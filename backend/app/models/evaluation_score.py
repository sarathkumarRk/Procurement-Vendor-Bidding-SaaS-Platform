from sqlalchemy import Column, Integer, String, Text, ForeignKey, Numeric, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class EvaluationScore(Base):
    __tablename__ = "evaluation_scores"

    id = Column(Integer, primary_key=True, index=True)
    quotation_id = Column(
        Integer, ForeignKey("quotations.id"), nullable=False, index=True
    )
    evaluated_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    price_score = Column(Numeric(5, 2), nullable=False)
    delivery_score = Column(Numeric(5, 2), nullable=False)
    compliance_score = Column(Numeric(5, 2), nullable=False)
    total_score = Column(Numeric(5, 2), nullable=False)
    comments = Column(Text)
    recommendation = Column(String(20), default="PENDING", nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    quotation = relationship("Quotation", back_populates="evaluation_scores")