import { useState } from 'react';
import type { AnalysisResult, ModelMode } from '@/types/analysis';
import { downloadMarkdownReport } from '@/utils/reportExport';

interface ReportActionsProps {
  result: AnalysisResult;
  modelMode?: ModelMode;
}

export function ReportActions({ result, modelMode }: ReportActionsProps) {
  const [copied, setCopied] = useState(false);

  async function copyAnalysisId() {
    await navigator.clipboard?.writeText(result.id);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <button
        type="button"
        onClick={() => downloadMarkdownReport(result, modelMode)}
        className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-surface transition hover:bg-accent-hover"
      >
        Download Report
      </button>
      <button
        type="button"
        onClick={copyAnalysisId}
        className="rounded-md border border-slate-750 bg-surface-raised px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-surface-overlay hover:text-white"
      >
        {copied ? 'Copied' : 'Copy Analysis ID'}
      </button>
    </div>
  );
}
