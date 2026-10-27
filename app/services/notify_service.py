import logging

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_civicai_notification(payload: dict) -> bool:
    """Send a CivicAI event to n8n without affecting the API response."""
    if not settings.N8N_WEBHOOK_URL or not settings.N8N_WEBHOOK_SECRET:
        logger.warning("n8n notification skipped: configuration missing")
        return False

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                settings.N8N_WEBHOOK_URL,
                json=payload,
                headers={"X-Webhook-Secret": settings.N8N_WEBHOOK_SECRET},
            )
            response.raise_for_status()
        logger.info("n8n accepted %s notification for report %s", payload.get("event"), payload.get("report_id"))
        return True
    except Exception:
        logger.exception("Failed to send CivicAI email notification")
        return False
