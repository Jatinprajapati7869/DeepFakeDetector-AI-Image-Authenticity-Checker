import { Link, useParams } from 'react-router-dom';
import { AnalysisBreakdown } from '@/components/AnalysisBreakdown';
import { ConfidenceGauge } from '@/components/ConfidenceGauge';
import { HeatmapCanvas } from '@/components/HeatmapCanvas';
import { ReportActions } from '@/components/ReportActions';
import { ResultExplanation } from '@/components/ResultExplanation';
import { useAnalysisDetail } from '@/hooks/useAnalysisDetail';
import { useBackendHealth } from '@/hooks/useBackendHealth';
import { api } from '@/services/api';

export function AnalysisDetail() {
  const { id } = useParams();
  const { result, isLoading, error } = useAnalysisDetail(id);
  const health = useBackendHealth();
  const modelMode = health?.model_mode ?? 'demo';

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-4">
        <Link to="/history" className="text-sm text-accent hover:underline" aria-label="Back to history">
          Back
        </Link>
        <h1 className="min-w-0 truncate font-display text-2xl font-bold text-white">
          Analysis Detail
        </h1>
      </div>

      {isLoading && (
        <div className="flex h-48 items-center justify-center" aria-live="polite" aria-busy="true">
          <p className="text-sm text-slate-500">Loading analysis...</p>
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-red-900/50 bg-fake-light p-4 text-sm text-fake">
          {error}
        </p>
      )}

      {result && (
        <div className="animate-slide-up flex flex-col gap-6">
          <section className="rounded-lg border border-slate-750 bg-surface-raised p-5">
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="max-w-xl truncate font-display text-base font-semibold text-white" title={result.filename}>
                  {result.filename}
                </h2>
                <p className="text-xs text-slate-500">
                  {new Date(result.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <HeatmapCanvas
                imageUrl={api.heatmapUrl(result.id)}
                heatmapUrl={api.heatmapUrl(result.id)}
                showOverlay={false}
              />
              <div className="flex flex-col gap-4">
                <ConfidenceGauge verdict={result.verdict} confidence={result.confidence} />
              </div>
            </div>
          </section>

          <ResultExplanation result={result} modelMode={modelMode} />
          <AnalysisBreakdown artifacts={result.artifacts} />
          <ReportActions result={result} modelMode={modelMode} />
        </div>
      )}
    </main>
  );
}
