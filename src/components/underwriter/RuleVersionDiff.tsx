import React, { useState } from 'react';
import { GitCompare, RotateCcw, CheckCircle2 } from 'lucide-react';
import {
  computeRuleVersionDiff,
  PolicyRuleConfig
} from '../../engine/underwriting';

interface RuleVersionDiffProps {
  policies: PolicyRuleConfig[];
  activePolicy: PolicyRuleConfig;
  onActivatePolicy: (version: string) => void;
}

export const RuleVersionDiff: React.FC<RuleVersionDiffProps> = ({
  policies,
  activePolicy,
  onActivatePolicy
}) => {
  const [leftVersion, setLeftVersion] = useState<string>(policies[2]?.version || policies[0].version);
  const [rightVersion, setRightVersion] = useState<string>(activePolicy.version);

  const leftPolicy = policies.find((p) => p.version === leftVersion) || policies[0];
  const rightPolicy = policies.find((p) => p.version === rightVersion) || activePolicy;

  const diffRows = computeRuleVersionDiff(leftPolicy, rightPolicy);
  const changedCount = diffRows.filter((d) => d.changed).length;

  return (
    <div className="space-y-6">
      <div className="p-5 bg-white border border-slate-200 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <GitCompare className="w-3.5 h-3.5 text-slate-700" />
            <span>Model & Credit Policy Rule Governance</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">Active Engine: {activePolicy.version}</span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900">
            Policy Version History, Side-by-Side Diff & Instant Rollback
          </h2>
          <p className="text-sm text-slate-600">
            Audit parameter changes across policy releases and switch or roll back the live underwriting rule engine with full portfolio re-evaluation.
          </p>
        </div>
      </div>

      {/* Policy Version Cards with 1-Click Rollback / Deploy */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {policies.map((pol) => {
          const isCurrent = pol.version === activePolicy.version;
          return (
            <div
              key={pol.version}
              className={`p-5 rounded-xl border flex flex-col justify-between gap-4 ${
                isCurrent
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-900 border-slate-200'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span>{pol.version}</span>
                  <span
                    className={
                      isCurrent
                        ? 'text-emerald-400 font-semibold'
                        : 'text-slate-500'
                    }
                  >
                    {isCurrent ? 'LIVE IN ENGINE' : pol.status}
                  </span>
                </div>
                <h3 className="text-base font-semibold">{pol.label}</h3>
                <p
                  className={`text-xs ${
                    isCurrent ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {pol.releaseNotes}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-700/20 flex items-center justify-between gap-2">
                <span
                  className={`text-[11px] font-mono ${
                    isCurrent ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {pol.deployedAt}
                </span>

                {isCurrent ? (
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Active Version
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onActivatePolicy(pol.version);
                      setRightVersion(pol.version);
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    {pol.status === 'ARCHIVED' ? 'Rollback to Version' : 'Deploy Staged Rules'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Side-by-Side Diff Viewer */}
      <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Side-by-Side Policy Parameter Diff ({changedCount} parameters modified)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare baseline thresholds against staged or production rule configurations.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <label htmlFor="leftVersionSelect" className="text-slate-600 font-medium">
                Baseline (A):
              </label>
              <select
                id="leftVersionSelect"
                value={leftVersion}
                onChange={(e) => setLeftVersion(e.target.value)}
                className="px-2.5 py-1.5 font-mono bg-slate-50 border border-slate-300 rounded-lg"
              >
                {policies.map((p) => (
                  <option key={p.version} value={p.version}>
                    {p.version}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="rightVersionSelect" className="text-slate-600 font-medium">
                Target (B):
              </label>
              <select
                id="rightVersionSelect"
                value={rightVersion}
                onChange={(e) => setRightVersion(e.target.value)}
                className="px-2.5 py-1.5 font-mono bg-slate-50 border border-slate-300 rounded-lg"
              >
                {policies.map((p) => (
                  <option key={p.version} value={p.version}>
                    {p.version}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Policy Parameter</th>
                <th className="py-3 px-4 text-right font-mono">Baseline ({leftPolicy.version})</th>
                <th className="py-3 px-4 text-right font-mono">Target ({rightPolicy.version})</th>
                <th className="py-3 px-4 text-right">Delta & Credit Posture</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {diffRows.map((row) => (
                <tr
                  key={row.fieldKey}
                  className={row.changed ? 'bg-amber-50/40' : 'hover:bg-slate-50'}
                >
                  <td className="py-3 px-4 font-medium text-slate-900">{row.label}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                    {row.oldValue} {row.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                    {row.newValue} {row.unit}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {!row.changed ? (
                      <span className="text-slate-400">UNCHANGED</span>
                    ) : row.riskDirection === 'RELAXED' ? (
                      <span className="text-emerald-700 font-semibold">
                        RELAXED (Inclusive Expansion)
                      </span>
                    ) : (
                      <span className="text-amber-700 font-semibold">
                        STRICTER (Risk Tightening)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
