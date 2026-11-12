"""
Data Integration Hub.

In production these functions call out to CIBIL/CRIF, Account Aggregator
(AA) bank-statement feeds, UIDAI e-KYC, IT portal (ITR/Form16), and GST
APIs. For the hackathon/demo these are deterministic, seeded mocks so the
pipeline is fully runnable offline -- swap each `fetch_*` function for a
real adapter without touching any downstream service.
"""
import hashlib
import random
from typing import Dict, Any


def _seeded_random(seed_key: str) -> random.Random:
    seed = int(hashlib.sha256(seed_key.encode()).hexdigest(), 16) % (2**32)
    return random.Random(seed)


def fetch_credit_bureau(pan: str) -> Dict[str, Any]:
    """Mock CIBIL/CRIF pull."""
    rnd = _seeded_random(f"bureau::{pan}")
    score = rnd.randint(550, 850)
    return {
        "source": "CIBIL_MOCK",
        "score": score,
        "active_loans": rnd.randint(0, 4),
        "delinquencies_24m": rnd.randint(0, 2) if score < 700 else 0,
        "report_date": "2026-11-01",
    }


def fetch_bank_statement_summary(pan: str, stated_monthly_income: float) -> Dict[str, Any]:
    """Mock Account Aggregator (AA) framework pull -> derived income."""
    rnd = _seeded_random(f"bank::{pan}")
    # Simulate real deposits being within +/-20% of stated income most of the time
    noise = rnd.uniform(-0.25, 0.15)
    derived_income = round(stated_monthly_income * (1 + noise), 2)
    avg_balance = round(derived_income * rnd.uniform(0.5, 2.0), 2)
    return {
        "source": "ACCOUNT_AGGREGATOR_MOCK",
        "derived_monthly_income": derived_income,
        "avg_monthly_balance": avg_balance,
        "bounced_cheques_6m": rnd.randint(0, 1),
    }


def fetch_ekyc(pan: str, aadhaar_last4: str | None) -> Dict[str, Any]:
    """Mock UIDAI e-KYC verification."""
    rnd = _seeded_random(f"kyc::{pan}")
    return {
        "source": "UIDAI_EKYC_MOCK",
        "name_match": rnd.random() > 0.03,
        "address_match": rnd.random() > 0.05,
        "aadhaar_valid": aadhaar_last4 is not None,
        "photo_match_confidence": round(rnd.uniform(0.85, 0.999), 3),
    }


def fetch_gst_data(pan: str, employment_type: str) -> Dict[str, Any] | None:
    """Mock GST data pull, only applicable for self-employed applicants."""
    if employment_type != "SELF_EMPLOYED":
        return None
    rnd = _seeded_random(f"gst::{pan}")
    return {
        "source": "GST_PORTAL_MOCK",
        "gstin_active": rnd.random() > 0.05,
        "annual_turnover": round(rnd.uniform(500000, 8000000), 2),
        "filing_consistency_score": round(rnd.uniform(0.6, 1.0), 2),
    }


def fetch_sanctions_pep_screen(applicant_name: str, pan: str) -> Dict[str, Any]:
    """Mock sanctions/PEP watchlist screening."""
    rnd = _seeded_random(f"sanctions::{pan}::{applicant_name.lower()}")
    hit = rnd.random() < 0.02  # ~2% synthetic hit rate for demo purposes
    return {
        "source": "SANCTIONS_PEP_SCREEN_MOCK",
        "hit": hit,
        "lists_checked": ["UN_SANCTIONS", "OFAC", "RBI_CAUTION_LIST", "PEP_DB"],
    }


def run_data_integration(application) -> Dict[str, Any]:
    """Aggregates all external pulls for an application (parallel in prod)."""
    bureau = fetch_credit_bureau(application.pan)
    bank = fetch_bank_statement_summary(application.pan, application.monthly_income)
    kyc = fetch_ekyc(application.pan, application.aadhaar_last4)
    gst = fetch_gst_data(application.pan, application.employment_type)
    sanctions = fetch_sanctions_pep_screen(application.applicant_name, application.pan)

    return {
        "bureau": bureau,
        "bank": bank,
        "kyc": kyc,
        "gst": gst,
        "sanctions": sanctions,
    }
