export type LoanType = 'HOME_LOAN' | 'LAP';
export type EmploymentType = 'SALARIED' | 'SELF_EMPLOYED';
export type GeographyTier = 'TIER_1' | 'TIER_2' | 'TIER_3';
export type DecisionOutcome = 'APPROVED' | 'REFERRED' | 'REJECTED';

export interface DocumentRecord {
  id: string;
  category: 'SALARY_SLIP' | 'BANK_STATEMENT' | 'ITR_FORM16' | 'PROPERTY_DEED' | 'KYC_ID';
  title: string;
  fileName: string;
  uploadedAt: string;
  ocrFieldLabel: string;
  ocrExtractedValue: string;
  ocrConfirmedValue: string;
  ocrNumericValue?: number;
  ocrConfidence: number;
  isConfirmed: boolean;
  discrepancyNote?: string;
}

export interface ConsentRecord {
  sourceId: 'BUREAU_CIBIL' | 'ACCOUNT_AGGREGATOR' | 'CKYC_AADHAAR' | 'PROPERTY_CERSAI';
  label: string;
  provider: string;
  purpose: string;
  regulatoryCitation: string;
  required: boolean;
  granted: boolean;
  timestamp: string | null;
}

export interface PolicyRuleConfig {
  version: string;
  label: string;
  status: 'ACTIVE' | 'STAGED' | 'ARCHIVED';
  deployedAt: string;
  author: string;
  releaseNotes: string;
  maxFoirSalaried: number;       // e.g. 55%
  maxFoirSelfEmployed: number;   // e.g. 60%
  referFoirBuffer: number;       // e.g. +8% above maxFoir goes to REFER instead of REJECT
  maxLtvHomeLoan: number;        // e.g. 80%
  maxLtvLap: number;             // e.g. 65%
  referLtvBuffer: number;        // e.g. +5% buffer
  minCibilApprove: number;       // e.g. 725
  minCibilRefer: number;         // e.g. 650
  maxAgeAtMaturity: number;      // e.g. 65 years
  minEmploymentYears: number;    // e.g. 2 years
  maxBouncesApprove: number;     // e.g. 0
  maxBouncesRefer: number;       // e.g. 2
  interestRateHomeLoan: number;  // e.g. 8.75%
  interestRateLap: number;       // e.g. 10.45%
}

export interface DecisionNodeResult {
  id: string;
  category: 'DATA_VERIFICATION' | 'ELIGIBILITY' | 'RISK_MODEL' | 'FRAUD_CHECK' | 'COMPLIANCE';
  ruleCode: string;
  label: string;
  thresholdText: string;
  actualValueText: string;
  status: 'PASS' | 'REFER' | 'FAIL';
  impactWeight: number;
  detail: string;
}

export interface ShapContribution {
  feature: string;
  category: string;
  rawValue: string;
  contribution: number; // positive or negative delta from baseScore (600)
  plainEnglishReason: string;
  weightPercent: number;
}

export interface ReasonCodeItem {
  code: string;
  factor: string;
  weightPercent: number;
  plainLanguageExplanation: string;
  actionableAdvice: string;
  direction: 'NEGATIVE' | 'POSITIVE' | 'NEUTRAL';
}

export interface UnderwritingResult {
  outcome: DecisionOutcome;
  finalScore: number; // 300 to 900 scale
  baseScore: number;  // 600 baseline
  calculatedEmi: number;
  foirPercent: number;
  ltvPercent: number;
  ageAtMaturity: number;
  sanctionedAmount: number;
  interestRate: number;
  tenureMonths: number;
  processingFee: number;
  decisionNodes: DecisionNodeResult[];
  shapWaterfall: ShapContribution[];
  reasonCodes: ReasonCodeItem[];
  assignedUnderwriter: {
    name: string;
    role: string;
    branch: string;
    email: string;
    slaHours: number;
  };
  fpcCompliant: boolean;
}

export interface ApplicationFormInput {
  applicantName: string;
  age: number;
  pan: string;
  mobile: string;
  email: string;
  city: string;
  geographyTier: GeographyTier;
  loanType: LoanType;
  employmentType: EmploymentType;
  employerOrBusinessName: string;
  employmentYears: number;
  netMonthlyIncome: number;
  existingMonthlyEmi: number;
  cibilScore: number;
  creditHistoryMonths: number;
  bounceCountLast12M: number;
  requestedLoanAmount: number;
  requestedTenureMonths: number;
  propertyValue: number;
  propertyCity: string;
  propertyType: 'RESIDENTIAL_READY' | 'UNDER_CONSTRUCTION' | 'COMMERCIAL_UNIT' | 'INDEPENDENT_HOUSE';
  isTitleClear: boolean;
}

