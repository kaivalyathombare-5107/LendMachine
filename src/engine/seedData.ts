import {
  ApplicationFormInput,
  AuditLogEntry,
  buildAuditPayload,
  computeAuditHash,
  ConsentRecord,
  DocumentRecord,
  evaluateApplication,
  MortgageApplication,
  PolicyRuleConfig
} from './underwriting';

export const POLICY_VERSIONS: PolicyRuleConfig[] = [
  {
    version: 'v2.4.0-prod',
    label: 'NHB/RBI Prime & Affordable Retail Policy (Current Production)',
    status: 'ACTIVE',
    deployedAt: '2026-10-18 09:30 IST',
    author: 'Risk Governance Committee (RGC-14)',
    releaseNotes:
      'Calibrated Salaried FOIR cap at 55%, Self-Employed at 60%, and CIBIL auto-approve floor at 725 with mandatory inline OCR confirmation.',
    maxFoirSalaried: 55,
    maxFoirSelfEmployed: 60,
    referFoirBuffer: 8,
    maxLtvHomeLoan: 80,
    maxLtvLap: 65,
    referLtvBuffer: 5,
    minCibilApprove: 725,
    minCibilRefer: 650,
    maxAgeAtMaturity: 65,
    minEmploymentYears: 2,
    maxBouncesApprove: 0,
    maxBouncesRefer: 2,
    interestRateHomeLoan: 8.75,
    interestRateLap: 10.45
  },
  {
    version: 'v2.5.0-staged',
    label: 'Tier-2/3 Semi-Urban Inclusive Housing Policy (Staged Candidate)',
    status: 'STAGED',
    deployedAt: '2026-11-10 14:15 IST',
    author: 'Credit Policy & Fairness Lab',
    releaseNotes:
      'Relaxes CIBIL auto-approve threshold to 710 and raises Salaried FOIR cap to 58% to reduce adverse impact in Tier-3 affordable housing.',
    maxFoirSalaried: 58,
    maxFoirSelfEmployed: 62,
    referFoirBuffer: 8,
    maxLtvHomeLoan: 82,
    maxLtvLap: 68,
    referLtvBuffer: 5,
    minCibilApprove: 710,
    minCibilRefer: 640,
    maxAgeAtMaturity: 67,
    minEmploymentYears: 2,
    maxBouncesApprove: 0,
    maxBouncesRefer: 2,
    interestRateHomeLoan: 8.65,
    interestRateLap: 10.25
  },
  {
    version: 'v2.3.1-legacy',
    label: 'Q2 FY26 Conservative Tightening Policy (Archived)',
    status: 'ARCHIVED',
    deployedAt: '2026-07-01 08:00 IST',
    author: 'Chief Credit Officer Office',
    releaseNotes:
      'Strict 50% Salaried FOIR cap and 740 CIBIL auto-approval floor prior to Account Aggregator cashflow integration.',
    maxFoirSalaried: 50,
    maxFoirSelfEmployed: 55,
    referFoirBuffer: 6,
    maxLtvHomeLoan: 75,
    maxLtvLap: 60,
    referLtvBuffer: 5,
    minCibilApprove: 740,
    minCibilRefer: 670,
    maxAgeAtMaturity: 62,
    minEmploymentYears: 3,
    maxBouncesApprove: 0,
    maxBouncesRefer: 1,
    interestRateHomeLoan: 8.95,
    interestRateLap: 10.75
  }
];

export function createDefaultConsents(allGranted = true): ConsentRecord[] {
  const now = '2026-11-12 09:40 IST';
  return [
    {
      sourceId: 'BUREAU_CIBIL',
      label: 'TransUnion CIBIL & Multi-Bureau Credit Pull',
      provider: 'TransUnion CIBIL / Experian',
      purpose: 'Fetch 36-month repayment track record, active tradelines, and credit score.',
      regulatoryCitation: 'RBI CIC (Regulation) Act & Fair Practices Code §4.1',
      required: true,
      granted: allGranted,
      timestamp: allGranted ? now : null
    },
    {
      sourceId: 'ACCOUNT_AGGREGATOR',
      label: 'Sahamati Account Aggregator (12M Bank Statement)',
      provider: 'Finvu / OneMoney AA FIP',
      purpose: 'Verify monthly salary/business credits, average balance, and inward NACH bounces.',
      regulatoryCitation: 'RBI Master Direction — NBFC Account Aggregator (DEPA)',
      required: true,
      granted: allGranted,
      timestamp: allGranted ? now : null
    },
    {
      sourceId: 'CKYC_AADHAAR',
      label: 'Central KYC (CKYC) & PAN-Aadhaar XML Verification',
      provider: 'CERSAI CKYC Registry & NSDL',
      purpose: 'Biometric/OTP identity verification and sanctions/AML screening.',
      regulatoryCitation: 'RBI Master Direction on KYC (Updated 2026)',
      required: true,
      granted: allGranted,
      timestamp: allGranted ? now : null
    },
    {
      sourceId: 'PROPERTY_CERSAI',
      label: 'CERSAI Collateral & Digital Land Registry Search',
      provider: 'CERSAI & State Sub-Registrar API',
      purpose: 'Verify clear marketable title and check for prior equitable mortgage charges.',
      regulatoryCitation: 'SARFAESI Act Sec 20 & NHB Valuation Norms',
      required: false,
      granted: allGranted,
      timestamp: allGranted ? now : null
    }
  ];
}

