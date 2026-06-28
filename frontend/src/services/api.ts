import type {
  AnalysisResult,
  BatchResultItem,
  HistoryPage,
} from '@/types/analysis';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? 'Unknown error');
  }
  return res.json() as Promise<T>;
}

export const api = {
  async analyzeImage(file: File): Promise<AnalysisResult> {
    const form = new FormData();
    form.append('file', file);

    const res = await fetch(`${BASE_URL}/api/analyze`, {
      method: 'POST',
      body: form,
    });

    return handleResponse<AnalysisResult>(res);
  },

  async analyzeBatch(files: File[]): Promise<BatchResultItem[]> {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));

    const res = await fetch(`${BASE_URL}/api/batch`, {
      method: 'POST',
      body: form,
    });

    const data = await handleResponse<{ results: BatchResultItem[] }>(res);
    return data.results;
  },

  async getHistory(page = 1, pageSize = 20): Promise<HistoryPage> {
    const res = await fetch(
      `${BASE_URL}/api/history?page=${page}&page_size=${pageSize}`,
    );
    return handleResponse<HistoryPage>(res);
  },

  heatmapUrl(analysisId: string): string {
    return `${BASE_URL}/api/heatmap/${analysisId}`;
  },
};

export { ApiError };
