from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.vendor import Vendor
from app.schemas.vendor import (
    VendorCreate,
    VendorUpdate,
    VendorVerification,
    VendorResponse,
)
from app.dependencies import get_current_user
from app.security import hash_password

router = APIRouter(prefix="/vendors", tags=["Vendors"])


# Create Vendor - Admin Only
@router.post("/", response_model=VendorResponse, status_code=201)
def create_vendor(
    data: VendorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    existing_user = db.query(User).filter(
        User.email == data.email
    ).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    existing_gst = db.query(Vendor).filter(
        Vendor.gst_number == data.gst_number
    ).first()

    if existing_gst:
        raise HTTPException(status_code=400, detail="GST number already registered")

    user = User(
        name=data.contact_name,
        email=data.email,
        hashed_password=hash_password(data.password),
        role="VENDOR",
        is_active=True,
    )

    db.add(user)
    db.flush()

    vendor = Vendor(
        user_id=user.id,
        company_name=data.company_name,
        contact_name=data.contact_name,
        phone=data.phone,
        address=data.address,
        gst_number=data.gst_number,
        verification_status="PENDING",
        is_verified=False,
    )

    db.add(vendor)
    db.commit()
    db.refresh(vendor)

    return vendor


# List Vendors - Admin Only
@router.get("/", response_model=list[VendorResponse])
def get_vendors(
    page: int = 1,
    limit: int = 10,
    verification_status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    if page < 1 or limit < 1 or limit > 100:
        raise HTTPException(status_code=400, detail="Invalid pagination values")

    query = db.query(Vendor)

    if verification_status:
        allowed_statuses = ["PENDING", "VERIFIED", "REJECTED"]

        if verification_status not in allowed_statuses:
            raise HTTPException(status_code=400, detail="Invalid verification status")

        query = query.filter(
            Vendor.verification_status == verification_status
        )

    return (
        query.order_by(Vendor.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )


# Get Vendor Profile - Admin or Own Vendor
@router.get("/{vendor_id}", response_model=VendorResponse)
def get_vendor(
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    if current_user.role != "ADMIN" and vendor.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return vendor


# Update Vendor Profile - Admin or Own Vendor
@router.put("/{vendor_id}", response_model=VendorResponse)
def update_vendor(
    vendor_id: int,
    data: VendorUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    is_admin = current_user.role == "ADMIN"
    is_owner = vendor.user_id == current_user.id

    if not is_admin and not is_owner:
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = data.model_dump(exclude_unset=True)

    # Vendors cannot change their own verification status or GST number.
    if not is_admin:
        update_data.pop("verification_status", None)
        update_data.pop("is_verified", None)
        update_data.pop("verified_by", None)
        update_data.pop("gst_number", None)

    for key, value in update_data.items():
        if hasattr(vendor, key):
            setattr(vendor, key, value)

    db.commit()
    db.refresh(vendor)

    return vendor


# Verify or Reject Vendor - Admin Only
@router.post("/{vendor_id}/verify", response_model=VendorResponse)
def verify_vendor(
    vendor_id: int,
    data: VendorVerification,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Admin access required")

    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()

    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    if data.status not in ["VERIFIED", "REJECTED"]:
        raise HTTPException(
            status_code=400,
            detail="Status must be VERIFIED or REJECTED",
        )

    vendor.verification_status = data.status
    vendor.is_verified = data.status == "VERIFIED"
    vendor.verified_by = current_user.id

    db.commit()
    db.refresh(vendor)

    return vendor