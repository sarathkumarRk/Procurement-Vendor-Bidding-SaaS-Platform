from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.sql import func

from app.database import Base


class WebhookDeliveryLog(Base):
    __tablename__ = "webhook_delivery_logs"

    id = Column(Integer, primary_key=True, index=True)
    purchase_order_id = Column(
        Integer, ForeignKey("purchase_orders.id"), nullable=False, index=True
    )
    event_type = Column(String(100), nullable=False)
    target_url = Column(String(1000), nullable=False)
    status_code = Column(Integer)
    attempt_number = Column(Integer, default=1, nullable=False)
    delivery_status = Column(String(20), default="PENDING", nullable=False)
    response_body = Column(Text)
    error_message = Column(Text)
    attempted_at = Column(DateTime, server_default=func.now())