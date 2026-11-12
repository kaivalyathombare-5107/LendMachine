"""
Pydantic request/response schemas.
"""
from __future__ import annotations
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, field_validator


class ApplicationCreate(BaseModel):
    product_type: str = Field(..., description="HOME_LOAN or LAP")
    applicant_name: str
    pan: str
    aadhaar_last4: Optional[str] = None
    employment_type: str = Field(..., description="SALARIED or SELF_EMPLOYED")
    monthly_income: float = Field(..., gt=0)
    requested_loan_amount: float = Field(..., gt=0)
    property_value: float = Field(..., gt=0)
    existing_emi: float = 0.0
    tenure_months: int = Field(..., gt=0, le=360)

    @field_validator("product_type")
    @classmethod
    def validate_product(cls, v):
        if v.upper() not in {"HOME_LOAN", "LAP"}:
            raise ValueError("product_type must be HOME_LOAN or LAP")
        return v.upper()

    @field_validator("employment_type")
    @classmethod
    def validate_employment(cls, v):
        if v.upper() not in {"SALARIED", "SELF_EMPLOYED"}:
            raise ValueError("employment_type must be SALARIED or SELF_EMPLOYED")
        return v.upper()

    @field_validator("pan")
    @classmethod
    def validate_pan(cls, v):
        if len(v) != 10:
            raise ValueError("PAN must be 10 characters")
        return v.upper()


class ApplicationOut(BaseModel):
    id: str
    status: str
    final_decision: Optional[str]
    decision_reason_codes: Optional[List[str]]
    pipeline_state: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


class AuditLogOut(BaseModel):
    sequence: int
    stage: str
    payload: Dict[str, Any]
    rule_version: Optional[str]
    model_version: Optional[str]
    prev_hash: str
    record_hash: str

    model_config = {"from_attributes": True, "protected_namespaces": ()}


class DocumentUploadOut(BaseModel):
    id: str
    doc_type: str
    filename: str
    extracted_fields: Dict[str, Any]
    authenticity_score: float

    class Config:
        from_attributes = True
