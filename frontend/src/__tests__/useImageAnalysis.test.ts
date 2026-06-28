import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useImageAnalysis } from '@/hooks/useImageAnalysis';
import * as apiModule from '@/services/api';
import type { AnalysisResult } from '@/types/analysis';

const MOCK_RESULT: AnalysisResult = {
  id: 'test-uuid-1234',
  verdict: 'FAKE',
  confidence: 0.92,
  heatmap_url: '/api/heatmap/test-uuid-1234',
  artifacts: {
    texture_score: 0.8,
    lighting_score: 0.6,
    edge_score: 0.7,
    frequency_score: 0.5,
  },
  analysis_time_ms: 312,
  created_at: '2026-06-28T10:00:00Z',
  filename: 'test.jpg',
};

function makeFile(): File {
  return new File([new Uint8Array(100)], 'test.jpg', { type: 'image/jpeg' });
}

describe('useImageAnalysis', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => useImageAnalysis());
    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('transitions to success state on a resolved API call', async () => {
    vi.spyOn(apiModule.api, 'analyzeImage').mockResolvedValue(MOCK_RESULT);

    const { result } = renderHook(() => useImageAnalysis());

    await act(async () => {
      await result.current.analyze(makeFile());
    });

    expect(result.current.status).toBe('success');
    expect(result.current.result).toEqual(MOCK_RESULT);
    expect(result.current.error).toBeNull();
  });

  it('transitions to error state on a rejected API call', async () => {
    vi.spyOn(apiModule.api, 'analyzeImage').mockRejectedValue(
      new apiModule.ApiError(500, 'Internal server error'),
    );

    const { result } = renderHook(() => useImageAnalysis());

    await act(async () => {
      await result.current.analyze(makeFile());
    });

    expect(result.current.status).toBe('error');
    expect(result.current.result).toBeNull();
    expect(result.current.error).toBe('Internal server error');
  });

  it('returns to idle after reset is called', async () => {
    vi.spyOn(apiModule.api, 'analyzeImage').mockResolvedValue(MOCK_RESULT);

    const { result } = renderHook(() => useImageAnalysis());

    await act(async () => {
      await result.current.analyze(makeFile());
    });

    expect(result.current.status).toBe('success');

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.result).toBeNull();
  });

  it('surfaces a generic message for non-ApiError exceptions', async () => {
    vi.spyOn(apiModule.api, 'analyzeImage').mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() => useImageAnalysis());

    await act(async () => {
      await result.current.analyze(makeFile());
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toMatch(/unexpected error/i);
  });
});
