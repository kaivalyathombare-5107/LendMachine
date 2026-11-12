"""
SQLAlchemy ORM models: Application, AuditLog (hash-chained), Document.
"""
import uuid
import datetime as dt

from sqlalchemy import (
    Column, String, Float, Integer, DateTime, JSON, ForeignKey, Text
)
from sqlalchemy.orm import relationship

from .database import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


class Application(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True, default=gen_uuid)
    product_type = Column(String, nullable=False)          # HOME_LOAN / LAP
    applicant_name = Column(String, nullable=False)
    pan = Column(String, nullable=False)
    aadhaar_last4 = Column(String, nullable=True)
    employment_type = Column(String, nullable=False)        # SALARIED / SELF_EMPLOYED
    monthly_income = Column(Float, nullable=False)
    requested_loan_amount = Column(Float, nullable=False)
    property_value = Column(Float, nullable=False)
    existing_emi = Column(Float, default=0.0)
    tenure_months = Column(Integer, nullable=False)

    status = Column(String, default="RECEIVED")
    # RECEIVED -> DATA_FETCHED -> ELIGIBILITY_PASSED/REJECTED ->
    # FRAUD_CHECKED -> RISK_SCORED -> COMPLIANCE_CHECKED -> DECISIONED

    created_at = Column(DateTime, default=dt.datetime.utcnow)
    updated_at = Column(DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow)

    pipeline_state = Column(JSON, default=dict)  # accumulates outputs of each stage
    final_decision = Column(String, nullable=True)   # APPROVE / REJECT / REFER
    decision_reason_codes = Column(JSON, default=list)

    audit_logs = relationship("AuditLog", back_populates="application", order_by="AuditLog.sequence")


class AuditLog(Base):
    """
    Append-only, hash-chained audit record.
    Each row's `record_hash` = H(prev_hash || payload), giving tamper-evidence
    without a real blockchain (demoable "innovation" feature).
    """
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=gen_uuid)
    application_id = Column(String, ForeignKey("applications.id"), nullable=False)
    sequence = Column(Integer, nullable=False)
    stage = Column(String, nullable=False)
    payload = Column(JSON, nullable=False)
    rule_version = Column(String, nullable=True)
    model_version = Column(String, nullable=True)
    prev_hash = Column(String, nullable=False)
    record_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=dt.datetime.utcnow)

    application = relationship("Application", back_populates="audit_logs")


class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=gen_uuid)
    application_id = Column(String, ForeignKey("applications.id"), nullable=False)
    doc_type = Column(String, nullable=False)   # SALARY_SLIP / BANK_STATEMENT / PROPERTY_PAPER / ID_PROOF
    filename = Column(String, nullable=False)
    ocr_text = Column(Text, nullable=True)
    extracted_fields = Column(JSON, default=dict)
    authenticity_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=dt.datetime.utcnow)
