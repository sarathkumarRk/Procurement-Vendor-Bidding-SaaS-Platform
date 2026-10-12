from sqlalchemy import Column, Integer, String, Text, ForeignKey, Numeric, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class RFQItem(Base):
    __tablename__ = "rfq_items"

    id = Column(Integer, primary_key=True, index=True)
    rfq_id = Column(Integer, ForeignKey("rfqs.id"), nullable=False, index=True)
    item_name = Column(String(200), nullable=False)
    description = Column(Text)
    quantity = Column(Numeric(12, 3), nullable=False)
    unit = Column(String(30), nullable=False)
    specifications = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    rfq = relationship("RFQ", back_populates="items")
    quotation_items = relationship("QuotationItem", back_populates="rfq_item")