import React, { useState } from 'react';
import { BarChart3, Sliders } from 'lucide-react';
import {
  evaluateApplication,
  formatINR,
  MortgageApplication,
  PolicyRuleConfig,
  ShapContribution
} from '../../engine/underwriting';

interface SHAPWaterfallProps {
  application: MortgageApplication;
  activePolicy: PolicyRuleConfig;
}

export const SHAPWaterfall: React.FC<SHAPWaterfallProps> = ({
  application,
  activePolicy
}) => {
  const [coApplicantIncome, setCoApplicantIncome] = useState<number>(0);
  const [additionalDownPayment, setAdditionalDownPayment] = useState<number>(0);

  // Counterfactual simulation
  const simulatedInput = {
    ...application,
    netMonthlyIncome: application.netMonthlyIncome + coApplicantIncome,
    requestedLoanAmount: Math.max(
      300000,
      application.requestedLoanAmount - additionalDownPayment
    )
  };
  const isCounterfactualActive = coApplicantIncome > 0 || additionalDownPayment > 0;
  const activeResult = isCounterfactualActive
    ? evaluateApplication(
        simulatedInput,
        activePolicy,
        application.documents.map((d) =>
          d.category === 'SALARY_SLIP'
            ? {
                ...d,
                ocrNumericValue: simulatedInput.netMonthlyIncome
              }
            : d
        ),
        application.consents
      )
    : application.result;

  const baseScore = activeResult.baseScore;
  const finalScore = activeResult.finalScore;

  // Build cumulative waterfall steps from baseScore (600)
  let runningTotal = baseScore;
  const waterfallBars = activeResult.shapWaterfall.map((item: ShapContribution) => {
    const start = runningTotal;
    const end = runningTotal + item.contribution;
    runningTotal = end;
    return {
      ...item,
      start,
      end,
      minVal: Math.min(start, end),
      maxVal: Math.max(start, end)
    };
  });

  // Scale helper: map [300, 900] score space to [0%, 100%]
  const toPercent = (scoreVal: number) => {
    const clamped = Math.max(300, Math.min(900, scoreVal));
    return ((clamped - 300) / 600) * 100;
  };

  return (
    <div className="p-5 bg-white border border-slate-200 rounded-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-mono text-slate-700">SHAP Additive Feature Attribution</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">Base E[f(x)] = {baseScore} pts</span>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mt-1">
            <BarChart3 className="w-4 h-4 text-slate-700" />
            Underwriter SHAP Waterfall & Counterfactual Lab
          </h3>
        </div>

        <div className="text-right font-mono tabular-nums">
          <span className="text-xs text-slate-500 block">Final Model Score f(x)</span>
          <span className="text-lg font-bold text-slate-900">
            {finalScore} / 900 ({activeResult.outcome})
          </span>
        </div>
      </div>

      {/* Horizontal SHAP Waterfall Chart */}
      <div className="space-y-3">
        {/* Baseline row */}
        <div className="grid grid-cols-12 items-center gap-3 text-xs">
          <div className="col-span-4 sm:col-span-3 font-medium text-slate-700 truncate">
            Baseline Prior E[f(x)]
          </div>
          <div className="col-span-6 sm:col-span-7 relative h-6 bg-slate-100 rounded overflow-hidden">
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-slate-900"
              style={{ left: `${toPercent(baseScore)}%` }}
            />
            <div
              className="h-full bg-slate-300"
              style={{ width: `${toPercent(baseScore)}%` }}
            />
          </div>
          <div className="col-span-2 text-right font-mono tabular-nums font-semibold text-slate-700">
            {baseScore} pts
          </div>
        </div>

        {waterfallBars.map((bar) => {
          const leftPct = toPercent(bar.minVal);
          const widthPct = Math.max(1.5, toPercent(bar.maxVal) - leftPct);
          const isPositive = bar.contribution >= 0;

          return (
            <div key={bar.feature} className="space-y-1">
              <div className="grid grid-cols-12 items-center gap-3 text-xs">
                <div className="col-span-4 sm:col-span-3">
                  <p className="font-semibold text-slate-900 truncate">{bar.feature}</p>
                  <p className="text-[11px] font-mono text-slate-500 truncate">{bar.rawValue}</p>
                </div>

                <div className="col-span-6 sm:col-span-7 relative h-7 bg-slate-100 rounded overflow-hidden">
                  {/* 600 baseline reference line */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-slate-300"
                    style={{ left: `${toPercent(baseScore)}%` }}
                  />
                  {/* Approval threshold 620 reference line */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-emerald-600/40"
                    style={{ left: `${toPercent(620)}%` }}
                  />
                  <div
                    className={`absolute top-1 bottom-1 rounded transition-all ${
                      isPositive ? 'bg-emerald-600' : 'bg-red-600'
                    }`}
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`
                    }}
                  />
                </div>

                <div className="col-span-2 text-right font-mono tabular-nums">
                  <span
                    className={`font-bold ${
                      isPositive ? 'text-emerald-700' : 'text-red-700'
                    }`}
                  >
                    {isPositive ? `+${bar.contribution}` : bar.contribution}
                  </span>
                  <span className="text-slate-400 block text-[11px]">
                    → {Math.max(300, Math.min(900, bar.end))}
                  </span>
                </div>
              </div>
              <p className="text-xs text-slate-500 pl-1">{bar.plainEnglishReason}</p>
            </div>
          );
        })}

        {/* Axis Scale Footer */}
        <div className="grid grid-cols-12 items-center gap-3 pt-2 border-t border-slate-100 text-[11px] font-mono tabular-nums text-slate-500">
          <div className="col-span-4 sm:col-span-3">Score Axis (300–900)</div>
          <div className="col-span-6 sm:col-span-7 flex justify-between">
            <span>300 (High Risk)</span>
            <span>600 (Base)</span>
            <span>900 (Prime)</span>
          </div>
          <div className="col-span-2 text-right font-semibold text-slate-900">
            = {finalScore} pts
          </div>
        </div>
      </div>

      {/* Counterfactual What-If Restructure Simulator */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-slate-700" />
            <h4 className="text-sm font-semibold text-slate-900">
              Interactive Counterfactual Restructure Simulator (What-If Analysis)
            </h4>
          </div>
          {isCounterfactualActive && (
            <button
              type="button"
              onClick={() => {
                setCoApplicantIncome(0);
                setAdditionalDownPayment(0);
              }}
              className="text-xs font-medium text-slate-700 underline cursor-pointer"
            >
              Reset Counterfactual
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="coApplicantSlider" className="text-slate-700 font-medium">
                Add Co-Applicant Net Monthly Income
              </label>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                +{formatINR(coApplicantIncome)}/mo
              </span>
            </div>
            <input
              id="coApplicantSlider"
              type="range"
              min={0}
              max={100000}
              step={10000}
              value={coApplicantIncome}
              onChange={(e) => setCoApplicantIncome(Number(e.target.value))}
              className="w-full accent-slate-900 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="downPaymentSlider" className="text-slate-700 font-medium">
                Increase Borrower Down-Payment (Reduce Loan)
              </label>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                -{formatINR(additionalDownPayment)}
              </span>
            </div>
            <input
              id="downPaymentSlider"
              type="range"
              min={0}
              max={1500000}
              step={100000}
              value={additionalDownPayment}
              onChange={(e) => setAdditionalDownPayment(Number(e.target.value))}
              className="w-full accent-slate-900 cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums">
          <span>
            Simulated FOIR: <strong>{activeResult.foirPercent}%</strong> (was {application.result.foirPercent}%)
          </span>
          <span>
            Simulated LTV: <strong>{activeResult.ltvPercent}%</strong> (was {application.result.ltvPercent}%)
          </span>
          <span>
            Simulated Outcome:{' '}
            <strong
              className={
                activeResult.outcome === 'APPROVED'
                  ? 'text-emerald-700'
                  : activeResult.outcome === 'REFERRED'
                  ? 'text-amber-700'
                  : 'text-red-700'
              }
            >
              {activeResult.outcome} ({activeResult.finalScore} pts)
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};
