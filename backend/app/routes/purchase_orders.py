import hashlib
import hmac
import json
import logging
import uuid

from datetime import datetime, timezone
from decimal import Decimal

import httpx

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user

from app.models.user import User
from app.models.vendor import Vendor
from app.models.quotation import Quotation
from app.models.purchase_order import PurchaseOrder
from app.models.purchase_order_item import PurchaseOrderItem
from app.models.approval_history import ApprovalHistory
from app.models.evaluation_score import EvaluationScore
from app.models.audit_log import AuditLog
from app.models.webhook_delivery_log import WebhookDeliveryLog

from app.schemas.purchase_order import (
    PurchaseOrderCreate,
    PurchaseOrderStatusUpdate,
    PurchaseOrderResponse,
)

from app.services.email_service import send_purchase_order_email


router = APIRouter(
    prefix="/purchase-orders",
    tags=["Purchase Orders"],
)

logger = logging.getLogger(__name__)


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def write_audit_log(
    db: Session,
    user_id: int,
    action: str,
    purchase_order: PurchaseOrder,
    details: str,
):
    values = {
        "user_id": user_id,
        "action": action,
        "entity_type": "PURCHASE_ORDER",
        "entity": "PURCHASE_ORDER",
        "entity_id": purchase_order.id,
        "resource": "PURCHASE_ORDER",
        "resource_id": purchase_order.id,
        "details": details,
        "description": details,
        "created_at": utc_now(),
        "timestamp": utc_now(),
    }

    columns = AuditLog.__table__.columns.keys()
    record_data = {
        key: value
        for key, value in values.items()
        if key in columns
    }

    db.add(AuditLog(**record_data))


def write_webhook_log(
    db: Session,
    event_id: str,
    event_type: str,
    target_url: str,
    status: str,
    response_code=None,
    error_message=None,
    attempts: int = 1,
):
    values = {
        "event_id": event_id,
        "event_type": event_type,
        "target_url": target_url,
        "url": target_url,
        "status": status,
        "response_code": response_code,
        "status_code": response_code,
        "attempt_count": attempts,
        "attempts": attempts,
        "error_message": error_message,
        "error": error_message,
        "created_at": utc_now(),
        "attempted_at": utc_now(),
        "delivered_at": (
            utc_now() if status == "DELIVERED" else None
        ),
    }

    columns = WebhookDeliveryLog.__table__.columns.keys()
    record_data = {
        key: value
        for key, value in values.items()
        if key in columns
    }

    db.add(WebhookDeliveryLog(**record_data))


def notify_vendor_by_email(
    db: Session,
    purchase_order: PurchaseOrder,
    status: str,
):
    vendor = (
        db.query(Vendor)
        .filter(Vendor.id == purchase_order.vendor_id)
        .first()
    )

    if not vendor:
        logger.warning(
            "Vendor not found for PO %s",
            purchase_order.po_number,
        )
        return False

    vendor_user = getattr(vendor, "user", None)
    email = getattr(vendor_user, "email", None) if vendor_user else None

    if not email:
        logger.warning(
            "Vendor email not found for PO %s",
            purchase_order.po_number,
        )
        return False

    try:
        result = send_purchase_order_email(
            to_email=email,
            po_number=purchase_order.po_number,
            status=status,
        )

        if result is False:
            logger.error(
                "Email delivery failed for PO %s",
                purchase_order.po_number,
            )
            return False

        return True

    except Exception:
        logger.exception(
            "Email notification failed for PO %s",
            purchase_order.po_number,
        )
        return False


