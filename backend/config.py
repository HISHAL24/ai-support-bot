from pydantic_settings import BaseSettings
from motor.motor_asyncio import AsyncIOMotorClient
import os

class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    DB_NAME: str = "ai_support_bot"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    UPLOAD_DIR: str = "./uploads"

    class Config:
        env_file = ".env"

settings = Settings()

client = AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.DB_NAME]

async def get_database():
    return db

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
