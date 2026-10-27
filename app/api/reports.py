from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File, Form, Query
from typing import Any, List, Optional
from datetime import datetime
from bson import ObjectId
import logging
from pathlib import Path

from app.models.report import ReportResponse
from app.db.mongodb import db_config
from app.api.deps import get_current_active_user, require_role
from app.core.files import save_upload
from app.services.ai_service import ai_service
from app.services.image_checks import inspect_image, find_hash_reuse
from app.services.notify_service import send_civicai_notification
from app.core.config import settings

router = APIRouter()
logger = logging.getLogger(__name__)

SEVERITY_WEIGHTS = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}


def calculate_priority_score(severity: Optional[str], affected_users: List[str]) -> int:
    return SEVERITY_WEIGHTS.get(severity or "Medium", 2) + 2 * len(affected_users)

@router.post("/", response_model=ReportResponse)
async def create_report(
    background_tasks: BackgroundTasks,
    category: str = Form(...),
    description: Optional[str] = Form(None),
    longitude: float = Form(...),
    latitude: float = Form(...),
    address: Optional[str] = Form(None),
    image: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user)
) -> Any:
    # 1. Save Image
    image_url = await save_upload(image)
    file_path = image_url.lstrip("/")
    
    # 2. AI Analysis
    ai_result = await ai_service.analyze_image(file_path, category, description)
    try:
        image_signals = inspect_image(file_path, latitude, longitude)
        phash = image_signals["phash"]
        code_flags = list(image_signals["flags"])
        code_flags.extend(await find_hash_reuse(
            phash,
            current_user["_id"],
            db_config.db["reports"],
            db_config.db["ai_analysis"],
        ))
    except Exception as error:
        phash = None
        image_signals = {"flags": [], "capture_time": None, "gps": None}
        code_flags = []
        logger.warning("Could not calculate image pHash (%s)", type(error).__name__)

    issue_visible = ai_result["issue_visible"]
    authenticity = ai_result["authenticity"]
    image_type = ai_result["image_type"]
    authenticity_signals = ai_result["authenticity_signals"]
    ai_flags = list(ai_result["flags"])
    if ai_result["description_assessment"] == "contradicted":
        ai_flags.append("description_mismatch")
    if not issue_visible:
        ai_flags.append("no_issue_detected")
    if authenticity == "likely_synthetic" or image_type in {"screenshot_or_stock", "illustration_or_render"}:
        ai_flags.append("suspected_fake")
    ai_flags.extend(code_flags)
    ai_flags = list(dict.fromkeys(ai_flags))

    needs_review = (
        not issue_visible
        or ai_result["confidence"] < 0.6
        or ai_result["detected_category"] != category
        or "ai_unavailable" in ai_flags
        or authenticity == "likely_synthetic"
        or image_type in {"screenshot_or_stock", "illustration_or_render"}
        or ai_result["description_assessment"] == "contradicted"
    )
    
    # 3. Duplicate Detection (Geospatial + Category)
    duplicate_of = None
    duplicate_message = None
    
    # Find the primary report for an open issue within 50 meters.
    pipeline = [
        {
            "$geoNear": {
                "near": { "type": "Point", "coordinates": [longitude, latitude] },
                "distanceField": "dist.calculated",
                "maxDistance": 50, # 50 meters radius
                "query": { 
                    "category": category, 
                    "status": {"$nin": ["Resolved", "Closed", "Rejected"]},
                    "duplicate_of": None,
                },
                "spherical": True
            }
        },
        {"$limit": 1}
    ]
    
    if not needs_review:
        try:
            cursor = db_config.db["reports"].aggregate(pipeline)
            duplicates = await cursor.to_list(length=1)
            if duplicates:
                duplicate_of = duplicates[0]["_id"]
                primary = duplicates[0]
                print(f"Found duplicate report: {duplicate_of} at distance {duplicates[0]['dist']['calculated']}")
                department = None
                if primary.get("assigned_department_id"):
                    department = await db_config.db["departments"].find_one(
                        {"_id": primary["assigned_department_id"]}
                    )
                ticket_id = str(duplicate_of)[:8]
                if primary.get("status") in {"Verified", "Assigned", "In Progress", "Resolved", "Closed"}:
                    department_name = department.get("name") if department else "the responsible department"
                    duplicate_message = (
                        f"This issue is already reported as ticket #{ticket_id} and is "
                        f"{primary['status']}. It has been sent to {department_name}. "
                        "An officer will review your photo and report. Follow the existing ticket for updates."
                    )
                else:
                    duplicate_message = (
                        f"A similar issue is already reported as ticket #{ticket_id} "
                        f"(status: {primary.get('status', 'Under Review')}). "
                        "An officer will review your photo and report alongside the existing ticket."
                    )
        except Exception as e:
            print("Duplicate detection aggregation failed (index might be missing):", e)
    
    report_dict = {
        "_id": str(ObjectId()),
        "citizen_id": current_user["_id"],
        "category": category,
        "description": description,
        "location": {
            "type": "Point",
            "coordinates": [longitude, latitude],
            "address": address
        },
        "image_url": image_url,
        "status": "AI Processing",
        "severity": ai_result["severity"],
        "ai_confidence_score": ai_result["confidence"],
        "ai_flags": ai_flags,
        "ai_summary": ai_result["summary"],
        "ai_detected_category": ai_result["detected_category"],
        "description_assessment": ai_result["description_assessment"],
        "description_observation": ai_result["description_observation"],
        "issue_visible": issue_visible,
        "image_type": image_type,
        "authenticity": authenticity,
        "authenticity_signals": authenticity_signals,
        "duplicate_message": duplicate_message,
        "duplicate_of": duplicate_of,
        "duplicate_count": 0,
        "affected_users": [current_user["_id"]] if duplicate_of is None else [],
        "priority_score": calculate_priority_score(ai_result["severity"], [current_user["_id"]]) if duplicate_of is None else 0,
        "assigned_department_id": None, 
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    
    # Simple department routing
    dept = await db_config.db["departments"].find_one({"category_handled": category})
    if dept:
        report_dict["assigned_department_id"] = dept["_id"]
        
    # Keep uncertain, unrelated, or mismatched reports available for human review.
    if duplicate_of is not None or needs_review:
        report_dict["status"] = "Needs Review"
    else:
        report_dict["status"] = "Verified"
    
    # Save Report
    await db_config.db["reports"].insert_one(report_dict)

    # Save Analysis details
    await db_config.db["ai_analysis"].insert_one({
        "_id": str(ObjectId()),
        "report_id": report_dict["_id"],
        "raw_output": ai_result["raw_output"],
        "phash": phash,
        "authenticity": authenticity,
        "authenticity_signals": authenticity_signals,
        "signals": image_signals,
        "flags": ai_flags,
        "processed_at": datetime.utcnow()
    })

    background_tasks.add_task(send_civicai_notification, {
        "event": "report_received",
        "recipient_email": current_user.get("email"),
        "recipient_name": current_user.get("name"),
        "report_id": report_dict["_id"],
        "category": category,
        "description": description,
        "status": report_dict["status"],
        "image_url": image_url,
        "address": address,
        "ai_summary": ai_result["summary"],
        "report_url": f"{settings.FRONTEND_URL.rstrip('/')}/dashboard",
        "created_at": report_dict["created_at"].isoformat(),
    })
    
    return report_dict

@router.get("/", response_model=List[ReportResponse])
async def list_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_active_user),
) -> Any:
    # If citizen, only their reports. If officer, only their dept. If admin, all.
    query = {}
    if current_user["role"] == "Citizen":
        query["citizen_id"] = current_user["_id"]
    elif current_user["role"] == "Officer":
        query["duplicate_of"] = None
        if "department_id" in current_user and current_user["department_id"]:
            query["assigned_department_id"] = current_user["department_id"]
        else:
            query["_id"] = {"$in": []}
    elif current_user["role"] == "Admin":
        query["duplicate_of"] = None
            
    cursor = db_config.db["reports"].find(query)
    if current_user["role"] in {"Officer", "Admin"}:
        cursor = cursor.sort([("priority_score", -1), ("created_at", -1)])
    else:
        cursor = cursor.sort("created_at", -1)
    reports = await cursor.skip(skip).limit(limit).to_list(length=limit)

    if current_user["role"] == "Citizen":
        primary_ids = list({report["duplicate_of"] for report in reports if report.get("duplicate_of")})
        if primary_ids:
            primaries = await db_config.db["reports"].find(
                {"_id": {"$in": primary_ids}}, {"_id": 1, "status": 1}
            ).to_list(length=len(primary_ids))
            primary_statuses = {primary["_id"]: primary["status"] for primary in primaries}
            for report in reports:
                primary_status = primary_statuses.get(report.get("duplicate_of"))
                if primary_status is not None and report.get("status") == "Merged":
                    report["status"] = primary_status
    return reports


