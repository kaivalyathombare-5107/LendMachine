import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, FastForward, AlertCircle, XCircle } from 'lucide-react';
import { UnderwritingResult } from '../../engine/underwriting';

interface StepperStatusProps {
  result: UnderwritingResult;
  policyVersion: string;
  onComplete: () => void;
}

const PIPELINE_STEPS = [
  {
    id: 'STEP_SUBMITTED',
    title: '01. Application Submitted',
    subtitle: 'Payload schema validated & assigned application reference ID',
    nodeCategories: [] as string[]
  },
  {
    id: 'STEP_DATA_VERIFIED',
    title: '02. Data Verified (OCR & Account Aggregator)',
    subtitle: 'Inline OCR income cross-match & 12M Sahamati AA bank cashflow check',
    nodeCategories: ['DATA_VERIFICATION', 'FRAUD_CHECK']
  },
  {
    id: 'STEP_RISK_ASSESSED',
    title: '03. Eligibility & Credit Risk Assessed',
    subtitle: 'FOIR, Collateral LTV, CERSAI Title & TransUnion CIBIL Bureau model',
    nodeCategories: ['ELIGIBILITY', 'RISK_MODEL']
  },
  {
    id: 'STEP_COMPLIANCE',
    title: '04. RBI Fair Practices & Policy Compliance',
    subtitle: 'Digital consent verification, reason-code generation & audit hash link',
    nodeCategories: ['COMPLIANCE']
  },
  {
    id: 'STEP_DECISION',
    title: '05. Final Decisioning Dispatched',
    subtitle: 'Dual-transparency borrower & underwriter artifacts ready',
    nodeCategories: [] as string[]
  }
];

export const StepperStatus: React.FC<StepperStatusProps> = ({
  result,
  policyVersion,
  onComplete
}) => {
  const [activeStageIndex, setActiveStageIndex] = useState<number>(1);

  useEffect(() => {
    if (activeStageIndex >= PIPELINE_STEPS.length) {
      const timer = setTimeout(() => {
        onComplete();
      }, 350);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setActiveStageIndex((prev) => prev + 1);
    }, 450);

    return () => clearTimeout(timer);
  }, [activeStageIndex, onComplete]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono text-slate-700">Live Underwriting Pipeline</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">Policy {policyVersion}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Stage {Math.min(activeStageIndex, PIPELINE_STEPS.length)}/{PIPELINE_STEPS.length}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mt-1">
            05. Real-Time Automated Underwriting Tracker
          </h2>
        </div>

        <button
          type="button"
          onClick={onComplete}
          className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FastForward className="w-3.5 h-3.5" />
          View Decision Immediately
        </button>
      </div>

      <div className="space-y-3">
        {PIPELINE_STEPS.map((step, index) => {
          const isDone = index < activeStageIndex;
          const isCurrent = index === activeStageIndex;
          const matchingNodes = result.decisionNodes.filter((n) =>
            step.nodeCategories.includes(n.category)
          );

          return (
            <div
              key={step.id}
              className={`p-5 rounded-xl border transition-colors ${
                isDone
                  ? 'bg-white border-slate-200'
                  : isCurrent
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    ) : isCurrent ? (
                      <Clock className="w-5 h-5 text-amber-400 shrink-0" />
                    ) : (
                      <Clock className="w-5 h-5 text-slate-400 shrink-0" />
                    )}
                    <h3
                      className={`text-base font-semibold ${
                        isCurrent ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {step.title}
                    </h3>
                  </div>
                  <p
                    className={`text-sm pl-7 ${
                      isCurrent ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    {step.subtitle}
                  </p>
                </div>

                <span
                  className={`text-xs font-mono tabular-nums shrink-0 ${
                    isDone
                      ? 'text-emerald-700 font-medium'
                      : isCurrent
                      ? 'text-amber-300'
                      : 'text-slate-400'
                  }`}
                >
                  {isDone ? 'Verified' : isCurrent ? 'Processing...' : 'Queued'}
                </span>
              </div>

              {isDone && matchingNodes.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 pl-7 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {matchingNodes.map((node) => (
                    <div
                      key={node.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span className="font-mono">{node.ruleCode}</span>
                          <span aria-hidden="true">·</span>
                          <span>Norm: {node.thresholdText}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-900">{node.label}</p>
                        <p className="text-xs font-mono tabular-nums text-slate-700">
                          Actual: {node.actualValueText}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-mono font-semibold shrink-0 inline-flex items-center gap-1 ${
                          node.status === 'PASS'
                            ? 'text-emerald-700'
                            : node.status === 'REFER'
                            ? 'text-amber-700'
                            : 'text-red-700'
                        }`}
                      >
                        {node.status === 'PASS' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {node.status === 'REFER' && <AlertCircle className="w-3.5 h-3.5" />}
                        {node.status === 'FAIL' && <XCircle className="w-3.5 h-3.5" />}
                        {node.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
