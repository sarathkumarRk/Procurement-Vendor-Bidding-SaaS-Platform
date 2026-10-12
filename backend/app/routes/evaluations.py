from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.models.rfq import RFQ
from app.models.quotation import Quotation
from app.models.evaluation_score import EvaluationScore
from app.schemas.evaluation_score import (
    EvaluationCreate,
    EvaluationResponse,
)

router = APIRouter(prefix="/evaluations", tags=["Evaluations"])


# Evaluate Quotation - Procurement Manager Only
@router.patch(
    "/quotations/{quotation_id}/evaluate",
    response_model=EvaluationResponse,
)
def evaluate_quotation(
    quotation_id: int,
    data: EvaluationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "PROCUREMENT_MANAGER":
        raise HTTPException(
            status_code=403,
            detail="Procurement Manager access required",
        )

    quotation = db.query(Quotation).filter(
        Quotation.id == quotation_id
    ).first()

    if not quotation:
        raise HTTPException(
            status_code=404,
            detail="Quotation not found",
        )

    rfq = db.query(RFQ).filter(
        RFQ.id == quotation.rfq_id
    ).first()

    if not rfq:
        raise HTTPException(
            status_code=404,
            detail="RFQ not found",
        )

    if rfq.created_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can evaluate quotations only for your own RFQs",
        )

    if rfq.status not in ["PUBLISHED", "CLOSED"]:
        raise HTTPException(
            status_code=400,
            detail="RFQ cannot be evaluated in its current status",
        )

    if quotation.status not in ["SUBMITTED", "SHORTLISTED", "RECOMMENDED"]:
        raise HTTPException(
            status_code=400,
            detail="This quotation cannot be evaluated",
        )

    allowed_recommendations = [
        "PENDING",
        "SHORTLISTED",
        "RECOMMENDED",
        "REJECTED",
    ]

    if data.recommendation not in allowed_recommendations:
        raise HTTPException(
            status_code=400,
            detail="Invalid evaluation recommendation",
        )

    evaluation = db.query(EvaluationScore).filter(
        EvaluationScore.quotation_id == quotation_id
    ).first()

    if evaluation and evaluation.evaluated_by != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="This evaluation belongs to another evaluator",
        )

    if not evaluation:
        evaluation = EvaluationScore(
            quotation_id=quotation_id,
            evaluated_by=current_user.id,
        )
        db.add(evaluation)

    evaluation.price_score = data.price_score
    evaluation.delivery_score = data.delivery_score
    evaluation.compliance_score = data.compliance_score

    evaluation.total_score = round(
        (
            data.price_score
            + data.delivery_score
            + data.compliance_score
        ) / 3,
        2,
    )

    evaluation.comments = data.comments
    evaluation.recommendation = data.recommendation

    if data.recommendation in [
        "SHORTLISTED",
        "RECOMMENDED",
        "REJECTED",
    ]:
        quotation.status = data.recommendation
    elif data.recommendation == "PENDING":
        quotation.status = "SUBMITTED"

    try:
        db.commit()
        db.refresh(evaluation)
        return evaluation

    except Exception:
        db.rollback()
        raise


# Get Evaluations for a Quotation
@router.get(
    "/quotations/{quotation_id}",
    response_model=list[EvaluationResponse],
)
def get_quotation_evaluations(
    quotation_id: int,
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

    quotation = db.query(Quotation).filter(
        Quotation.id == quotation_id
    ).first()

    if not quotation:
        raise HTTPException(
            status_code=404,
            detail="Quotation not found",
        )

    if current_user.role == "PROCUREMENT_MANAGER":
        rfq = db.query(RFQ).filter(
            RFQ.id == quotation.rfq_id
        ).first()

        if not rfq or rfq.created_by != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only view evaluations for your own RFQs",
            )

    return db.query(EvaluationScore).filter(
        EvaluationScore.quotation_id == quotation_id
    ).all()


# List Evaluations
@router.get("/", response_model=list[EvaluationResponse])
def get_evaluations(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    recommendation: str | None = Query(None),
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

    query = db.query(EvaluationScore)

    if current_user.role == "PROCUREMENT_MANAGER":
        query = query.join(
            Quotation,
            EvaluationScore.quotation_id == Quotation.id,
        ).join(
            RFQ,
            Quotation.rfq_id == RFQ.id,
        ).filter(
            RFQ.created_by == current_user.id
        )

    if recommendation:
        allowed_recommendations = [
            "PENDING",
            "SHORTLISTED",
            "RECOMMENDED",
            "REJECTED",
        ]

        if recommendation not in allowed_recommendations:
            raise HTTPException(
                status_code=400,
                detail="Invalid recommendation filter",
            )

        query = query.filter(
            EvaluationScore.recommendation == recommendation
        )

    return (
        query.order_by(EvaluationScore.id.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )