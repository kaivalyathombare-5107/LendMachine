# Digitally Automated Mortgage Underwriting Engine — Backend

FastAPI implementation of the underwriting pipeline described in `BACKEND.md`
(Hero Housing Finance Hackathon, Problem Statement 2).

```
Application → Data Integration → Eligibility & Policy → Fraud/KYC/AML →
Risk Scoring → Document & Property Verification → Compliance Checks →
Decision Engine → Explainability & Audit Log
```

## Run it

```bash
cd backend
python -m venv venv && source venv/bin/activate   # optional
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Open **http://localhost:8000/docs** for interactive Swagger UI.

## API flow

1. `POST /applications` — submit a loan application (Ingestion Gateway).
   Returns an `application_id`.
2. `POST /applications/{id}/documents` — upload salary slips, bank
   statements, property papers, ID proof (multipart form: `doc_type` +
   `file`). Optional but feeds document-authenticity checks.
3. `POST /applications/{id}/run` — executes the full pipeline synchronously
   and returns the final decision (`APPROVE` / `REJECT` / `REFER`) with
   every reason code.
4. `GET /applications/{id}` — current status + full pipeline trace.
5. `GET /applications/{id}/audit` — the complete, ordered audit trail
   (one record per stage).
6. `GET /applications/{id}/audit/verify` — recomputes the hash chain and
   confirms no record has been tampered with.

## What's real vs mocked

| Component | Status |
|---|---|
| Ingestion, schema validation, orchestration | Real (FastAPI + Pydantic) |
| Eligibility & Policy Engine | Real, YAML-config-driven (`app/rules/policy_v1.yaml`) |
| Risk Scoring | Real `GradientBoostingClassifier` (scikit-learn), trained at startup on synthetic data standing in for XGBoost/LightGBM — swap `services/risk_scoring.py` for a real trained artifact in production |
| Explainability | Lightweight SHAP-flavored per-feature attribution (no `shap` dependency required) |
| Compliance traceability mapping | Real logic, demo regulatory citations |
| Hash-chained audit log | Real (SHA-256 chain, tamper-evidence verifiable via `/audit/verify`) |
| Credit bureau (CIBIL/CRIF), Account Aggregator bank data, e-KYC, GST, sanctions/PEP screening | **Mocked** — deterministic, seeded-random stand-ins in `app/services/data_integration.py`. Swap each `fetch_*` function for a real API adapter; nothing downstream needs to change. |
| OCR / LLM-vision document extraction | **Mocked** in `app/services/document_property.py` — swap for a real vision-LLM or Tesseract call |
| Property Valuation (PS1 AVM) | **Mocked** stand-in in `document_property.run_property_valuation_avm` |
| Event bus (Kafka/RabbitMQ) / Temporal orchestration | Not implemented — the pipeline runs synchronously end-to-end inside `/run` for demo purposes. The service boundaries (`app/services/*.py`) are already split so each can become its own microservice behind a real event bus. |

## Project layout

```
backend/
  app/
    main.py                  FastAPI app, CORS, router mounting
    database.py               SQLAlchemy engine/session (SQLite by default)
    models.py                 Application, Document, AuditLog ORM models
    schemas.py                Pydantic request/response models
    rules/policy_v1.yaml      Versioned, editable policy configuration
    services/
      data_integration.py      Bureau / AA / e-KYC / GST / sanctions (mocked adapters)
      eligibility.py            Deterministic policy engine (CIBIL, FOIR, LTV, tenure)
      fraud_kyc.py               Fraud/KYC/AML checks + velocity screening
      document_property.py       OCR/vision extraction, income cross-verify, AVM
      risk_scoring.py            ML probability-of-default + reason codes
      compliance.py               Reason-code → regulation traceability map
      decision.py                 Final APPROVE / REJECT / REFER logic
      audit.py                    Appends hash-chained audit records
    routers/applications.py    Ingestion Gateway + full pipeline wiring
    utils/hash_chain.py        SHA-256 hash-chain + verification
  requirements.txt
```

## Swapping in Postgres

Change `SQLALCHEMY_DATABASE_URL` in `app/database.py` to a Postgres DSN,
e.g. `postgresql+psycopg2://user:pass@host:5432/underwriting`, and add
`psycopg2-binary` to `requirements.txt`.

## Next steps for a production build

- Replace synchronous `/run` with an event-driven workflow (Kafka topics
  per stage, or Temporal.io workflow) so Data Integration Hub calls run in
  true parallel and the Decision Orchestrator reacts to events.
- Swap mocked adapters for real CIBIL/CRIF, AA, UIDAI, GST integrations.
- Load a versioned, pre-trained risk model from a model registry instead
  of training inline at import time.
- Add field-level encryption for PII (PAN, Aadhaar) at rest, and OAuth2
  auth on every endpoint.
- Persist the audit log to an append-only store (or anchor periodic
  hash-chain checkpoints externally) for regulator-grade tamper evidence.
