import React from 'react';
import { CheckCircle2, AlertCircle, XCircle, GitBranch } from 'lucide-react';
import { DecisionNodeResult, DecisionOutcome } from '../../engine/underwriting';

interface DecisionTreeProps {
  nodes: DecisionNodeResult[];
  finalOutcome: DecisionOutcome;
  policyVersion: string;
}

export const DecisionTree: React.FC<DecisionTreeProps> = ({
  nodes,
  finalOutcome,
  policyVersion
}) => {
  const passCount = nodes.filter((n) => n.status === 'PASS').length;
  const referCount = nodes.filter((n) => n.status === 'REFER').length;
  const failCount = nodes.filter((n) => n.status === 'FAIL').length;

  return (
    <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono text-slate-700">Rule Execution Trace</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">Policy {policyVersion}</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mt-1">
            <GitBranch className="w-4 h-4 text-slate-700" />
            Visual Policy & Risk Decision Tree
          </h3>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono tabular-nums">
          <span className="text-emerald-700 font-semibold">{passCount} PASS</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="text-amber-700 font-semibold">{referCount} REFER</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="text-red-700 font-semibold">{failCount} FAIL</span>
        </div>
      </div>

      {/* Connected Decision Pipeline Flow */}
      <div className="space-y-3">
        {nodes.map((node, index) => {
          const isPass = node.status === 'PASS';
          const isRefer = node.status === 'REFER';

          return (
            <div key={node.id} className="relative">
              {index < nodes.length - 1 && (
                <div
                  className="hidden sm:block absolute left-5 top-12 bottom-[-14px] w-px bg-slate-200"
                  aria-hidden="true"
                />
              )}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {isPass ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : isRefer ? (
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-slate-700">
                        {node.ruleCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{node.category.replace('_', ' ')}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">
                        Weight: {node.impactWeight}%
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900">{node.label}</h4>
                    <p className="text-xs text-slate-600">{node.detail}</p>
                  </div>
                </div>

                <div className="sm:text-right shrink-0 space-y-1 pl-8 sm:pl-0">
                  <div className="text-xs font-mono tabular-nums text-slate-900 font-semibold">
                    {node.actualValueText}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    Threshold: {node.thresholdText}
                  </div>
                  <div
                    className={`text-xs font-mono font-bold ${
                      isPass
                        ? 'text-emerald-700'
                        : isRefer
                        ? 'text-amber-700'
                        : 'text-red-700'
                    }`}
                  >
                    GATE OUTCOME: {node.status}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Terminal Decision Synthesis Node */}
        <div className="p-4 bg-slate-900 text-white rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-xs font-mono text-slate-400">
              Terminal Aggregation Rule (ANY FAIL → REJECT · ANY REFER → REFER · ALL PASS → APPROVE)
            </span>
            <p className="text-sm font-semibold">
              Synthesized Engine Recommendation: {finalOutcome}
            </p>
          </div>
          <span
            className={`text-xs font-mono font-bold shrink-0 ${
              finalOutcome === 'APPROVED'
                ? 'text-emerald-400'
                : finalOutcome === 'REFERRED'
                ? 'text-amber-400'
                : 'text-red-400'
            }`}
          >
            FINAL STATE: {finalOutcome}
          </span>
        </div>
      </div>
    </div>
  );
};