def _remove_report_upload(image_url: Optional[str]) -> None:
    """Remove only files owned by the app's uploads directory."""
    if not image_url or not image_url.startswith("/uploads/"):
        return
    filename = image_url.removeprefix("/uploads/").split("?", 1)[0]
    if not filename or Path(filename).name != filename:
        logger.warning("Skipping unsafe report upload path during deletion")
        return
    uploads_dir = Path("uploads").resolve()
    target = (uploads_dir / filename).resolve()
    if target.parent != uploads_dir:
        logger.warning("Skipping report upload outside uploads directory")
        return
    try:
        target.unlink(missing_ok=True)
    except OSError as error:
        logger.warning("Could not remove report upload (%s)", type(error).__name__)


@router.delete("/{report_id}")
async def delete_report(
    report_id: str,
    current_user: dict = Depends(require_role("Citizen")),
) -> Any:
    report = await db_config.db["reports"].find_one({"_id": report_id})
    if report is None or report.get("citizen_id") != current_user["_id"]:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.get("duplicate_of") is None:
        linked_reports = await db_config.db["reports"].count_documents({"duplicate_of": report_id})
        other_affected_users = {
            citizen_id for citizen_id in report.get("affected_users", [])
            if citizen_id != current_user["_id"]
        }
        if linked_reports or other_affected_users:
            raise HTTPException(
                status_code=409,
                detail="This complaint has other citizens or reports linked to it and cannot be deleted. Contact the responsible officer for help.",
            )

    await db_config.db["reports"].delete_one({"_id": report_id, "citizen_id": current_user["_id"]})
    await db_config.db["ai_analysis"].delete_many({"report_id": report_id})
    await db_config.db["report_history"].delete_many({"report_id": report_id})
    _remove_report_upload(report.get("image_url"))
    _remove_report_upload(report.get("after_image_url"))

    return {"message": "Complaint deleted successfully"}


