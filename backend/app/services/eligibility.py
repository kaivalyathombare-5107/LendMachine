"""
Eligibility & Policy Engine.
Deterministic, config-driven. Runs FIRST in the pipeline -- hard rejects
exit immediately with a reason code (fast-fail, saves downstream compute).
"""
import os
from functools import lru_cache
from typing import Dict, Any, Tuple, List

import yaml

RULES_PATH = os.path.join(os.path.dirname(__file__), "..", "rules", "policy_v1.yaml")


@lru_cache(maxsize=1)
def load_policy() -> Dict[str, Any]:
    with open(RULES_PATH, "r") as f:
        return yaml.safe_load(f)


def compute_foir(monthly_income: float, existing_emi: float, new_emi: float) -> float:
    if monthly_income <= 0:
        return 1.0
    return round((existing_emi + new_emi) / monthly_income, 4)


def estimate_emi(principal: float, annual_rate: float, tenure_months: int) -> float:
    """Standard reducing-balance EMI formula."""
    r = annual_rate / 12 / 100
    if r == 0:
        return round(principal / tenure_months, 2)
    emi = principal * r * (1 + r) ** tenure_months / ((1 + r) ** tenure_months - 1)
    return round(emi, 2)


def run_eligibility(application, bureau_score: int, assumed_rate: float = 9.5) -> Tuple[bool, List[str], Dict[str, Any]]:
    """
    Returns (passed, reject_reason_codes, details).
    An empty reject list means the application survives to the next stage.
    """
    policy = load_policy()
    common = policy["common"]
    product_rules = policy[application.product_type]

    reasons: List[str] = []

    # 1. CIBIL floor
    if bureau_score < common["min_cibil_score"]:
        reasons.append("CIBIL_BELOW_MIN")

    # 2. Loan amount band
    if not (product_rules["min_loan_amount"] <= application.requested_loan_amount <= product_rules["max_loan_amount"]):
        reasons.append("LOAN_AMOUNT_OUT_OF_RANGE")

    # 3. LTV cap
    ltv = round(application.requested_loan_amount / application.property_value, 4) if application.property_value else 1.0
    if ltv > product_rules["max_ltv"]:
        reasons.append("LTV_EXCEEDED")

    # 4. Tenure cap
    tenure_ok = application.tenure_months <= product_rules["max_tenure_months"]

    # 5. FOIR cap
    new_emi = estimate_emi(application.requested_loan_amount, assumed_rate, application.tenure_months)
    foir = compute_foir(application.monthly_income, application.existing_emi, new_emi)
    if foir > common["max_foir"]:
        reasons.append("FOIR_EXCEEDED")

    details = {
        "policy_version": policy["version"],
        "ltv": ltv,
        "max_ltv_allowed": product_rules["max_ltv"],
        "foir": foir,
        "max_foir_allowed": common["max_foir"],
        "estimated_emi": new_emi,
        "assumed_annual_rate": assumed_rate,
        "tenure_within_cap": tenure_ok,
        "bureau_score": bureau_score,
        "min_cibil_required": common["min_cibil_score"],
    }

    if not tenure_ok:
        reasons.append("LOAN_AMOUNT_OUT_OF_RANGE")  # tenure violation treated as policy-band breach

    passed = len(reasons) == 0
    return passed, reasons, details
