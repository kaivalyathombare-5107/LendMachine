import React from 'react';
import { CheckCircle2, Scale, AlertTriangle } from 'lucide-react';
import {
  computeFairnessMetrics,
  FairnessSegmentMetric,
  MortgageApplication
} from '../../engine/underwriting';

interface FairnessDashboardProps {
  applications: MortgageApplication[];
  activePolicyVersion: string;
  onNavigateToGovernance: () => void;
}

export const FairnessDashboard: React.FC<FairnessDashboardProps> = ({
  applications,
  activePolicyVersion,
  onNavigateToGovernance
}) => {
  const metrics = computeFairnessMetrics(applications);
  const groups: FairnessSegmentMetric['segmentGroup'][] = [
    'Geography Tier',
    'Loan Ticket Size',
    'Applicant Type'
  ];

  const watchOrAdverseCount = metrics.filter((m) => m.status !== 'PASS').length;

  return (
    <div className="space-y-6">
      <div className="p-5 bg-white border border-slate-200 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Scale className="w-3.5 h-3.5 text-slate-700" />
            <span>Algorithmic Fairness & Disparate Impact Monitor</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">Active Policy: {activePolicyVersion}</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">
            Demographic & Proxy Segment Parity Dashboard (Four-Fifths 0.80 Rule)
          </h2>
          <p className="text-sm text-slate-600">
            Tracks approval rates across geography tiers, loan ticket sizes, and borrower occupations to detect unintended disparate impact before regulatory audit.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right font-mono tabular-nums text-xs">
            <span className="text-slate-500 block">Segments Monitored</span>
            <span className="font-semibold text-slate-900">
              {metrics.length} Segments ({watchOrAdverseCount} Watch/Alert)
            </span>
          </div>
          <button
            type="button"
            onClick={onNavigateToGovernance}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Calibrate Policy Rules →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {groups.map((groupName) => {
          const groupRows = metrics.filter((m) => m.segmentGroup === groupName);
          return (
            <div
              key={groupName}
              className="p-5 bg-white border border-slate-200 rounded-xl flex flex-col justify-between space-y-5"
            >
              <div className="pb-3 border-b border-slate-200">
                <span className="text-xs text-slate-500">Proxy Dimension</span>
                <h3 className="text-base font-semibold text-slate-900 mt-0.5">
                  {groupName} Parity
                </h3>
              </div>

              <div className="space-y-4 flex-1">
                {groupRows.map((row) => (
                  <div
                    key={row.segmentLabel}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-900 whitespace-nowrap truncate">
                        {row.segmentLabel}
                      </span>
                      <span
                        className={`text-xs font-mono tabular-nums font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0 ${
                          row.status === 'PASS'
                            ? 'text-emerald-700'
                            : row.status === 'WATCH'
                            ? 'text-amber-700'
                            : 'text-red-700'
                        }`}
                      >
                        {row.status === 'PASS' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        )}
                        DIR {row.disparateImpactRatio.toFixed(2)} ·{' '}
                        {row.status === 'ADVERSE_IMPACT' ? 'ALERT' : row.status}
                      </span>
                    </div>

                    {/* Visual Approval Rate Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono tabular-nums text-slate-600">
                        <span>Approval Rate: {row.approvalRate}%</span>
                        <span>Avg Score: {row.avgScore}</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            row.status === 'PASS'
                              ? 'bg-emerald-600'
                              : row.status === 'WATCH'
                              ? 'bg-amber-600'
                              : 'bg-red-600'
                          }`}
                          style={{ width: `${Math.max(6, row.approvalRate)}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-500 pt-1">
                      <span>Total: {row.totalApplications}</span>
                      <span>
                        Approve: {row.approvedCount} · Refer: {row.referredCount} · Reject:{' '}
                        {row.rejectedCount}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 text-xs text-slate-500">
                Benchmark: Disparate Impact Ratio (DIR) &gt;= 0.80 vs highest-approved cohort in dimension.
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
