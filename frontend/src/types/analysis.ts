export type Verdict = 'REAL' | 'FAKE';
export type ModelMode = 'demo' | 'mock' | 'real';

export type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'success' | 'error';

export interface ArtifactBreakdown {
  /** 0-1: higher = more suspicious texture inconsistencies */
  texture_score: number;
  /** 0-1: higher = more suspicious lighting anomalies */
  lighting_score: number;
  /** 0-1: higher = more suspicious edge artifacts */
  edge_score: number;
  /** 0-1: higher = more high-frequency FFT artifacts */
  frequency_score: number;
}

export interface AnalysisResult {
  id: string;
  verdict: Verdict;
  /** Probability that the verdict is correct (0.0-1.0) */
  confidence: number;
  heatmap_url: string;
  artifacts: ArtifactBreakdown;
  analysis_time_ms: number;
  created_at: string;
  filename: string;
}

export interface BatchResultItem {
  filename: string;
  result: AnalysisResult | null;
  error: string | null;
}

export interface ApiError {
  detail: string;
}

export interface HealthStatus {
  status: string;
  model_loaded: boolean;
  version: string;
  demo_mode: boolean;
  model_mode: ModelMode;
}

export interface HistoryPage {
  items: AnalysisResult[];
  total: number;
  page: number;
  page_size: number;
}

