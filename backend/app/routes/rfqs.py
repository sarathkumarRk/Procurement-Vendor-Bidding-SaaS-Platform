import logging
from datetime import datetime, timezone
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    UploadFile,
    File,
)
from sqlalchemy.orm import Session
import cloudinary.uploader

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.rfq import RFQ
from app.models.rfq_item import RFQItem
from app.models.quotation import Quotation
from app.models.vendor import Vendor
from app.models.department import Department
from app.schemas.rfq import RFQCreate, RFQUpdate, RFQResponse
from app.services.email_service import send_rfq_published_email

router = APIRouter(prefix="/rfqs", tags=["RFQs"])

logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 10 * 1024 * 1024

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".png",
    ".jpg",
    ".jpeg",
}


def get_current_utc_time():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def check_procurement_manager(current_user: User):
    if current_user.role != "PROCUREMENT_MANAGER":
        raise HTTPException(
            status_code=403,
            detail="Procurement Manager access required",
        )


def notify_verified_vendors(db: Session, rfq: RFQ):
    vendors = (
        db.query(Vendor)
        .filter(Vendor.is_verified.is_(True))
        .all()
    )

    for vendor in vendors:
        try:
            user = (
                db.query(User)
                .filter(User.id == vendor.user_id)
                .first()
            )

            if not user or not user.email:
                continue

            send_rfq_published_email(
                to_email=user.email,
                rfq_number=rfq.rfq_number,
                title=rfq.title,
                description=rfq.description or "",
                submission_deadline=str(rfq.submission_deadline),
            )

        except Exception:
            logger.exception(
                "Failed to send RFQ publication email to vendor_id=%s",
                vendor.id,
            )


# Upload RFQ Attachment - Procurement Manager Only
@router.post("/upload-attachment")
async def upload_rfq_attachment(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    check_procurement_manager(current_user)

    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Please select a file",
        )

    extension = Path(file.filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Allowed files: PDF, DOC, DOCX, PNG, JPG, JPEG",
        )

    content = await file.read()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="The selected file is empty",
        )

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail="File size must not exceed 10 MB",
        )

    try:
        file.file.seek(0)

        resource_type = (
            "image"
            if extension in {".png", ".jpg", ".jpeg"}
            else "raw"
        )

        result = cloudinary.uploader.upload(
            file.file,
            resource_type=resource_type,
            folder="procurement/rfq_attachments",
            use_filename=True,
            unique_filename=True,
        )

        return {
            "message": "RFQ attachment uploaded successfully",
            "attachment_url": result["secure_url"],
            "public_id": result["public_id"],
            "filename": file.filename,
        }

    except HTTPException:
        raise

    except Exception:
        logger.exception("RFQ attachment upload failed")

        raise HTTPException(
            status_code=500,
            detail="Failed to upload RFQ attachment",
        )

    finally:
        await file.close()


