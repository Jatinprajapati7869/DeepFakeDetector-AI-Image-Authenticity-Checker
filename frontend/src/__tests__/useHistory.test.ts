import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistory } from '@/hooks/useHistory';
import * as apiModule from '@/services/api';
import type { HistoryPage } from '@/types/analysis';

const MOCK_PAGE_1: HistoryPage = {
  items: [
    {
      id: '1',
      verdict: 'FAKE',
      confidence: 0.9,
      heatmap_url: '',
      artifacts: { texture_score: 0, lighting_score: 0, edge_score: 0, frequency_score: 0 },
      analysis_time_ms: 100,
      created_at: '',
      filename: '1.jpg',
    },
  ],
  total: 2,
  page: 1,
  page_size: 1,
};

const MOCK_PAGE_2: HistoryPage = {
  items: [
    {
      id: '2',
      verdict: 'REAL',
      confidence: 0.9,
      heatmap_url: '',
      artifacts: { texture_score: 0, lighting_score: 0, edge_score: 0, frequency_score: 0 },
      analysis_time_ms: 100,
      created_at: '',
      filename: '2.jpg',
    },
  ],
  total: 2,
  page: 2,
  page_size: 1,
};

describe('useHistory', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('H1: Fetches page 1 on mount', async () => {
    const fetchSpy = vi.spyOn(apiModule.api, 'getHistory').mockResolvedValue(MOCK_PAGE_1);

    const { result } = renderHook(() => useHistory());

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    // Wait for effect to settle
    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchSpy).toHaveBeenCalledWith(1);
    expect(result.current.data).toEqual(MOCK_PAGE_1);
    expect(result.current.error).toBeNull();
  });

  it('H2: goToPage triggers a new fetch with correct page', async () => {
    const fetchSpy = vi.spyOn(apiModule.api, 'getHistory');
    fetchSpy.mockResolvedValueOnce(MOCK_PAGE_1);
    fetchSpy.mockResolvedValueOnce(MOCK_PAGE_2);

    const { result } = renderHook(() => useHistory());

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.goToPage(2);
    });

    expect(result.current.isLoading).toBe(true);

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(fetchSpy).toHaveBeenCalledWith(2);
    expect(result.current.data).toEqual(MOCK_PAGE_2);
  });

  it('H3: Error response exposes error string and clears data', async () => {
    vi.spyOn(apiModule.api, 'getHistory').mockRejectedValue(new Error('Failed to fetch'));

    const { result } = renderHook(() => useHistory());

    await vi.waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load history.');
    expect(result.current.data).toBeNull();
  });
});
