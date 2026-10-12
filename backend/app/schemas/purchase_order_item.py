from decimal import Decimal
from pydantic import BaseModel, Field


class PurchaseOrderItemCreate(BaseModel):
    item_name: str
    quantity: Decimal = Field(gt=0)
    unit_price: Decimal = Field(ge=0)
    tax_amount: Decimal = Field(ge=0)
    line_total: Decimal = Field(ge=0)


class PurchaseOrderItemResponse(BaseModel):
    id: int
    purchase_order_id: int
    item_name: str
    quantity: Decimal
    unit_price: Decimal
    tax_amount: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True