import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  FileCheck2,
  Home,
  RotateCcw,
  UserCheck,
  XCircle
} from 'lucide-react';
import {
  ApplicationFormInput,
  calculateMonthlyEmi,
  ConsentRecord,
  DocumentRecord,
  evaluateApplication,
  formatINR,
  MortgageApplication,
  PolicyRuleConfig,
  validateApplicationForm
} from '../../engine/underwriting';
import {
  APPLICANT_PRESETS,
  ApplicantScenarioPreset,
  createDefaultConsents,
  createDocumentsForIncome
} from '../../engine/seedData';
import { DocumentUploader } from './DocumentUploader';
import { ConsentModal } from './ConsentModal';
import { StepperStatus } from './StepperStatus';
import { ReasonCodeCard } from './ReasonCodeCard';

interface ApplicantPortalProps {
  activePolicy: PolicyRuleConfig;
  onApplicationSubmitted: (app: MortgageApplication) => void;
  onInspectInUnderwriterView: (applicationId: string) => void;
}

type ApplicantWizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export const ApplicantPortal: React.FC<ApplicantPortalProps> = ({
  activePolicy,
  onApplicationSubmitted,
  onInspectInUnderwriterView
}) => {
  const [step, setStep] = useState<ApplicantWizardStep>(1);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(APPLICANT_PRESETS[0].id);
  const [form, setForm] = useState<ApplicationFormInput>(APPLICANT_PRESETS[0].form);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<DocumentRecord[]>(() =>
    createDocumentsForIncome(
      APPLICANT_PRESETS[0].form.netMonthlyIncome,
      APPLICANT_PRESETS[0].form.propertyValue,
      APPLICANT_PRESETS[0].form.pan,
      true
    )
  );
  const [consents, setConsents] = useState<ConsentRecord[]>(() => createDefaultConsents(true));
  const [submittedApp, setSubmittedApp] = useState<MortgageApplication | null>(null);
  const [eSigned, setESigned] = useState<boolean>(false);

  // Live pre-calculation for transparency in form header
  const liveRate =
    form.loanType === 'HOME_LOAN'
      ? activePolicy.interestRateHomeLoan
      : activePolicy.interestRateLap;
  const liveEmi = calculateMonthlyEmi(
    form.requestedLoanAmount,
    liveRate,
    form.requestedTenureMonths
  );
  const liveFoir =
    form.netMonthlyIncome > 0
      ? (((form.existingMonthlyEmi + liveEmi) / form.netMonthlyIncome) * 100).toFixed(1)
      : '0.0';
  const liveLtv =
    form.propertyValue > 0
      ? ((form.requestedLoanAmount / form.propertyValue) * 100).toFixed(1)
      : '0.0';

  const applyPreset = (preset: ApplicantScenarioPreset) => {
    setSelectedPresetId(preset.id);
    setForm(preset.form);
    setFormErrors({});
    setDocuments(
      createDocumentsForIncome(
        preset.form.netMonthlyIncome,
        preset.form.propertyValue,
        preset.form.pan,
        true
      )
    );
    setConsents(createDefaultConsents(true));
    setESigned(false);
  };

  const handleFieldChange = <K extends keyof ApplicationFormInput>(
    field: K,
    value: ApplicationFormInput[K]
  ) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (field === 'netMonthlyIncome' || field === 'propertyValue' || field === 'pan') {
      setDocuments(
        createDocumentsForIncome(
          field === 'netMonthlyIncome' ? (value as number) : updated.netMonthlyIncome,
          field === 'propertyValue' ? (value as number) : updated.propertyValue,
          field === 'pan' ? (value as string) : updated.pan,
          true
        )
      );
    }
  };

  const handleProceedFromForm = () => {
    const errors = validateApplicationForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    setFormErrors({});
    setStep(3);
  };

  const handleUpdateDocument = (docId: string, updates: Partial<DocumentRecord>) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, ...updates } : d))
    );
  };

  const handleConfirmAllDocuments = () => {
    setDocuments((prev) => prev.map((d) => ({ ...d, isConfirmed: true })));
  };

  const handleToggleConsent = (sourceId: ConsentRecord['sourceId']) => {
    const now = '2026-11-12 09:45 IST';
    setConsents((prev) =>
      prev.map((c) =>
        c.sourceId === sourceId
          ? { ...c, granted: !c.granted, timestamp: !c.granted ? now : null }
          : c
      )
    );
  };

  const handleGrantAllConsents = () => {
    const now = '2026-11-12 09:45 IST';
    setConsents((prev) => prev.map((c) => ({ ...c, granted: true, timestamp: now })));
  };

  const handleRunUnderwriting = () => {
    const result = evaluateApplication(form, activePolicy, documents, consents);
    const newApp: MortgageApplication = {
      ...form,
      id: `HHF-2026-${Math.floor(9100 + Math.random() * 899)}`,
      submittedAt: '2026-11-12 09:48 IST',
      documents,
      consents,
      policyVersionUsed: activePolicy.version,
      result
    };
    setSubmittedApp(newApp);
    onApplicationSubmitted(newApp);
    setStep(5);
  };

  const handleStartNewApplication = () => {
    setSubmittedApp(null);
    setESigned(false);
    setStep(1);
  };

  return (
    <div className="space-y-8">
      {/* Top Scenario Quick-Loader & Progress Stepper Bar */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-5">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="shrink-0">
            <div className="flex items-center gap-2 text-xs text-slate-500 whitespace-nowrap">
              <span>Self-Serve Digital Mortgage Onboarding</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Active Engine Policy: {activePolicy.version}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1 whitespace-nowrap">
              Applicant Self-Serve Underwriting Portal
            </h1>
          </div>

          {/* Interactive Scenario Presets */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-slate-500 mr-1 whitespace-nowrap">
              Demo Scenarios:
            </span>
            {APPLICANT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  selectedPresetId === preset.id
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* 6-Step Progress Navigation */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { num: 1, label: '01. Loan Type' },
            { num: 2, label: '02. Application Form' },
            { num: 3, label: '03. Document OCR' },
            { num: 4, label: '04. Digital Consent' },
            { num: 5, label: '05. Live Pipeline' },
            { num: 6, label: '06. Decision' }
          ].map((item) => {
            const isCurrent = step === item.num;
            const isPast = step > item.num;
            const canClick =
              item.num <= 4 || (submittedApp !== null && (item.num === 5 || item.num === 6));
            return (
              <button
                key={item.num}
                type="button"
                disabled={!canClick}
                onClick={() => canClick && setStep(item.num as ApplicantWizardStep)}
                className={`px-3 py-2.5 rounded-lg text-left border transition-colors ${
                  isCurrent
                    ? 'bg-slate-900 text-white border-slate-900'
                    : isPast
                    ? 'bg-emerald-50 text-emerald-950 border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                    : canClick
                    ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 cursor-pointer'
                    : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                }`}
              >
                <p className="text-xs font-mono font-semibold whitespace-nowrap truncate">
                  {item.label}
                </p>
              </button>
            );
          })}
        </div>

        {/* Live Financial Telemetry Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-500">Selected Product & Rate</span>
            <p className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
              {form.loanType === 'HOME_LOAN' ? 'Home Loan' : 'Loan Against Property'} · {liveRate}% p.a.
            </p>
          </div>
          <div>
            <span className="text-slate-500">Estimated Monthly EMI</span>
            <p className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
              {formatINR(liveEmi)} / mo ({form.requestedTenureMonths}m)
            </p>
          </div>
          <div>
            <span className="text-slate-500">Projected FOIR (Debt Burden)</span>
            <p className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
              {liveFoir}% (Policy max:{' '}
              {form.employmentType === 'SALARIED'
                ? activePolicy.maxFoirSalaried
                : activePolicy.maxFoirSelfEmployed}
              %)
            </p>
          </div>
          <div>
            <span className="text-slate-500">Projected Collateral LTV</span>
            <p className="font-mono tabular-nums font-semibold text-slate-900 mt-0.5">
              {liveLtv}% (Policy max:{' '}
              {form.loanType === 'HOME_LOAN'
                ? activePolicy.maxLtvHomeLoan
                : activePolicy.maxLtvLap}
              %)
            </p>
          </div>
        </div>
      </div>

      {/* STEP 1: LOAN TYPE SELECTION */}
      {step === 1 && (
        <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-6">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">
              01. Select Mortgage Product Type
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Policy rules, LTV ceilings, and base interest spreads adjust automatically by product category.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              type="button"
              onClick={() => handleFieldChange('loanType', 'HOME_LOAN')}
              className={`p-6 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                form.loanType === 'HOME_LOAN'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-900 border-slate-200 hover:border-slate-400'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Home
                    className={`w-6 h-6 ${
                      form.loanType === 'HOME_LOAN' ? 'text-emerald-400' : 'text-slate-700'
                    }`}
                  />
                  <span className="text-xs font-mono tabular-nums">
                    Rate: {activePolicy.interestRateHomeLoan}% p.a. · Max LTV: {activePolicy.maxLtvHomeLoan}%
                  </span>
                </div>
                <h3 className="text-lg font-semibold">Retail Home Loan (Purchase / Construction)</h3>
                <p
                  className={`text-sm ${
                    form.loanType === 'HOME_LOAN' ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  For purchase of ready residential flats, under-construction RERA-approved homes, or self-construction on residential plots.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-700/20 flex items-center justify-between text-xs font-mono">
                <span>Tenure up to 30 Years (360m)</span>
                <span>{form.loanType === 'HOME_LOAN' ? 'Selected ✓' : 'Select Product →'}</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleFieldChange('loanType', 'LAP')}
              className={`p-6 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                form.loanType === 'LAP'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-900 border-slate-200 hover:border-slate-400'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Building2
                    className={`w-6 h-6 ${
                      form.loanType === 'LAP' ? 'text-emerald-400' : 'text-slate-700'
                    }`}
                  />
                  <span className="text-xs font-mono tabular-nums">
                    Rate: {activePolicy.interestRateLap}% p.a. · Max LTV: {activePolicy.maxLtvLap}%
                  </span>
                </div>
                <h3 className="text-lg font-semibold">Loan Against Property (LAP / MSME Equity)</h3>
                <p
                  className={`text-sm ${
                    form.loanType === 'LAP' ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  Unlock working capital or business expansion liquidity against unencumbered residential or commercial real estate collateral.
                </p>
              </div>
              <div className="pt-3 border-t border-slate-700/20 flex items-center justify-between text-xs font-mono">
                <span>Tenure up to 15 Years (180m)</span>
                <span>{form.loanType === 'LAP' ? 'Selected ✓' : 'Select Product →'}</span>
              </div>
            </button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="text-xs text-slate-600">
              Current Preset Loaded: <strong className="text-slate-900">{form.applicantName}</strong> ({form.city})
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRunUnderwriting}
                className="px-4 py-2.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Quick-Run Selected Scenario
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Continue to Application Form
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: APPLICATION FORM */}
      {step === 2 && (
        <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-6">
          <div className="pb-4 border-b border-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">
              02. Applicant, Income, Bureau & Property Particulars
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Enter or adjust borrower financial details to see how the underwriting engine evaluates FOIR, LTV, and bureau parameters.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div>
              <label htmlFor="applicantName" className="block text-xs font-medium text-slate-700 mb-1">
                Applicant Full Name (as per PAN)
              </label>
              <input
                id="applicantName"
                type="text"
                value={form.applicantName}
                onChange={(e) => handleFieldChange('applicantName', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {formErrors.applicantName && (
                <p className="text-xs text-red-600 mt-1">{formErrors.applicantName}</p>
              )}
            </div>

            <div>
              <label htmlFor="age" className="block text-xs font-medium text-slate-700 mb-1">
                Applicant Age (Years)
              </label>
              <input
                id="age"
                type="number"
                value={form.age}
                onChange={(e) => handleFieldChange('age', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {formErrors.age && <p className="text-xs text-red-600 mt-1">{formErrors.age}</p>}
            </div>

            <div>
              <label htmlFor="pan" className="block text-xs font-medium text-slate-700 mb-1">
                Permanent Account Number (PAN)
              </label>
              <input
                id="pan"
                type="text"
                maxLength={10}
                value={form.pan}
                onChange={(e) => handleFieldChange('pan', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm font-mono uppercase bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {formErrors.pan && <p className="text-xs text-red-600 mt-1">{formErrors.pan}</p>}
            </div>

            <div>
              <label htmlFor="mobile" className="block text-xs font-medium text-slate-700 mb-1">
                Mobile Number (Aadhaar Linked)
              </label>
              <input
                id="mobile"
                type="text"
                maxLength={10}
                value={form.mobile}
                onChange={(e) => handleFieldChange('mobile', e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {formErrors.mobile && (
                <p className="text-xs text-red-600 mt-1">{formErrors.mobile}</p>
              )}
            </div>

            <div>
              <label htmlFor="city" className="block text-xs font-medium text-slate-700 mb-1">
                City / Branch Location
              </label>
              <input
                id="city"
                type="text"
                value={form.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="geographyTier" className="block text-xs font-medium text-slate-700 mb-1">
                Geography Classification
              </label>
              <select
                id="geographyTier"
                value={form.geographyTier}
                onChange={(e) =>
                  handleFieldChange(
                    'geographyTier',
                    e.target.value as ApplicationFormInput['geographyTier']
                  )
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="TIER_1">Tier 1 Metro</option>
                <option value="TIER_2">Tier 2 Urban</option>
                <option value="TIER_3">Tier 3 Semi-Urban</option>
              </select>
            </div>

            <div>
              <label htmlFor="employmentType" className="block text-xs font-medium text-slate-700 mb-1">
                Employment Category
              </label>
              <select
                id="employmentType"
                value={form.employmentType}
                onChange={(e) =>
                  handleFieldChange(
                    'employmentType',
                    e.target.value as ApplicationFormInput['employmentType']
                  )
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="SALARIED">Salaried Professional</option>
                <option value="SELF_EMPLOYED">Self-Employed / MSME Proprietor</option>
              </select>
            </div>

            <div>
              <label htmlFor="employerOrBusinessName" className="block text-xs font-medium text-slate-700 mb-1">
                Employer / Business Entity Name
              </label>
              <input
                id="employerOrBusinessName"
                type="text"
                value={form.employerOrBusinessName}
                onChange={(e) => handleFieldChange('employerOrBusinessName', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="employmentYears" className="block text-xs font-medium text-slate-700 mb-1">
                Occupational Vintage (Years)
              </label>
              <input
                id="employmentYears"
                type="number"
                step="0.5"
                value={form.employmentYears}
                onChange={(e) => handleFieldChange('employmentYears', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="netMonthlyIncome" className="block text-xs font-medium text-slate-700 mb-1">
                Net Monthly Income (₹)
              </label>
              <input
                id="netMonthlyIncome"
                type="number"
                step="5000"
                value={form.netMonthlyIncome}
                onChange={(e) => handleFieldChange('netMonthlyIncome', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {formErrors.netMonthlyIncome && (
                <p className="text-xs text-red-600 mt-1">{formErrors.netMonthlyIncome}</p>
              )}
            </div>

            <div>
              <label htmlFor="existingMonthlyEmi" className="block text-xs font-medium text-slate-700 mb-1">
                Existing Monthly EMIs (₹)
              </label>
              <input
                id="existingMonthlyEmi"
                type="number"
                step="1000"
                value={form.existingMonthlyEmi}
                onChange={(e) => handleFieldChange('existingMonthlyEmi', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="cibilScore" className="block text-xs font-medium text-slate-700 mb-1">
                Simulated CIBIL Score (300–900)
              </label>
              <input
                id="cibilScore"
                type="number"
                min={300}
                max={900}
                value={form.cibilScore}
                onChange={(e) => handleFieldChange('cibilScore', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="requestedLoanAmount" className="block text-xs font-medium text-slate-700 mb-1">
                Requested Loan Amount (₹)
              </label>
              <input
                id="requestedLoanAmount"
                type="number"
                step="100000"
                value={form.requestedLoanAmount}
                onChange={(e) => handleFieldChange('requestedLoanAmount', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {formErrors.requestedLoanAmount && (
                <p className="text-xs text-red-600 mt-1">{formErrors.requestedLoanAmount}</p>
              )}
            </div>

            <div>
              <label htmlFor="propertyValue" className="block text-xs font-medium text-slate-700 mb-1">
                Assessed Property Value (₹)
              </label>
              <input
                id="propertyValue"
                type="number"
                step="100000"
                value={form.propertyValue}
                onChange={(e) => handleFieldChange('propertyValue', Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {formErrors.propertyValue && (
                <p className="text-xs text-red-600 mt-1">{formErrors.propertyValue}</p>
              )}
            </div>

            <div>
              <label htmlFor="requestedTenureMonths" className="block text-xs font-medium text-slate-700 mb-1">
                Loan Tenure (Months)
              </label>
              <input
                id="requestedTenureMonths"
                type="number"
                step="12"
                value={form.requestedTenureMonths}
                onChange={(e) =>
                  handleFieldChange('requestedTenureMonths', Number(e.target.value))
                }
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              {formErrors.requestedTenureMonths && (
                <p className="text-xs text-red-600 mt-1">{formErrors.requestedTenureMonths}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              ← Back to Loan Type
            </button>
            <button
              type="button"
              onClick={handleProceedFromForm}
              className="px-5 py-2.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Proceed to Document Upload & OCR
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DOCUMENT UPLOAD & INLINE OCR PREVIEW */}
      {step === 3 && (
        <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-6">
          <DocumentUploader
            documents={documents}
            onUpdateDocument={handleUpdateDocument}
            onConfirmAll={handleConfirmAllDocuments}
          />
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              ← Back to Form
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="px-5 py-2.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Continue to Digital Consent
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: EXPLICIT CONSENT SCREEN */}
      {step === 4 && (
        <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-6">
          <ConsentModal
            consents={consents}
            onToggleConsent={handleToggleConsent}
            onGrantAll={handleGrantAllConsents}
          />
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              ← Back to Document OCR
            </button>
            <button
              type="button"
              onClick={handleRunUnderwriting}
              className="px-6 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Submit & Run Live Underwriting
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: LIVE STATUS TRACKER */}
      {step === 5 && submittedApp && (
        <div className="p-6 bg-white border border-slate-200 rounded-xl">
          <StepperStatus
            result={submittedApp.result}
            policyVersion={submittedApp.policyVersionUsed}
            onComplete={() => setStep(6)}
          />
        </div>
      )}

      {/* STEP 6: FINAL DECISION SCREEN */}
      {step === 6 && submittedApp && (
        <div className="space-y-6">
          {/* Primary Decision Banner */}
          <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-200">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                  <span>Application ID: {submittedApp.id}</span>
                  <span aria-hidden="true">·</span>
                  <span>Policy: {submittedApp.policyVersionUsed}</span>
                  <span aria-hidden="true">·</span>
                  <span>Evaluated: {submittedApp.submittedAt}</span>
                </div>
                <div className="flex items-center gap-3">
                  {submittedApp.result.outcome === 'APPROVED' && (
                    <CheckCircle2 className="w-7 h-7 text-emerald-700 shrink-0" />
                  )}
                  {submittedApp.result.outcome === 'REFERRED' && (
                    <Clock className="w-7 h-7 text-amber-600 shrink-0" />
                  )}
                  {submittedApp.result.outcome === 'REJECTED' && (
                    <XCircle className="w-7 h-7 text-red-700 shrink-0" />
                  )}
                  <h2 className="text-2xl font-bold text-slate-900">
                    {submittedApp.result.outcome === 'APPROVED' &&
                      'Application Provisionally Sanctioned (Instant Approval)'}
                    {submittedApp.result.outcome === 'REFERRED' &&
                      'Application Referred for Senior Underwriter Appraisal'}
                    {submittedApp.result.outcome === 'REJECTED' &&
                      'Application Declined — Adverse Action Notice (RBI FPC)'}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => onInspectInUnderwriterView(submittedApp.id)}
                  className="px-4 py-2 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Inspect in Underwriter 360° Console →
                </button>
                <button
                  type="button"
                  onClick={handleStartNewApplication}
                  className="px-4 py-2 text-xs font-medium text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Test Another Scenario
                </button>
              </div>
            </div>

            {/* Key Decision Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs text-slate-500">Underwriting Score</span>
                <p className="text-lg font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                  {submittedApp.result.finalScore} / 900
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs text-slate-500">Sanctioned Amount</span>
                <p className="text-lg font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                  {formatINR(submittedApp.result.sanctionedAmount)}
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs text-slate-500">Monthly EMI</span>
                <p className="text-lg font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                  {formatINR(submittedApp.result.calculatedEmi)}
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs text-slate-500">Interest Rate</span>
                <p className="text-lg font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                  {submittedApp.result.interestRate}% p.a.
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs text-slate-500">Computed FOIR</span>
                <p className="text-lg font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                  {submittedApp.result.foirPercent}%
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-xs text-slate-500">Collateral LTV</span>
                <p className="text-lg font-mono tabular-nums font-bold text-slate-900 mt-0.5">
                  {submittedApp.result.ltvPercent}%
                </p>
              </div>
            </div>

            {/* Outcome-Specific Action Box */}
            {submittedApp.result.outcome === 'APPROVED' && (
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-emerald-950 flex items-center gap-2">
                    <FileCheck2 className="w-5 h-5 text-emerald-700" />
                    Digital Sanction Letter Ready for Aadhaar e-Sign
                  </h3>
                  <p className="text-sm text-emerald-900">
                    Sanctioned {formatINR(submittedApp.result.sanctionedAmount)} for {submittedApp.result.tenureMonths} months at {submittedApp.result.interestRate}% p.a. (Processing fee: {formatINR(submittedApp.result.processingFee)}).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setESigned(true)}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {eSigned ? 'Sanction Letter e-Signed ✓' : 'Complete Aadhaar e-Sign & Disbursal'}
                </button>
              </div>
            )}

            {submittedApp.result.outcome === 'REFERRED' && (
              <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-amber-950 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-amber-700" />
                    Assigned to Senior Underwriter: {submittedApp.result.assignedUnderwriter.name}
                  </h3>
                  <p className="text-sm text-amber-900">
                    {submittedApp.result.assignedUnderwriter.role} · {submittedApp.result.assignedUnderwriter.branch}
                  </p>
                  <p className="text-xs font-mono text-amber-800 pt-0.5">
                    Committed Turnaround SLA: Within {submittedApp.result.assignedUnderwriter.slaHours} Hours · Contact: {submittedApp.result.assignedUnderwriter.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onInspectInUnderwriterView(submittedApp.id)}
                  className="px-4 py-2.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Open Underwriter Review Desk →
                </button>
              </div>
            )}
          </div>

          {/* Plain-Language Reason Code Card */}
          <ReasonCodeCard
            outcome={submittedApp.result.outcome}
            reasonCodes={submittedApp.result.reasonCodes}
          />
        </div>
      )}
    </div>
  );
};
