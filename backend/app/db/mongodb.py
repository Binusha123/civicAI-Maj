from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class MongoDB:
    client: AsyncIOMotorClient = None
    db = None

db_config = MongoDB()

async def connect_to_mongo():
    db_config.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db_config.db = db_config.client[settings.DATABASE_NAME]

async def close_mongo_connection():
    if db_config.client is not None:
        db_config.client.close()
