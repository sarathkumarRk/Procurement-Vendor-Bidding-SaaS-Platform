from enum import Enum as PyEnum

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.database import Base


class UserRole(str, PyEnum):
    ADMIN = "ADMIN"
    PROCUREMENT_MANAGER = "PROCUREMENT_MANAGER"
    VENDOR = "VENDOR"
    APPROVER = "APPROVER"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)

    role = Column(
        Enum(UserRole, name="user_role"),
        default=UserRole.VENDOR,
        nullable=False,
    )

    is_active = Column(Boolean, default=True, nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    department = relationship("Department", back_populates="users")

    vendor = relationship(
        "Vendor",
        back_populates="user",
        uselist=False,
        foreign_keys="Vendor.user_id",
    )