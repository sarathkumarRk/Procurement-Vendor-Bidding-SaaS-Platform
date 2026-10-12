from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user

from app.models.user import User
from app.models.vendor import Vendor
from app.models.rfq import RFQ
from app.models.quotation import Quotation
from app.models.purchase_order import PurchaseOrder


router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"],
)


@router.get("/summary")
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    role = current_user.role

    if role not in [
        "ADMIN",
        "PROCUREMENT_MANAGER",
        "APPROVER",
        "VENDOR",
    ]:
        raise HTTPException(
            status_code=403,
            detail="Access denied",
        )

    if role == "VENDOR":
        vendor = (
            db.query(Vendor)
            .filter(Vendor.user_id == current_user.id)
            .first()
        )

        if not vendor:
            raise HTTPException(
                status_code=404,
                detail="Vendor profile not found",
            )

        total_quotations = (
            db.query(Quotation)
            .filter(Quotation.vendor_id == vendor.id)
            .count()
        )

        pending_quotations = (
            db.query(Quotation)
            .filter(
                Quotation.vendor_id == vendor.id,
                Quotation.status == "PENDING",
            )
            .count()
        )

        total_purchase_orders = (
            db.query(PurchaseOrder)
            .filter(PurchaseOrder.vendor_id == vendor.id)
            .count()
        )

        active_purchase_orders = (
            db.query(PurchaseOrder)
            .filter(
                PurchaseOrder.vendor_id == vendor.id,
                PurchaseOrder.status.in_([
                    "APPROVED",
                    "SENT_TO_VENDOR",
                ]),
            )
            .count()
        )

        recent_purchase_orders = (
            db.query(PurchaseOrder)
            .filter(PurchaseOrder.vendor_id == vendor.id)
            .order_by(PurchaseOrder.id.desc())
            .limit(5)
            .all()
        )

        return {
            "role": role,
            "total_quotations": total_quotations,
            "pending_quotations": pending_quotations,
            "total_purchase_orders": total_purchase_orders,
            "active_purchase_orders": active_purchase_orders,
            "recent_purchase_orders": [
                {
                    "id": po.id,
                    "po_number": po.po_number,
                    "status": po.status,
                    "total_amount": str(po.total_amount),
                }
                for po in recent_purchase_orders
            ],
        }

    total_users = db.query(User).count()
    total_vendors = db.query(Vendor).count()
    total_rfqs = db.query(RFQ).count()
    total_quotations = db.query(Quotation).count()
    total_purchase_orders = db.query(PurchaseOrder).count()

    published_rfqs = (
        db.query(RFQ)
        .filter(RFQ.status == "PUBLISHED")
        .count()
    )

    closed_rfqs = (
        db.query(RFQ)
        .filter(RFQ.status == "CLOSED")
        .count()
    )

    pending_purchase_orders = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.status == "PENDING_APPROVAL")
        .count()
    )

    approved_purchase_orders = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.status == "APPROVED")
        .count()
    )

    fulfilled_purchase_orders = (
        db.query(PurchaseOrder)
        .filter(PurchaseOrder.status == "FULFILLED")
        .count()
    )

    recent_rfqs = (
        db.query(RFQ)
        .order_by(RFQ.id.desc())
        .limit(5)
        .all()
    )

    recent_purchase_orders = (
        db.query(PurchaseOrder)
        .order_by(PurchaseOrder.id.desc())
        .limit(5)
        .all()
    )

    summary = {
        "role": role,
        "total_rfqs": total_rfqs,
        "published_rfqs": published_rfqs,
        "closed_rfqs": closed_rfqs,
        "total_quotations": total_quotations,
        "total_purchase_orders": total_purchase_orders,
        "pending_purchase_orders": pending_purchase_orders,
        "approved_purchase_orders": approved_purchase_orders,
        "fulfilled_purchase_orders": fulfilled_purchase_orders,
        "recent_rfqs": [
            {
                "id": rfq.id,
                "title": getattr(rfq, "title", None),
                "status": rfq.status,
            }
            for rfq in recent_rfqs
        ],
        "recent_purchase_orders": [
            {
                "id": po.id,
                "po_number": po.po_number,
                "status": po.status,
                "total_amount": str(po.total_amount),
            }
            for po in recent_purchase_orders
        ],
    }

    if role == "ADMIN":
        summary["total_users"] = total_users
        summary["total_vendors"] = total_vendors

    return summary


@router.get("/purchase-orders")
def get_purchase_order_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in [
        "ADMIN",
    ]:
        raise HTTPException(
            status_code=403,
            detail="Access denied",
        )

    statuses = [
        "DRAFT",
        "PENDING_APPROVAL",
        "APPROVED",
        "SENT_TO_VENDOR",
        "FULFILLED",
        "CANCELLED",
    ]

    statistics = {}

    for status in statuses:
        statistics[status.lower()] = (
            db.query(PurchaseOrder)
            .filter(PurchaseOrder.status == status)
            .count()
        )

    statistics["total"] = db.query(PurchaseOrder).count()

    return statistics