from decimal import Decimal
from pydantic import BaseModel, Field


class QuotationItemCreate(BaseModel):
    rfq_item_id: int
    quantity: Decimal = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    tax_rate: Decimal = Field(ge=0, le=100)
    delivery_days: int = Field(ge=1)
    compliance_status: str = "PENDING"


class QuotationItemResponse(BaseModel):
    id: int
    quotation_id: int
    rfq_item_id: int
    quantity: Decimal
    unit_price: Decimal
    tax_rate: Decimal
    tax_amount: Decimal
    line_total: Decimal
    delivery_days: int
    compliance_status: str

    class Config:
        from_attributes = True