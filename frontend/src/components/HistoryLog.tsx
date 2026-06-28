import { clsx } from 'clsx';
import type { AnalysisResult } from '@/types/analysis';

interface HistoryLogProps {
  items: AnalysisResult[];
  total: number;
  page: number;
  pageSize: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onItemClick?: (item: AnalysisResult) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoryLog({
  items,
  total,
  page,
  pageSize,
  isLoading,
  onPageChange,
  onItemClick,
}: HistoryLogProps) {
  const totalPages = Math.ceil(total / pageSize);

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center" aria-live="polite" aria-busy="true">
        <p className="text-sm text-slate-500">Loading history…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-slate-500">
        <p className="text-sm">No analyses yet. Upload your first image to get started.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-slate-500">{total} image{total !== 1 ? 's' : ''} analyzed</p>

      <ul className="divide-y divide-slate-750 rounded-lg border border-slate-750 bg-surface-raised" role="list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onItemClick?.(item)}
              className="flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-surface-overlay"
              aria-label={`View analysis for ${item.filename}, verdict: ${item.verdict}, confidence: ${Math.round(item.confidence * 100)}%`}
            >
              <span
                className={clsx(
                  'shrink-0 rounded-md px-2.5 py-0.5 text-xs font-bold uppercase',
                  item.verdict === 'FAKE'
                    ? 'bg-red-900/40 text-fake-dark'
                    : 'bg-green-900/40 text-real-dark',
                )}
              >
                {item.verdict}
              </span>

              <span className="min-w-0 flex-1 truncate text-sm text-slate-300" title={item.filename}>
                {item.filename}
              </span>

              <span className="shrink-0 font-display text-sm font-semibold text-slate-400">
                {Math.round(item.confidence * 100)}%
              </span>

              <span className="shrink-0 text-xs text-slate-500">
                {formatDate(item.created_at)}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="rounded-md border border-slate-750 px-3 py-1.5 text-sm text-slate-400 transition hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Previous page"
      >
        Prev
      </button>

      <span className="font-display text-sm text-slate-400">
        {page} / {totalPages}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="rounded-md border border-slate-750 px-3 py-1.5 text-sm text-slate-400 transition hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Next page"
      >
        Next
      </button>
    </nav>
  );
}
