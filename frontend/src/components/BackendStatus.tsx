import { useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';

type Status = 'checking' | 'waking' | 'ready' | 'offline';

const POLL_INTERVAL_MS = 8_000;
/** After this many seconds with no response, stop polling and show the offline banner. */
const OFFLINE_THRESHOLD_S = 120;

export function BackendStatus() {
  const [status, setStatus] = useState<Status>('checking');
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref-based active flag so inner callbacks can stop polling without closure staleness
  const activeRef = useRef(true);

  useEffect(() => {
    function stopAll() {
      activeRef.current = false;
      if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
      if (pollerRef.current) { clearInterval(pollerRef.current); pollerRef.current = null; }
    }

    function startElapsedTimer() {
      // Always clear before starting — prevents duplicate timers on repeated failed pings
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
      const ok = await api.ping();
      if (!activeRef.current) return;

      if (ok) {
        setStatus('ready');
        stopAll();
        return;
      }

      setStatus((prev) => (prev === 'checking' ? 'waking' : prev));
      startElapsedTimer();
    }

    check();
    pollerRef.current = setInterval(() => {
      if (activeRef.current) check();
    }, POLL_INTERVAL_MS);

    return () => stopAll();
  }, []);

  if (status === 'ready' || status === 'checking') return null;

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
      <div className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" aria-hidden="true" />
      <div>
        <p className="font-display font-semibold text-amber-400">
          Backend is waking up…{elapsed > 0 ? ` (${elapsed}s)` : ''}
        </p>
        <p className="mt-0.5 text-amber-500/80">
          The free-tier server starts from sleep on first visit. This takes up to 90 seconds.
          Your upload will work automatically once it&apos;s ready.
        </p>
      </div>
    </div>
  );
}
