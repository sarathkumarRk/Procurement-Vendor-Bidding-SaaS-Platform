
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, EmailStr


class VendorCreate(BaseModel):
    company_name: str
    contact_name: str
    email: EmailStr
    password: str
    phone: str
    address: str | None = None
    gst_number: str | None = None


class VendorUpdate(BaseModel):
    company_name: str | None = None
    contact_name: str | None = None
    phone: str | None = None
    address: str | None = None
    gst_number: str | None = None


class VendorVerification(BaseModel):
    status: Literal["VERIFIED", "REJECTED"]
    comments: str | None = None


class VendorResponse(BaseModel):
    id: int
    user_id: int
    company_name: str
    contact_name: str
    phone: str
    address: str | None = None
    gst_number: str | None = None
    verification_status: str
    is_verified: bool
    verified_at: datetime | None = None

    class Config:
        from_attributes = True
