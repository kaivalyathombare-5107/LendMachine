"""
Fraud & KYC/AML Service.
- Document authenticity (forgery/tampering) checks
- Name/address cross-matching across documents
- PEP / sanctions screening
- Velocity checks (multiple applications in a short window)
"""
from typing import Dict, Any, List, Tuple
import datetime as dt

from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models import Application


def velocity_check(db: Session, pan: str, window_hours: int = 24, max_allowed: int = 2) -> Dict[str, Any]:
    cutoff = dt.datetime.utcnow() - dt.timedelta(hours=window_hours)
    count = (
        db.query(func.count(Application.id))
        .filter(Application.pan == pan, Application.created_at >= cutoff)
        .scalar()
    )
    return {
        "applications_in_window": int(count),
        "window_hours": window_hours,
        "flagged": int(count) > max_allowed,
    }


def run_fraud_kyc(
    db: Session,
    application,
    sanctions_result: Dict[str, Any],
    kyc_result: Dict[str, Any],
    documents: List[Dict[str, Any]],
) -> Tuple[bool, List[str], Dict[str, Any]]:
    """
    Returns (passed_hard_stop, reject_codes, details).
    Soft flags (refer-worthy) are returned in details["refer_flags"].
    """
    reject_codes: List[str] = []
    refer_flags: List[str] = []

    if sanctions_result.get("hit"):
        reject_codes.append("SANCTIONS_HIT")

    # Document authenticity: average authenticity score across uploaded docs
    auth_scores = [d.get("authenticity_score", 1.0) for d in documents] or [1.0]
    avg_authenticity = round(sum(auth_scores) / len(auth_scores), 3)
    if avg_authenticity < 0.5:
        reject_codes.append("DOCUMENT_FORGERY_SUSPECTED")
    elif avg_authenticity < 0.75:
        refer_flags.append("DOCUMENT_AUTHENTICITY_BORDERLINE")

    if not kyc_result.get("name_match", True) or not kyc_result.get("address_match", True):
        refer_flags.append("KYC_FIELD_MISMATCH")

    vel = velocity_check(db, application.pan)
    if vel["flagged"]:
        refer_flags.append("VELOCITY_FLAG")

    details = {
        "sanctions_hit": sanctions_result.get("hit", False),
        "avg_document_authenticity": avg_authenticity,
        "kyc_name_match": kyc_result.get("name_match"),
        "kyc_address_match": kyc_result.get("address_match"),
        "velocity": vel,
        "refer_flags": refer_flags,
    }

    passed = len(reject_codes) == 0
    return passed, reject_codes, details
