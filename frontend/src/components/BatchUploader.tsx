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
            'rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500',
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
            className="text-sm text-gray-500 underline hover:text-gray-700"
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
        <p role="alert" className="text-sm text-red-600">{state.error}</p>
      )}

      {state.results.length > 0 && (
        <BatchResultsTable results={state.results} />
      )}
    </div>
  );
}

function BatchResultsTable({ results }: { results: BatchResultItem[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-sm" aria-label="Batch analysis results">
        <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500">
          <tr>
            <th className="px-4 py-3 text-left">File</th>
            <th className="px-4 py-3 text-left">Verdict</th>
            <th className="px-4 py-3 text-left">Confidence</th>
            <th className="px-4 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {results.map((item, i) => (
            <tr key={i} className="transition hover:bg-gray-50">
              <td className="max-w-[200px] truncate px-4 py-3 font-medium text-gray-700" title={item.filename}>
                {item.filename}
              </td>
              <td className="px-4 py-3">
                {item.result ? (
                  <span className={clsx(
                    'rounded-full px-2.5 py-0.5 text-xs font-bold uppercase',
                    item.result.verdict === 'FAKE'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-green-100 text-green-700',
                  )}>
                    {item.result.verdict}
                  </span>
                ) : '—'}
              </td>
              <td className="px-4 py-3 text-gray-600">
                {item.result ? `${Math.round(item.result.confidence * 100)}%` : '—'}
              </td>
              <td className="px-4 py-3">
                {item.error
                  ? <span className="text-red-500">{item.error}</span>
                  : <span className="text-green-600">✓ Done</span>
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
