import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  FileText,
  Gavel,
  ShieldCheck,
  XCircle
} from 'lucide-react';
import {
  AuditLogEntry,
  DecisionOutcome,
  formatINR,
  MortgageApplication,
  PolicyRuleConfig
} from '../../engine/underwriting';
import { DecisionTree } from './DecisionTree';
import { SHAPWaterfall } from './SHAPWaterfall';
import { AuditLogTable } from './AuditLogTable';
import { FairnessDashboard } from './FairnessDashboard';
import { RuleVersionDiff } from './RuleVersionDiff';

export type UnderwriterTab =
  | 'QUEUE_360'
  | 'COMPLIANCE_AUDIT'
  | 'FAIRNESS_MONITOR'
  | 'RULE_GOVERNANCE';

interface UnderwriterDashboardProps {
  activeSubTab: UnderwriterTab;
  onChangeSubTab: (tab: UnderwriterTab) => void;
  applications: MortgageApplication[];
  selectedApplicationId: string;
  onSelectApplicationId: (id: string) => void;
  onUnderwriterDecision: (
    applicationId: string,
    newOutcome: DecisionOutcome,
    notes: string
  ) => void;
  auditLogs: AuditLogEntry[];
  policies: PolicyRuleConfig[];
  activePolicy: PolicyRuleConfig;
  onActivatePolicy: (version: string) => void;
}

