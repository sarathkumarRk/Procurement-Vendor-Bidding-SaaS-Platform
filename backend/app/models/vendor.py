from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class Vendor(Base):
    __tablename__ = "vendors"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    company_name = Column(String(200), nullable=False)
    contact_name = Column(String(100), nullable=False)
    phone = Column(String(30), nullable=False)
    address = Column(String(500))
    gst_number = Column(String(20), unique=True, index=True)
    verification_status = Column(String(20), default="PENDING", nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="vendor", foreign_keys=[user_id])
    quotations = relationship("Quotation", back_populates="vendor")