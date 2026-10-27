from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.api.deps import require_role
from app.core.config import settings
from app.services.notify_service import send_civicai_notification

router = APIRouter()


@router.post("/email-trigger")
async def trigger_test_email(current_user: dict = Depends(require_role("Citizen", "Officer"))) -> Any:
    recipient_email = current_user.get("email")
    if not recipient_email:
        raise HTTPException(status_code=400, detail="Your account does not have an email address.")

    sent = await send_civicai_notification({
        "event": "manual_email_trigger",
        "test": True,
        "recipient_email": recipient_email,
        "recipient_name": current_user.get("name"),
        "subject": "CivicAI email notification test",
        "message": "Your CivicAI email notification connection is working.",
        "report_url": f"{settings.FRONTEND_URL.rstrip('/')}/dashboard",
        "requested_at": datetime.utcnow().isoformat(),
    })
    if not sent:
        raise HTTPException(
            status_code=503,
            detail="The email service is unavailable. Check the n8n webhook URL, shared secret, and workflow execution.",
        )

    return {"message": "Test email notification accepted by n8n", "recipient_email": recipient_email}
