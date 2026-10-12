from datetime import datetime
from pydantic import BaseModel


class AuditLogResponse(BaseModel):
    id: int
    user_id: int | None = None
    action: str
    entity_type: str
    entity_id: int | None = None
    details: str | None = None
    ip_address: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True