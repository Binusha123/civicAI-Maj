from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Literal
from datetime import datetime

class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: str = "Citizen" # Citizen, Officer, Admin
    department_id: Optional[str] = None

class UserCreate(UserBase):
    password: str
    requested_role: Optional[Literal["Officer", "Admin"]] = None

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    password_hash: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserResponse(UserBase):
    id: str = Field(alias="_id")
    created_at: datetime
    role_request: Optional[dict] = None
    
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
