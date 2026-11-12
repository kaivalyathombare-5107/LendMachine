import React, { useState } from 'react';
import {
  CheckCircle2,
  Download,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import {
  AuditLogEntry,
  DecisionOutcome,
  verifyAuditLogChain
} from '../../engine/underwriting';

interface AuditLogTableProps {
  logs: AuditLogEntry[];
  onSelectApplication?: (applicationId: string) => void;
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({
  logs,
  onSelectApplication
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | DecisionOutcome>('ALL');
  const [simulateTamper, setSimulateTamper] = useState<boolean>(false);

  // Apply optional tamper simulation to demonstrate cryptographic verification
  const effectiveLogs: AuditLogEntry[] = simulateTamper
    ? logs.map((entry, idx) =>
        idx === 1
          ? {
              ...entry,
              outcome: 'APPROVED',
              score: 845,
              details: `${entry.details} [UNAUTHORIZED DB MUTATION]`
            }
          : entry
      )
    : logs;

  const chainVerification = verifyAuditLogChain(effectiveLogs);

  const filteredLogs = effectiveLogs.filter((entry) => {
    const matchesOutcome =
      outcomeFilter === 'ALL' || entry.outcome === outcomeFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      entry.applicantName.toLowerCase().includes(q) ||
      entry.applicationId.toLowerCase().includes(q) ||
      entry.officerOrEngine.toLowerCase().includes(q) ||
      entry.id.toLowerCase().includes(q);
    return matchesOutcome && matchesQuery;
  });

  const handleExportCsv = () => {
    const headers = [
      'Audit ID',
      'Timestamp',
      'Application ID',
      'Applicant Name',
      'Product',
      'Decision',
      'Score',
      'Policy Version',
      'Decision Authority',
      'Prev Hash',
      'Record Hash'
    ];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.timestamp,
      l.applicationId,
      `"${l.applicantName}"`,
      l.loanType,
      l.outcome,
      l.score,
      l.policyVersion,
      `"${l.officerOrEngine}"`,
      l.prevHash,
      l.recordHash
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HHF_RBI_Compliance_Audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Cryptographic Tamper-Evidence Header Banner */}
      <div
        className={`p-5 rounded-xl border flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
          chainVerification.isValid
            ? 'bg-white border-slate-200'
            : 'bg-red-50 border-red-300'
        }`}
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5 text-slate-700" />
            <span>SHA-Style Hash-Chained Ledger</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              Verified Records: {chainVerification.verifiedCount}/{effectiveLogs.length}
            </span>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
            {chainVerification.isValid ? (
              <>
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0" />
                <span>Immutable Compliance Audit Log — Cryptographic Chain Verified</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-5 h-5 text-red-700 shrink-0" />
                <span className="text-red-950">
                  Tamper Alert: Hash Mismatch Detected in Record(s):{' '}
                  {chainVerification.tamperedIds.join(', ')}
                </span>
              </>
            )}
          </h2>
          <p className="text-sm text-slate-600">
            Every automated or manual credit decision hashes the preceding record digest, preventing retroactive manipulation prior to NHB/RBI inspection.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setSimulateTamper((prev) => !prev)}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              simulateTamper
                ? 'bg-emerald-700 text-white border-emerald-700 hover:bg-emerald-800'
                : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
            }`}
          >
            {simulateTamper
              ? 'Restore Original Hash Chain'
              : 'Simulate Record Tamper Attack'}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Audit CSV
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search compliance audit records"
            placeholder="Search by Applicant Name, App ID (HHF-2026-...), or Officer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          {(['ALL', 'APPROVED', 'REFERRED', 'REJECTED'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setOutcomeFilter(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                outcomeFilter === status
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {status === 'ALL' ? 'All Decisions' : status}
            </button>
          ))}
        </div>
      </div>

      {/* High-Density Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-600">
                <th className="py-3 px-4">Audit ID & Timestamp</th>
                <th className="py-3 px-4">Application & Borrower</th>
                <th className="py-3 px-4">Decision Authority</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4 text-right">Score</th>
                <th className="py-3 px-4">Policy & Telemetry</th>
                <th className="py-3 px-4">Cryptographic Hash Integrity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No audit records match your current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((entry) => {
                  const isTampered = chainVerification.tamperedIds.includes(entry.id);
                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isTampered ? 'bg-red-50/70' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-slate-900">{entry.id}</div>
                        <div className="text-[11px] text-slate-500">{entry.timestamp}</div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() =>
                            onSelectApplication && onSelectApplication(entry.applicationId)
                          }
                          className="font-semibold text-slate-900 hover:underline text-left cursor-pointer"
                        >
                          {entry.applicantName}
                        </button>
                        <div className="text-[11px] font-mono text-slate-500">
                          {entry.applicationId} · {entry.loanType === 'HOME_LOAN' ? 'Home Loan' : 'LAP'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{entry.officerOrEngine}</td>
                      <td className="py-3 px-4 font-mono font-semibold whitespace-nowrap">
                        <span
                          className={
                            entry.outcome === 'APPROVED'
                              ? 'text-emerald-700'
                              : entry.outcome === 'REFERRED'
                              ? 'text-amber-700'
                              : 'text-red-700'
                          }
                        >
                          {entry.outcome}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                        {entry.score}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-[11px] text-slate-800">
                          {entry.policyVersion}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {entry.details}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums whitespace-nowrap">
                        {isTampered ? (
                          <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            HASH BROKEN
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              {entry.recordHash.slice(0, 14)}...
                            </span>
                            <div className="text-[10px] text-slate-400">
                              prev: {entry.prevHash.slice(0, 10)}...
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
