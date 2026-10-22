import asyncio
from app.db.mongodb import connect_to_mongo, close_mongo_connection, db_config
from app.core.security import get_password_hash
from bson import ObjectId
from datetime import datetime

async def seed():
    await connect_to_mongo()
    db = db_config.db
    
    # Check if already seeded
    if await db["users"].count_documents({}) > 0:
        print("Database already seeded.")
        await close_mongo_connection()
        return
        
    print("Seeding departments...")
    depts = [
        {"_id": str(ObjectId()), "name": "Roads & Public Works Department", "category_handled": "Road Damage", "sort_order": 0},
        {"_id": str(ObjectId()), "name": "Water Supply & Sewerage Board", "category_handled": "Water Issues", "sort_order": 1},
        {"_id": str(ObjectId()), "name": "Electricity & Power Utility Department", "category_handled": "Electricity Hazards", "sort_order": 2},
        {"_id": str(ObjectId()), "name": "Police Department", "category_handled": "Other Services - Police", "sort_order": 3},
        {"_id": str(ObjectId()), "name": "Fire & Rescue Services", "category_handled": "Other Services - Fire and Rescue", "sort_order": 4},
        {"_id": str(ObjectId()), "name": "Municipal Corporation / Sanitation Department", "category_handled": "Garbage & Sanitation", "sort_order": 5},
        {"_id": str(ObjectId()), "name": "Transport Department", "category_handled": "Other Services - Transport", "sort_order": 6},
        {"_id": str(ObjectId()), "name": "Health Department", "category_handled": "Other Services - Health", "sort_order": 7},
        {"_id": str(ObjectId()), "name": "Revenue Department", "category_handled": "Other Services - Revenue", "sort_order": 8},
        {"_id": str(ObjectId()), "name": "Disaster Management Department", "category_handled": "Other Services - Disaster Management", "sort_order": 9},
        {"_id": str(ObjectId()), "name": "Other Government Department", "category_handled": "Other Services - Other Government Department", "sort_order": 10},
    ]
    await db["departments"].insert_many(depts)
    
    print("Seeding users...")
    users = [
        {
            "_id": str(ObjectId()),
            "name": "Admin User",
            "email": "admin@civicai.com",
            "password_hash": get_password_hash("admin123"),
            "role": "Admin",
            "department_id": None,
            "created_at": datetime.utcnow()
        },
        {
            "_id": str(ObjectId()),
            "name": "Roads Officer",
            "email": "roads@civicai.com",
            "password_hash": get_password_hash("officer123"),
            "role": "Officer",
            "department_id": depts[0]["_id"],
            "created_at": datetime.utcnow()
        },
        {
            "_id": str(ObjectId()),
            "name": "John Citizen",
            "email": "citizen@civicai.com",
            "password_hash": get_password_hash("citizen123"),
            "role": "Citizen",
            "department_id": None,
            "created_at": datetime.utcnow()
        }
    ]
    await db["users"].insert_many(users)
    
    print("Seeding completed!")
    await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(seed())
