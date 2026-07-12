import type { AnalysisResult, ModelMode } from '@/types/analysis';
import { confidenceTier, formatPercent, modelModeLabel } from '@/utils/reportExport';

interface ResultExplanationProps {
  result: AnalysisResult;
  modelMode?: ModelMode;
}

function verdictCopy(result: AnalysisResult): string {
  const tier = confidenceTier(result.confidence);
  if (result.verdict === 'FAKE') {
    if (tier === 'high') return 'The scanner found strong synthetic-image signals.';
    if (tier === 'medium') return 'The scanner found several synthetic-image signals, but review is still needed.';
    return 'The scanner leaned synthetic with low confidence. Treat this as inconclusive.';
  }
  if (tier === 'high') return 'The scanner found few synthetic-image signals.';
  if (tier === 'medium') return 'The scanner leaned real, but some artifact scores deserve review.';
  return 'The scanner leaned real with low confidence. Treat this as inconclusive.';
}

export function ResultExplanation({ result, modelMode = 'demo' }: ResultExplanationProps) {
  const isDemoLike = modelMode !== 'real';

  return (
    <section className="rounded-lg border border-slate-750 bg-surface-raised p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-display text-base font-semibold text-white">Result explanation</h2>
          <p className="mt-1 text-sm text-slate-400">{verdictCopy(result)}</p>
        </div>
        <span className="w-fit rounded-md bg-surface-overlay px-2.5 py-1 text-xs font-bold uppercase text-slate-300">
          {modelModeLabel(modelMode)}
        </span>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase text-slate-500">Confidence</dt>
          <dd className="mt-1 font-display font-semibold text-slate-200">
            {formatPercent(result.confidence)} ({confidenceTier(result.confidence)})
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Analysis ID</dt>
          <dd className="mt-1 truncate font-mono text-xs text-slate-300" title={result.id}>
            {result.id}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Runtime</dt>
          <dd className="mt-1 font-display font-semibold text-slate-200">
            {result.analysis_time_ms} ms
          </dd>
        </div>
      </dl>

      {isDemoLike && (
        <p className="mt-4 rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          This run used {modelModeLabel(modelMode).toLowerCase()}. It is suitable for product review
          and local portfolio demos, not forensic claims.
        </p>
      )}
    </section>
  );
}
