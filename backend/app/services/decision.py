"""
Decision Orchestrator.

Aggregates outputs from every upstream service and applies final decision
logic: APPROVE / REJECT / REFER. Triggers the refer path whenever
confidence is low, a hard-stop is ambiguous, or the Compliance Checker
finds an untraceable reason code -- straight-through processing only
happens on genuinely clean, confidently-scored, fully-compliant cases.
"""
from typing import Dict, Any, List, Tuple

APPROVE, REJECT, REFER = "APPROVE", "REJECT", "REFER"

# Risk-score bands applied on top of whatever survives the hard policy gates.
PD_AUTO_APPROVE_MAX = 0.15
PD_AUTO_REJECT_MIN = 0.55


def decide(
    eligibility_passed: bool,
    eligibility_reject_codes: List[str],
    fraud_passed: bool,
    fraud_reject_codes: List[str],
    fraud_refer_flags: List[str],
    risk_result: Dict[str, Any],
    income_mismatch: bool,
    compliance_result: Dict[str, Any],
) -> Tuple[str, List[str]]:
    """Returns (final_decision, full_reason_code_list)."""

    # 1. Hard rejects from eligibility / fraud short-circuit everything else.
    hard_rejects = eligibility_reject_codes + fraud_reject_codes
    if hard_rejects:
        return REJECT, hard_rejects

    refer_codes: List[str] = list(fraud_refer_flags)

    if income_mismatch:
        refer_codes.append("INCOME_MISMATCH")

    pd = risk_result["probability_of_default"]
    if risk_result.get("low_confidence"):
        refer_codes.append("LOW_MODEL_CONFIDENCE")

    # Borderline FOIR already flagged upstream and passed in via refer_codes
    # if applicable (see pipeline wiring in routers/applications.py).

    # 2. Compliance gate: any untraceable code forces REFER regardless of score.
    if not compliance_result["all_codes_traceable"]:
        refer_codes.append("COMPLIANCE_TRACEABILITY_GAP")

    if refer_codes:
        return REFER, refer_codes

    # 3. Clean path: bucket purely on model-estimated probability of default.
    if pd <= PD_AUTO_APPROVE_MAX:
        return APPROVE, [f"PD_WITHIN_AUTO_APPROVE_BAND({pd})"]
    elif pd >= PD_AUTO_REJECT_MIN:
        return REJECT, [f"PD_ABOVE_AUTO_REJECT_THRESHOLD({pd})"]
    else:
        return REFER, [f"PD_IN_DISCRETIONARY_BAND({pd})"]
