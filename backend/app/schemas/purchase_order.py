
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.purchase_order_item import (
    PurchaseOrderItemResponse,
)


class PurchaseOrderCreate(BaseModel):
    quotation_id: int


class PurchaseOrderStatusUpdate(BaseModel):
    status: str


class PurchaseOrderResponse(BaseModel):
    id: int
    po_number: str
    quotation_id: int
    vendor_id: int
    created_by: int
    total_amount: Decimal
    status: str

    approved_by: int | None = None
    approved_at: datetime | None = None
    issued_at: datetime | None = None

    # Vendor receipt confirmation details
    receipt_confirmed_at: datetime | None = None
    receipt_confirmed_by: int | None = None

    items: list[PurchaseOrderItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
