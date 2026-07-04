import { useCallback, useEffect, useRef, useState } from 'react';
import { ImageUploader } from '@/components/ImageUploader';
import { HeatmapCanvas } from '@/components/HeatmapCanvas';
import { ConfidenceGauge } from '@/components/ConfidenceGauge';
import { AnalysisBreakdown } from '@/components/AnalysisBreakdown';
import { BatchUploader } from '@/components/BatchUploader';
import { EducationalMode } from '@/components/EducationalMode';
import { BackendStatus } from '@/components/BackendStatus';
import { useImageAnalysis } from '@/hooks/useImageAnalysis';
import { api } from '@/services/api';

export function Home() {
  const { status, result, error, analyze, reset } = useImageAnalysis();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === 'uploading' || status === 'analyzing') {
      setElapsed(0);
      elapsedRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (elapsedRef.current) {
        clearInterval(elapsedRef.current);
        elapsedRef.current = null;
      }
    }
    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current);
    };
  }, [status]);

  const handleFileSelected = useCallback(
    (file: File) => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
      analyze(file);
    },
    [analyze, previewUrl],
  );

  const handleReset = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    reset();
  }, [reset, previewUrl]);

  const isProcessing = status === 'uploading' || status === 'analyzing';

  function loadingMessage(): string {
    if (status === 'uploading') return 'Uploading image…';
    if (elapsed < 5) return 'Running forensic analysis…';
    if (elapsed < 20) return `Scanning pixels… (${elapsed}s)`;
    if (elapsed < 60) return `Still working — server may be waking up (${elapsed}s)`;
    return `Almost there… please wait (${elapsed}s)`;
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-10 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Image Authenticity Scanner
        </h1>
        <p className="mt-3 text-base text-slate-400">
          Drop an image to run a forensic analysis. The neural network highlights the exact pixels
          it flagged as synthetic.
        </p>
      </header>

      <BackendStatus />

      {/* Mode tabs */}
      <div className="mb-6 flex rounded-lg border border-slate-750 bg-surface-raised p-1">
        {(['single', 'batch'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => {
              setActiveTab(tab);
              handleReset();
            }}
            aria-selected={activeTab === tab}
            role="tab"
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              activeTab === tab
                ? 'bg-surface-overlay text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab === 'single' ? 'Single Image' : 'Batch Mode'}
          </button>
        ))}
      </div>

      {activeTab === 'single' ? (
        <div className="flex flex-col gap-6">
          {status === 'idle' && <ImageUploader onFileSelected={handleFileSelected} />}

          {isProcessing && (
            <div
              role="status"
              aria-live="polite"
              className="flex flex-col items-center gap-3 rounded-lg border border-slate-750 bg-surface-raised py-16"
            >
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent border-t-transparent" />
              <p className="text-sm font-medium text-slate-300">{loadingMessage()}</p>
              {elapsed >= 15 && (
                <p className="max-w-xs text-center text-xs text-slate-500">
                  First request wakes the server and downloads the AI model. Subsequent requests are
                  much faster.
                </p>
              )}
            </div>
          )}

          {status === 'error' && (
            <div
              role="alert"
              className="rounded-lg border border-red-900/50 bg-fake-light p-5 text-center"
            >
              <p className="font-display font-semibold text-fake-dark">Analysis failed</p>
              <p className="mt-1 text-sm text-red-400">{error}</p>
              {error?.includes('timed out') || error?.includes('reach') ? (
                <p className="mt-2 text-xs text-red-500/80">
                  The backend is probably still waking up. Wait 30 seconds and try again.
                </p>
              ) : null}
              <button
                type="button"
                onClick={handleReset}
                className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          )}

          {status === 'success' && result && previewUrl && (
            <div className="animate-slide-up flex flex-col gap-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <HeatmapCanvas imageUrl={previewUrl} heatmapUrl={api.heatmapUrl(result.id)} />
                <div className="flex flex-col gap-4">
                  <ConfidenceGauge verdict={result.verdict} confidence={result.confidence} />
                  <p className="text-center text-xs text-slate-500">
                    Analyzed in {result.analysis_time_ms} ms
                  </p>
                </div>
              </div>

              <AnalysisBreakdown artifacts={result.artifacts} />

              <button
                type="button"
                onClick={handleReset}
                className="self-center rounded-md border border-slate-750 bg-surface-raised px-5 py-2 text-sm font-medium text-slate-300 transition hover:bg-surface-overlay hover:text-white"
              >
                Analyze Another Image
              </button>
            </div>
          )}
        </div>
      ) : (
        <BatchUploader />
      )}

      <div className="mt-10">
        <EducationalMode />
      </div>
    </main>
  );
}