export function createDocumentsForIncome(
  monthlyIncome: number,
  propertyValue: number,
  pan: string,
  allConfirmed = true
): DocumentRecord[] {
  const formattedIncome = `₹${monthlyIncome.toLocaleString('en-IN')}`;
  const formattedAnnual = `₹${(monthlyIncome * 12).toLocaleString('en-IN')}`;
  const formattedProp = `₹${propertyValue.toLocaleString('en-IN')}`;

  return [
    {
      id: 'DOC-1',
      category: 'SALARY_SLIP',
      title: 'Latest 3 Months Salary Slip / Audited P&L',
      fileName: 'SalarySlip_Oct2026_Signed.pdf',
      uploadedAt: '2026-11-12 09:35 IST',
      ocrFieldLabel: 'Net Monthly Income',
      ocrExtractedValue: formattedIncome,
      ocrConfirmedValue: formattedIncome,
      ocrNumericValue: monthlyIncome,
      ocrConfidence: 98.4,
      isConfirmed: allConfirmed
    },
    {
      id: 'DOC-2',
      category: 'BANK_STATEMENT',
      title: '12-Month Primary Bank Statement (AA/PDF)',
      fileName: 'HDFC_Acct_8821_12M_Statement.pdf',
      uploadedAt: '2026-11-12 09:36 IST',
      ocrFieldLabel: 'Avg Monthly Credit',
      ocrExtractedValue: formattedIncome,
      ocrConfirmedValue: formattedIncome,
      ocrNumericValue: monthlyIncome,
      ocrConfidence: 99.1,
      isConfirmed: allConfirmed
    },
    {
      id: 'DOC-3',
      category: 'ITR_FORM16',
      title: 'Form 16 / ITR-V Acknowledgement (AY 2026-27)',
      fileName: 'ITR_Ack_AY2026_27_Verified.pdf',
      uploadedAt: '2026-11-12 09:37 IST',
      ocrFieldLabel: 'Gross Annual Income',
      ocrExtractedValue: formattedAnnual,
      ocrConfirmedValue: formattedAnnual,
      ocrConfidence: 96.8,
      isConfirmed: allConfirmed
    },
    {
      id: 'DOC-4',
      category: 'PROPERTY_DEED',
      title: 'Registered Sale Agreement & Valuation Report',
      fileName: 'Registered_Title_Deed_2026.pdf',
      uploadedAt: '2026-11-12 09:38 IST',
      ocrFieldLabel: 'Assessed Market Value',
      ocrExtractedValue: formattedProp,
      ocrConfirmedValue: formattedProp,
      ocrNumericValue: propertyValue,
      ocrConfidence: 94.5,
      isConfirmed: allConfirmed
    },
    {
      id: 'DOC-5',
      category: 'KYC_ID',
      title: 'PAN Card & Masked Aadhaar Card',
      fileName: `PAN_${pan.toUpperCase()}_KYC.pdf`,
      uploadedAt: '2026-11-12 09:39 IST',
      ocrFieldLabel: 'Extracted PAN Number',
      ocrExtractedValue: pan.toUpperCase(),
      ocrConfirmedValue: pan.toUpperCase(),
      ocrConfidence: 99.7,
      isConfirmed: allConfirmed
    }
  ];
}

export interface ApplicantScenarioPreset {
  id: 'PRESET_APPROVED' | 'PRESET_REFERRED' | 'PRESET_REJECTED';
  label: string;
  badge: string;
  description: string;
  form: ApplicationFormInput;
}

