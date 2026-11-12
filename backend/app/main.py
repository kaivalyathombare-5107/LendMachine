"""
Digitally Automated Mortgage Underwriting Engine — API entrypoint.

Run with:
    uvicorn app.main:app --reload --port 8000

Docs at http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import applications

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Digitally Automated Mortgage Underwriting Engine",
    description=(
        "Microservice-style, event-driven underwriting engine: intake -> "
        "data integration -> eligibility & policy -> fraud/KYC/AML -> risk "
        "scoring -> document/property verification -> compliance -> decision "
        "-> explainability & audit."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(applications.router)


@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok"}


@app.get("/", tags=["meta"])
def root():
    return {
        "service": "underwriting-engine",
        "docs": "/docs",
        "pipeline": [
            "INGESTION",
            "DATA_INTEGRATION",
            "ELIGIBILITY_POLICY",
            "DOCUMENT_PROPERTY_VERIFICATION",
            "FRAUD_KYC_AML",
            "RISK_SCORING",
            "COMPLIANCE_CHECK",
            "FINAL_DECISION",
        ],
    }
