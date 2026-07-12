import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HistoryLog } from '@/components/HistoryLog';
import { useHistory } from '@/hooks/useHistory';
import type { AnalysisResult } from '@/types/analysis';

export function History() {
  const { data, page, isLoading, error, goToPage } = useHistory();
  const navigate = useNavigate();

  const handleItemClick = useCallback(
    (item: AnalysisResult) => {
      navigate(`/history/${item.id}`);
    },
    [navigate],
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-4">
        <Link to="/" className="text-sm text-accent hover:underline" aria-label="Back to scanner">
          Back
        </Link>
        <h1 className="font-display text-2xl font-bold text-white">Analysis History</h1>
      </div>

      {error && (
        <p role="alert" className="mb-6 text-sm text-fake">
          {error}
        </p>
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
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      )}
    </main>
  );
}
