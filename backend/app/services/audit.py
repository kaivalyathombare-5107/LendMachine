"""
Explainability & Audit Service.
Every pipeline stage calls `log_stage` to append an immutable,
hash-chained record: decision + inputs + rule version + model version.
"""
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models import AuditLog
from ..utils.hash_chain import compute_record_hash, GENESIS_HASH


def log_stage(
    db: Session,
    application_id: str,
    stage: str,
    payload: dict,
    rule_version: str | None = None,
    model_version: str | None = None,
) -> AuditLog:
    last = (
        db.query(AuditLog)
        .filter(AuditLog.application_id == application_id)
        .order_by(AuditLog.sequence.desc())
        .first()
    )
    sequence = (last.sequence + 1) if last else 0
    prev_hash = last.record_hash if last else GENESIS_HASH

    record_hash = compute_record_hash(prev_hash, payload)

    entry = AuditLog(
        application_id=application_id,
        sequence=sequence,
        stage=stage,
        payload=payload,
        rule_version=rule_version,
        model_version=model_version,
        prev_hash=prev_hash,
        record_hash=record_hash,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
