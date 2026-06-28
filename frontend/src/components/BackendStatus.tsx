import { useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';

type Status = 'checking' | 'waking' | 'ready' | 'offline';

const POLL_INTERVAL_MS = 8_000;

export function BackendStatus() {
  const [status, setStatus] = useState<Status>('checking');
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let polling = true;

    async function check() {
      const ok = await api.ping();
      if (!polling) return;

      if (ok) {
        setStatus('ready');
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }

      setStatus((prev) => (prev === 'checking' ? 'waking' : prev));
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
    }

    check();
    const poller = setInterval(() => {
      if (polling) check();
    }, POLL_INTERVAL_MS);

    return () => {
      polling = false;
      clearInterval(poller);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  if (status === 'ready' || status === 'checking') return null;

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