export interface MortgageApplication extends ApplicationFormInput {
  id: string;
  submittedAt: string;
  documents: DocumentRecord[];
  consents: ConsentRecord[];
  policyVersionUsed: string;
  result: UnderwritingResult;
  underwriterOverride?: {
    officerName: string;
    previousOutcome: DecisionOutcome;
    newOutcome: DecisionOutcome;
    notes: string;
    overriddenAt: string;
  };
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  applicationId: string;
  applicantName: string;
  loanType: LoanType;
  officerOrEngine: string;
  outcome: DecisionOutcome;
  score: number;
  policyVersion: string;
  prevHash: string;
  recordHash: string;
  details: string;
}

export interface FairnessSegmentMetric {
  segmentGroup: 'Geography Tier' | 'Loan Ticket Size' | 'Applicant Type';
  segmentLabel: string;
  totalApplications: number;
  approvedCount: number;
  referredCount: number;
  rejectedCount: number;
  approvalRate: number; // 0 to 100
  avgScore: number;
  disparateImpactRatio: number; // ratio vs reference highest-approval group in segmentGroup (e.g. 0.86)
  status: 'PASS' | 'WATCH' | 'ADVERSE_IMPACT';
}

export interface RuleDiffItem {
  fieldKey: keyof PolicyRuleConfig;
  label: string;
  unit: string;
  oldValue: string | number;
  newValue: string | number;
  changed: boolean;
  riskDirection: 'STRICTER' | 'RELAXED' | 'UNCHANGED';
}

export function formatINR(amount: number): string {
  if (!Number.isFinite(amount)) return '₹0';
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

export function calculateMonthlyEmi(
  principal: number,
  annualRatePercent: number,
  tenureMonths: number
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualRatePercent <= 0) return Math.round(principal / tenureMonths);
  const monthlyRate = annualRatePercent / 12 / 100;
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);
  return Math.round(emi);
}

export function validateApplicationForm(input: ApplicationFormInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.applicantName || input.applicantName.trim().length < 3) {
    errors.applicantName = 'Applicant full name must be at least 3 characters.';
  }
  if (!input.age || input.age < 21 || input.age > 70) {
    errors.age = 'Applicant age must be between 21 and 70 years.';
  }
  if (!input.pan || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(input.pan.trim())) {
    errors.pan = 'Enter a valid 10-character PAN (e.g., ABCDE1234F).';
  }
  if (!input.mobile || !/^[6-9]\d{9}$/.test(input.mobile.trim())) {
    errors.mobile = 'Enter a valid 10-digit Indian mobile number.';
  }
  if (!input.netMonthlyIncome || input.netMonthlyIncome < 15000) {
    errors.netMonthlyIncome = 'Net monthly income must be at least ₹15,000.';
  }
  if (input.existingMonthlyEmi < 0) {
    errors.existingMonthlyEmi = 'Existing monthly EMI cannot be negative.';
  }
  if (!input.requestedLoanAmount || input.requestedLoanAmount < 300000) {
    errors.requestedLoanAmount = 'Minimum loan amount is ₹3,00,000.';
  }
  if (!input.propertyValue || input.propertyValue < 500000) {
    errors.propertyValue = 'Market property value must be at least ₹5,00,000.';
  }
  if (input.requestedTenureMonths < 12 || input.requestedTenureMonths > 360) {
    errors.requestedTenureMonths = 'Tenure must be between 12 and 360 months.';
  }
  return errors;
}

