import { useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';
import type { HealthStatus } from '@/types/analysis';

type Status = 'checking' | 'waking' | 'ready' | 'offline';

const POLL_INTERVAL_MS = 8_000;
const OFFLINE_THRESHOLD_S = 120;

function modeLabel(health: HealthStatus): string {
  if (health.model_mode === 'real') return 'Real model';
  if (health.model_mode === 'mock') return 'Mock model';
  return 'Demo mode';
}

function modeDescription(health: HealthStatus): string {
  if (health.model_mode === 'real') {
    return 'Using configured model weights for inference.';
  }
  if (health.model_mode === 'mock') {
    return 'Using mock inference because model weights are not enabled.';
  }
  return 'Using deterministic sample-friendly inference so the app runs immediately after clone.';
}

export function BackendStatus() {
  const [status, setStatus] = useState<Status>('checking');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;

    function stopAll() {
      activeRef.current = false;
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    }

    function startElapsedTimer() {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startRef.current) / 1000);
        setElapsed(secs);
        if (secs >= OFFLINE_THRESHOLD_S) {
          setStatus('offline');
          stopAll();
        }
      }, 1000);
    }

    async function check() {
      try {
        const nextHealth = await api.getHealth();
        if (!activeRef.current) return;
        setHealth(nextHealth);
        setStatus('ready');
        stopAll();
      } catch {
        if (!activeRef.current) return;
        setStatus((prev) => (prev === 'checking' ? 'waking' : prev));
        startElapsedTimer();
      }
    }

    check();
    pollerRef.current = setInterval(() => {
      if (activeRef.current) check();
    }, POLL_INTERVAL_MS);

    return () => stopAll();
  }, []);

  if (status === 'checking') return null;

  if (status === 'ready' && health) {
    const isReal = health.model_mode === 'real';
    return (
      <div
        role="status"
        className="mb-6 flex flex-col gap-2 rounded-lg border border-slate-750 bg-surface-raised px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="font-display font-semibold text-slate-100">Backend ready</p>
          <p className="mt-0.5 text-xs text-slate-500">{modeDescription(health)}</p>
        </div>
        <span
          className={`w-fit rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${
            isReal ? 'bg-green-900/40 text-real-dark' : 'bg-amber-900/40 text-amber-300'
          }`}
        >
          {modeLabel(health)}
        </span>
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div
        role="alert"
        className="mb-6 flex items-start gap-3 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm"
      >
        <div className="mt-0.5 h-4 w-4 shrink-0 rounded-full bg-red-500" aria-hidden="true" />
        <div>
          <p className="font-display font-semibold text-red-400">Backend is offline</p>
          <p className="mt-0.5 text-red-500/80">
            The server did not respond after {OFFLINE_THRESHOLD_S} seconds. Please{' '}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="underline hover:text-red-300"
            >
              refresh the page
            </button>{' '}
            to try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 flex items-start gap-3 rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm"
    >
      <div
        className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-amber-500 border-t-transparent"
        aria-hidden="true"
      />
      <div>
        <p className="font-display font-semibold text-amber-400">
          Backend is waking up...{elapsed > 0 ? ` (${elapsed}s)` : ''}
        </p>
        <p className="mt-0.5 text-amber-500/80">
          The free-tier server starts from sleep on first visit. This takes up to 90 seconds. Your
          upload will work automatically once it is ready.
        </p>
      </div>
    </div>
  );
}

