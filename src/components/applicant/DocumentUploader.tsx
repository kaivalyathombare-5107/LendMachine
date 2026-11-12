import React, { useState } from 'react';
import { Check, Edit3, FileText, Upload, Camera, AlertTriangle } from 'lucide-react';
import { DocumentRecord } from '../../engine/underwriting';

interface DocumentUploaderProps {
  documents: DocumentRecord[];
  onUpdateDocument: (docId: string, updates: Partial<DocumentRecord>) => void;
  onConfirmAll: () => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  documents,
  onUpdateDocument,
  onConfirmAll
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftValue, setDraftValue] = useState<string>('');
  const [simulatedCaptureNotice, setSimulatedCaptureNotice] = useState<string | null>(null);

  const confirmedCount = documents.filter((d) => d.isConfirmed).length;

  const startEdit = (doc: DocumentRecord) => {
    setEditingId(doc.id);
    setDraftValue(doc.ocrConfirmedValue.replace(/[^0-9A-Za-z]/g, ''));
  };

  const saveEdit = (doc: DocumentRecord) => {
    const cleaned = draftValue.trim();
    if (!cleaned) {
      setEditingId(null);
      return;
    }
    const numeric = Number(cleaned.replace(/[^0-9]/g, ''));
    const isCurrency = doc.ocrExtractedValue.startsWith('₹');
    const formatted =
      isCurrency && Number.isFinite(numeric) && numeric > 0
        ? `₹${numeric.toLocaleString('en-IN')}`
        : cleaned.toUpperCase();

    onUpdateDocument(doc.id, {
      ocrConfirmedValue: formatted,
      ocrNumericValue: isCurrency && Number.isFinite(numeric) ? numeric : doc.ocrNumericValue,
      isConfirmed: true,
      discrepancyNote:
        formatted !== doc.ocrExtractedValue
          ? `Applicant corrected OCR value from ${doc.ocrExtractedValue} to ${formatted}`
          : undefined
    });
    setEditingId(null);
  };

  const handleSimulateReupload = (doc: DocumentRecord, mode: 'upload' | 'camera') => {
    const timestamp = new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    });
    onUpdateDocument(doc.id, {
      fileName:
        mode === 'camera'
          ? `MobileCapture_${doc.category}_${Date.now().toString().slice(-4)}.jpg`
          : `Reuploaded_${doc.fileName}`,
      uploadedAt: `2026-11-12 ${timestamp} IST`,
      ocrConfidence: 99.4,
      isConfirmed: true
    });
    setSimulatedCaptureNotice(
      `${doc.title} ${mode === 'camera' ? 'captured via mobile camera' : 'uploaded'} & OCR re-extracted at 99.4% confidence.`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            03. Document Upload & Inline OCR Verification
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Confirm extracted values before underwriting to prevent OCR misreads from causing false rejections.
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="text-xs font-mono tabular-nums text-slate-600">
            Confirmed: {confirmedCount}/{documents.length} documents
          </span>
          <button
            type="button"
            onClick={onConfirmAll}
            className="px-4 py-2 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Confirm All Extracted Values
          </button>
        </div>
      </div>

      {simulatedCaptureNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center justify-between">
          <span>{simulatedCaptureNotice}</span>
          <button
            type="button"
            onClick={() => setSimulatedCaptureNotice(null)}
            className="text-emerald-700 underline ml-4 whitespace-nowrap cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {documents.map((doc) => {
          const isEditing = editingId === doc.id;
          return (
            <div
              key={doc.id}
              className="p-5 bg-white border border-slate-200 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono text-slate-700">{doc.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{doc.fileName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">OCR Confidence {doc.ocrConfidence}%</span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>{doc.title}</span>
                </h3>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSimulateReupload(doc, 'upload')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Replace PDF / Drag-and-Drop
                  </button>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <button
                    type="button"
                    onClick={() => handleSimulateReupload(doc, 'camera')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Mobile Camera Capture
                  </button>
                </div>
              </div>

              {/* Inline OCR Confirmation Box */}
              <div className="lg:w-[460px] p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="text-xs text-slate-500">{doc.ocrFieldLabel} (Inline OCR Read)</p>
                  {isEditing ? (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        aria-label={`Edit ${doc.ocrFieldLabel}`}
                        value={draftValue}
                        onChange={(e) => setDraftValue(e.target.value)}
                        className="w-36 px-2.5 py-1 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                      <button
                        type="button"
                        onClick={() => saveEdit(doc)}
                        className="px-3 py-1 text-xs font-medium bg-emerald-700 text-white rounded hover:bg-emerald-800 whitespace-nowrap cursor-pointer"
                      >
                        Save & Confirm
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-slate-900">
                      We read <span className="font-mono tabular-nums font-semibold">{doc.ocrConfirmedValue}</span> — confirm?
                    </p>
                  )}
                  {doc.discrepancyNote && (
                    <p className="text-xs text-amber-700 pt-0.5">{doc.discrepancyNote}</p>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(doc)}
                      aria-label={`Edit OCR value for ${doc.title}`}
                      className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateDocument(doc.id, { isConfirmed: !doc.isConfirmed })
                      }
                      aria-label={
                        doc.isConfirmed
                          ? `Confirmed ${doc.title}`
                          : `Confirm OCR value for ${doc.title}`
                      }
                      className={`px-3 py-1.5 text-xs font-medium rounded-md inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                        doc.isConfirmed
                          ? 'bg-emerald-700 text-white'
                          : 'bg-amber-600 text-white hover:bg-amber-700'
                      }`}
                    >
                      {doc.isConfirmed ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Confirmed
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Confirm Value
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
