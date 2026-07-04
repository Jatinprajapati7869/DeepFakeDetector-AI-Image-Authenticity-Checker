import { useCallback, useReducer } from 'react';
import { api, ApiError } from '@/services/api';
import type { AnalysisResult, AnalysisStatus } from '@/types/analysis';

interface AnalysisState {
  status: AnalysisStatus;
  result: AnalysisResult | null;
  error: string | null;
}

type Action =
  | { type: 'UPLOAD_START' }
  | { type: 'ANALYSIS_START' }
  | { type: 'SUCCESS'; payload: AnalysisResult }
  | { type: 'ERROR'; payload: string }
  | { type: 'RESET' };

const initialState: AnalysisState = {
  status: 'idle',
  result: null,
  error: null,
};

function reducer(state: AnalysisState, action: Action): AnalysisState {
  switch (action.type) {
    case 'UPLOAD_START':
      return { status: 'uploading', result: null, error: null };
    case 'ANALYSIS_START':
      return { ...state, status: 'analyzing' };
    case 'SUCCESS':
      return { status: 'success', result: action.payload, error: null };
    case 'ERROR':
      return { status: 'error', result: null, error: action.payload };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

export function useImageAnalysis() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const analyze = useCallback(async (file: File) => {
    dispatch({ type: 'UPLOAD_START' });

    try {
      dispatch({ type: 'ANALYSIS_START' });
      const result = await api.analyzeImage(file);
      dispatch({ type: 'SUCCESS', payload: result });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'An unexpected error occurred. Please try again.';
      dispatch({ type: 'ERROR', payload: message });
    }
  }, []);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return { ...state, analyze, reset };
}
