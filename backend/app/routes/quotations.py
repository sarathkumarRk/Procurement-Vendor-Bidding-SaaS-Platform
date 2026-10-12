
import logging
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
)
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.vendor import Vendor
from app.models.rfq import RFQ
from app.models.quotation import Quotation
from app.models.quotation_item import QuotationItem
from app.schemas.quotation import (
    QuotationCreate,
    QuotationUpdate,
    QuotationResponse,
)
from app.services.storage_service import (
    upload_quotation_document,
    delete_quotation_document,
)
from app.services.email_service import (
    send_quotation_submitted_email,
    send_quotation_confirmation_email,
)

router = APIRouter(prefix="/quotations", tags=["Quotations"])

logger = logging.getLogger(__name__)

MAX_DOCUMENT_SIZE = 10 * 1024 * 1024

ALLOWED_DOCUMENT_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/png",
    "image/jpeg",
}

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".png",
    ".jpg",
    ".jpeg",
}


def get_current_utc_time():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def normalize_date(value):
    """
    Convert datetime to date.
    If the value is already a date, return it unchanged.
    """
    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date):
        return value

    raise HTTPException(
        status_code=400,
        detail="Invalid date format",
    )


def get_verified_vendor(db: Session, user_id: int):
    vendor = (
        db.query(Vendor)
        .filter(Vendor.user_id == user_id)
        .first()
    )

    if not vendor or not vendor.is_verified:
        raise HTTPException(
            status_code=403,
            detail="Verified vendor account required",
        )

    return vendor


def check_deadline(rfq: RFQ):
    deadline = rfq.submission_deadline

    if deadline.replace(tzinfo=None) <= get_current_utc_time():
        raise HTTPException(
            status_code=400,
            detail="RFQ submission deadline has passed",
        )


def calculate_quotation_items(rfq: RFQ, items_data):
    rfq_items = {item.id: item for item in rfq.items}
    submitted_ids = [item.rfq_item_id for item in items_data]

    if len(submitted_ids) != len(set(submitted_ids)):
        raise HTTPException(
            status_code=400,
            detail="Duplicate RFQ items are not allowed",
        )

    if set(submitted_ids) != set(rfq_items.keys()):
        raise HTTPException(
            status_code=400,
            detail="Quotation must include every RFQ item exactly once",
        )

    subtotal = Decimal("0")
    total_tax = Decimal("0")
    quotation_items = []

    for item_data in items_data:
        rfq_item_id = item_data.rfq_item_id
        quantity = item_data.quantity
        unit_price = item_data.unit_price
        tax_rate = item_data.tax_rate
        delivery_days = item_data.delivery_days
        compliance_status = item_data.compliance_status

        rfq_item = rfq_items.get(rfq_item_id)

        if not rfq_item:
            raise HTTPException(
                status_code=400,
                detail="Invalid RFQ item",
            )

        if quantity != rfq_item.quantity:
            raise HTTPException(
                status_code=400,
                detail="Quotation quantity must match the RFQ quantity",
            )

        if unit_price < 0:
            raise HTTPException(
                status_code=400,
                detail="Unit price cannot be negative",
            )

        if tax_rate < 0 or tax_rate > 100:
            raise HTTPException(
                status_code=400,
                detail="Tax rate must be between 0 and 100",
            )

        line_subtotal = quantity * unit_price

        tax_amount = (
            line_subtotal * tax_rate / Decimal("100")
        ).quantize(Decimal("0.01"))

        line_total = line_subtotal + tax_amount

        subtotal += line_subtotal
        total_tax += tax_amount

        quotation_items.append(
            QuotationItem(
                rfq_item_id=rfq_item_id,
                quantity=quantity,
                unit_price=unit_price,
                tax_rate=tax_rate,
                tax_amount=tax_amount,
                line_total=line_total,
                delivery_days=delivery_days,
                compliance_status=compliance_status,
            )
        )

    return subtotal, total_tax, quotation_items


