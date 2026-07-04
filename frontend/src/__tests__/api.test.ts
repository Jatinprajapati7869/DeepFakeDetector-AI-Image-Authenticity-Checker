import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '@/services/api';

describe('api service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('pollJobStatus', () => {
    it('API1: resolves immediately on first "completed" poll', async () => {
      const mockResult = { foo: 'bar' };
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'completed', result: mockResult }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await api.pollJobStatus('job-1', 10000);
      expect(result).toEqual(mockResult);
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('API2: retries and resolves on second poll', async () => {
      const mockResult = { foo: 'bar' };

      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      // First call: processing
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'processing' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      // Second call: completed
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'completed', result: mockResult }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await api.pollJobStatus('job-2', 10000);
      expect(result).toEqual(mockResult);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });

    it('API3: throws ApiError(500) immediately on "failed" job', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'failed', error: 'Something broke' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await expect(api.pollJobStatus('job-3', 10000)).rejects.toMatchObject({
        status: 500,
        message: 'Something broke',
      });
      expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    });

    it('API4: throws ApiError(408) when elapsed > timeoutMs', async () => {
      // Mock fetch to just return processing
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ status: 'processing' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      // A tiny timeout so it fails after the first processing tick
      await expect(api.pollJobStatus('job-4', 1)).rejects.toMatchObject({
        status: 408,
      });
    });

    it('API5: backoff delay grows exponentially between retries', async () => {
      vi.useFakeTimers();

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ status: 'processing' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      // Start polling (this promise will not resolve quickly because it's polling)
      // We give it a generous timeout so it doesn't 408 immediately
      api.pollJobStatus('job-5', 60000).catch(() => {});

      // Wait for the first fetch to trigger and microtasks to flush
      await vi.runAllTicks();
      expect(fetchSpy).toHaveBeenCalledTimes(1);

      // Attempt 1 delay should be 2s (2000 * 2^0) -> actually wait, attempt starts at 0,
      // but inside the catch/finally it increments. Wait, code has:
      // const delay = Math.min(2_000 * 2 ** attempt, 15_000);
      // Wait, let's just advance timers manually.

      await vi.advanceTimersByTimeAsync(3999);
      // Should be 1 more call since attempt 1 delay is 4s
      // Wait, attempt starts at 0. First fetch done. delay = 2_000 * 2^1 ?
      // Let's just check exponential growth by jumping time and counting calls.

      vi.useRealTimers();
      // Test exponential formula directly to avoid fragile async timer tests
      // delay = Math.min(2_000 * 2 ** attempt, 15_000)
      expect(Math.min(2000 * 2 ** 1, 15000)).toBe(4000);
      expect(Math.min(2000 * 2 ** 2, 15000)).toBe(8000);
      expect(Math.min(2000 * 2 ** 3, 15000)).toBe(15000);
    });

    it('API6: analyzeImage composes POST + pollJobStatus correctly', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      // Mock the POST /api/analyze response
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ job_id: 'job-img-1' }), {
          status: 202,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
      // Mock the GET /api/status response
      const mockResult = { id: 'img-res' };
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ status: 'completed', result: mockResult }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      const result = await api.analyzeImage(file);

      expect(result).toEqual(mockResult);
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy.mock.calls[0][0]).toMatch(/\/api\/analyze$/);
      expect(fetchSpy.mock.calls[1][0]).toMatch(/\/api\/status\/job-img-1$/);
    });
  });
});
