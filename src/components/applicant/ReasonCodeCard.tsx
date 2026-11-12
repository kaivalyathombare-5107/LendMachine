import React from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { DecisionOutcome, ReasonCodeItem } from '../../engine/underwriting';

interface ReasonCodeCardProps {
  outcome: DecisionOutcome;
  reasonCodes: ReasonCodeItem[];
}

export const ReasonCodeCard: React.FC<ReasonCodeCardProps> = ({
  outcome,
  reasonCodes
}) => {
  const negativeReasons = reasonCodes.filter((r) => r.direction === 'NEGATIVE');
  const displayReasons =
    outcome === 'APPROVED'
      ? reasonCodes.slice(0, 4)
      : negativeReasons.length > 0
      ? negativeReasons
      : reasonCodes.slice(0, 4);

  const primarySummaryText =
    outcome === 'REJECTED'
      ? `Your application was declined primarily due to: ${displayReasons
          .slice(0, 2)
          .map((r) => `${r.factor} (${r.weightPercent}% weight)`)
          .join(', ')}.`
      : outcome === 'REFERRED'
      ? `Your application was routed for human credit appraisal primarily due to: ${displayReasons
          .slice(0, 2)
          .map((r) => `${r.factor} (${r.weightPercent}% weight)`)
          .join(', ')}.`
      : `Your application met all automated policy norms led by: ${displayReasons
          .slice(0, 2)
          .map((r) => `${r.factor} (${r.weightPercent}% weight)`)
          .join(', ')}.`;

  return (
    <div className="p-6 bg-white border border-slate-200 rounded-xl space-y-5">
      <div className="space-y-1.5 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>RBI Fair Practices Code Statement</span>
          <span aria-hidden="true">·</span>
          <span>Applicant-Facing Plain-Language Explanation</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900">
          Why Our Engine Reached This Decision (Reason Code Breakdown)
        </h3>
        <p className="text-sm font-medium text-slate-800 pt-1">{primarySummaryText}</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {displayReasons.map((item) => {
          const isNeg = item.direction === 'NEGATIVE';
          return (
            <div
              key={item.code}
              className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isNeg ? (
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                  )}
                  <span className="text-xs font-mono text-slate-600">{item.code}</span>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <h4 className="text-sm font-semibold text-slate-900">{item.factor}</h4>
                </div>
                <span className="text-xs font-mono tabular-nums font-semibold text-slate-900">
                  Decision Weight: {item.weightPercent}%
                </span>
              </div>

              {/* Clean Weight Progress Bar */}
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    isNeg ? 'bg-red-600' : 'bg-emerald-600'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(8, item.weightPercent))}%` }}
                />
              </div>

              <p className="text-sm text-slate-700">{item.plainLanguageExplanation}</p>

              <div className="pt-1 flex items-start gap-2 text-xs text-slate-600">
                <Info className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  <strong className="font-medium text-slate-800">How to improve: </strong>
                  {item.actionableAdvice}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