def send_po_webhook(
    db: Session,
    purchase_order: PurchaseOrder,
    old_status: str,
    new_status: str,
):
    target_url = getattr(settings, "WEBHOOK_URL", None)
    secret = getattr(settings, "WEBHOOK_SECRET", None)

    event_type = "purchase_order.status_changed"
    event_id = str(uuid.uuid4())

    if not target_url:
        logger.info(
            "Webhook skipped: WEBHOOK_URL is not configured"
        )
        return False

    if not secret:
        logger.warning(
            "Webhook skipped: WEBHOOK_SECRET is not configured"
        )
        return False

    payload = {
        "event_id": event_id,
        "event_type": event_type,
        "occurred_at": utc_now().isoformat(),
        "data": {
            "purchase_order_id": purchase_order.id,
            "po_number": purchase_order.po_number,
            "quotation_id": purchase_order.quotation_id,
            "vendor_id": purchase_order.vendor_id,
            "old_status": old_status,
            "new_status": new_status,
            "total_amount": str(purchase_order.total_amount),
        },
    }

    body = json.dumps(
        payload,
        separators=(",", ":"),
        default=str,
    )

    signature = hmac.new(
        secret.encode("utf-8"),
        body.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    response_code = None
    error_message = None
    delivery_status = "FAILED"
    max_attempts = 3
    attempt = 0

    for attempt in range(1, max_attempts + 1):
        try:
            response = httpx.post(
                target_url,
                content=body,
                headers={
                    "Content-Type": "application/json",
                    "X-Webhook-Signature": signature,
                    "X-Webhook-Event": event_type,
                    "X-Webhook-Event-ID": event_id,
                },
                timeout=10.0,
            )

            response_code = response.status_code

            if 200 <= response.status_code < 300:
                delivery_status = "DELIVERED"
                error_message = None
                break

            error_message = (
                f"Webhook returned HTTP {response.status_code}"
            )

        except httpx.HTTPError as exc:
            error_message = str(exc)

        except Exception as exc:
            error_message = str(exc)
            logger.exception("Unexpected webhook error")

    try:
        write_webhook_log(
            db=db,
            event_id=event_id,
            event_type=event_type,
            target_url=target_url,
            status=delivery_status,
            response_code=response_code,
            error_message=error_message,
            attempts=attempt,
        )
        db.commit()

    except Exception:
        db.rollback()
        logger.exception("Could not save webhook delivery log")

    if delivery_status == "FAILED":
        logger.error(
            "Webhook failed for PO %s",
            purchase_order.po_number,
        )

    return delivery_status == "DELIVERED"



def record_status_change(
    db: Session,
    current_user: User,
    purchase_order: PurchaseOrder,
    old_status: str,
    new_status: str,
):
    db.add(
        ApprovalHistory(
            purchase_order_id=purchase_order.id,
            approver_id=current_user.id,
            action="STATUS_CHANGED",
            comments=f"Status changed from {old_status} to {new_status}",
        )
    )

    write_audit_log(
        db=db,
        user_id=current_user.id,
        action=f"PO_STATUS_CHANGED_{new_status}",
        purchase_order=purchase_order,
        details=(
            f"PO {purchase_order.po_number}: "
            f"{old_status} -> {new_status}"
        ),
    )



def run_post_commit_notifications(
    db: Session,
    purchase_order: PurchaseOrder,
    old_status: str,
    new_status: str,
):
    try:
        notify_vendor_by_email(
            db=db,
            purchase_order=purchase_order,
            status=new_status,
        )
    except Exception:
        logger.exception("Could not process PO email notification")

    try:
        send_po_webhook(
            db=db,
            purchase_order=purchase_order,
            old_status=old_status,
            new_status=new_status,
        )
    except Exception:
        logger.exception("Could not process PO webhook")


@router.post(
    "/",
    response_model=PurchaseOrderResponse,
    status_code=201,
)
def create_purchase_order(
    data: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "PROCUREMENT_MANAGER":
        raise HTTPException(
            status_code=403,
            detail="Procurement Manager access required",
        )

    try:
        quotation = (
            db.query(Quotation)
            .filter(Quotation.id == data.quotation_id)
            .first()
        )

        if not quotation:
            raise HTTPException(
                status_code=404,
                detail="Quotation not found",
            )

        evaluation = (
            db.query(EvaluationScore)
            .filter(
                EvaluationScore.quotation_id == quotation.id,
                EvaluationScore.recommendation == "RECOMMENDED",
                EvaluationScore.evaluated_by == current_user.id,
            )
            .first()
        )

        if not evaluation:
            raise HTTPException(
                status_code=400,
                detail="You must recommend this quotation before creating a PO",
            )

        existing_po = (
            db.query(PurchaseOrder)
            .filter(PurchaseOrder.quotation_id == quotation.id)
            .first()
        )

        if existing_po:
            raise HTTPException(
                status_code=409,
                detail="A purchase order already exists for this quotation",
            )

        quotation_items = list(quotation.items)

        if not quotation_items:
            raise HTTPException(
                status_code=400,
                detail="Quotation has no items",
            )

        if (
            quotation.total_amount is None
            or quotation.total_amount < Decimal("0")
        ):
            raise HTTPException(
                status_code=400,
                detail="Quotation total amount is invalid",
            )

        purchase_order = PurchaseOrder(
            po_number=f"PO-{uuid.uuid4().hex[:16].upper()}",
            quotation_id=quotation.id,
            vendor_id=quotation.vendor_id,
            created_by=current_user.id,
            total_amount=quotation.total_amount,
            status="PENDING_APPROVAL",
        )

        db.add(purchase_order)
        db.flush()

        for item in quotation_items:
            if not item.rfq_item:
                raise HTTPException(
                    status_code=400,
                    detail="A quotation item is missing its RFQ item",
                )

            db.add(
                PurchaseOrderItem(
                    purchase_order_id=purchase_order.id,
                    item_name=item.rfq_item.item_name,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    tax_amount=item.tax_amount,
                    line_total=item.line_total,
                )
            )

        db.add(
            ApprovalHistory(
                purchase_order_id=purchase_order.id,
                approver_id=current_user.id,
                action="CREATED",
                comments="Purchase order submitted for approval",
            )
        )

        write_audit_log(
            db=db,
            user_id=current_user.id,
            action="PO_CREATED",
            purchase_order=purchase_order,
            details=f"PO created from quotation {quotation.id}",
        )

        db.commit()
        db.refresh(purchase_order)

        return purchase_order

    except HTTPException:
        db.rollback()
        raise

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Could not create PO; a duplicate record may exist",
        )

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Database error creating purchase order")
        raise HTTPException(
            status_code=500,
            detail="Database error while creating purchase order",
        )


@router.get(
    "/",
    response_model=list[PurchaseOrderResponse],
)
def get_purchase_orders(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    po_status: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    allowed_roles = [
        "ADMIN",
        "PROCUREMENT_MANAGER",
        "APPROVER",
        "VENDOR",
    ]

    if current_user.role not in allowed_roles:
        raise HTTPException(status_code=403, detail="Access denied")

    query = db.query(PurchaseOrder)

    if current_user.role == "VENDOR":
        vendor = (
            db.query(Vendor)
            .filter(Vendor.user_id == current_user.id)
            .first()
        )

        if not vendor:
            raise HTTPException(
                status_code=403,
                detail="Vendor profile not found",
            )

        query = query.filter(
            PurchaseOrder.vendor_id == vendor.id,
            PurchaseOrder.status.in_(["SENT_TO_VENDOR", "FULFILLED"]),
        )

    if po_status:
        allowed_statuses = [
            "DRAFT",
            "PENDING_APPROVAL",
            "APPROVED",
            "SENT_TO_VENDOR",
            "FULFILLED",
            "CANCELLED",
        ]

        if po_status not in allowed_statuses:
            raise HTTPException(
                status_code=400,
                detail="Invalid purchase order status",
            )

        query = query.filter(PurchaseOrder.status == po_status)

    return (
        query.order_by(PurchaseOrder.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )


@router.get(
    "/{po_id}",
    response_model=PurchaseOrderResponse,
)
def get_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    purchase_order = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.id == po_id)
        .first()
    )

    if not purchase_order:
        raise HTTPException(
            status_code=404,
            detail="Purchase order not found",
        )

    if current_user.role == "VENDOR":
        vendor = (
            db.query(Vendor)
            .filter(Vendor.user_id == current_user.id)
            .first()
        )

        if not vendor or purchase_order.vendor_id != vendor.id:
            raise HTTPException(status_code=403, detail="Access denied")

        if purchase_order.status not in ["SENT_TO_VENDOR", "FULFILLED"]:
            raise HTTPException(
                status_code=403,
                detail="Purchase order is not available to the vendor yet",
            )

    elif current_user.role not in [
        "ADMIN",
        "PROCUREMENT_MANAGER",
        "APPROVER",
    ]:
        raise HTTPException(status_code=403, detail="Access denied")

    return purchase_order


@router.post(
    "/{po_id}/approve",
    response_model=PurchaseOrderResponse,
)
def approve_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "APPROVER":
        raise HTTPException(
            status_code=403,
            detail="Approver access required",
        )

    try:
        purchase_order = (
            db.query(PurchaseOrder)
            .filter(PurchaseOrder.id == po_id)
            .with_for_update()
            .first()
        )

        if not purchase_order:
            raise HTTPException(
                status_code=404,
                detail="Purchase order not found",
            )

        if purchase_order.status != "PENDING_APPROVAL":
            raise HTTPException(
                status_code=400,
                detail="Purchase order is not pending approval",
            )

        recommendation = (
            db.query(EvaluationScore)
            .filter(
                EvaluationScore.quotation_id == purchase_order.quotation_id,
                EvaluationScore.recommendation == "RECOMMENDED",
            )
            .first()
        )

        if not recommendation:
            raise HTTPException(
                status_code=400,
                detail="Purchase recommendation not found",
            )

        if recommendation.evaluated_by == current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You cannot approve your own recommendation",
            )

        old_status = purchase_order.status

        purchase_order.status = "APPROVED"
        purchase_order.approved_by = current_user.id
        purchase_order.approved_at = utc_now()

        db.add(
            ApprovalHistory(
                purchase_order_id=purchase_order.id,
                approver_id=current_user.id,
                action="APPROVED",
                comments="Purchase order approved",
            )
        )

        write_audit_log(
            db=db,
            user_id=current_user.id,
            action="PO_APPROVED",
            purchase_order=purchase_order,
            details=f"PO approved: {purchase_order.po_number}",
        )

        db.commit()
        db.refresh(purchase_order)

    except HTTPException:
        db.rollback()
        raise

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Database error approving PO")
        raise HTTPException(
            status_code=500,
            detail="Database error while approving purchase order",
        )

    run_post_commit_notifications(
        db,
        purchase_order,
        old_status,
        purchase_order.status,
    )

    return purchase_order