@router.get("/nearby")
async def nearby_reports(
    latitude: float,
    longitude: float,
    category: str,
    current_user: dict = Depends(get_current_active_user),
) -> Any:
    pipeline = [
        {
            "$geoNear": {
                "near": {"type": "Point", "coordinates": [longitude, latitude]},
                "distanceField": "distance",
                "maxDistance": 100,
                "query": {
                    "category": category,
                    "duplicate_of": None,
                    "status": {"$nin": ["Resolved", "Closed", "Rejected"]},
                },
                "spherical": True,
            }
        },
        {"$limit": 5},
        {
            "$project": {
                "_id": 1,
                "description": 1,
                "image_url": 1,
                "address": "$location.address",
                "status": 1,
                "duplicate_count": {"$ifNull": ["$duplicate_count", 0]},
                "affected_users_count": {
                    "$size": {"$ifNull": ["$affected_users", ["$citizen_id"]]}
                },
                "distance": 1,
            }
        },
    ]
    reports = await db_config.db["reports"].aggregate(pipeline).to_list(length=5)
    return [
        {
            "id": report["_id"],
            "description": report.get("description"),
            "image_url": report.get("image_url"),
            "address": report.get("address"),
            "status": report.get("status"),
            "duplicate_count": report.get("duplicate_count", 0),
            "affected_users_count": report.get("affected_users_count", 1),
            "distance": report.get("distance", 0),
        }
        for report in reports
    ]


