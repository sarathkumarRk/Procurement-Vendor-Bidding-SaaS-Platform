from datetime import datetime
from pydantic import BaseModel, Field

from app.schemas.rfq_item import RFQItemCreate, RFQItemResponse


class RFQCreate(BaseModel):
    title: str
    description: str
    department_id: int
    submission_deadline: datetime
    required_delivery_date: datetime | None = None
    terms_and_conditions: str | None = None
    attachment_url: str | None = None
    items: list[RFQItemCreate] = Field(min_length=1)


class RFQUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    department_id: int | None = None
    submission_deadline: datetime | None = None
    required_delivery_date: datetime | None = None
    terms_and_conditions: str | None = None
    attachment_url: str | None = None


class RFQResponse(BaseModel):
    id: int
    rfq_number: str
    title: str
    description: str
    department_id: int
    created_by: int
    status: str
    submission_deadline: datetime
    required_delivery_date: datetime | None = None
    terms_and_conditions: str | None = None
    attachment_url: str | None = None
    published_at: datetime | None = None
    closed_at: datetime | None = None
    items: list[RFQItemResponse] = []

    class Config:
        from_attributes = True