@router.patch(
    "/{po_id}/status",
    response_model=PurchaseOrderResponse,
)
def update_purchase_order_status(
    po_id: int,
    data: PurchaseOrderStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [
        "ADMIN",
        "PROCUREMENT_MANAGER",
        "APPROVER",
    ]:
        raise HTTPException(status_code=403, detail="Access denied")

    if data.status not in [
        "SENT_TO_VENDOR",
        "FULFILLED",
        "CANCELLED",
    ]:
        raise HTTPException(
            status_code=400,
            detail="Invalid purchase order status",
        )

    try:
        purchase_order = (
            db.query(PurchaseOrder)
            .filter(PurchaseOrder.id == po_id)
            .with_for_update()
            .first()
        )

        if not purchase_order:
            raise HTTPException(
                status_code=404,
                detail="Purchase order not found",
            )

        old_status = purchase_order.status
        new_status = data.status

        if new_status == "SENT_TO_VENDOR":
            if current_user.role != "PROCUREMENT_MANAGER":
                raise HTTPException(
                    status_code=403,
                    detail="Procurement Manager access required to issue a PO",
                )

            if old_status != "APPROVED":
                raise HTTPException(
                    status_code=400,
                    detail="Only approved purchase orders can be issued",
                )

            purchase_order.issued_at = utc_now()

        elif new_status == "FULFILLED":
            if current_user.role not in [
                "PROCUREMENT_MANAGER",
                "ADMIN",
            ]:
                raise HTTPException(
                    status_code=403,
                    detail="Only Admin or Procurement Manager can fulfil a PO",
                )

            if old_status != "SENT_TO_VENDOR":
                raise HTTPException(
                    status_code=400,
                    detail="Only issued purchase orders can be fulfilled",
                )

        elif new_status == "CANCELLED":
            if current_user.role not in [
                "PROCUREMENT_MANAGER",
                "ADMIN",
            ]:
                raise HTTPException(
                    status_code=403,
                    detail="Only Admin or Procurement Manager can cancel a PO",
                )

            if old_status in ["FULFILLED", "CANCELLED"]:
                raise HTTPException(
                    status_code=400,
                    detail="This purchase order cannot be cancelled",
                )

        purchase_order.status = new_status

        record_status_change(
            db=db,
            current_user=current_user,
            purchase_order=purchase_order,
            old_status=old_status,
            new_status=new_status,
        )

        db.commit()
        db.refresh(purchase_order)

    except HTTPException:
        db.rollback()
        raise

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Purchase order status update conflicted with another record",
        )

    except SQLAlchemyError:
        db.rollback()
        logger.exception("Database error updating PO status")
        raise HTTPException(
            status_code=500,
            detail="Database error while updating purchase order",
        )

    run_post_commit_notifications(
        db=db,
        purchase_order=purchase_order,
        old_status=old_status,
        new_status=new_status,
    )

    return purchase_order



