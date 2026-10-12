from datetime import datetime
from pydantic import BaseModel


class ApprovalCreate(BaseModel):
    action: str
    comments: str | None = None


class ApprovalResponse(BaseModel):
    id: int
    purchase_order_id: int
    approver_id: int
    action: str
    comments: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True