export const UnderwriterDashboard: React.FC<UnderwriterDashboardProps> = ({
  activeSubTab,
  onChangeSubTab,
  applications,
  selectedApplicationId,
  onSelectApplicationId,
  onUnderwriterDecision,
  auditLogs,
  policies,
  activePolicy,
  onActivatePolicy
}) => {
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'REFERRED' | 'APPROVED' | 'REJECTED'>(
    'ALL'
  );
  const [overrideNote, setOverrideNote] = useState<string>(
    'Verified secondary bank account inflows & co-applicant rental income; cashflow comfortably covers EMI.'
  );
  const [overrideBanner, setOverrideBanner] = useState<string | null>(null);

  const selectedApp =
    applications.find((a) => a.id === selectedApplicationId) || applications[0];

  const referredCount = applications.filter((a) => a.result.outcome === 'REFERRED').length;
  const approvedCount = applications.filter((a) => a.result.outcome === 'APPROVED').length;
  const rejectedCount = applications.filter((a) => a.result.outcome === 'REJECTED').length;

  const filteredQueue = applications.filter((app) =>
    queueFilter === 'ALL' ? true : app.result.outcome === queueFilter
  );

  const handleDecisionClick = (newOutcome: DecisionOutcome) => {
    if (!selectedApp) return;
    const cleanNote =
      overrideNote.trim() ||
      `Manual underwriter decision (${newOutcome}) recorded by Senior Credit Manager.`;
    onUnderwriterDecision(selectedApp.id, newOutcome, cleanNote);
    setOverrideBanner(
      `Application ${selectedApp.id} (${selectedApp.applicantName}) updated to ${newOutcome} and appended to the cryptographic compliance audit chain.`
    );
  };

  return (
    <div className="space-y-6">
      {/* Executive Portfolio KPI Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <span className="text-xs text-slate-500">Referral Queue (Needs Human Review)</span>
          <p className="text-2xl font-mono tabular-nums font-bold text-amber-700 mt-1">
            {referredCount} Applications
          </p>
          <span className="text-xs text-slate-500">SLA Target: &lt; 4 Hours</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <span className="text-xs text-slate-500">Auto-Sanctioned (Straight-Through)</span>
          <p className="text-2xl font-mono tabular-nums font-bold text-emerald-700 mt-1">
            {approvedCount} Applications
          </p>
          <span className="text-xs text-slate-500">
            Approval Rate: {Math.round((approvedCount / Math.max(1, applications.length)) * 100)}%
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <span className="text-xs text-slate-500">Declined (Adverse Action Issued)</span>
          <p className="text-2xl font-mono tabular-nums font-bold text-red-700 mt-1">
            {rejectedCount} Applications
          </p>
          <span className="text-xs text-slate-500">100% RBI FPC Reason-Coded</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-xl">
          <span className="text-xs text-slate-500">Active Policy & Audit Ledger</span>
          <p className="text-lg font-mono tabular-nums font-bold text-slate-900 mt-1">
            {activePolicy.version}
          </p>
          <span className="text-xs font-mono text-emerald-700">
            {auditLogs.length} Hash-Chained Decisions
          </span>
        </div>
      </div>

      {/* Sub-Navigation Workspace Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-white border border-slate-200 rounded-xl">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'QUEUE_360', label: '01. Referral Queue & 360° Explainability' },
            { id: 'COMPLIANCE_AUDIT', label: '02. Compliance Audit Log (Hash-Verified)' },
            { id: 'FAIRNESS_MONITOR', label: '03. Bias & Fairness Monitor' },
            { id: 'RULE_GOVERNANCE', label: '04. Model & Rule Governance' }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChangeSubTab(tab.id as UnderwriterTab)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                activeSubTab === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {overrideBanner && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 flex items-center justify-between">
          <span>{overrideBanner}</span>
          <button
            type="button"
            onClick={() => setOverrideBanner(null)}
            className="text-emerald-800 underline ml-4 whitespace-nowrap cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* VIEW 1: QUEUE & 360° APPLICATION DETAIL + EXPLAINABILITY */}
      {activeSubTab === 'QUEUE_360' && selectedApp && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Application Queue List (4 cols) */}
          <div className="lg:col-span-4 min-w-0 bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm xl:text-base font-semibold text-slate-900 whitespace-nowrap">
                  Underwriting Queue ({filteredQueue.length})
                </h2>
                <span className="text-[11px] font-mono text-slate-500 whitespace-nowrap shrink-0">
                  By Urgency
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
                {(['ALL', 'REFERRED', 'APPROVED', 'REJECTED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setQueueFilter(st)}
                    className={`py-1.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap truncate cursor-pointer ${
                      queueFilter === st
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-200 max-h-[780px] overflow-y-auto">
              {filteredQueue.map((app) => {
                const isSelected = app.id === selectedApp.id;
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => onSelectApplicationId(app.id)}
                    className={`w-full p-4 text-left transition-colors cursor-pointer block ${
                      isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-xs font-mono mb-1">
                      <span
                        className={`truncate ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {app.id} · {app.city}
                      </span>
                      <span
                        className={`font-semibold shrink-0 ${
                          app.result.outcome === 'APPROVED'
                            ? isSelected
                              ? 'text-emerald-400'
                              : 'text-emerald-700'
                            : app.result.outcome === 'REFERRED'
                            ? isSelected
                              ? 'text-amber-400'
                              : 'text-amber-700'
                            : isSelected
                            ? 'text-red-400'
                            : 'text-red-700'
                        }`}
                      >
                        {app.result.outcome}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold truncate">{app.applicantName}</h3>
                      <span className="text-xs font-mono tabular-nums shrink-0">
                        {formatINR(app.requestedLoanAmount)}
                      </span>
                    </div>

                    <div
                      className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono tabular-nums mt-1.5 ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      <span>Score {app.result.finalScore}</span>
                      <span aria-hidden="true">·</span>
                      <span>FOIR {app.result.foirPercent}%</span>
                      <span aria-hidden="true">·</span>
                      <span>LTV {app.result.ltvPercent}%</span>
                      <span aria-hidden="true">·</span>
                      <span>CIBIL {app.cibilScore}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: 360° Application Detail, Decision Tree & SHAP Waterfall (8 cols) */}
          <div className="lg:col-span-8 min-w-0 space-y-6">
            {/* Applicant 360° Header Card */}
            <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-mono">
                    <span className="truncate max-w-[240px]">{selectedApp.id}</span>
                    <span aria-hidden="true">·</span>
                    <span>PAN: {selectedApp.pan}</span>
                    <span aria-hidden="true">·</span>
                    <span>{selectedApp.city} ({selectedApp.geographyTier.replace('_', ' ')})</span>
                    <span aria-hidden="true">·</span>
                    <span>Submitted {selectedApp.submittedAt}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 text-balance">
                    {selectedApp.applicantName} — 360° Credit Appraisal Dossier
                  </h2>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {selectedApp.employmentType === 'SALARIED' ? 'Salaried' : 'Self-Employed'} at{' '}
                    <strong className="text-slate-900">{selectedApp.employerOrBusinessName}</strong> ({selectedApp.employmentYears} yrs vintage) · Age {selectedApp.age} yrs
                  </p>
                </div>

                <div className="text-left sm:text-right font-mono shrink-0">
                  <span className="text-xs text-slate-500 block">Current Status</span>
                  <span
                    className={`text-lg font-bold inline-flex items-center gap-1.5 whitespace-nowrap ${
                      selectedApp.result.outcome === 'APPROVED'
                        ? 'text-emerald-700'
                        : selectedApp.result.outcome === 'REFERRED'
                        ? 'text-amber-700'
                        : 'text-red-700'
                    }`}
                  >
                    {selectedApp.result.outcome === 'APPROVED' && (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                    {selectedApp.result.outcome === 'REFERRED' && <Clock className="w-5 h-5" />}
                    {selectedApp.result.outcome === 'REJECTED' && <XCircle className="w-5 h-5" />}
                    {selectedApp.result.outcome} ({selectedApp.result.finalScore}/900)
                  </span>
                </div>
              </div>

              {/* 6-Metric Financial Summary Grid (3x2 on desktop for full label legibility) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block">Loan Requested</span>
                  <p className="font-mono tabular-nums font-bold text-slate-900 text-sm mt-0.5 whitespace-nowrap">
                    {formatINR(selectedApp.requestedLoanAmount)}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block">Property Value</span>
                  <p className="font-mono tabular-nums font-bold text-slate-900 text-sm mt-0.5 whitespace-nowrap">
                    {formatINR(selectedApp.propertyValue)}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block">Net Monthly Income</span>
                  <p className="font-mono tabular-nums font-bold text-slate-900 text-sm mt-0.5 whitespace-nowrap">
                    {formatINR(selectedApp.netMonthlyIncome)}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block">Total FOIR Burden</span>
                  <p className="font-mono tabular-nums font-bold text-slate-900 text-sm mt-0.5 whitespace-nowrap">
                    {selectedApp.result.foirPercent}%
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block">Collateral LTV</span>
                  <p className="font-mono tabular-nums font-bold text-slate-900 text-sm mt-0.5 whitespace-nowrap">
                    {selectedApp.result.ltvPercent}%
                  </p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-slate-500 block">CIBIL & Bounces</span>
                  <p className="font-mono tabular-nums font-bold text-slate-900 text-sm mt-0.5 whitespace-nowrap">
                    {selectedApp.cibilScore} · {selectedApp.bounceCountLast12M} bnc
                  </p>
                </div>
              </div>

              {/* Verified Data Sources & OCR Document Status Strip */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-700" />
                  <span>
                    OCR Documents Confirmed:{' '}
                    <strong className="font-mono text-slate-900">
                      {selectedApp.documents.filter((d) => d.isConfirmed).length}/
                      {selectedApp.documents.length}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>
                    Digital Consents Signed:{' '}
                    <strong className="font-mono text-slate-900">
                      {selectedApp.consents.filter((c) => c.granted).length}/
                      {selectedApp.consents.length}
                    </strong>{' '}
                    (CIBIL + Sahamati AA + CKYC)
                  </span>
                </div>
              </div>

              {/* Human Underwriter Action & Referral Resolution Console */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <Gavel className="w-4 h-4 text-slate-700" />
                    Senior Underwriter Decision & Override Authority
                  </h3>
                  <span className="text-xs font-mono text-slate-500">
                    Logged to Tamper-Evident Audit Chain
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    aria-label="Underwriter Credit Justification Note"
                    value={overrideNote}
                    onChange={(e) => setOverrideNote(e.target.value)}
                    placeholder="Enter credit justification or sanction covenant notes..."
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDecisionClick('APPROVED')}
                      className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Approve Sanction
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDecisionClick('REJECTED')}
                      className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Decline Application
                    </button>
                  </div>
                </div>

                {selectedApp.underwriterOverride && (
                  <p className="text-xs font-mono text-emerald-800 pt-1">
                    Last Override: {selectedApp.underwriterOverride.officerName} changed{' '}
                    {selectedApp.underwriterOverride.previousOutcome} →{' '}
                    {selectedApp.underwriterOverride.newOutcome} ({selectedApp.underwriterOverride.overriddenAt}) — &ldquo;{selectedApp.underwriterOverride.notes}&rdquo;
                  </p>
                )}
              </div>
            </div>

            {/* SHAP Waterfall & Counterfactual Lab */}
            <SHAPWaterfall application={selectedApp} activePolicy={activePolicy} />

            {/* Visual Decision Tree */}
            <DecisionTree
              nodes={selectedApp.result.decisionNodes}
              finalOutcome={selectedApp.result.outcome}
              policyVersion={selectedApp.policyVersionUsed}
            />
          </div>
        </div>
      )}

      {/* VIEW 2: COMPLIANCE AUDIT LOG */}
      {activeSubTab === 'COMPLIANCE_AUDIT' && (
        <AuditLogTable
          logs={auditLogs}
          onSelectApplication={(appId) => {
            onSelectApplicationId(appId);
            onChangeSubTab('QUEUE_360');
          }}
        />
      )}

      {/* VIEW 3: BIAS & FAIRNESS MONITOR */}
      {activeSubTab === 'FAIRNESS_MONITOR' && (
        <FairnessDashboard
          applications={applications}
          activePolicyVersion={activePolicy.version}
          onNavigateToGovernance={() => onChangeSubTab('RULE_GOVERNANCE')}
        />
      )}

      {/* VIEW 4: MODEL & RULE GOVERNANCE */}
      {activeSubTab === 'RULE_GOVERNANCE' && (
        <RuleVersionDiff
          policies={policies}
          activePolicy={activePolicy}
          onActivatePolicy={onActivatePolicy}
        />
      )}
    </div>
  );
};
