from sqlalchemy import (
    Column, Integer, String, Text, DateTime,
    ForeignKey, Numeric, UniqueConstraint
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Quotation(Base):
    __tablename__ = "quotations"
    __table_args__ = (
        UniqueConstraint("rfq_id", "vendor_id", name="uq_rfq_vendor"),
    )

    id = Column(Integer, primary_key=True, index=True)
    quotation_number = Column(String(40), unique=True, nullable=False)
    rfq_id = Column(Integer, ForeignKey("rfqs.id"), nullable=False, index=True)
    vendor_id = Column(Integer, ForeignKey("vendors.id"), nullable=False, index=True)
    submitted_at = Column(DateTime, server_default=func.now())
    validity_date = Column(DateTime, nullable=False)
    delivery_days = Column(Integer, nullable=False)
    subtotal = Column(Numeric(14, 2), nullable=False)
    total_tax = Column(Numeric(14, 2), nullable=False)
    total_amount = Column(Numeric(14, 2), nullable=False)
    document_url = Column(String(1000))
    document_public_id = Column(String(255))
    status = Column(String(20), default="SUBMITTED", nullable=False)
    comments = Column(Text)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    rfq = relationship("RFQ", back_populates="quotations")
    vendor = relationship("Vendor", back_populates="quotations")
    items = relationship("QuotationItem", back_populates="quotation")
    evaluation_scores = relationship("EvaluationScore", back_populates="quotation")
    purchase_order = relationship(
        "PurchaseOrder", back_populates="quotation", uselist=False
    )