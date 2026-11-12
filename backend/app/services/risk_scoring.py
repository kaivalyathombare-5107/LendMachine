"""
Risk Scoring Service.

Produces a probability-of-default (PD) score bounded by the policy
engine's hard cutoffs. Uses a small GradientBoostingClassifier trained on
synthetic data at import time (stand-in for XGBoost/LightGBM -- swap the
model class for a real one without touching the interface). Explainability
is approximated with a lightweight permutation-style "reason code" function
(a SHAP-flavored breakdown of which features pushed risk up/down) so the
service is fully offline-runnable without the `shap` package.
"""
from __future__ import annotations
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier
from typing import Dict, Any, List, Tuple

MODEL_VERSION = "risk-model-v1-gbc-synthetic"

FEATURE_NAMES = [
    "cibil_score",
    "foir",
    "ltv",
    "monthly_income",
    "income_deviation_pct",
    "existing_active_loans",
]


def _synthesize_training_data(n: int = 4000, seed: int = 42):
    rng = np.random.default_rng(seed)
    cibil = rng.integers(550, 900, n).astype(float)
    foir = rng.uniform(0.1, 0.9, n)
    ltv = rng.uniform(0.2, 0.95, n)
    income = rng.uniform(20000, 300000, n)
    income_dev = rng.uniform(0, 60, n)
    active_loans = rng.integers(0, 6, n).astype(float)

    # Synthetic "true" default probability driven by a hand-crafted logit
    logit = (
        -0.02 * (cibil - 650)
        + 4.0 * foir
        + 2.5 * ltv
        + 0.03 * income_dev
        + 0.3 * active_loans
        - 2.0
    )
    prob_default = 1 / (1 + np.exp(-logit))
    y = (rng.uniform(0, 1, n) < prob_default).astype(int)

    X = np.column_stack([cibil, foir, ltv, income, income_dev, active_loans])
    return X, y


def _train_model() -> GradientBoostingClassifier:
    X, y = _synthesize_training_data()
    model = GradientBoostingClassifier(
        n_estimators=120, max_depth=3, learning_rate=0.08, random_state=42
    )
    model.fit(X, y)
    return model


# Train once at module import (hackathon-scoped; in production this is a
# versioned artifact loaded from a model registry, not trained inline).
_MODEL = _train_model()


def _feature_contributions(feature_vec: np.ndarray) -> List[Dict[str, Any]]:
    """
    Lightweight, SHAP-flavored local explanation: perturb each feature to
    the population baseline (training mean) one at a time and measure the
    swing in predicted probability. This approximates per-feature
    attribution without requiring the `shap` dependency.
    """
    baseline_X, _ = _synthesize_training_data(n=500, seed=7)
    baseline = baseline_X.mean(axis=0)

    base_pred = _MODEL.predict_proba(feature_vec.reshape(1, -1))[0, 1]
    contributions = []
    for i, name in enumerate(FEATURE_NAMES):
        perturbed = feature_vec.copy()
        perturbed[i] = baseline[i]
        perturbed_pred = _MODEL.predict_proba(perturbed.reshape(1, -1))[0, 1]
        swing = round(float(base_pred - perturbed_pred), 4)
        contributions.append({"feature": name, "impact_on_pd": swing})

    contributions.sort(key=lambda c: abs(c["impact_on_pd"]), reverse=True)
    return contributions


def score_application(
    cibil_score: float,
    foir: float,
    ltv: float,
    monthly_income: float,
    income_deviation_pct: float,
    existing_active_loans: int,
) -> Dict[str, Any]:
    feature_vec = np.array(
        [cibil_score, foir, ltv, monthly_income, income_deviation_pct, existing_active_loans],
        dtype=float,
    )
    pd_estimate = float(_MODEL.predict_proba(feature_vec.reshape(1, -1))[0, 1])

    # Confidence interval: approximate via the spread across the model's
    # individual trees' staged predictions (a cheap proxy for predictive
    # uncertainty without a full Bayesian/ensemble-variance model).
    staged = np.array([
        p[0, 1] for p in _MODEL.staged_predict_proba(feature_vec.reshape(1, -1))
    ])
    tail = staged[-20:] if len(staged) >= 20 else staged
    ci_width = float(np.std(tail)) * 2

    reason_codes = _feature_contributions(feature_vec)

    return {
        "model_version": MODEL_VERSION,
        "probability_of_default": round(pd_estimate, 4),
        "confidence_interval_width": round(ci_width, 4),
        "low_confidence": ci_width > 0.08,
        "reason_codes": reason_codes,
    }