export const APPLICANT_PRESETS: ApplicantScenarioPreset[] = [
  {
    id: 'PRESET_APPROVED',
    label: 'Salaried Prime (Approve)',
    badge: 'Expected: Approved',
    description: 'CIBIL 782 · FOIR 35.1% · LTV 71.4% · Zero NACH bounces',
    form: {
      applicantName: 'Ananya Deshmukh',
      age: 33,
      pan: 'ALCPD4821K',
      mobile: '9820411920',
      email: 'ananya.deshmukh@techcorp.in',
      city: 'Pune',
      geographyTier: 'TIER_1',
      loanType: 'HOME_LOAN',
      employmentType: 'SALARIED',
      employerOrBusinessName: 'Persistent Systems Ltd',
      employmentYears: 6,
      netMonthlyIncome: 145000,
      existingMonthlyEmi: 8500,
      cibilScore: 782,
      creditHistoryMonths: 64,
      bounceCountLast12M: 0,
      requestedLoanAmount: 4500000,
      requestedTenureMonths: 240,
      propertyValue: 6300000,
      propertyCity: 'Pune',
      propertyType: 'RESIDENTIAL_READY',
      isTitleClear: true
    }
  },
  {
    id: 'PRESET_REFERRED',
    label: 'Self-Employed LAP (Refer)',
    badge: 'Expected: Referred',
    description: 'CIBIL 708 · FOIR 63.4% (in referral band) · 1 technical bounce',
    form: {
      applicantName: 'Rajeshwar Khandelwal',
      age: 42,
      pan: 'BKMPK9032M',
      mobile: '9829034512',
      email: 'rk.textiles@khandelwalgroup.co.in',
      city: 'Jaipur',
      geographyTier: 'TIER_2',
      loanType: 'LAP',
      employmentType: 'SELF_EMPLOYED',
      employerOrBusinessName: 'Khandelwal Precision Fabrics Pvt Ltd',
      employmentYears: 5,
      netMonthlyIncome: 125000,
      existingMonthlyEmi: 36000,
      cibilScore: 708,
      creditHistoryMonths: 42,
      bounceCountLast12M: 1,
      requestedLoanAmount: 3800000,
      requestedTenureMonths: 180,
      propertyValue: 6200000,
      propertyCity: 'Jaipur',
      propertyType: 'COMMERCIAL_UNIT',
      isTitleClear: true
    }
  },
  {
    id: 'PRESET_REJECTED',
    label: 'High EMI & Low CIBIL (Reject)',
    badge: 'Expected: Rejected',
    description: 'CIBIL 615 · FOIR 78.2% · 4 NACH bounces · Explainable Reason Codes',
    form: {
      applicantName: 'Saurabh Tiwari',
      age: 38,
      pan: 'CMJPT7719Q',
      mobile: '9415088234',
      email: 'saurabh.tiwari88@gmail.com',
      city: 'Lucknow',
      geographyTier: 'TIER_2',
      loanType: 'HOME_LOAN',
      employmentType: 'SALARIED',
      employerOrBusinessName: 'Awadh Logistics Solutions',
      employmentYears: 1.5,
      netMonthlyIncome: 62000,
      existingMonthlyEmi: 22000,
      cibilScore: 615,
      creditHistoryMonths: 14,
      bounceCountLast12M: 4,
      requestedLoanAmount: 3200000,
      requestedTenureMonths: 240,
      propertyValue: 3700000,
      propertyCity: 'Lucknow',
      propertyType: 'UNDER_CONSTRUCTION',
      isTitleClear: true
    }
  }
];

