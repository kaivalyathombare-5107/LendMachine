"""
Tamper-evident, hash-chained audit logging.

Each audit record's hash is a function of the previous record's hash plus
its own payload -- exactly like a blockchain's block-linking, without the
consensus/mining overhead. Altering any historical record breaks every
subsequent hash, making tampering detectable on verification.
"""
import hashlib
import json
from typing import Any, Dict

GENESIS_HASH = "0" * 64


def _canonical(payload: Dict[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True, default=str)


def compute_record_hash(prev_hash: str, payload: Dict[str, Any]) -> str:
    h = hashlib.sha256()
    h.update(prev_hash.encode("utf-8"))
    h.update(_canonical(payload).encode("utf-8"))
    return h.hexdigest()


def verify_chain(records) -> Dict[str, Any]:
    """
    records: iterable of objects with .prev_hash, .record_hash, .payload,
             ordered by sequence ascending.
    Returns {"valid": bool, "broken_at": Optional[int]}
    """
    expected_prev = GENESIS_HASH
    for rec in records:
        if rec.prev_hash != expected_prev:
            return {"valid": False, "broken_at": rec.sequence}
        recomputed = compute_record_hash(rec.prev_hash, rec.payload)
        if recomputed != rec.record_hash:
            return {"valid": False, "broken_at": rec.sequence}
        expected_prev = rec.record_hash
    return {"valid": True, "broken_at": None}