def notify_procurement_manager(
    db: Session,
    rfq: RFQ,
    quotation: Quotation,
):
    manager = (
        db.query(User)
        .filter(User.id == rfq.created_by)
        .first()
    )

    if not manager or not manager.email:
        logger.warning(
            "RFQ owner email not found for quotation_id=%s",
            quotation.id,
        )
        return False

    try:
        result = send_quotation_submitted_email(
            to_email=manager.email,
            quotation_number=quotation.quotation_number,
            rfq_number=rfq.rfq_number,
            rfq_title=rfq.title,
            total_amount=str(quotation.total_amount),
        )

        if not result:
            logger.warning(
                "Quotation notification email failed for quotation_id=%s",
                quotation.id,
            )

        return result

    except Exception:
        logger.exception(
            "Quotation notification failed for quotation_id=%s",
            quotation.id,
        )
        return False


def notify_vendor_quotation_submitted(
    email: str,
    rfq_number: str,
):
    try:
        result = send_quotation_confirmation_email(
            to_email=email,
            rfq_number=rfq_number,
        )

        if not result:
            logger.warning(
                "Quotation confirmation email failed for RFQ %s",
                rfq_number,
            )

        return result

    except Exception:
        logger.exception(
            "Quotation confirmation email failed for RFQ %s",
            rfq_number,
        )
        return False


def check_quotation_access(
    db: Session,
    quotation: Quotation,
    current_user: User,
):
    if current_user.role == "VENDOR":
        vendor = get_verified_vendor(db, current_user.id)

        if quotation.vendor_id != vendor.id:
            raise HTTPException(
                status_code=403,
                detail="Access denied",
            )

    elif current_user.role == "PROCUREMENT_MANAGER":
        rfq = (
            db.query(RFQ)
            .filter(RFQ.id == quotation.rfq_id)
            .first()
        )

        if not rfq or rfq.created_by != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="Access denied",
            )

    elif current_user.role not in ["ADMIN", "APPROVER"]:
        raise HTTPException(
            status_code=403,
            detail="Access denied",
        )


# Submit Quotation - Vendor Only
@router.post(
    "/rfqs/{rfq_id}",
    response_model=QuotationResponse,
    status_code=201,
)
def submit_quotation(
    rfq_id: int,
    data: QuotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "VENDOR":
        raise HTTPException(
            status_code=403,
            detail="Vendor access required",
        )

    vendor = get_verified_vendor(db, current_user.id)

    rfq = (
        db.query(RFQ)
        .filter(RFQ.id == rfq_id)
        .first()
    )

    if not rfq:
        raise HTTPException(
            status_code=404,
            detail="RFQ not found",
        )

    if rfq.status != "PUBLISHED":
        raise HTTPException(
            status_code=400,
            detail="RFQ is not open for bidding",
        )

    check_deadline(rfq)

    if not rfq.items:
        raise HTTPException(
            status_code=400,
            detail="RFQ has no items",
        )

    # FIX: Compare date with date, not datetime with date.
    validity_date = normalize_date(data.validity_date)

    if validity_date <= get_current_utc_time().date():
        raise HTTPException(
            status_code=400,
            detail="Quotation validity date must be in the future",
        )

    existing = (
        db.query(Quotation)
        .filter(
            Quotation.rfq_id == rfq_id,
            Quotation.vendor_id == vendor.id,
        )
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="You have already submitted a quotation for this RFQ",
        )

    subtotal, total_tax, quotation_items = calculate_quotation_items(
        rfq,
        data.items,
    )

    quotation = Quotation(
        quotation_number=(
            f"QUO-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}"
        ),
        rfq_id=rfq_id,
        vendor_id=vendor.id,
        validity_date=validity_date,
        delivery_days=data.delivery_days,
        subtotal=subtotal,
        total_tax=total_tax,
        total_amount=subtotal + total_tax,
        comments=data.comments,
        status="SUBMITTED",
        items=quotation_items,
    )

    try:
        db.add(quotation)
        db.commit()
        db.refresh(quotation)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Quotation could not be submitted because a conflicting record exists",
        )

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Database error submitting quotation")
        raise HTTPException(
            status_code=500,
            detail="Database error while submitting quotation",
        )

    notify_procurement_manager(db, rfq, quotation)

    notify_vendor_quotation_submitted(
        current_user.email,
        rfq.rfq_number,
    )

    return quotation


