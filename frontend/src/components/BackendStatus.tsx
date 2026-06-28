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

      // First failed check — start the elapsed timer and mark as waking
      setStatus((prev) => (prev === 'checking' ? 'waking' : prev));
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
      }, 1000);
    }

    // Initial check immediately, then poll
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

  // Don't render anything when ready or still on first check
  if (status === 'ready' || status === 'checking') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm"
    >
      <span className="mt-0.5 shrink-0 animate-spin text-base" aria-hidden="true">⚙️</span>
      <div>
        <p className="font-semibold text-amber-800">
          Backend is waking up…{elapsed > 0 ? ` (${elapsed}s)` : ''}
        </p>
        <p className="mt-0.5 text-amber-700">
          The free-tier server starts from sleep on first visit. This takes up to 90 seconds.
          Your upload will work automatically once it&apos;s ready.
        </p>
      </div>
    </div>
  );
}
