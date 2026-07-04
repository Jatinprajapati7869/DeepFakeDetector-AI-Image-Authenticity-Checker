import type { AnalysisResult, BatchResultItem, HistoryPage } from '@/types/analysis';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

// Generous timeouts: the Render free tier needs time to wake up and
// download the model (~90s on a cold start).
const TIMEOUT_MS = {
  analyze: 150_000, // 2.5 min
  batch: 240_000, // 4 min
  default: 30_000,
} as const;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(
        408,
        'The request timed out. The backend may still be waking up — please wait 30 seconds and try again.',
      );
    }
    // Network error (CORS, no internet, backend down)
    throw new ApiError(
      0,
      'Could not reach the server. Check your internet connection or wait for the backend to wake up.',
    );
  } finally {
    clearTimeout(timer);
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? `Server error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async ping(): Promise<boolean> {
    try {
      const res = await fetchWithTimeout(`${BASE_URL}/api/health`, {}, 8_000);
      return res.ok;
    } catch {
      return false;
    }
  },

  async pollJobStatus<T>(jobId: string, timeoutMs: number): Promise<T> {
    const startTime = Date.now();
    let attempt = 0;

    while (Date.now() - startTime < timeoutMs) {
      try {
        const res = await fetchWithTimeout(`${BASE_URL}/api/status/${jobId}`, {}, 10_000);
        const data = await handleResponse<{ status: string; result?: T; error?: string }>(res);

        if (data.status === 'completed' && data.result) {
          return data.result;
        }
        if (data.status === 'failed') {
          throw new ApiError(500, data.error || 'Background job failed.');
        }

        attempt++;
      } catch (err) {
        // If it's a hard 500 error from a failed job, re-throw it so the UI shows the error
        if (err instanceof ApiError && err.status === 500) {
          throw err;
        }
        // Otherwise (like a 408 timeout or network drop), ignore and let the loop retry
        console.warn('Polling interrupted, retrying...', err);
        attempt++;
      }

      // Exponential backoff: 2s → 4s → 8s, capped at 15s
      const delay = Math.min(2_000 * 2 ** attempt, 15_000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    throw new ApiError(408, 'The request timed out while polling job status.');
  },

  async analyzeImage(file: File): Promise<AnalysisResult> {
    const form = new FormData();
    form.append('file', file);

    const res = await fetchWithTimeout(
      `${BASE_URL}/api/analyze`,
      { method: 'POST', body: form },
      30_000,
    );
    const data = await handleResponse<{ job_id: string }>(res);
    return this.pollJobStatus<AnalysisResult>(data.job_id, TIMEOUT_MS.analyze);
  },

  async analyzeBatch(files: File[]): Promise<BatchResultItem[]> {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));

    const res = await fetchWithTimeout(
      `${BASE_URL}/api/batch`,
      { method: 'POST', body: form },
      30_000,
    );
    const data = await handleResponse<{ job_id: string }>(res);
    const result = await this.pollJobStatus<{ results: BatchResultItem[] }>(
      data.job_id,
      TIMEOUT_MS.batch,
    );
    return result.results;
  },

  async getHistory(page = 1, pageSize = 20): Promise<HistoryPage> {
    const res = await fetchWithTimeout(
      `${BASE_URL}/api/history?page=${page}&page_size=${pageSize}`,
      {},
      TIMEOUT_MS.default,
    );
    return handleResponse<HistoryPage>(res);
  },

  heatmapUrl(analysisId: string): string {
    return `${BASE_URL}/api/heatmap/${analysisId}`;
  },
};
