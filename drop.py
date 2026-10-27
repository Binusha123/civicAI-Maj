import asyncio
from app.db.mongodb import db_config, connect_to_mongo, close_mongo_connection

async def run():
    await connect_to_mongo()
    await db_config.db['users'].drop()
    await db_config.db['departments'].drop()
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(run())
