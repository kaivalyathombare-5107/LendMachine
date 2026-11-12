"""
Ingestion Gateway + Decision Orchestrator wiring.

POST /applications            -> create application (Ingestion Gateway)
POST /applications/{id}/documents -> upload a document for OCR/extraction
POST /applications/{id}/run   -> run the full pipeline end-to-end
GET  /applications/{id}       -> current status / decision
GET  /applications/{id}/audit -> full audit trail
GET  /applications/{id}/audit/verify -> tamper-evidence check on the hash chain
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..services import (
    data_integration,
    eligibility,
    fraud_kyc,
    document_property,
    risk_scoring,
    compliance,
    decision,
    audit,
)

router = APIRouter(prefix="/applications", tags=["applications"])


@router.post("", response_model=schemas.ApplicationOut, status_code=201)
def create_application(payload: schemas.ApplicationCreate, db: Session = Depends(get_db)):
    """Ingestion Gateway: validates schema (via Pydantic), assigns application_id,
    persists the application, logs stage 0 of the audit trail."""
    app_row = models.Application(
        product_type=payload.product_type,
        applicant_name=payload.applicant_name,
        pan=payload.pan,
        aadhaar_last4=payload.aadhaar_last4,
        employment_type=payload.employment_type,
        monthly_income=payload.monthly_income,
        requested_loan_amount=payload.requested_loan_amount,
        property_value=payload.property_value,
        existing_emi=payload.existing_emi,
        tenure_months=payload.tenure_months,
        status="RECEIVED",
        pipeline_state={},
    )
    db.add(app_row)
    db.commit()
    db.refresh(app_row)

    audit.log_stage(
        db, app_row.id, "INGESTION",
        payload={"event": "application_received", "payload": payload.model_dump()},
    )
    return app_row


@router.post("/{application_id}/documents", response_model=schemas.DocumentUploadOut, status_code=201)
def upload_document(
    application_id: str,
    doc_type: str = Form(..., description="SALARY_SLIP | BANK_STATEMENT | PROPERTY_PAPER | ID_PROOF"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    app_row = db.query(models.Application).get(application_id)
    if not app_row:
        raise HTTPException(404, "Application not found")

    raw_bytes = file.file.read()
    raw_text = None
    try:
        raw_text = raw_bytes.decode("utf-8", errors="ignore") if raw_bytes else None
    except Exception:
        raw_text = None

    extraction = document_property.extract_document_fields(doc_type, file.filename, raw_text)

    doc_row = models.Document(
        application_id=application_id,
        doc_type=doc_type,
        filename=file.filename,
        ocr_text=raw_text[:2000] if raw_text else None,
        extracted_fields=extraction["fields"],
        authenticity_score=extraction["authenticity_score"],
    )
    db.add(doc_row)
    db.commit()
    db.refresh(doc_row)

    audit.log_stage(
        db, application_id, "DOCUMENT_UPLOAD",
        payload={
            "doc_type": doc_type,
            "filename": file.filename,
            "authenticity_score": extraction["authenticity_score"],
        },
    )
    return doc_row


@router.post("/{application_id}/run", response_model=schemas.ApplicationOut)
def run_pipeline(application_id: str, db: Session = Depends(get_db)):
    """
    Runs the full straight-through pipeline synchronously:
    Data Integration -> Eligibility -> Fraud/KYC + Document/Property (parallel
    in production, sequential here) -> Risk Scoring -> Compliance -> Decision.
    Every stage appends a hash-chained audit record.
    """
    app_row = db.query(models.Application).get(application_id)
    if not app_row:
        raise HTTPException(404, "Application not found")

    state = dict(app_row.pipeline_state or {})

    # --- Stage 1: Data Integration Hub ---
    integration = data_integration.run_data_integration(app_row)
    state["data_integration"] = integration
    app_row.status = "DATA_FETCHED"
    audit.log_stage(db, application_id, "DATA_INTEGRATION", payload=integration)

    # --- Stage 2: Eligibility & Policy Engine (fast-fail) ---
    bureau_score = integration["bureau"]["score"]
    elig_passed, elig_reject_codes, elig_details = eligibility.run_eligibility(app_row, bureau_score)
    state["eligibility"] = {"passed": elig_passed, "reject_codes": elig_reject_codes, **elig_details}
    audit.log_stage(
        db, application_id, "ELIGIBILITY_POLICY",
        payload=state["eligibility"],
        rule_version=elig_details["policy_version"],
    )

    if not elig_passed:
        app_row.status = "ELIGIBILITY_REJECTED"
        return _finalize(
            db, app_row, state,
            decision_val="REJECT", reason_codes=elig_reject_codes,
            compliance_result=compliance.check_compliance(elig_reject_codes),
        )

    app_row.status = "ELIGIBILITY_PASSED"

    # --- Stage 3a: Document & Property Service ---
    documents = db.query(models.Document).filter(models.Document.application_id == application_id).all()
    doc_payloads = [
        {"doc_type": d.doc_type, "authenticity_score": d.authenticity_score, "fields": d.extracted_fields}
        for d in documents
    ]
    income_check = document_property.cross_verify_income(
        app_row.monthly_income, integration["bank"]["derived_monthly_income"]
    )
    avm = document_property.run_property_valuation_avm(app_row.pan, app_row.property_value)
    state["document_property"] = {"documents": doc_payloads, "income_check": income_check, "avm": avm}
    audit.log_stage(db, application_id, "DOCUMENT_PROPERTY_VERIFICATION", payload=state["document_property"])

    # --- Stage 3b: Fraud & KYC/AML ---
    fraud_passed, fraud_reject_codes, fraud_details = fraud_kyc.run_fraud_kyc(
        db, app_row, integration["sanctions"], integration["kyc"], doc_payloads
    )
    state["fraud_kyc"] = {"passed": fraud_passed, "reject_codes": fraud_reject_codes, **fraud_details}
    audit.log_stage(db, application_id, "FRAUD_KYC_AML", payload=state["fraud_kyc"])

    if not fraud_passed:
        app_row.status = "FRAUD_REJECTED"
        all_codes = elig_reject_codes + fraud_reject_codes
        return _finalize(
            db, app_row, state,
            decision_val="REJECT", reason_codes=all_codes,
            compliance_result=compliance.check_compliance(all_codes),
        )

    app_row.status = "FRAUD_CHECKED"

    # Borderline FOIR check (refer-worthy, not a hard reject)
    foir = state["eligibility"]["foir"]
    max_foir = state["eligibility"]["max_foir_allowed"]
    borderline_foir = (max_foir - foir) <= 0.05 and foir <= max_foir
    extra_refer_flags = list(fraud_details["refer_flags"])
    if borderline_foir:
        extra_refer_flags.append("BORDERLINE_FOIR")

    # --- Stage 4: Risk Scoring Service ---
    risk_result = risk_scoring.score_application(
        cibil_score=bureau_score,
        foir=foir,
        ltv=state["eligibility"]["ltv"],
        monthly_income=app_row.monthly_income,
        income_deviation_pct=income_check["deviation_pct"],
        existing_active_loans=integration["bureau"]["active_loans"],
    )
    state["risk_scoring"] = risk_result
    app_row.status = "RISK_SCORED"
    audit.log_stage(
        db, application_id, "RISK_SCORING",
        payload=risk_result, model_version=risk_result["model_version"],
    )

    # --- Stage 5: Compliance Checker ---
    provisional_codes = extra_refer_flags.copy()
    if income_check["significant_mismatch"]:
        provisional_codes.append("INCOME_MISMATCH")
    if risk_result.get("low_confidence"):
        provisional_codes.append("LOW_MODEL_CONFIDENCE")
    compliance_result = compliance.check_compliance(provisional_codes)
    state["compliance"] = compliance_result
    app_row.status = "COMPLIANCE_CHECKED"
    audit.log_stage(
        db, application_id, "COMPLIANCE_CHECK",
        payload=compliance_result, rule_version=compliance_result["ruleset_version"],
    )

    # --- Stage 6: Decision Orchestrator ---
    final_decision, reason_codes = decision.decide(
        eligibility_passed=elig_passed,
        eligibility_reject_codes=elig_reject_codes,
        fraud_passed=fraud_passed,
        fraud_reject_codes=fraud_reject_codes,
        fraud_refer_flags=extra_refer_flags,
        risk_result=risk_result,
        income_mismatch=income_check["significant_mismatch"],
        compliance_result=compliance_result,
    )

    return _finalize(db, app_row, state, final_decision, reason_codes, compliance_result)


def _finalize(db: Session, app_row, state, decision_val, reason_codes, compliance_result):
    app_row.status = "DECISIONED"
    app_row.final_decision = decision_val
    app_row.decision_reason_codes = reason_codes
    app_row.pipeline_state = state
    db.add(app_row)
    db.commit()
    db.refresh(app_row)

    audit.log_stage(
        db, app_row.id, "FINAL_DECISION",
        payload={
            "decision": decision_val,
            "reason_codes": reason_codes,
            "compliance_traceable": compliance_result.get("all_codes_traceable"),
        },
        rule_version=compliance_result.get("ruleset_version"),
    )
    return app_row


@router.get("/{application_id}", response_model=schemas.ApplicationOut)
def get_application(application_id: str, db: Session = Depends(get_db)):
    app_row = db.query(models.Application).get(application_id)
    if not app_row:
        raise HTTPException(404, "Application not found")
    return app_row


@router.get("/{application_id}/audit", response_model=list[schemas.AuditLogOut])
def get_audit_trail(application_id: str, db: Session = Depends(get_db)):
    app_row = db.query(models.Application).get(application_id)
    if not app_row:
        raise HTTPException(404, "Application not found")
    logs = (
        db.query(models.AuditLog)
        .filter(models.AuditLog.application_id == application_id)
        .order_by(models.AuditLog.sequence)
        .all()
    )
    return logs


@router.get("/{application_id}/audit/verify")
def verify_audit_trail(application_id: str, db: Session = Depends(get_db)):
    from ..utils.hash_chain import verify_chain

    logs = (
        db.query(models.AuditLog)
        .filter(models.AuditLog.application_id == application_id)
        .order_by(models.AuditLog.sequence)
        .all()
    )
    if not logs:
        raise HTTPException(404, "No audit records for this application")
    return verify_chain(logs)
