from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import Any
from datetime import datetime
from bson import ObjectId
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import UserCreate, UserResponse, Token, UserInDB
from app.db.mongodb import db_config
from app.api.deps import get_current_active_user

router = APIRouter()

SIGNUP_DEPARTMENTS = [
    ("Roads & Public Works Department", "Road Damage"),
    ("Water Supply & Sewerage Board", "Water Issues"),
    ("Electricity & Power Utility Department", "Electricity Hazards"),
    ("Police Department", "Other Services - Police"),
    ("Fire & Rescue Services", "Other Services - Fire and Rescue"),
    ("Municipal Corporation / Sanitation Department", "Garbage & Sanitation"),
    ("Transport Department", "Other Services - Transport"),
    ("Health Department", "Other Services - Health"),
    ("Revenue Department", "Other Services - Revenue"),
    ("Disaster Management Department", "Other Services - Disaster Management"),
    ("Other Government Department", "Other Services - Other Government Department"),
]

@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate) -> Any:
    user = await db_config.db["users"].find_one({"email": user_in.email})
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this username already exists in the system.",
        )
    user_dict = user_in.model_dump(exclude={"requested_role"})
    password = user_dict.pop("password")
    user_dict["password_hash"] = get_password_hash(password)
    user_dict["_id"] = str(ObjectId())
    user_dict["created_at"] = datetime.utcnow()
    requested_role = user_in.requested_role
    requested_department_id = user_dict.pop("department_id", None)
    user_dict["role"] = "Citizen"
    user_dict["department_id"] = None
    if requested_role:
        if requested_role == "Officer":
            if not requested_department_id:
                raise HTTPException(status_code=400, detail="Select the government department you work for.")
            department = await db_config.db["departments"].find_one({"_id": requested_department_id})
            if not department:
                raise HTTPException(status_code=400, detail="The selected department was not found.")
        elif requested_department_id:
            raise HTTPException(status_code=400, detail="Admin access requests do not use a department.")
        user_dict["role_request"] = {
            "requested_role": requested_role,
            "department_id": requested_department_id if requested_role == "Officer" else None,
            "status": "Pending",
            "requested_at": datetime.utcnow(),
        }
    
    await db_config.db["users"].insert_one(user_dict)
    return user_dict


@router.get("/departments")
async def list_signup_departments() -> Any:
    departments = db_config.db["departments"]
    for sort_order, (name, category_handled) in enumerate(SIGNUP_DEPARTMENTS):
        await departments.update_one(
            {"category_handled": category_handled},
            {
                "$set": {"name": name, "sort_order": sort_order},
                "$setOnInsert": {"_id": str(ObjectId()), "category_handled": category_handled},
            },
            upsert=True,
        )
    category_keys = [category_handled for _, category_handled in SIGNUP_DEPARTMENTS]
    return await departments.find(
        {"category_handled": {"$in": category_keys}},
        {"_id": 1, "name": 1, "category_handled": 1, "sort_order": 1},
    ).sort("sort_order", 1).to_list(length=len(SIGNUP_DEPARTMENTS))

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    user = await db_config.db["users"].find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(
        subject=user["email"], role=user["role"]
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_user_me(current_user: dict = Depends(get_current_active_user)) -> Any:
    return current_user