export function evaluateApplication(
  input: ApplicationFormInput,
  policy: PolicyRuleConfig,
  documents: DocumentRecord[],
  consents: ConsentRecord[]
): UnderwritingResult {
  const baseScore = 600;
  const interestRate =
    input.loanType === 'HOME_LOAN' ? policy.interestRateHomeLoan : policy.interestRateLap;

  // Use OCR confirmed income if SALARY_SLIP or ITR_FORM16 has a numeric confirmed value
  const salaryDoc = documents.find(
    (d) => d.category === 'SALARY_SLIP' || d.category === 'ITR_FORM16'
  );
  const effectiveMonthlyIncome =
    salaryDoc && salaryDoc.isConfirmed && salaryDoc.ocrNumericValue && salaryDoc.ocrNumericValue > 0
      ? salaryDoc.ocrNumericValue
      : input.netMonthlyIncome;

  const calculatedEmi = calculateMonthlyEmi(
    input.requestedLoanAmount,
    interestRate,
    input.requestedTenureMonths
  );

  const totalMonthlyObligation = input.existingMonthlyEmi + calculatedEmi;
  const foirPercent =
    effectiveMonthlyIncome > 0
      ? Number(((totalMonthlyObligation / effectiveMonthlyIncome) * 100).toFixed(1))
      : 100;

  const ltvPercent =
    input.propertyValue > 0
      ? Number(((input.requestedLoanAmount / input.propertyValue) * 100).toFixed(1))
      : 100;

  const ageAtMaturity = Number((input.age + input.requestedTenureMonths / 12).toFixed(1));

  const maxFoirAllowed =
    input.employmentType === 'SALARIED' ? policy.maxFoirSalaried : policy.maxFoirSelfEmployed;
  const maxLtvAllowed =
    input.loanType === 'HOME_LOAN' ? policy.maxLtvHomeLoan : policy.maxLtvLap;

  const decisionNodes: DecisionNodeResult[] = [];
  const rawShap: Omit<ShapContribution, 'weightPercent'>[] = [];

  // 1. Consent & Fair Practices Compliance Check
  const requiredConsentsGranted = consents
    .filter((c) => c.required)
    .every((c) => c.granted);
  decisionNodes.push({
    id: 'NODE_CONSENT_FPC',
    category: 'COMPLIANCE',
    ruleCode: 'RBI-FPC-101',
    label: 'Explicit Data Pull & CKYC Consent',
    thresholdText: '100% Mandatory Consents Signed',
    actualValueText: requiredConsentsGranted ? 'Verified (Bureau + AA + CKYC)' : 'Missing Mandatory Consent',
    status: requiredConsentsGranted ? 'PASS' : 'FAIL',
    impactWeight: 15,
    detail: requiredConsentsGranted
      ? 'Customer granted explicit digital consent with audit timestamp under RBI Fair Practices Code.'
      : 'Cannot complete automated bureau/AA pull without explicit borrower consent.'
  });

  // 2. OCR Document Confirmation Check
  const unconfirmedDocs = documents.filter((d) => !d.isConfirmed);
  const incomeMismatchPct =
    effectiveMonthlyIncome > 0
      ? Math.abs(input.netMonthlyIncome - effectiveMonthlyIncome) / effectiveMonthlyIncome
      : 0;
  const ocrStatus: 'PASS' | 'REFER' | 'FAIL' =
    unconfirmedDocs.length > 0 || incomeMismatchPct > 0.15 ? 'REFER' : 'PASS';
  decisionNodes.push({
    id: 'NODE_OCR_DOC',
    category: 'DATA_VERIFICATION',
    ruleCode: 'DOC-OCR-204',
    label: 'Inline OCR Extraction & Income Cross-Match',
    thresholdText: 'All Docs Confirmed & Variance <= 15%',
    actualValueText:
      unconfirmedDocs.length === 0
        ? `Confirmed (${documents.length}/${documents.length} docs)`
        : `${unconfirmedDocs.length} Unconfirmed Doc(s)`,
    status: ocrStatus,
    impactWeight: 15,
    detail:
      ocrStatus === 'PASS'
        ? `Applicant confirmed inline OCR values across ${documents.length} documents with zero unverified discrepancies.`
        : 'Document OCR confirmation pending or declared income diverges from extracted slip.'
  });

  // 3. FOIR (Fixed Obligation to Income Ratio) Check
  let foirStatus: 'PASS' | 'REFER' | 'FAIL' = 'PASS';
  let foirDelta = 0;
  if (foirPercent <= maxFoirAllowed) {
    foirStatus = 'PASS';
    foirDelta = Math.round((maxFoirAllowed - foirPercent) * 2.8) + 20;
  } else if (foirPercent <= maxFoirAllowed + policy.referFoirBuffer) {
    foirStatus = 'REFER';
    foirDelta = -Math.round((foirPercent - maxFoirAllowed) * 6.5) - 15;
  } else {
    foirStatus = 'FAIL';
    foirDelta = -Math.round((foirPercent - maxFoirAllowed) * 7.5) - 45;
  }

  decisionNodes.push({
    id: 'NODE_FOIR',
    category: 'ELIGIBILITY',
    ruleCode: 'POL-FOIR-301',
    label: 'Fixed Obligation to Income Ratio (FOIR)',
    thresholdText: `<= ${maxFoirAllowed}% (${input.employmentType === 'SALARIED' ? 'Salaried' : 'Self-Employed'})`,
    actualValueText: `${foirPercent}% (EMI: ${formatINR(totalMonthlyObligation)}/mo)`,
    status: foirStatus,
    impactWeight: 30,
    detail:
      foirStatus === 'PASS'
        ? `Total EMI burden (${foirPercent}%) is well within the ${maxFoirAllowed}% policy ceiling.`
        : foirStatus === 'REFER'
        ? `FOIR of ${foirPercent}% exceeds standard ${maxFoirAllowed}% cap but falls within +${policy.referFoirBuffer}% underwriter referral band.`
        : `FOIR of ${foirPercent}% breaches maximum permissible debt service ratio (${maxFoirAllowed + policy.referFoirBuffer}%).`
  });

  rawShap.push({
    feature: 'FOIR / EMI Burden',
    category: 'Affordability',
    rawValue: `${foirPercent}% of ₹${Math.round(effectiveMonthlyIncome).toLocaleString('en-IN')}`,
    contribution: Math.max(-140, Math.min(95, foirDelta)),
    plainEnglishReason:
      foirDelta >= 0
        ? `Healthy debt-to-income ratio (${foirPercent}% vs ${maxFoirAllowed}% limit) supports timely repayment.`
        : `High monthly EMI burden (${foirPercent}% of net income vs ${maxFoirAllowed}% policy threshold).`
  });

  // 4. Credit Bureau (CIBIL Score & History)
  let cibilStatus: 'PASS' | 'REFER' | 'FAIL' = 'PASS';
  let cibilDelta = 0;
  if (input.cibilScore >= policy.minCibilApprove && input.creditHistoryMonths >= 24) {
    cibilStatus = 'PASS';
    cibilDelta = Math.round((input.cibilScore - policy.minCibilApprove) * 1.1) + 35;
  } else if (input.cibilScore >= policy.minCibilRefer) {
    cibilStatus = 'REFER';
    cibilDelta =
      input.cibilScore >= policy.minCibilApprove
        ? -25 // thin credit file (<24m)
        : -Math.round((policy.minCibilApprove - input.cibilScore) * 1.2) - 15;
  } else {
    cibilStatus = 'FAIL';
    cibilDelta = -Math.round((policy.minCibilApprove - input.cibilScore) * 1.3) - 35;
  }

  decisionNodes.push({
    id: 'NODE_CIBIL',
    category: 'RISK_MODEL',
    ruleCode: 'RSK-BUR-401',
    label: 'Bureau Credit Score & Vintage',
    thresholdText: `>= ${policy.minCibilApprove} & >= 24m Vintage`,
    actualValueText: `${input.cibilScore} (${input.creditHistoryMonths}m vintage)`,
    status: cibilStatus,
    impactWeight: 25,
    detail:
      cibilStatus === 'PASS'
        ? `Strong bureau score (${input.cibilScore}) with ${input.creditHistoryMonths} months established repayment track record.`
        : cibilStatus === 'REFER'
        ? `Bureau score (${input.cibilScore}) or credit vintage (${input.creditHistoryMonths}m) requires manual credit appraisal.`
        : `Bureau score (${input.cibilScore}) is below minimum policy floor of ${policy.minCibilRefer}.`
  });

  rawShap.push({
    feature: 'Bureau Score & Vintage',
    category: 'Credit History',
    rawValue: `CIBIL ${input.cibilScore} · ${input.creditHistoryMonths}m`,
    contribution: Math.max(-130, Math.min(110, cibilDelta)),
    plainEnglishReason:
      cibilDelta >= 0
        ? `Strong credit bureau score (${input.cibilScore}) and ${input.creditHistoryMonths}-month bureau vintage.`
        : input.cibilScore < policy.minCibilApprove
        ? `Sub-prime credit bureau score (${input.cibilScore} vs ${policy.minCibilApprove} benchmark).`
        : `Limited credit history duration (${input.creditHistoryMonths} months vs 24-month benchmark).`
  });

  // 5. LTV (Loan-to-Value) & Property Title Check
  let ltvStatus: 'PASS' | 'REFER' | 'FAIL' = 'PASS';
  let ltvDelta = 0;
  if (!input.isTitleClear) {
    ltvStatus = 'FAIL';
    ltvDelta = -95;
  } else if (ltvPercent <= maxLtvAllowed) {
    ltvStatus = 'PASS';
    ltvDelta = Math.round((maxLtvAllowed - ltvPercent) * 1.6) + 15;
  } else if (ltvPercent <= maxLtvAllowed + policy.referLtvBuffer) {
    ltvStatus = 'REFER';
    ltvDelta = -35;
  } else {
    ltvStatus = 'FAIL';
    ltvDelta = -85;
  }

  decisionNodes.push({
    id: 'NODE_LTV_PROP',
    category: 'ELIGIBILITY',
    ruleCode: 'POL-LTV-305',
    label: 'Collateral LTV & CERSAI Title Search',
    thresholdText: `<= ${maxLtvAllowed}% LTV & Clear Title`,
    actualValueText: `${ltvPercent}% LTV · ${input.isTitleClear ? 'Clear CERSAI Title' : 'Title Encumbrance'}`,
    status: ltvStatus,
    impactWeight: 20,
    detail:
      ltvStatus === 'PASS'
        ? `Property LTV (${ltvPercent}%) complies with NHB/RBI norms (${maxLtvAllowed}% max) with clean CERSAI title.`
        : ltvStatus === 'REFER'
        ? `LTV (${ltvPercent}%) slightly exceeds ${maxLtvAllowed}% standard norm; eligible for collateral margin review.`
        : !input.isTitleClear
        ? 'Property title shows unresolved encumbrance in CERSAI / legal search.'
        : `LTV (${ltvPercent}%) exceeds statutory ceiling (${maxLtvAllowed + policy.referLtvBuffer}%).`
  });

  rawShap.push({
    feature: 'Property LTV & Collateral',
    category: 'Collateral Security',
    rawValue: `${ltvPercent}% LTV (${input.isTitleClear ? 'Clear Title' : 'Encumbered'})`,
    contribution: Math.max(-100, Math.min(75, ltvDelta)),
    plainEnglishReason:
      ltvDelta >= 0
        ? `Favorable collateral equity coverage (${ltvPercent}% LTV against ${maxLtvAllowed}% cap).`
        : !input.isTitleClear
        ? 'Unresolved legal/CERSAI title encumbrance on offered property collateral.'
        : `Elevated Loan-to-Value ratio (${ltvPercent}% vs ${maxLtvAllowed}% policy guideline).`
  });

  // 6. Bank Statement Behaviour & NACH Bounces (Account Aggregator)
  let bankStatus: 'PASS' | 'REFER' | 'FAIL' = 'PASS';
  let bankDelta = 0;
  if (input.bounceCountLast12M <= policy.maxBouncesApprove) {
    bankStatus = 'PASS';
    bankDelta = 30;
  } else if (input.bounceCountLast12M <= policy.maxBouncesRefer) {
    bankStatus = 'REFER';
    bankDelta = -30 * input.bounceCountLast12M;
  } else {
    bankStatus = 'FAIL';
    bankDelta = -85;
  }

  decisionNodes.push({
    id: 'NODE_AA_BANK',
    category: 'FRAUD_CHECK',
    ruleCode: 'FRD-AA-502',
    label: 'Account Aggregator Cashflow & NACH Bounces',
    thresholdText: `<= ${policy.maxBouncesApprove} inward cheque/NACH bounces (12M)`,
    actualValueText: `${input.bounceCountLast12M} bounce(s) in last 12M`,
    status: bankStatus,
    impactWeight: 15,
    detail:
      bankStatus === 'PASS'
        ? '12-month Account Aggregator bank cashflow shows zero inward NACH/ECS bounces and consistent salary/business credits.'
        : bankStatus === 'REFER'
        ? `${input.bounceCountLast12M} technical/inward bounce(s) observed in 12-month AA statement; requires banking explanation.`
        : `Multiple inward EMI/cheque bounces (${input.bounceCountLast12M}) indicate severe cashflow stress.`
  });

  rawShap.push({
    feature: 'AA Bank Cashflow & Bounces',
    category: 'Banking Behaviour',
    rawValue: `${input.bounceCountLast12M} bounces (12M)`,
    contribution: bankDelta,
    plainEnglishReason:
      bankDelta >= 0
        ? 'Zero NACH/cheque bounces in 12-month Account Aggregator bank statement.'
        : `${input.bounceCountLast12M} inward EMI/cheque bounce(s) detected in last 12 months.`
  });

  // 7. Employment Stability & Age at Loan Maturity
  let empStatus: 'PASS' | 'REFER' | 'FAIL' = 'PASS';
  let empDelta = 0;
  if (
    input.employmentYears >= policy.minEmploymentYears &&
    ageAtMaturity <= policy.maxAgeAtMaturity
  ) {
    empStatus = 'PASS';
    empDelta = Math.min(45, Math.round(input.employmentYears * 4.5));
  } else if (
    input.employmentYears >= 1 &&
    ageAtMaturity <= policy.maxAgeAtMaturity + 5
  ) {
    empStatus = 'REFER';
    empDelta = -25;
  } else {
    empStatus = 'FAIL';
    empDelta = -65;
  }

  decisionNodes.push({
    id: 'NODE_EMP_AGE',
    category: 'ELIGIBILITY',
    ruleCode: 'POL-EMP-309',
    label: 'Employment Vintage & Maturity Age',
    thresholdText: `>= ${policy.minEmploymentYears}y tenure & Age <= ${policy.maxAgeAtMaturity} at maturity`,
    actualValueText: `${input.employmentYears}y tenure · ${ageAtMaturity}y at maturity`,
    status: empStatus,
    impactWeight: 10,
    detail:
      empStatus === 'PASS'
        ? `Applicant has ${input.employmentYears} years stability and reaches ${ageAtMaturity} years at loan maturity.`
        : empStatus === 'REFER'
        ? `Employment tenure (${input.employmentYears}y) or maturity age (${ageAtMaturity}y) requires co-applicant or tenure adjustment.`
        : `Age at maturity (${ageAtMaturity}y) or employment stability (${input.employmentYears}y) outside policy bounds.`
  });

  rawShap.push({
    feature: 'Employment & Maturity Age',
    category: 'Stability',
    rawValue: `${input.employmentYears}y work · ${ageAtMaturity}y mat.`,
    contribution: empDelta,
    plainEnglishReason:
      empDelta >= 0
        ? `Stable ${input.employmentYears}-year occupational vintage and ${ageAtMaturity}-year maturity age.`
        : `Short occupational vintage (${input.employmentYears} yrs) or high age at loan maturity (${ageAtMaturity} yrs).`
  });

  // Calculate normalized weights for SHAP and Reason Codes
  const totalAbsShap = rawShap.reduce((acc, item) => acc + Math.abs(item.contribution), 0) || 1;
  const shapWaterfall: ShapContribution[] = rawShap.map((item) => ({
    ...item,
    weightPercent: Math.round((Math.abs(item.contribution) / totalAbsShap) * 100)
  }));

  const rawScore = baseScore + shapWaterfall.reduce((acc, s) => acc + s.contribution, 0);
  const finalScore = Math.max(300, Math.min(900, rawScore));

  // Determine overall decision outcome from decisionNodes
  const hasFail = decisionNodes.some((n) => n.status === 'FAIL');
  const hasRefer = decisionNodes.some((n) => n.status === 'REFER');

  let outcome: DecisionOutcome = 'APPROVED';
  if (hasFail) {
    outcome = 'REJECTED';
  } else if (hasRefer || finalScore < 620) {
    outcome = 'REFERRED';
  } else {
    outcome = 'APPROVED';
  }

  // Construct human-readable ReasonCodeItem[] sorted by impact
  const sortedFactors = [...shapWaterfall].sort(
    (a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)
  );

  // For REJECTED or REFERRED, calculate relative weights among negative factors if any exist
  const negativeFactors = sortedFactors.filter((f) => f.contribution < 0);
  const totalNegativeAbs =
    negativeFactors.reduce((sum, f) => sum + Math.abs(f.contribution), 0) || totalAbsShap;

  const reasonCodes: ReasonCodeItem[] = sortedFactors.map((f, index) => {
    const isNeg = f.contribution < 0;
    const relevantWeight =
      outcome !== 'APPROVED' && isNeg
        ? Math.round((Math.abs(f.contribution) / totalNegativeAbs) * 100)
        : f.weightPercent;

    let actionableAdvice = 'Maintain current financial profile.';
    if (f.feature.includes('FOIR')) {
      actionableAdvice = isNeg
        ? 'Consider adding an earning co-applicant, extending loan tenure, or closing an existing personal/auto loan to reduce monthly EMI outflow.'
        : 'Low existing EMI obligations give you comfortable repayment headroom.';
    } else if (f.feature.includes('Bureau')) {
      actionableAdvice = isNeg
        ? 'Ensure 100% on-time credit card/EMI payments for the next 6 months and keep credit utilization below 30%.'
        : 'Eligible for prime tier interest rate spread based on bureau track record.';
    } else if (f.feature.includes('LTV')) {
      actionableAdvice = isNeg
        ? 'Increase down-payment margin by 10–15% or provide clear CERSAI/chain title deed documentation.'
        : 'Strong property equity cushion lowers collateral risk.';
    } else if (f.feature.includes('Bounces')) {
      actionableAdvice = isNeg
        ? 'Provide banker realization letters if bounces were non-financial/technical, and maintain sufficient average monthly balance.'
        : 'Clean banking conduct verified via Account Aggregator.';
    } else if (f.feature.includes('Employment')) {
      actionableAdvice = isNeg
        ? 'Reduce requested loan tenure so age at maturity stays within 65 years, or add a younger earning co-borrower.'
        : 'Occupational stability meets prime underwriting norms.';
    }

    return {
      code: `RC-${index + 101}`,
      factor: f.feature,
      weightPercent: Math.max(5, relevantWeight),
      plainLanguageExplanation: f.plainEnglishReason,
      actionableAdvice,
      direction: isNeg ? 'NEGATIVE' : 'POSITIVE'
    };
  });

  const sanctionedAmount =
    outcome === 'APPROVED'
      ? input.requestedLoanAmount
      : outcome === 'REFERRED'
      ? Math.round(input.requestedLoanAmount * 0.9)
      : 0;

  return {
    outcome,
    finalScore,
    baseScore,
    calculatedEmi,
    foirPercent,
    ltvPercent,
    ageAtMaturity,
    sanctionedAmount,
    interestRate,
    tenureMonths: input.requestedTenureMonths,
    processingFee: Math.round(input.requestedLoanAmount * 0.005),
    decisionNodes,
    shapWaterfall,
    reasonCodes,
    assignedUnderwriter: {
      name: 'Vikramaditya Sen',
      role: 'Senior Credit Manager — Retail Mortgages (NCM Level 2)',
      branch: `${input.city || 'New Delhi'} Regional Credit Hub`,
      email: 'vikramaditya.sen@herohousingfinance.com',
      slaHours: 4
    },
    fpcCompliant: requiredConsentsGranted && reasonCodes.length > 0
  };
}