@router.post("/{report_id}/me-too")
async def me_too(
    report_id: str,
    current_user: dict = Depends(require_role("Citizen")),
) -> Any:
    target = await db_config.db["reports"].find_one({"_id": report_id})
    if target is None:
        raise HTTPException(status_code=404, detail="Report not found")

    primary_id = target.get("duplicate_of") or target["_id"]
    primary = await db_config.db["reports"].find_one({"_id": primary_id})
    if primary is None:
        raise HTTPException(status_code=404, detail="Primary report not found")

    affected_users = primary.get("affected_users") or [primary["citizen_id"]]
    if current_user["_id"] in affected_users:
        raise HTTPException(status_code=400, detail="You are already marked as affected")

    update_result = await db_config.db["reports"].update_one(
        {"_id": primary_id, "affected_users": {"$ne": current_user["_id"]}},
        {
            "$addToSet": {
                "affected_users": {
                    "$each": [primary["citizen_id"], current_user["_id"]]
                }
            },
        },
    )
    if update_result.modified_count == 0:
        raise HTTPException(status_code=400, detail="You are already marked as affected")

    updated_primary = await db_config.db["reports"].find_one({"_id": primary_id})
    updated_users = updated_primary.get("affected_users") or [updated_primary["citizen_id"]]
    priority_score = calculate_priority_score(updated_primary.get("severity"), updated_users)
    await db_config.db["reports"].update_one(
        {"_id": primary_id}, {"$set": {"priority_score": priority_score}}
    )
    updated_primary["priority_score"] = priority_score
    return updated_primary

@router.put("/{report_id}/status")
async def update_status(
    report_id: str, 
    background_tasks: BackgroundTasks,
    status: str = Form(...),
    remarks: Optional[str] = Form(None),
    after_image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(require_role("Officer", "Admin"))
) -> Any:
    report = await db_config.db["reports"].find_one({"_id": report_id})
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found")

    allowed_statuses = {
        "Verified",
        "Needs Review",
        "Assigned",
        "In Progress",
        "Resolved",
        "Closed",
        "Rejected",
    }
    if status not in allowed_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")

    if current_user.get("role") == "Officer" and report.get("assigned_department_id") != current_user.get("department_id"):
        raise HTTPException(status_code=403, detail="Not enough permissions")

    update_data = {
        "status": status,
        "updated_at": datetime.utcnow()
    }

    if status in ["Resolved", "Closed"]:
        update_data["resolved_at"] = datetime.utcnow()
    
    if remarks:
        update_data["remarks"] = remarks
        
    # Process after_image if resolved
    if status in ["Resolved", "Closed"] and after_image:
        update_data["after_image_url"] = await save_upload(after_image)
        
    await db_config.db["reports"].update_one(
        {"_id": report_id},
        {"$set": update_data}
    )

    if report.get("duplicate_of") is None:
        duplicate_reports = await db_config.db["reports"].find(
            {"duplicate_of": report_id}, {"citizen_id": 1}
        ).to_list(length=10000)
        await db_config.db["reports"].update_many(
            {"duplicate_of": report_id},
            {
                "$set": {
                    "status": status,
                    "updated_at": update_data["updated_at"],
                    **({"resolved_at": update_data["resolved_at"]} if "resolved_at" in update_data else {}),
                }
            },
        )

        affected_citizen_ids = {report["citizen_id"]}
        affected_citizen_ids.update(item["citizen_id"] for item in duplicate_reports if item.get("citizen_id"))
        for citizen_id in affected_citizen_ids:
            user = await db_config.db["users"].find_one({"_id": citizen_id})
            if user and user.get("email"):
                background_tasks.add_task(send_civicai_notification, {
                    "event": "status_update",
                    "recipient_email": user["email"],
                    "recipient_name": user.get("name"),
                    "report_id": report_id,
                    "category": report["category"],
                    "description": report.get("description"),
                    "status": status,
                    "remarks": remarks,
                    "report_url": f"{settings.FRONTEND_URL.rstrip('/')}/dashboard",
                    "updated_at": update_data["updated_at"].isoformat(),
                })
    else:
        user = await db_config.db["users"].find_one({"_id": report["citizen_id"]})
        if user and user.get("email"):
            background_tasks.add_task(send_civicai_notification, {
                "event": "status_update",
                "recipient_email": user["email"],
                "recipient_name": user.get("name"),
                "report_id": report_id,
                "category": report["category"],
                "description": report.get("description"),
                "status": status,
                "remarks": remarks,
                "report_url": f"{settings.FRONTEND_URL.rstrip('/')}/dashboard",
                "updated_at": update_data["updated_at"].isoformat(),
            })
    
    # Record history
    if report.get("duplicate_of") is None:
        await db_config.db["report_history"].insert_one({
            "_id": str(ObjectId()),
            "report_id": report_id,
            "status_to": status,
            "changed_by": current_user["_id"],
            "remarks": remarks,
            "timestamp": datetime.utcnow()
        })
    
    return {"message": "Status updated successfully"}
