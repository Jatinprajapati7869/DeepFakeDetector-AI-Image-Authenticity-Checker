import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAnalysisDetail } from '@/hooks/useAnalysisDetail';
import * as apiModule from '@/services/api';
import type { AnalysisResult } from '@/types/analysis';

const MOCK_RESULT: AnalysisResult = {
  id: 'analysis-1',
  verdict: 'FAKE',
  confidence: 0.91,
  heatmap_url: '/api/heatmap/analysis-1',
  artifacts: {
    texture_score: 0.8,
    lighting_score: 0.4,
    edge_score: 0.7,
    frequency_score: 0.6,
  },
  analysis_time_ms: 42,
  created_at: '2026-07-12T00:00:00Z',
  filename: 'sample.jpg',
};

describe('useAnalysisDetail', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads one analysis by ID', async () => {
    const fetchSpy = vi.spyOn(apiModule.api, 'getAnalysis').mockResolvedValue(MOCK_RESULT);

    const { result } = renderHook(() => useAnalysisDetail('analysis-1'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchSpy).toHaveBeenCalledWith('analysis-1');
    expect(result.current.result).toEqual(MOCK_RESULT);
    expect(result.current.error).toBeNull();
  });

  it('returns a missing ID error without calling API', async () => {
    const fetchSpy = vi.spyOn(apiModule.api, 'getAnalysis');

    const { result } = renderHook(() => useAnalysisDetail(undefined));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.current.error).toBe('Missing analysis ID.');
  });

  it('surfaces load errors', async () => {
    vi.spyOn(apiModule.api, 'getAnalysis').mockRejectedValue(new apiModule.ApiError(404, 'Not found'));

    const { result } = renderHook(() => useAnalysisDetail('missing'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBe('Not found');
  });
});