# Upload Quotation Document - Vendor Only
@router.post("/{quotation_id}/documents")
def upload_quotation_document_route(
    quotation_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "VENDOR":
        raise HTTPException(
            status_code=403,
            detail="Vendor access required",
        )

    vendor = get_verified_vendor(db, current_user.id)

    quotation = (
        db.query(Quotation)
        .filter(
            Quotation.id == quotation_id,
            Quotation.vendor_id == vendor.id,
        )
        .first()
    )

    if not quotation:
        raise HTTPException(
            status_code=404,
            detail="Quotation not found",
        )

    rfq = (
        db.query(RFQ)
        .filter(RFQ.id == quotation.rfq_id)
        .first()
    )

    if not rfq:
        raise HTTPException(
            status_code=404,
            detail="RFQ not found",
        )

    if rfq.status != "PUBLISHED":
        raise HTTPException(
            status_code=400,
            detail="Documents can only be uploaded while the RFQ is published",
        )

    check_deadline(rfq)

    if quotation.status != "SUBMITTED":
        raise HTTPException(
            status_code=400,
            detail="Only submitted quotations can have documents uploaded",
        )

    extension = Path(file.filename or "").suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Unsupported document file extension",
        )

    if file.content_type not in ALLOWED_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported document content type",
        )

    try:
        contents = file.file.read()

        if not contents:
            raise HTTPException(
                status_code=400,
                detail="Uploaded document is empty",
            )

        if len(contents) > MAX_DOCUMENT_SIZE:
            raise HTTPException(
                status_code=413,
                detail="Document size must not exceed 10 MB",
            )

        file.file.seek(0)

        uploaded = upload_quotation_document(file)

        quotation.document_url = uploaded["document_url"]
        quotation.document_public_id = uploaded["public_id"]

        db.commit()
        db.refresh(quotation)

        return {
            "message": "Quotation document uploaded successfully",
            "quotation_id": quotation.id,
            "document_url": quotation.document_url,
        }

    except HTTPException:
        db.rollback()
        raise

    except ValueError as exc:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except RuntimeError as exc:
        db.rollback()
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    except SQLAlchemyError as exc:
        db.rollback()
        logger.exception(
            "Database error while saving quotation document, quotation_id=%s",
            quotation_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Could not save quotation document information",
        ) from exc

    except Exception as exc:
        db.rollback()
        logger.exception(
            "Document upload failed for quotation_id=%s",
            quotation_id,
        )
        raise HTTPException(
            status_code=502,
            detail="Document upload failed",
        ) from exc

    finally:
        file.file.close()

