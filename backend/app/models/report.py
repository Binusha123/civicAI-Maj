from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class GeoPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float] # [longitude, latitude]
    address: Optional[str] = None

class ReportBase(BaseModel):
    category: str # Road Damage, Garbage & Sanitation, Water Issues, Electricity Hazards
    description: Optional[str] = None
    location: GeoPoint

class ReportCreate(ReportBase):
    pass

class AIAnalysisData(BaseModel):
    confidence_score: float = 0.0
    flags: List[str] = []
    severity: str = "Medium" # Critical, High, Medium, Low
    
class ReportInDB(ReportBase):
    id: str = Field(default=..., alias="_id")
    citizen_id: str
    image_url: str
    before_image_url: Optional[str] = None
    after_image_url: Optional[str] = None
    status: str = "Submitted" # Submitted, AI Processing, Verified, Needs Review, Rejected, Assigned, In Progress, Resolved, Closed
    severity: str = "Medium"
    ai_confidence_score: float = 0.0
    ai_flags: List[str] = []
    ai_summary: Optional[str] = None
    ai_detected_category: Optional[str] = None
    description_assessment: Optional[str] = None
    description_observation: Optional[str] = None
    issue_visible: Optional[bool] = None
    image_type: Optional[str] = None
    authenticity: Optional[str] = None
    authenticity_signals: List[str] = Field(default_factory=list)
    duplicate_message: Optional[str] = None
    duplicate_of: Optional[str] = None
    duplicate_count: int = 0
    affected_users: List[str] = Field(default_factory=list)
    priority_score: int = 0
    assigned_department_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None

class ReportResponse(ReportInDB):
    pass
