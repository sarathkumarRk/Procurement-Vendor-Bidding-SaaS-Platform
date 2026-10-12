
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class EvaluationCreate(BaseModel):
    price_score: Decimal = Field(ge=0, le=100)
    delivery_score: Decimal = Field(ge=0, le=100)
    compliance_score: Decimal = Field(ge=0, le=100)
    comments: str | None = None
    recommendation: Literal[
        "PENDING",
        "SHORTLISTED",
        "RECOMMENDED",
        "REJECTED",
    ] = "PENDING"


class EvaluationResponse(BaseModel):
    id: int
    quotation_id: int
    evaluated_by: int
    price_score: Decimal
    delivery_score: Decimal
    compliance_score: Decimal
    total_score: Decimal
    comments: str | None = None
    recommendation: str

    class Config:
        from_attributes = True
