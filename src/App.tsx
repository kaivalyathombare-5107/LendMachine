import React, { useState } from 'react';
import {
  AuditLogEntry,
  buildAuditPayload,
  computeAuditHash,
  DecisionOutcome,
  evaluateApplication,
  MortgageApplication,
  PolicyRuleConfig
} from './engine/underwriting';
import {
  buildInitialApplications,
  buildInitialAuditLogs,
  POLICY_VERSIONS
} from './engine/seedData';
import { ApplicantPortal } from './components/applicant/ApplicantPortal';
import {
  UnderwriterDashboard,
  UnderwriterTab
} from './components/underwriter/UnderwriterDashboard';

type PrimaryView = 'APPLICANT' | 'UNDERWRITER';

export default function App() {
  const [policies, setPolicies] = useState<PolicyRuleConfig[]>(POLICY_VERSIONS);
  const [activePolicyVersion, setActivePolicyVersion] = useState<string>(
    POLICY_VERSIONS[0].version
  );

  const activePolicy =
    policies.find((p) => p.version === activePolicyVersion) || policies[0];

  const [applications, setApplications] = useState<MortgageApplication[]>(() =>
    buildInitialApplications(POLICY_VERSIONS[0])
  );
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() =>
    buildInitialAuditLogs(buildInitialApplications(POLICY_VERSIONS[0]))
  );

  const [primaryView, setPrimaryView] = useState<PrimaryView>('APPLICANT');
  const [underwriterTab, setUnderwriterTab] = useState<UnderwriterTab>('QUEUE_360');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string>(
    'HHF-2026-8901'
  );

  // Append a new immutable entry to the cryptographic audit log chain
  const appendAuditEntry = (
    app: MortgageApplication,
    officerOrEngine: string,
    customDetails?: string
  ) => {
    setAuditLogs((prevLogs) => {
      const latestHash =
        prevLogs.length > 0
          ? prevLogs[0].recordHash
          : '0x00000000000000000000000000000000';
      const nextId = `AUD-${1001 + prevLogs.length}`;
      const baseEntry: Omit<AuditLogEntry, 'recordHash'> = {
        id: nextId,
        timestamp: '2026-11-12 09:50 IST',
        applicationId: app.id,
        applicantName: app.applicantName,
        loanType: app.loanType,
        officerOrEngine,
        outcome: app.result.outcome,
        score: app.result.finalScore,
        policyVersion: app.policyVersionUsed,
        prevHash: latestHash,
        details:
          customDetails ||
          `FOIR ${app.result.foirPercent}% · LTV ${app.result.ltvPercent}% · CIBIL ${app.cibilScore}`
      };
      const recordHash = computeAuditHash(latestHash, buildAuditPayload(baseEntry));
      return [{ ...baseEntry, recordHash }, ...prevLogs];
    });
  };

  const handleApplicationSubmitted = (newApp: MortgageApplication) => {
    setApplications((prev) => [newApp, ...prev]);
    setSelectedApplicationId(newApp.id);
    appendAuditEntry(newApp, 'Automated Engine (UnderwriteAI)');
  };

  const handleUnderwriterDecision = (
    applicationId: string,
    newOutcome: DecisionOutcome,
    notes: string
  ) => {
    setApplications((prev) =>
      prev.map((app) => {
        if (app.id !== applicationId) return app;
        const updatedApp: MortgageApplication = {
          ...app,
          result: {
            ...app.result,
            outcome: newOutcome,
            sanctionedAmount:
              newOutcome === 'APPROVED' ? app.requestedLoanAmount : 0
          },
          underwriterOverride: {
            officerName: 'Vikramaditya Sen (NCM-L2)',
            previousOutcome: app.result.outcome,
            newOutcome,
            notes,
            overriddenAt: '2026-11-12 09:52 IST'
          }
        };
        appendAuditEntry(
          updatedApp,
          'Underwriter: Vikramaditya Sen',
          `Manual Override (${app.result.outcome} -> ${newOutcome}): ${notes}`
        );
        return updatedApp;
      })
    );
  };

  const handleActivatePolicy = (version: string) => {
    const targetPolicy = policies.find((p) => p.version === version);
    if (!targetPolicy) return;

    setActivePolicyVersion(version);
    setPolicies((prev) =>
      prev.map((p) => ({
        ...p,
        status:
          p.version === version
            ? 'ACTIVE'
            : p.status === 'ACTIVE'
            ? 'ARCHIVED'
            : p.status
      }))
    );

    // Re-evaluate existing non-overridden applications under newly activated policy
    setApplications((prev) =>
      prev.map((app) => {
        if (app.underwriterOverride) return app;
        const newResult = evaluateApplication(
          app,
          targetPolicy,
          app.documents,
          app.consents
        );
        return {
          ...app,
          policyVersionUsed: targetPolicy.version,
          result: newResult
        };
      })
    );
  };

  const navigateToUnderwriterTab = (tab: UnderwriterTab) => {
    setPrimaryView('UNDERWRITER');
    setUnderwriterTab(tab);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setPrimaryView('APPLICANT');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-display"
        >
          Hero FinCorp UnderwriteAI
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <a
            href="#applicant-portal"
            onClick={(e) => {
              e.preventDefault();
              setPrimaryView('APPLICANT');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              primaryView === 'APPLICANT'
                ? 'text-slate-900 border-b-2 border-slate-900 font-semibold'
                : ''
            }`}
          >
            Applicant Portal
          </a>
          <a
            href="#underwriter-queue"
            onClick={(e) => {
              e.preventDefault();
              navigateToUnderwriterTab('QUEUE_360');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              primaryView === 'UNDERWRITER' && underwriterTab === 'QUEUE_360'
                ? 'text-slate-900 border-b-2 border-slate-900 font-semibold'
                : ''
            }`}
          >
            Underwriter Queue
          </a>
          <a
            href="#compliance-audit"
            onClick={(e) => {
              e.preventDefault();
              navigateToUnderwriterTab('COMPLIANCE_AUDIT');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              primaryView === 'UNDERWRITER' && underwriterTab === 'COMPLIANCE_AUDIT'
                ? 'text-slate-900 border-b-2 border-slate-900 font-semibold'
                : ''
            }`}
          >
            Compliance Audit
          </a>
          <a
            href="#fairness-monitor"
            onClick={(e) => {
              e.preventDefault();
              navigateToUnderwriterTab('FAIRNESS_MONITOR');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              primaryView === 'UNDERWRITER' && underwriterTab === 'FAIRNESS_MONITOR'
                ? 'text-slate-900 border-b-2 border-slate-900 font-semibold'
                : ''
            }`}
          >
            Fairness Monitor
          </a>
          <a
            href="#rule-governance"
            onClick={(e) => {
              e.preventDefault();
              navigateToUnderwriterTab('RULE_GOVERNANCE');
            }}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 py-1 ${
              primaryView === 'UNDERWRITER' && underwriterTab === 'RULE_GOVERNANCE'
                ? 'text-slate-900 border-b-2 border-slate-900 font-semibold'
                : ''
            }`}
          >
            Rule Governance
          </a>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() =>
              setPrimaryView((prev) =>
                prev === 'APPLICANT' ? 'UNDERWRITER' : 'APPLICANT'
              )
            }
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {primaryView === 'APPLICANT'
              ? 'Open Underwriter Console'
              : 'Open Applicant Portal'}
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {primaryView === 'APPLICANT' ? (
          <ApplicantPortal
            activePolicy={activePolicy}
            onApplicationSubmitted={handleApplicationSubmitted}
            onInspectInUnderwriterView={(appId) => {
              setSelectedApplicationId(appId);
              navigateToUnderwriterTab('QUEUE_360');
            }}
          />
        ) : (
          <UnderwriterDashboard
            activeSubTab={underwriterTab}
            onChangeSubTab={setUnderwriterTab}
            applications={applications}
            selectedApplicationId={selectedApplicationId}
            onSelectApplicationId={setSelectedApplicationId}
            onUnderwriterDecision={handleUnderwriterDecision}
            auditLogs={auditLogs}
            policies={policies}
            activePolicy={activePolicy}
            onActivatePolicy={handleActivatePolicy}
          />
        )}
      </main>

      {/* Quiet Regulatory Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <span>
            Hero Housing Finance Digital Underwriting Engine · RBI Fair Practices Code & Account Aggregator Compliant
          </span>
          <span className="font-mono whitespace-nowrap">
            Dual-Transparency Architecture · Reason Codes · SHAP Waterfall · Tamper-Evident Audit
          </span>
        </div>
      </footer>
    </div>
  );
}
