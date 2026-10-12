from datetime import datetime
from pydantic import BaseModel


class WebhookDeliveryLogResponse(BaseModel):
    id: int
    purchase_order_id: int
    event_type: str
    target_url: str
    status_code: int | None = None
    attempt_number: int
    delivery_status: str
    response_body: str | None = None
    error_message: str | None = None
    attempted_at: datetime

    class Config:
        from_attributes = True