# Get All Submitted Quotations - Procurement Manager Only
@router.get(
    "/",
    response_model=list[QuotationResponse],
)
def get_all_quotations(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [
        "ADMIN",
        "PROCUREMENT_MANAGER",
        "APPROVER",
    ]:
        raise HTTPException(
            status_code=403,
            detail="Access denied",
        )

    query = db.query(Quotation)

    if current_user.role == "PROCUREMENT_MANAGER":
        query = query.join(
            RFQ,
            Quotation.rfq_id == RFQ.id,
        ).filter(
            RFQ.created_by == current_user.id
        )

    return (
        query.order_by(Quotation.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )



# Get Quotations for an RFQ
@router.get(
    "/rfqs/{rfq_id}",
    response_model=list[QuotationResponse],
)
def get_quotations(
    rfq_id: int,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rfq = (
        db.query(RFQ)
        .filter(RFQ.id == rfq_id)
        .first()
    )

    if not rfq:
        raise HTTPException(
            status_code=404,
            detail="RFQ not found",
        )

    query = db.query(Quotation).filter(
        Quotation.rfq_id == rfq_id
    )

    if current_user.role == "VENDOR":
        vendor = get_verified_vendor(db, current_user.id)

        if rfq.status != "PUBLISHED":
            raise HTTPException(
                status_code=403,
                detail="Quotation access is not available for this RFQ",
            )

        query = query.filter(
            Quotation.vendor_id == vendor.id
        )

    elif current_user.role == "PROCUREMENT_MANAGER":
        if rfq.created_by != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only view quotations for your own RFQs",
            )

    elif current_user.role not in ["ADMIN", "APPROVER"]:
        raise HTTPException(
            status_code=403,
            detail="Access denied",
        )

    return (
        query.order_by(Quotation.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )


# Get Single Quotation
@router.get(
    "/{quotation_id}",
    response_model=QuotationResponse,
)
def get_quotation(
    quotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    quotation = (
        db.query(Quotation)
        .filter(Quotation.id == quotation_id)
        .first()
    )

    if not quotation:
        raise HTTPException(
            status_code=404,
            detail="Quotation not found",
        )

    check_quotation_access(db, quotation, current_user)

    return quotation


# Update Quotation - Vendor Only
@router.patch(
    "/{quotation_id}",
    response_model=QuotationResponse,
)
def update_quotation(
    quotation_id: int,
    data: QuotationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "VENDOR":
        raise HTTPException(
            status_code=403,
            detail="Vendor access required",
        )

    vendor = get_verified_vendor(db, current_user.id)

    quotation = (
        db.query(Quotation)
        .filter(
            Quotation.id == quotation_id,
            Quotation.vendor_id == vendor.id,
        )
        .first()
    )

    if not quotation:
        raise HTTPException(
            status_code=404,
            detail="Quotation not found",
        )

    rfq = (
        db.query(RFQ)
        .filter(RFQ.id == quotation.rfq_id)
        .first()
    )

    if not rfq:
        raise HTTPException(
            status_code=404,
            detail="RFQ not found",
        )

    if rfq.status != "PUBLISHED":
        raise HTTPException(
            status_code=400,
            detail="RFQ is not open for bidding",
        )

    check_deadline(rfq)

    if quotation.status != "SUBMITTED":
        raise HTTPException(
            status_code=400,
            detail="Only submitted quotations can be modified",
        )

    update_data = data.model_dump(exclude_unset=True)
    items_data = update_data.pop("items", None)

    # FIX: Normalize date before comparing.
    if "validity_date" in update_data:
        validity_date = normalize_date(update_data["validity_date"])

        if validity_date <= get_current_utc_time().date():
            raise HTTPException(
                status_code=400,
                detail="Quotation validity date must be in the future",
            )

        update_data["validity_date"] = validity_date

    if items_data is not None and not items_data:
        raise HTTPException(
            status_code=400,
            detail="Quotation must contain every RFQ item",
        )

    try:
        for key, value in update_data.items():
            setattr(quotation, key, value)

        if items_data is not None:
            subtotal, total_tax, new_items = calculate_quotation_items(
                rfq,
                items_data,
            )

            db.query(QuotationItem).filter(
                QuotationItem.quotation_id == quotation.id
            ).delete(synchronize_session=False)

            for item in new_items:
                item.quotation_id = quotation.id
                db.add(item)

            quotation.subtotal = subtotal
            quotation.total_tax = total_tax
            quotation.total_amount = subtotal + total_tax

        db.commit()
        db.refresh(quotation)

        return quotation

    except HTTPException:
        db.rollback()
        raise

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Quotation update conflicts with an existing record",
        )

    except SQLAlchemyError:
        db.rollback()
        logger.exception(
            "Database error updating quotation_id=%s",
            quotation_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Database error while updating quotation",
        )