# Create RFQ - Procurement Manager Only
@router.post("/", response_model=RFQResponse, status_code=201)
def create_rfq(
    data: RFQCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_procurement_manager(current_user)

    if (
        data.submission_deadline.replace(tzinfo=None)
        <= get_current_utc_time()
    ):
        raise HTTPException(
            status_code=400,
            detail="Submission deadline must be in the future",
        )

    if (
        data.required_delivery_date
        and data.required_delivery_date.replace(tzinfo=None)
        < data.submission_deadline.replace(tzinfo=None)
    ):
        raise HTTPException(
            status_code=400,
            detail="Required delivery date cannot be before the submission deadline",
        )

    department = (
        db.query(Department)
        .filter(Department.id == data.department_id)
        .first()
    )

    if not department:
        raise HTTPException(
            status_code=404,
            detail="Department not found",
        )

    rfq = RFQ(
        rfq_number=(
            f"RFQ-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}"
        ),
        title=data.title,
        description=data.description,
        department_id=data.department_id,
        created_by=current_user.id,
        status="DRAFT",
        submission_deadline=data.submission_deadline,
        required_delivery_date=data.required_delivery_date,
        terms_and_conditions=data.terms_and_conditions,
        attachment_url=data.attachment_url,
    )

    try:
        db.add(rfq)
        db.flush()

        for item_data in data.items:
            db.add(
                RFQItem(
                    rfq_id=rfq.id,
                    item_name=item_data.item_name,
                    description=item_data.description,
                    quantity=item_data.quantity,
                    unit=item_data.unit,
                    specifications=item_data.specifications,
                )
            )

        db.commit()
        db.refresh(rfq)

        return rfq

    except Exception:
        db.rollback()
        raise


# List RFQs
@router.get("/", response_model=list[RFQResponse])
def get_rfqs(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    rfq_status: str | None = Query(None, alias="status"),
    search: str | None = Query(None, min_length=1, max_length=100),
    department_id: int | None = Query(None, ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed_statuses = [
        "DRAFT",
        "PUBLISHED",
        "CLOSED",
        "AWARDED",
        "CANCELLED",
    ]

    if rfq_status and rfq_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid RFQ status",
        )

    query = db.query(RFQ)

    if current_user.role == "VENDOR":
        vendor = (
            db.query(Vendor)
            .filter(Vendor.user_id == current_user.id)
            .first()
        )

        if not vendor or not vendor.is_verified:
            raise HTTPException(
                status_code=403,
                detail="Verified vendor access required",
            )

        query = query.filter(RFQ.status == "PUBLISHED")

    elif current_user.role == "PROCUREMENT_MANAGER":
        query = query.filter(RFQ.created_by == current_user.id)

        if rfq_status:
            query = query.filter(RFQ.status == rfq_status)

    elif current_user.role in ["ADMIN", "APPROVER"]:
        if rfq_status:
            query = query.filter(RFQ.status == rfq_status)

    else:
        raise HTTPException(
            status_code=403,
            detail="Access denied",
        )

    if search:
        query = query.filter(RFQ.title.ilike(f"%{search}%"))

    if department_id:
        query = query.filter(RFQ.department_id == department_id)

    return (
        query.order_by(RFQ.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )


# Get RFQ Details
@router.get("/{rfq_id}", response_model=RFQResponse)
def get_rfq(
    rfq_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()

    if not rfq:
        raise HTTPException(
            status_code=404,
            detail="RFQ not found",
        )

    if current_user.role == "VENDOR":
        vendor = (
            db.query(Vendor)
            .filter(Vendor.user_id == current_user.id)
            .first()
        )

        if not vendor or not vendor.is_verified:
            raise HTTPException(
                status_code=403,
                detail="Verified vendor access required",
            )

        if rfq.status != "PUBLISHED":
            raise HTTPException(
                status_code=403,
                detail="This RFQ is not available",
            )

    elif current_user.role == "PROCUREMENT_MANAGER":
        if rfq.created_by != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only access your own RFQs",
            )

    elif current_user.role not in ["ADMIN", "APPROVER"]:
        raise HTTPException(
            status_code=403,
            detail="Access denied",
        )

    return rfq


# Update Draft RFQ
@router.put("/{rfq_id}", response_model=RFQResponse)
def update_rfq(
    rfq_id: int,
    data: RFQUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_procurement_manager(current_user)

    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()

    if not rfq:
        raise HTTPException(
            status_code=404,
            detail="RFQ not found",
        )

    if rfq.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only update your own RFQs",
        )

    if rfq.status != "DRAFT":
        raise HTTPException(
            status_code=400,
            detail="Only draft RFQs can be updated",
        )

    update_data = data.model_dump(exclude_unset=True)
    items_data = update_data.pop("items", None)

    if "submission_deadline" in update_data:
        deadline = update_data["submission_deadline"]

        if deadline.replace(tzinfo=None) <= get_current_utc_time():
            raise HTTPException(
                status_code=400,
                detail="Submission deadline must be in the future",
            )

    if (
        "required_delivery_date" in update_data
        and update_data["required_delivery_date"] is not None
    ):
        delivery_date = update_data["required_delivery_date"]
        deadline = update_data.get(
            "submission_deadline",
            rfq.submission_deadline,
        )

        if (
            delivery_date.replace(tzinfo=None)
            < deadline.replace(tzinfo=None)
        ):
            raise HTTPException(
                status_code=400,
                detail="Required delivery date cannot be before the submission deadline",
            )

    if "department_id" in update_data:
        department = (
            db.query(Department)
            .filter(
                Department.id == update_data["department_id"]
            )
            .first()
        )

        if not department:
            raise HTTPException(
                status_code=404,
                detail="Department not found",
            )

    if items_data is not None and not items_data:
        raise HTTPException(
            status_code=400,
            detail="RFQ must contain at least one item",
        )

    for key, value in update_data.items():
        setattr(rfq, key, value)

    if items_data is not None:
        db.query(RFQItem).filter(
            RFQItem.rfq_id == rfq.id
        ).delete(synchronize_session=False)

        for item_data in items_data:
            db.add(
                RFQItem(
                    rfq_id=rfq.id,
                    item_name=item_data["item_name"],
                    description=item_data.get("description"),
                    quantity=item_data["quantity"],
                    unit=item_data["unit"],
                    specifications=item_data.get("specifications"),
                )
            )

    try:
        db.commit()
        db.refresh(rfq)

        return rfq

    except Exception:
        db.rollback()
        raise


# Publish RFQ
@router.patch("/{rfq_id}/publish", response_model=RFQResponse)
def publish_rfq(
    rfq_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_procurement_manager(current_user)

    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()

    if not rfq:
        raise HTTPException(
            status_code=404,
            detail="RFQ not found",
        )

    if rfq.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only publish your own RFQs",
        )

    if rfq.status != "DRAFT":
        raise HTTPException(
            status_code=400,
            detail="Only draft RFQs can be published",
        )

    if rfq.submission_deadline.replace(tzinfo=None) <= get_current_utc_time():
        raise HTTPException(
            status_code=400,
            detail="RFQ submission deadline has passed",
        )

    if not rfq.items:
        raise HTTPException(
            status_code=400,
            detail="RFQ must contain at least one item",
        )

    rfq.status = "PUBLISHED"
    rfq.published_at = get_current_utc_time()

    try:
        db.commit()
        db.refresh(rfq)

    except Exception:
        db.rollback()
        raise

    notify_verified_vendors(db, rfq)

    return rfq


# Close RFQ
@router.patch("/{rfq_id}/close", response_model=RFQResponse)
def close_rfq(
    rfq_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    check_procurement_manager(current_user)

    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()

    if not rfq:
        raise HTTPException(
            status_code=404,
            detail="RFQ not found",
        )

    if rfq.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only close your own RFQs",
        )

    if rfq.status != "PUBLISHED":
        raise HTTPException(
            status_code=400,
            detail="Only published RFQs can be closed",
        )

    rfq.status = "CLOSED"
    rfq.closed_at = get_current_utc_time()

    try:
        db.commit()
        db.refresh(rfq)

        return rfq

    except Exception:
        db.rollback()
        raise


# Get RFQ Response Count
@router.get("/{rfq_id}/response-count")
def get_rfq_response_count(
    rfq_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ["ADMIN", "PROCUREMENT_MANAGER"]:
        raise HTTPException(
            status_code=403,
            detail="Access denied",
        )

    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()

    if not rfq:
        raise HTTPException(
            status_code=404,
            detail="RFQ not found",
        )

    if (
        current_user.role == "PROCUREMENT_MANAGER"
        and rfq.created_by != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="You can only view responses for your own RFQs",
        )

    count = (
        db.query(Quotation)
        .filter(Quotation.rfq_id == rfq_id)
        .count()
    )

    return {
        "rfq_id": rfq_id,
        "response_count": count,
    }