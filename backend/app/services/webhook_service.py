import hashlib
import hmac
import json
import logging

import requests

from app.config import settings


logger = logging.getLogger(__name__)

TIMEOUT_SECONDS = 10


def send_purchase_order_webhook(
    webhook_url: str,
    po_number: str,
    old_status: str,
    new_status: str,
) -> dict:
    """
    Notify an external system when a purchase order status changes.
    """

    payload = {
        "event": "purchase_order.status_changed",
        "po_number": po_number,
        "old_status": old_status,
        "new_status": new_status,
    }

    body = json.dumps(
        payload,
        separators=(",", ":"),
    )

    signature = hmac.new(
        settings.WEBHOOK_SECRET.encode("utf-8"),
        body.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    headers = {
        "Content-Type": "application/json",
        "X-Webhook-Signature": f"sha256={signature}",
    }

    try:
        response = requests.post(
            webhook_url,
            data=body,
            headers=headers,
            timeout=TIMEOUT_SECONDS,
        )

        response.raise_for_status()

        logger.info(
            "Webhook delivered: PO=%s, status=%s",
            po_number,
            response.status_code,
        )

        return {
            "success": True,
            "status_code": response.status_code,
            "error": None,
        }

    except requests.RequestException as exc:
        logger.exception(
            "Webhook delivery failed for PO=%s",
            po_number,
        )

        return {
            "success": False,
            "status_code": (
                exc.response.status_code
                if exc.response is not None
                else None
            ),
            "error": str(exc),
        }