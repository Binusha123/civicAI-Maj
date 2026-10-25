
import logging
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_civicai_notification(payload: dict) -> None:
    """Send a notification through n8n without failing the API."""
    if not settings.N8N_WEBHOOK_URL or not settings.N8N_WEBHOOK_SECRET:
        logger.warning("n8n notification skipped: configuration missing")
        return

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                settings.N8N_WEBHOOK_URL,
                json=payload,
                headers={
                    "X-Webhook-Secret": settings.N8N_WEBHOOK_SECRET
                },
            )
            response.raise_for_status()

        logger.info(
            "n8n accepted notification for report %s",
            payload.get("report_id"),
        )

    except Exception:
        logger.exception("Failed to send CivicAI email notification")
