# Frontend — Digitally Automated Mortgage Underwriting Engine
### Problem Statement 2 | Hero Housing Finance Hackathon

## 1. Overview

Two interfaces, one shared design system:

1. **Applicant Portal** — self-serve application submission, document upload, real-time status
2. **Underwriter/Admin Dashboard** — for the `refer`-to-human path, compliance audits, and model/rule governance

Design principle: **transparency at every step** — the applicant always knows *why* they're at a given stage, and the underwriter always sees *why* the engine decided what it decided.

---

## 2. Applicant Portal

### 2.1 Flow
1. **Loan type selection** — Home Loan / LAP
2. **Application form** — personal, income, employment, loan amount, property details
3. **Document upload** — salary slips, bank statements, ITR/Form 16, property papers, ID proof (drag-and-drop, camera capture for mobile)
4. **Consent screen** — explicit consent for bureau pull, Account Aggregator data fetch, KYC verification (required for compliance/Fair Practices Code)
5. **Live status tracker** — stepper UI showing: Submitted → Data Verified → Risk Assessed → Compliance Checked → Decision, each step updating in real time via WebSocket/polling
6. **Decision screen**:
   - **Approved**: loan terms, next steps (e-sign, disbursal)
   - **Rejected**: plain-language reason codes (required for Fair Practices Code — adverse action must be explainable to the customer, not just the regulator)
   - **Referred**: expected timeline, assigned underwriter contact

### 2.2 Key UI components
- `<StepperStatus />` — real-time pipeline visualization
- `<DocumentUploader />` — with inline OCR preview ("we read your salary as ₹X — confirm?") to catch extraction errors early
- `<ReasonCodeCard />` — human-readable explanation card (not raw SHAP values) — e.g., "Your application was declined primarily due to: high existing EMI burden (40% weight), limited credit history (25% weight)"
- `<ConsentModal />` — granular, revocable consent toggles per data source

---

## 3. Underwriter / Admin Dashboard

### 3.1 Core views

| View | Purpose |
|---|---|
| **Queue view** | Lists all `refer`-to-human applications, sorted by risk/urgency |
| **Application detail** | Full 360° view: applicant data, all service outputs (eligibility, fraud, risk, compliance), with a visual decision tree showing exactly which rule/model fired |
| **Explainability panel** | SHAP waterfall chart per decision — which factors pushed the score up/down and by how much |
| **Compliance audit view** | Filterable log of every decision ever made, searchable by date/officer/outcome, exportable for regulator audits |
| **Bias/fairness monitor** | Dashboard tracking approval rates across proxy segments (geography, loan size, applicant type) to flag unintended disparate impact over time |
| **Model/rule governance** | Version history of policy rules and ML model deployments, with rollback capability |

### 3.2 Key UI components
- `<DecisionTree />` — visual flow of which rule/check passed/failed/triggered referral
- `<SHAPWaterfall />` — chart component rendering per-decision factor contributions
- `<AuditLogTable />` — virtualized table for large-scale audit queries, with hash-verification indicator (tamper-evidence check)
- `<FairnessDashboard />` — approval-rate comparison charts across segments
- `<RuleVersionDiff />` — side-by-side diff viewer when policy rules are updated

---

## 4. Tech stack

- **Framework**: React + Vite + TypeScript
- **Styling**: Tailwind CSS
- **State/data**: TanStack Query (for real-time polling/websocket sync with backend)
- **Charts**: Recharts or D3 (for SHAP waterfall, fairness dashboards)
- **Forms**: React Hook Form + Zod validation
- **Real-time updates**: WebSocket (or Server-Sent Events) for live status tracker
- **Deployment**: Vercel

---

## 5. Covering the frontend's share of the 8 points

| # | Requirement | Frontend contribution |
|---|---|---|
| 1 | Integrate data sources | Consent UI + visibility into which sources were pulled (transparency layer) |
| 2 | Eligibility & policy | Real-time stepper shows policy checks passing/failing live |
| 5 | Documents & property | Upload UI with inline OCR confirmation, reduces extraction errors before they hit the backend |
| 7 | Instant decisioning | Live status tracker gives the "instant" feel even while backend processes async |
| 8 | Explainability & governance | Reason-code cards (applicant-facing) + SHAP waterfall + audit log (underwriter-facing) are the primary UI expression of this requirement |

---

## 6. Innovation highlights to pitch

1. **Dual-transparency design** — both applicant and underwriter see *why*, in language appropriate to each audience (plain English vs technical SHAP values)
2. **Inline OCR confirmation** — catches document extraction errors before they propagate into a wrong decision, reducing false rejects
3. **Fairness dashboard as a first-class UI feature** — most hackathon teams only build the happy-path decision screen; a bias-monitoring view signals real regulatory maturity
4. **Tamper-evidence indicator in the audit log UI** — visually shows auditors that records haven't been altered, directly answering "audit-ready"
