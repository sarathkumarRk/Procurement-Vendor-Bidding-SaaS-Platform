from sqlalchemy import (
    Column, Integer, String, ForeignKey, Numeric, UniqueConstraint
)
from sqlalchemy.orm import relationship

from app.database import Base


class QuotationItem(Base):
    __tablename__ = "quotation_items"
    __table_args__ = (
        UniqueConstraint(
            "quotation_id", "rfq_item_id", name="uq_quotation_rfq_item"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(
        Integer, ForeignKey("quotations.id"), nullable=False, index=True
    )
    rfq_item_id = Column(Integer, ForeignKey("rfq_items.id"), nullable=False)
    quantity = Column(Numeric(12, 3), nullable=False)
    unit_price = Column(Numeric(14, 2), nullable=False)
    tax_rate = Column(Numeric(5, 2), nullable=False)
    tax_amount = Column(Numeric(14, 2), nullable=False)
    line_total = Column(Numeric(14, 2), nullable=False)
    delivery_days = Column(Integer, nullable=False)
    compliance_status = Column(String(20), default="PENDING", nullable=False)

    quotation = relationship("Quotation", back_populates="items")
    rfq_item = relationship("RFQItem", back_populates="quotation_items")