@router.post(
    "/{po_id}/confirm-receipt",
    response_model=PurchaseOrderResponse,
)
def confirm_purchase_order_receipt(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Only the vendor can confirm receipt.
    if current_user.role != "VENDOR":
        raise HTTPException(
            status_code=403,
            detail="Vendor access required",
        )

    try:
        # Find the logged-in user's vendor profile.
        vendor = (
            db.query(Vendor)
            .filter(Vendor.user_id == current_user.id)
            .first()
        )

        if not vendor:
            raise HTTPException(
                status_code=403,
                detail="Vendor profile not found",
            )

        # Lock the purchase order while processing confirmation.
        purchase_order = (
            db.query(PurchaseOrder)
            .filter(PurchaseOrder.id == po_id)
            .with_for_update()
            .first()
        )

        if not purchase_order:
            raise HTTPException(
                status_code=404,
                detail="Purchase order not found",
            )

        # Ensure the vendor owns this purchase order.
        if purchase_order.vendor_id != vendor.id:
            raise HTTPException(
                status_code=403,
                detail="You cannot confirm another vendor's purchase order",
            )

        # Receipt can only be confirmed for an issued PO.
        if purchase_order.status != "SENT_TO_VENDOR":
            raise HTTPException(
                status_code=400,
                detail="Only purchase orders issued to the vendor can be confirmed",
            )

        # Prevent duplicate receipt confirmation.
        if purchase_order.receipt_confirmed_at is not None:
            raise HTTPException(
                status_code=409,
                detail="Receipt has already been confirmed",
            )

        # Save the receipt confirmation.
        purchase_order.receipt_confirmed_at = utc_now()
        purchase_order.receipt_confirmed_by = current_user.id

        # Keep the receipt event in approval history.
        db.add(
            ApprovalHistory(
                purchase_order_id=purchase_order.id,
                approver_id=current_user.id,
                action="RECEIPT_CONFIRMED",
                comments="Vendor confirmed receipt of purchase order",
            )
        )

        write_audit_log(
            db=db,
            user_id=current_user.id,
            action="PO_RECEIPT_CONFIRMED",
            purchase_order=purchase_order,
            details=(
                f"Vendor confirmed receipt of "
                f"PO {purchase_order.po_number}"
            ),
        )

        db.commit()
        db.refresh(purchase_order)

        return purchase_order

    except HTTPException:
        db.rollback()
        raise

    except SQLAlchemyError:
        db.rollback()
        logger.exception(
            "Database error confirming receipt for PO %s",
            po_id,
        )
        raise HTTPException(
            status_code=500,
            detail="Database error while confirming purchase order receipt",
        )
