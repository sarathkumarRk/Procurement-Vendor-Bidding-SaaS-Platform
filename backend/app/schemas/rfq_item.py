from decimal import Decimal
from pydantic import BaseModel, Field


class RFQItemCreate(BaseModel):
    item_name: str
    description: str | None = None
    quantity: Decimal = Field(gt=0)
    unit: str
    specifications: str | None = None


class RFQItemResponse(BaseModel):
    id: int
    rfq_id: int
    item_name: str
    description: str | None = None
    quantity: Decimal
    unit: str
    specifications: str | None = None

    class Config:
        from_attributes = True