const SEED_RAW_APPLICATIONS: {
  id: string;
  submittedAt: string;
  input: ApplicationFormInput;
}[] = [
  {
    id: 'HHF-2026-8901',
    submittedAt: '2026-11-12 09:12 IST',
    input: APPLICANT_PRESETS[1].form // Referred - Jaipur LAP
  },
  {
    id: 'HHF-2026-8902',
    submittedAt: '2026-11-12 08:54 IST',
    input: {
      applicantName: 'Meenakshi Sundaram',
      age: 36,
      pan: 'DFGPS2210E',
      mobile: '9840122910',
      email: 'meenakshi.s@chennai-auto.in',
      city: 'Coimbatore',
      geographyTier: 'TIER_2',
      loanType: 'HOME_LOAN',
      employmentType: 'SALARIED',
      employerOrBusinessName: 'Lakshmi Machine Works',
      employmentYears: 4,
      netMonthlyIncome: 92000,
      existingMonthlyEmi: 24000,
      cibilScore: 718,
      creditHistoryMonths: 28,
      bounceCountLast12M: 0,
      requestedLoanAmount: 3400000,
      requestedTenureMonths: 240,
      propertyValue: 4400000,
      propertyCity: 'Coimbatore',
      propertyType: 'RESIDENTIAL_READY',
      isTitleClear: true
    }
  },
  {
    id: 'HHF-2026-8903',
    submittedAt: '2026-11-12 08:30 IST',
    input: {
      applicantName: 'Harpreet Singh Gill',
      age: 47,
      pan: 'GHJPK1190R',
      mobile: '9814099812',
      email: 'harpreet@gillagro.com',
      city: 'Ludhiana',
      geographyTier: 'TIER_2',
      loanType: 'LAP',
      employmentType: 'SELF_EMPLOYED',
      employerOrBusinessName: 'Gill Agro Implements Co.',
      employmentYears: 9,
      netMonthlyIncome: 165000,
      existingMonthlyEmi: 42000,
      cibilScore: 735,
      creditHistoryMonths: 72,
      bounceCountLast12M: 2,
      requestedLoanAmount: 5200000,
      requestedTenureMonths: 180,
      propertyValue: 7800000,
      propertyCity: 'Ludhiana',
      propertyType: 'INDEPENDENT_HOUSE',
      isTitleClear: true
    }
  },
  {
    id: 'HHF-2026-8904',
    submittedAt: '2026-11-12 08:05 IST',
    input: APPLICANT_PRESETS[0].form // Approved - Pune Home Loan
  },
  {
    id: 'HHF-2026-8905',
    submittedAt: '2026-11-11 17:45 IST',
    input: APPLICANT_PRESETS[2].form // Rejected - Lucknow Home Loan
  },
  {
    id: 'HHF-2026-8906',
    submittedAt: '2026-11-11 16:20 IST',
    input: {
      applicantName: 'Kiranmayee Rao',
      age: 31,
      pan: 'JKLPR4412N',
      mobile: '9900144210',
      email: 'kiranmayee.rao@biocon.com',
      city: 'Bengaluru',
      geographyTier: 'TIER_1',
      loanType: 'HOME_LOAN',
      employmentType: 'SALARIED',
      employerOrBusinessName: 'Biocon Biologics Ltd',
      employmentYears: 5,
      netMonthlyIncome: 135000,
      existingMonthlyEmi: 5000,
      cibilScore: 794,
      creditHistoryMonths: 54,
      bounceCountLast12M: 0,
      requestedLoanAmount: 5500000,
      requestedTenureMonths: 240,
      propertyValue: 7400000,
      propertyCity: 'Bengaluru',
      propertyType: 'RESIDENTIAL_READY',
      isTitleClear: true
    }
  },
  {
    id: 'HHF-2026-8907',
    submittedAt: '2026-11-11 15:10 IST',
    input: {
      applicantName: 'Devendra Nath Shukla',
      age: 35,
      pan: 'MNPPS8831C',
      mobile: '9425011298',
      email: 'devendra.shukla@mpstate.org',
      city: 'Ujjain',
      geographyTier: 'TIER_3',
      loanType: 'HOME_LOAN',
      employmentType: 'SALARIED',
      employerOrBusinessName: 'Madhya Pradesh Power Transmission',
      employmentYears: 7,
      netMonthlyIncome: 68000,
      existingMonthlyEmi: 4000,
      cibilScore: 761,
      creditHistoryMonths: 48,
      bounceCountLast12M: 0,
      requestedLoanAmount: 2100000,
      requestedTenureMonths: 240,
      propertyValue: 2900000,
      propertyCity: 'Ujjain',
      propertyType: 'INDEPENDENT_HOUSE',
      isTitleClear: true
    }
  },
  {
    id: 'HHF-2026-8908',
    submittedAt: '2026-11-11 14:00 IST',
    input: {
      applicantName: 'Farhan Akhtar Shaikh',
      age: 40,
      pan: 'QRTPS5519B',
      mobile: '9823177610',
      email: 'farhan@shaikhexports.in',
      city: 'Aurangabad',
      geographyTier: 'TIER_3',
      loanType: 'LAP',
      employmentType: 'SELF_EMPLOYED',
      employerOrBusinessName: 'Marathwada Auto Components',
      employmentYears: 6,
      netMonthlyIncome: 110000,
      existingMonthlyEmi: 12000,
      cibilScore: 754,
      creditHistoryMonths: 60,
      bounceCountLast12M: 0,
      requestedLoanAmount: 2400000,
      requestedTenureMonths: 180,
      propertyValue: 4500000,
      propertyCity: 'Aurangabad',
      propertyType: 'COMMERCIAL_UNIT',
      isTitleClear: true
    }
  },
  {
    id: 'HHF-2026-8909',
    submittedAt: '2026-11-11 12:30 IST',
    input: {
      applicantName: 'Prashant Bhushan Verma',
      age: 29,
      pan: 'VWXPV3310Z',
      mobile: '9711288390',
      email: 'prashant.verma@delhimetro.in',
      city: 'Gurugram',
      geographyTier: 'TIER_1',
      loanType: 'HOME_LOAN',
      employmentType: 'SALARIED',
      employerOrBusinessName: 'Siemens Mobility India',
      employmentYears: 4,
      netMonthlyIncome: 118000,
      existingMonthlyEmi: 9000,
      cibilScore: 768,
      creditHistoryMonths: 40,
      bounceCountLast12M: 0,
      requestedLoanAmount: 4200000,
      requestedTenureMonths: 240,
      propertyValue: 5800000,
      propertyCity: 'Gurugram',
      propertyType: 'RESIDENTIAL_READY',
      isTitleClear: true
    }
  },
  {
    id: 'HHF-2026-8910',
    submittedAt: '2026-11-11 11:15 IST',
    input: {
      applicantName: 'Bhupendra Patel',
      age: 44,
      pan: 'ZABPP9920L',
      mobile: '9825066712',
      email: 'bhupendra@patelceramics.com',
      city: 'Morbi',
      geographyTier: 'TIER_3',
      loanType: 'LAP',
      employmentType: 'SELF_EMPLOYED',
      employerOrBusinessName: 'Patel Vitrified Tiles LLP',
      employmentYears: 4,
      netMonthlyIncome: 95000,
      existingMonthlyEmi: 38000,
      cibilScore: 632,
      creditHistoryMonths: 22,
      bounceCountLast12M: 3,
      requestedLoanAmount: 3500000,
      requestedTenureMonths: 180,
      propertyValue: 4800000,
      propertyCity: 'Morbi',
      propertyType: 'COMMERCIAL_UNIT',
      isTitleClear: false
    }
  }
];

