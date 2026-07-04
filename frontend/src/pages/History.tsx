import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { HistoryLog } from '@/components/HistoryLog';
import { HeatmapCanvas } from '@/components/HeatmapCanvas';
import { ConfidenceGauge } from '@/components/ConfidenceGauge';
import { AnalysisBreakdown } from '@/components/AnalysisBreakdown';
import { useHistory } from '@/hooks/useHistory';
import { api } from '@/services/api';
import type { AnalysisResult } from '@/types/analysis';

export function History() {
  const { data, page, isLoading, error, goToPage } = useHistory();
  const [selected, setSelected] = useState<AnalysisResult | null>(null);

  const handleItemClick = useCallback((item: AnalysisResult) => {
    setSelected(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-4">
        <Link
          to="/"
          className="text-sm text-accent hover:underline"
          aria-label="Back to scanner"
        >
          Back
        </Link>
        <h1 className="font-display text-2xl font-bold text-white">Analysis History</h1>
      </div>

      {error && (
        <p role="alert" className="mb-6 text-sm text-fake">{error}</p>
      )}

      {selected && (
        <div className="mb-8 animate-slide-up rounded-lg border border-slate-750 bg-surface-raised p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-slate-200 truncate max-w-xs" title={selected.filename}>
              {selected.filename}
            </h2>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-sm text-slate-500 hover:text-slate-300"
              aria-label="Close detail view"
            >
              Close
            </button>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <HeatmapCanvas
              imageUrl={api.heatmapUrl(selected.id)}
              heatmapUrl={api.heatmapUrl(selected.id)}
              showOverlay={false}
            />
            <div className="flex flex-col gap-4">
              <ConfidenceGauge verdict={selected.verdict} confidence={selected.confidence} />
            </div>
          </div>

          <div className="mt-4">
            <AnalysisBreakdown artifacts={selected.artifacts} />
          </div>
        </div>
      )}

      {data && (
        <HistoryLog
          items={data.items}
          total={data.total}
          page={page}
          pageSize={data.page_size}
          isLoading={isLoading}
          onPageChange={goToPage}
          onItemClick={handleItemClick}
        />
      )}

      {isLoading && !data && (
        <div className="flex h-48 items-center justify-center" aria-live="polite" aria-busy="true">
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      )}
    </main>
  );
}
