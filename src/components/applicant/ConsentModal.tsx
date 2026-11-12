import React from 'react';
import { ShieldCheck, CheckSquare, Square, Lock } from 'lucide-react';
import { ConsentRecord } from '../../engine/underwriting';

interface ConsentModalProps {
  consents: ConsentRecord[];
  onToggleConsent: (sourceId: ConsentRecord['sourceId']) => void;
  onGrantAll: () => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({
  consents,
  onToggleConsent,
  onGrantAll
}) => {
  const mandatoryConsents = consents.filter((c) => c.required);
  const allMandatoryGranted = mandatoryConsents.every((c) => c.granted);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            04. Explicit Digital Consent & RBI Fair Practices Disclosure
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Granular, revocable data-source authorizations required under RBI Digital Lending & Account Aggregator guidelines.
          </p>
        </div>
        <button
          type="button"
          onClick={onGrantAll}
          className="px-4 py-2 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Authorize All Data Sources
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {consents.map((consent) => (
          <div
            key={consent.sourceId}
            className="p-5 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-mono text-slate-700">{consent.provider}</span>
                <span aria-hidden="true">·</span>
                <span>{consent.regulatoryCitation}</span>
                <span aria-hidden="true">·</span>
                <span className={consent.required ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                  {consent.required ? 'Mandatory for Underwriting' : 'Optional Collateral Speedup'}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{consent.label}</span>
              </h3>
              <p className="text-sm text-slate-600">{consent.purpose}</p>
              {consent.timestamp && consent.granted && (
                <p className="text-xs font-mono tabular-nums text-emerald-700 pt-1">
                  Digitally signed & timestamped: {consent.timestamp} · Revocable via AA Portal
                </p>
              )}
            </div>

            <div className="shrink-0">
              <button
                type="button"
                role="switch"
                aria-checked={consent.granted}
                aria-label={`Toggle consent for ${consent.label}`}
                onClick={() => onToggleConsent(consent.sourceId)}
                className={`px-4 py-2.5 rounded-lg text-xs font-medium inline-flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
                  consent.granted
                    ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                    : 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200'
                }`}
              >
                {consent.granted ? (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    Consent Granted
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4" />
                    Grant Consent
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl flex items-start gap-3">
        <Lock className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 space-y-1">
          <p className="font-semibold text-slate-900">
            Borrower Rights under RBI Fair Practices Code (FPC)
          </p>
          <p>
            Your bureau enquiry and Account Aggregator fetch are encrypted end-to-end and used solely for mortgage underwriting. In case of an adverse credit decision or referral, you are guaranteed a plain-language statement of primary reason codes and weights.
          </p>
          {!allMandatoryGranted && (
            <p className="text-red-700 font-medium pt-1">
              Note: Unchecking mandatory consents (CIBIL Bureau, Account Aggregator, or CKYC) will trigger an immediate compliance hold (RBI-FPC-101).
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
