import { useEffect, useState } from 'react';
import { api, ApiError } from '@/services/api';
import type { AnalysisResult } from '@/types/analysis';

interface AnalysisDetailState {
  result: AnalysisResult | null;
  isLoading: boolean;
  error: string | null;
}

export function useAnalysisDetail(analysisId: string | undefined) {
  const [state, setState] = useState<AnalysisDetailState>({
    result: null,
    isLoading: Boolean(analysisId),
    error: null,
  });

  useEffect(() => {
    if (!analysisId) {
      setState({ result: null, isLoading: false, error: 'Missing analysis ID.' });
      return;
    }

    let active = true;
    setState({ result: null, isLoading: true, error: null });

    api
      .getAnalysis(analysisId)
      .then((result) => {
        if (active) setState({ result, isLoading: false, error: null });
      })
      .catch((err) => {
        const message = err instanceof ApiError ? err.message : 'Failed to load analysis.';
        if (active) setState({ result: null, isLoading: false, error: message });
      });

    return () => {
      active = false;
    };
  }, [analysisId]);

  return state;
}
