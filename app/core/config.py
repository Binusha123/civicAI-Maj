from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "CivicAI"
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "civicai_db"
    CORS_ORIGINS: str = "http://localhost:5173"
    AI_API_KEY: str = ""
    AI_MODEL: str = ""
    N8N_WEBHOOK_URL: str = ""
    N8N_WEBHOOK_SECRET: str = ""
    FRONTEND_URL: str = "http://localhost:5173"
    
    SECRET_KEY: str = "supersecretkey_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7 # 7 days
    
    class Config:
        env_file = ".env"

settings = Settings()
