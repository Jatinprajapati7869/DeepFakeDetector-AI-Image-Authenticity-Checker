import { useCallback, useReducer, useRef } from 'react';
import { clsx } from 'clsx';
import { validateImageFiles } from '@/utils/imageValidation';
import { api, ApiError } from '@/services/api';
import type { BatchResultItem } from '@/types/analysis';

interface BatchState {
  status: 'idle' | 'analyzing' | 'done' | 'error';
  results: BatchResultItem[];
  error: string | null;
}

type Action =
  | { type: 'START' }
  | { type: 'SUCCESS'; payload: BatchResultItem[] }
  | { type: 'ERROR'; payload: string }
  | { type: 'RESET' };

function reducer(state: BatchState, action: Action): BatchState {
  switch (action.type) {
    case 'START':   return { status: 'analyzing', results: [], error: null };
    case 'SUCCESS': return { status: 'done', results: action.payload, error: null };
    case 'ERROR':   return { status: 'error', results: [], error: action.payload };
    case 'RESET':   return { status: 'idle', results: [], error: null };
    default:        return state;
  }
}

export function BatchUploader() {
  const [state, dispatch] = useReducer(reducer, {
    status: 'idle', results: [], error: null,
  });
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    const validation = validateImageFiles(fileArray);
    if (!validation.valid) {
      dispatch({ type: 'ERROR', payload: validation.error ?? 'Invalid files.' });
      return;
    }

    dispatch({ type: 'START' });
    try {
      const results = await api.analyzeBatch(fileArray);
      dispatch({ type: 'SUCCESS', payload: results });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Batch analysis failed.';
      dispatch({ type: 'ERROR', payload: message });
    }
  }, []);

  const isAnalyzing = state.status === 'analyzing';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isAnalyzing}
          className={clsx(
            'rounded-md bg-accent px-4 py-2 text-sm font-semibold text-surface transition hover:bg-accent-muted',
            isAnalyzing && 'cursor-not-allowed opacity-60',
          )}
          aria-busy={isAnalyzing}
        >
          {isAnalyzing ? 'Analyzing…' : 'Select Images (up to 10)'}
        </button>

        {state.status === 'done' && (
          <button
            type="button"
            onClick={() => dispatch({ type: 'RESET' })}
            className="text-sm text-slate-400 underline hover:text-slate-200"
          >
            Clear results
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          aria-hidden="true"
          tabIndex={-1}
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={isAnalyzing}
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-fake">{state.error}</p>
      )}

      {state.results.length > 0 && (
        <BatchResultsTable results={state.results} />
      )}
    </div>
  );
}

function BatchResultsTable({ results }: { results: BatchResultItem[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-750">
      <table className="w-full text-sm" aria-label="Batch analysis results">
        <thead className="bg-surface-raised text-xs font-semibold uppercase tracking-wider text-slate-400">
          <tr>
            <th className="px-4 py-3 text-left">File</th>
            <th className="px-4 py-3 text-left">Verdict</th>
            <th className="px-4 py-3 text-left">Confidence</th>
            <th className="px-4 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-750 bg-surface">
          {results.map((item, i) => (
            <tr key={i} className="transition hover:bg-surface-raised">
              <td className="max-w-[200px] truncate px-4 py-3 font-medium text-slate-300" title={item.filename}>
                {item.filename}
              </td>
              <td className="px-4 py-3">
                {item.result ? (
                  <span className={clsx(
                    'rounded-md px-2.5 py-0.5 text-xs font-bold uppercase',
                    item.result.verdict === 'FAKE'
                      ? 'bg-red-900/40 text-fake-dark'
                      : 'bg-green-900/40 text-real-dark',
                  )}>
                    {item.result.verdict}
                  </span>
                ) : '—'}
              </td>
              <td className="px-4 py-3 text-slate-400">
                {item.result ? `${Math.round(item.result.confidence * 100)}%` : '—'}
              </td>
              <td className="px-4 py-3">
                {item.error
                  ? <span className="text-fake">{item.error}</span>
                  : <span className="text-real">Done</span>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
