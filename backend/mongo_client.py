from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
from typing import Optional

load_dotenv()

class MongoClient:
    _instance: Optional['MongoClient'] = None
    _client: Optional[AsyncIOMotorClient] = None
    
    def __new__(cls) -> 'MongoClient':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    @classmethod
    async def get_client(cls) -> AsyncIOMotorClient:
        if cls._client is None:
            mongodb_url = os.getenv('MONGODB_URL')
            cls._client = AsyncIOMotorClient(mongodb_url)
        return cls._client
    
    @classmethod
    async def get_database(cls, db_name: str = 'slides_db'):
        client = await cls.get_client()
        return client[db_name]
    
    @classmethod
    async def get_courses_collection(cls):
        """Get courses collection"""
        db = await cls.get_database()
        return db.courses
    
    @classmethod
    async def get_notes_collection(cls):
        """Get notes collection"""
        db = await cls.get_database()
        return db.notes
    
    @classmethod
    async def get_folders_collection(cls):
        """Get folders collection"""
        db = await cls.get_database()
        return db.folders