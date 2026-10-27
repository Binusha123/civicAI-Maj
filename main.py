from contextlib import asynccontextmanager
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.db.mongodb import connect_to_mongo, close_mongo_connection
from app.api.auth import router as auth_router
from app.api.reports import router as reports_router
from app.api.admin import router as admin_router
from app.api.notifications import router as notifications_router
import os

DEFAULT_SECRET_KEY = "supersecretkey_change_in_production"


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.SECRET_KEY == DEFAULT_SECRET_KEY:
        logging.warning("SECRET_KEY is set to the default value; configure a secure secret in the environment.")

    await connect_to_mongo()
    # Create geospatial index for duplicate detection
    import pymongo
    from app.db.mongodb import db_config
    try:
        await db_config.db["reports"].create_index([("location", pymongo.GEOSPHERE)])
        print("Geospatial index created on 'location' field.")
    except Exception as e:
        print("Could not create geospatial index:", e)

    try:
        yield
    finally:
        await close_mongo_connection()


app = FastAPI(title=settings.PROJECT_NAME, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(reports_router, prefix="/api/reports", tags=["reports"])
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["notifications"])

@app.get("/")
def root():
    return {"message": "Welcome to CivicAI API"}