/**
 * Deterministic FNV-1a / SHA-style hex digest for tamper-evident audit chains
 * (runs synchronously in both browser and Node unit tests).
 */
export function computeAuditHash(prevHash: string, payload: string): string {
  const combined = `${prevHash}|${payload}`;
  let h1 = 0xdeadbeef ^ combined.length;
  let h2 = 0x41c6ce57 ^ combined.length;
  let h3 = 0x9e3779b9 ^ combined.length;
  let h4 = 0x85ebca6b ^ combined.length;

  for (let i = 0; i < combined.length; i++) {
    const ch = combined.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822519);
    h4 = Math.imul(h4 ^ ch, 3266489917);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909);

  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return `0x${hex(h1)}${hex(h2)}${hex(h3)}${hex(h4)}`;
}

export function buildAuditPayload(entry: Omit<AuditLogEntry, 'recordHash'>): string {
  return `${entry.id}:${entry.timestamp}:${entry.applicationId}:${entry.outcome}:${entry.score}:${entry.policyVersion}:${entry.officerOrEngine}`;
}

export function verifyAuditLogChain(entries: AuditLogEntry[]): {
  isValid: boolean;
  verifiedCount: number;
  tamperedIds: string[];
} {
  // Entries can be stored newest-first or oldest-first; sort chronologically by id sequence / chain
  const chronological = [...entries].reverse();
  const tamperedIds: string[] = [];

  for (let i = 0; i < chronological.length; i++) {
    const item = chronological[i];
    const expectedPrev = i === 0 ? '0x00000000000000000000000000000000' : chronological[i - 1].recordHash;
    const expectedHash = computeAuditHash(expectedPrev, buildAuditPayload(item));
    if (item.prevHash !== expectedPrev || item.recordHash !== expectedHash) {
      tamperedIds.push(item.id);
    }
  }

  return {
    isValid: tamperedIds.length === 0,
    verifiedCount: entries.length - tamperedIds.length,
    tamperedIds
  };
}

