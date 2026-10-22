from fastapi import APIRouter, Depends, HTTPException
from typing import Any
from pydantic import BaseModel
from datetime import datetime
from app.db.mongodb import db_config
from app.api.deps import require_role

router = APIRouter()


class RoleRequestDecision(BaseModel):
    approved: bool

@router.get("/analytics")
async def get_analytics(current_user: dict = Depends(require_role("Admin"))) -> Any:
    pipeline_status = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db_config.db["reports"].aggregate(pipeline_status).to_list(100)
    
    pipeline_category = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]
    category_counts = await db_config.db["reports"].aggregate(pipeline_category).to_list(100)

    pipeline_department = [
        {"$group": {"_id": "$assigned_department_id", "count": {"$sum": 1}}}
    ]
    department_counts = await db_config.db["reports"].aggregate(pipeline_department).to_list(100)

    pipeline_severity = [
        {"$group": {"_id": "$severity", "count": {"$sum": 1}}}
    ]
    severity_counts = await db_config.db["reports"].aggregate(pipeline_severity).to_list(100)
    
    total_reports = await db_config.db["reports"].count_documents({"duplicate_of": None})
    duplicate_reports = await db_config.db["reports"].count_documents(
        {"duplicate_of": {"$exists": True, "$ne": None}}
    )
    
    return {
        "total": total_reports,
        "by_status": {item["_id"]: item["count"] for item in status_counts},
        "by_category": {item["_id"]: item["count"] for item in category_counts},
        "by_department": {item["_id"]: item["count"] for item in department_counts},
        "by_severity": {item["_id"]: item["count"] for item in severity_counts},
        "duplicates": duplicate_reports,
    }


@router.get("/role-requests")
async def list_role_requests(current_user: dict = Depends(require_role("Admin"))) -> Any:
    requests = await db_config.db["users"].find(
        {"role_request.status": "Pending"},
        {"_id": 1, "name": 1, "email": 1, "role_request": 1, "created_at": 1},
    ).to_list(length=500)
    department_ids = {
        item["role_request"].get("department_id")
        for item in requests
        if item.get("role_request", {}).get("department_id")
    }
    departments = await db_config.db["departments"].find(
        {"_id": {"$in": list(department_ids)}}, {"_id": 1, "name": 1}
    ).to_list(length=len(department_ids)) if department_ids else []
    department_names = {item["_id"]: item["name"] for item in departments}
    for item in requests:
        department_id = item.get("role_request", {}).get("department_id")
        item["role_request"]["department_name"] = department_names.get(department_id)
    return requests


@router.put("/role-requests/{user_id}")
async def decide_role_request(
    user_id: str,
    decision: RoleRequestDecision,
    current_user: dict = Depends(require_role("Admin")),
) -> Any:
    applicant = await db_config.db["users"].find_one({"_id": user_id, "role_request.status": "Pending"})
    if not applicant:
        raise HTTPException(status_code=404, detail="Pending role request not found")

    request = applicant["role_request"]
    update = {
        "role_request.status": "Approved" if decision.approved else "Denied",
        "role_request.decided_at": datetime.utcnow(),
        "role_request.decided_by": current_user["_id"],
    }
    if decision.approved:
        requested_role = request.get("requested_role")
        if requested_role not in {"Officer", "Admin"}:
            raise HTTPException(status_code=400, detail="Invalid requested role")
        if requested_role == "Officer":
            department_id = request.get("department_id")
            department = await db_config.db["departments"].find_one({"_id": department_id})
            if not department:
                raise HTTPException(status_code=400, detail="The requested department no longer exists")
            update["role"] = "Officer"
            update["department_id"] = department_id
        else:
            update["role"] = "Admin"
            update["department_id"] = None

    await db_config.db["users"].update_one({"_id": user_id}, {"$set": update})
    return {"message": "Role request approved" if decision.approved else "Role request denied"}
