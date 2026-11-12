"""
Compliance Checker.

Maps every decision path against NHB regulations, the Fair Practices
Code, and the internal credit policy version in force, and blocks any
output that lacks a traceable compliance justification (i.e. every
reject/refer code must map to a documented regulatory or policy basis).
"""
from typing import Dict, Any, List

# Maps internal reason codes -> the regulatory/policy clause they trace to.
# In production this table itself would be versioned alongside policy_v1.yaml.
COMPLIANCE_MAP: Dict[str, str] = {
    "CIBIL_BELOW_MIN": "Internal Credit Policy §3.1 (Minimum Creditworthiness)",
    "FOIR_EXCEEDED": "Internal Credit Policy §3.4 (Debt Burden Ratio) / NHB Prudential Norms",
    "LTV_EXCEEDED": "NHB Directions 2010 §Loan-to-Value Ratio norms",
    "LOAN_AMOUNT_OUT_OF_RANGE": "Internal Credit Policy §2.2 (Product Eligibility Bands)",
    "SANCTIONS_HIT": "PMLA 2002 / RBI Master Direction on KYC (AML screening)",
    "DOCUMENT_FORGERY_SUSPECTED": "Fair Practices Code §4 (Document Integrity) / IPC fraud provisions",
    "LOW_MODEL_CONFIDENCE": "Internal Model Risk Policy — confidence-gated human review",
    "BORDERLINE_FOIR": "Internal Credit Policy §3.4 (Debt Burden Ratio) — discretionary band",
    "INCOME_MISMATCH": "Fair Practices Code §3 (Income Verification) — discretionary review",
    "VELOCITY_FLAG": "RBI Master Direction on KYC §Risk Categorisation (multiple-application anomaly)",
    "KYC_FIELD_MISMATCH": "RBI Master Direction on KYC §Customer Identification Procedure",
    "DOCUMENT_AUTHENTICITY_BORDERLINE": "Fair Practices Code §4 (Document Integrity) — discretionary review",
}

COMPLIANCE_RULESET_VERSION = "compliance-map-v1"


def check_compliance(all_reason_codes: List[str]) -> Dict[str, Any]:
    """
    Verifies every reason code driving the decision has a traceable
    regulatory/policy basis. Any code without a mapping is itself a
    compliance gap and forces a REFER (never a silent approve/reject).
    """
    unmapped = [c for c in all_reason_codes if c not in COMPLIANCE_MAP]
    traceability = {
        c: COMPLIANCE_MAP[c] for c in all_reason_codes if c in COMPLIANCE_MAP
    }
    return {
        "ruleset_version": COMPLIANCE_RULESET_VERSION,
        "all_codes_traceable": len(unmapped) == 0,
        "unmapped_codes": unmapped,
        "traceability_map": traceability,
    }