export function buildInitialApplications(activePolicy: PolicyRuleConfig): MortgageApplication[] {
  return SEED_RAW_APPLICATIONS.map((seed) => {
    const docs = createDocumentsForIncome(
      seed.input.netMonthlyIncome,
      seed.input.propertyValue,
      seed.input.pan,
      true
    );
    const consents = createDefaultConsents(true);
    const result = evaluateApplication(seed.input, activePolicy, docs, consents);
    return {
      ...seed.input,
      id: seed.id,
      submittedAt: seed.submittedAt,
      documents: docs,
      consents,
      policyVersionUsed: activePolicy.version,
      result
    };
  });
}

export function buildInitialAuditLogs(applications: MortgageApplication[]): AuditLogEntry[] {
  // Build oldest-first so prevHash links chronologically, then return newest-first
  const oldestFirst = [...applications].reverse();
  const built: AuditLogEntry[] = [];

  for (let i = 0; i < oldestFirst.length; i++) {
    const app = oldestFirst[i];
    const prevHash = i === 0 ? '0x00000000000000000000000000000000' : built[i - 1].recordHash;
    const baseEntry: Omit<AuditLogEntry, 'recordHash'> = {
      id: `AUD-${1001 + i}`,
      timestamp: app.submittedAt,
      applicationId: app.id,
      applicantName: app.applicantName,
      loanType: app.loanType,
      officerOrEngine: app.underwriterOverride
        ? `Underwriter: ${app.underwriterOverride.officerName}`
        : 'Automated Engine (UnderwriteAI)',
      outcome: app.result.outcome,
      score: app.result.finalScore,
      policyVersion: app.policyVersionUsed,
      prevHash,
      details: `FOIR ${app.result.foirPercent}% · LTV ${app.result.ltvPercent}% · CIBIL ${app.cibilScore} · ${app.result.reasonCodes[0]?.code || 'RC-101'}`
    };
    const recordHash = computeAuditHash(prevHash, buildAuditPayload(baseEntry));
    built.push({
      ...baseEntry,
      recordHash
    });
  }

  return built.reverse();
}