export function computeFairnessMetrics(
  applications: MortgageApplication[]
): FairnessSegmentMetric[] {
  const results: FairnessSegmentMetric[] = [];

  const buildGroup = (
    groupName: FairnessSegmentMetric['segmentGroup'],
    buckets: { label: string; filter: (a: MortgageApplication) => boolean }[]
  ) => {
    const rawStats = buckets.map((b) => {
      const subset = applications.filter(b.filter);
      const total = subset.length;
      const approved = subset.filter((a) => a.result.outcome === 'APPROVED').length;
      const referred = subset.filter((a) => a.result.outcome === 'REFERRED').length;
      const rejected = subset.filter((a) => a.result.outcome === 'REJECTED').length;
      const approvalRate = total > 0 ? Number(((approved / total) * 100).toFixed(1)) : 0;
      const avgScore =
        total > 0
          ? Math.round(subset.reduce((acc, a) => acc + a.result.finalScore, 0) / total)
          : 0;
      return {
        segmentGroup: groupName,
        segmentLabel: b.label,
        totalApplications: total,
        approvedCount: approved,
        referredCount: referred,
        rejectedCount: rejected,
        approvalRate,
        avgScore
      };
    });

    const maxApprovalRate = Math.max(...rawStats.map((s) => s.approvalRate), 1);

    for (const stat of rawStats) {
      const dir = Number((stat.approvalRate / maxApprovalRate).toFixed(2));
      const status: FairnessSegmentMetric['status'] =
        dir >= 0.8 ? 'PASS' : dir >= 0.72 ? 'WATCH' : 'ADVERSE_IMPACT';
      results.push({
        ...stat,
        disparateImpactRatio: dir,
        status
      });
    }
  };

  buildGroup('Geography Tier', [
    { label: 'Tier 1 Metro', filter: (a) => a.geographyTier === 'TIER_1' },
    { label: 'Tier 2 Urban', filter: (a) => a.geographyTier === 'TIER_2' },
    { label: 'Tier 3 Semi-Urban', filter: (a) => a.geographyTier === 'TIER_3' }
  ]);

  buildGroup('Loan Ticket Size', [
    { label: 'Affordable (<= ₹25L)', filter: (a) => a.requestedLoanAmount <= 2500000 },
    {
      label: 'Mid-Segment (₹25L–₹50L)',
      filter: (a) => a.requestedLoanAmount > 2500000 && a.requestedLoanAmount <= 5000000
    },
    { label: 'Prime (> ₹50L)', filter: (a) => a.requestedLoanAmount > 5000000 }
  ]);

  buildGroup('Applicant Type', [
    { label: 'Salaried Prime', filter: (a) => a.employmentType === 'SALARIED' },
    { label: 'Self-Employed / MSME', filter: (a) => a.employmentType === 'SELF_EMPLOYED' }
  ]);

  return results;
}

