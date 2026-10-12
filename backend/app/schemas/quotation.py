
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.quotation_item import (
    QuotationItemCreate,
    QuotationItemResponse,
)


class QuotationCreate(BaseModel):
    validity_date: datetime
    delivery_days: int = Field(ge=1)
    comments: str | None = None
    items: list[QuotationItemCreate] = Field(min_length=1)


class QuotationUpdate(BaseModel):
    validity_date: datetime | None = None
    delivery_days: int | None = Field(default=None, ge=1)
    comments: str | None = None
    items: list[QuotationItemCreate] | None = None


class QuotationResponse(BaseModel):
    id: int
    quotation_number: str
    rfq_id: int
    vendor_id: int
    submitted_at: datetime
    validity_date: datetime
    delivery_days: int
    subtotal: Decimal
    total_tax: Decimal
    total_amount: Decimal
    document_url: str | None = None
    status: str
    comments: str | None = None
    items: list[QuotationItemResponse] = []

    class Config:
        from_attributes = True
