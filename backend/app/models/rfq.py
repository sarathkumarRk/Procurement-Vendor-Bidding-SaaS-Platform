from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class RFQ(Base):
    __tablename__ = "rfqs"

    id = Column(Integer, primary_key=True, index=True)
    rfq_number = Column(String(30), unique=True, index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(String(20), default="DRAFT", nullable=False)
    submission_deadline = Column(DateTime, nullable=False, index=True)
    required_delivery_date = Column(DateTime)
    terms_and_conditions = Column(Text)
    attachment_url = Column(String(1000))
    published_at = Column(DateTime)
    closed_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    department = relationship("Department", back_populates="rfqs")
    items = relationship("RFQItem", back_populates="rfq")
    quotations = relationship("Quotation", back_populates="rfq")