export function computeRuleVersionDiff(
  olderVersion: PolicyRuleConfig,
  newerVersion: PolicyRuleConfig
): RuleDiffItem[] {
  const fields: {
    key: keyof PolicyRuleConfig;
    label: string;
    unit: string;
    higherIsRelaxed: boolean;
  }[] = [
    { key: 'maxFoirSalaried', label: 'Max FOIR (Salaried)', unit: '%', higherIsRelaxed: true },
    { key: 'maxFoirSelfEmployed', label: 'Max FOIR (Self-Employed)', unit: '%', higherIsRelaxed: true },
    { key: 'referFoirBuffer', label: 'Referral FOIR Buffer Band', unit: '%', higherIsRelaxed: true },
    { key: 'maxLtvHomeLoan', label: 'Max LTV (Home Loan)', unit: '%', higherIsRelaxed: true },
    { key: 'maxLtvLap', label: 'Max LTV (Loan Against Property)', unit: '%', higherIsRelaxed: true },
    { key: 'minCibilApprove', label: 'Min CIBIL Score (Auto-Approve)', unit: 'pts', higherIsRelaxed: false },
    { key: 'minCibilRefer', label: 'Min CIBIL Score (Referral Floor)', unit: 'pts', higherIsRelaxed: false },
    { key: 'maxAgeAtMaturity', label: 'Max Borrower Age at Maturity', unit: 'yrs', higherIsRelaxed: true },
    { key: 'minEmploymentYears', label: 'Min Employment / Business Vintage', unit: 'yrs', higherIsRelaxed: false },
    { key: 'maxBouncesRefer', label: 'Max Inward Bounces (12M Referral)', unit: 'bounces', higherIsRelaxed: true },
    { key: 'interestRateHomeLoan', label: 'Base Home Loan Interest Rate', unit: '% p.a.', higherIsRelaxed: false },
    { key: 'interestRateLap', label: 'Base LAP Interest Rate', unit: '% p.a.', higherIsRelaxed: false }
  ];

  return fields.map((f) => {
    const oldVal = olderVersion[f.key] as number;
    const newVal = newerVersion[f.key] as number;
    const changed = oldVal !== newVal;
    let riskDirection: RuleDiffItem['riskDirection'] = 'UNCHANGED';
    if (changed) {
      const increased = newVal > oldVal;
      riskDirection =
        (increased && f.higherIsRelaxed) || (!increased && !f.higherIsRelaxed)
          ? 'RELAXED'
          : 'STRICTER';
    }
    return {
      fieldKey: f.key,
      label: f.label,
      unit: f.unit,
      oldValue: oldVal,
      newValue: newVal,
      changed,
      riskDirection
    };
  });
}
