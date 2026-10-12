
from sqlalchemy import (
    Column,
    Integer,
    String,
    ForeignKey,
    Numeric,
    DateTime,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True)

    po_number = Column(
        String(40),
        unique=True,
        nullable=False,
        index=True,
    )

    quotation_id = Column(
        Integer,
        ForeignKey("quotations.id"),
        unique=True,
        nullable=False,
    )

    vendor_id = Column(
        Integer,
        ForeignKey("vendors.id"),
        nullable=False,
    )

    created_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    total_amount = Column(Numeric(14, 2), nullable=False)

    status = Column(
        String(30),
        default="DRAFT",
        nullable=False,
        index=True,
    )

    approved_by = Column(Integer, ForeignKey("users.id"))
    approved_at = Column(DateTime)
    issued_at = Column(DateTime)

    # Vendor receipt confirmation details
    receipt_confirmed_at = Column(DateTime, nullable=True)
    receipt_confirmed_by = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
    )

    created_at = Column(
        DateTime,
        server_default=func.now(),
    )

    updated_at = Column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
    )

    quotation = relationship(
        "Quotation",
        back_populates="purchase_order",
    )

    items = relationship(
        "PurchaseOrderItem",
        back_populates="purchase_order",
    )

    approval_history = relationship(
        "ApprovalHistory",
        back_populates="purchase_order",
    )
