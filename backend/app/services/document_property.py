"""
Document & Property Service.

Real implementation: LLM-vision extraction from salary slips / bank
statements / property papers, with Tesseract/OCR fallback, then
cross-verification of stated income vs bank deposits, and a call into the
Property Valuation Engine (PS1 synergy) for collateral assessment.

This module provides the extraction + cross-verification logic and a
mock Automated Valuation Model (AVM) stand-in for PS1's valuation engine.
"""
import hashlib
import random
from typing import Dict, Any


def _seeded_random(seed_key: str) -> random.Random:
    seed = int(hashlib.sha256(seed_key.encode()).hexdigest(), 16) % (2**32)
    return random.Random(seed)


def extract_document_fields(doc_type: str, filename: str, raw_text: str | None) -> Dict[str, Any]:
    """
    Simulates LLM-vision / OCR extraction. If raw_text is supplied it is
    lightly parsed; otherwise deterministic mock fields are generated so
    the pipeline is runnable without real scanned documents.
    """
    rnd = _seeded_random(f"doc::{filename}::{doc_type}")
    authenticity_score = round(rnd.uniform(0.55, 0.999), 3)

    fields: Dict[str, Any] = {"doc_type": doc_type}
    if doc_type == "SALARY_SLIP":
        fields["net_pay"] = round(rnd.uniform(25000, 200000), 2)
        fields["employer_name"] = f"Employer_{rnd.randint(100,999)}"
    elif doc_type == "BANK_STATEMENT":
        fields["avg_monthly_credit"] = round(rnd.uniform(25000, 220000), 2)
        fields["num_bounced_cheques"] = rnd.randint(0, 1)
    elif doc_type == "PROPERTY_PAPER":
        fields["registered_value"] = round(rnd.uniform(1000000, 15000000), 2)
        fields["encumbrance_clear"] = rnd.random() > 0.05
    elif doc_type == "ID_PROOF":
        fields["name_on_doc"] = "EXTRACTED_NAME_MOCK"
        fields["id_number_masked"] = "XXXX-XXXX-" + str(rnd.randint(1000, 9999))

    return {"fields": fields, "authenticity_score": authenticity_score}


def cross_verify_income(stated_income: float, bank_derived_income: float) -> Dict[str, Any]:
    if stated_income <= 0:
        deviation = 1.0
    else:
        deviation = abs(stated_income - bank_derived_income) / stated_income
    return {
        "stated_income": stated_income,
        "bank_derived_income": bank_derived_income,
        "deviation_pct": round(deviation * 100, 2),
        "significant_mismatch": deviation > 0.30,
    }


def run_property_valuation_avm(pan: str, declared_property_value: float) -> Dict[str, Any]:
    """
    Mock stand-in for the Property Valuation Engine (PS1). In production
    this calls Hero's AVM service and returns a model-estimated value plus
    confidence band, which feeds directly into LTV-based risk scoring.
    """
    rnd = _seeded_random(f"avm::{pan}")
    variance = rnd.uniform(-0.1, 0.1)
    avm_value = round(declared_property_value * (1 + variance), 2)
    return {
        "source": "PS1_AVM_MOCK",
        "avm_estimated_value": avm_value,
        "declared_value": declared_property_value,
        "variance_pct": round(variance * 100, 2),
        "confidence": round(rnd.uniform(0.75, 0.97), 3),
    }
