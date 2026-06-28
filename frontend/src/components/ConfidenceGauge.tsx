import { clsx } from 'clsx';
import type { Verdict } from '@/types/analysis';

interface ConfidenceGaugeProps {
  verdict: Verdict;
  confidence: number;
}

const RADIUS = 56;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ConfidenceGauge({ verdict, confidence }: ConfidenceGaugeProps) {
  const percentage = Math.round(confidence * 100);
  const strokeDashoffset = CIRCUMFERENCE * (1 - confidence);

  const isFake = verdict === 'FAKE';
  const strokeColor = isFake
    ? confidence > 0.85 ? '#ef4444' : '#f97316'
    : '#22c55e';

  const labelColor = isFake ? 'text-fake-dark' : 'text-real-dark';
  const bgColor = isFake ? 'bg-fake-light' : 'bg-real-light';

  return (
    <div
      className={clsx('flex flex-col items-center gap-3 rounded-lg p-6', bgColor)}
      role="meter"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${verdict} — ${percentage}% confidence`}
    >
      <div className="relative h-36 w-36">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={RADIUS}
            fill="none"
            stroke="#334155"
            strokeWidth="12"
          />
          <circle
            cx="70"
            cy="70"
            r={RADIUS}
            fill="none"
            stroke={strokeColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={clsx('font-display text-3xl font-bold', labelColor)}>
            {percentage}%
          </span>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            confidence
          </span>
        </div>
      </div>

      <div className="text-center">
        <span
          className={clsx(
            'inline-block rounded-md px-4 py-1 text-sm font-bold uppercase tracking-widest',
            isFake
              ? 'bg-red-900/40 text-fake-dark'
              : 'bg-green-900/40 text-real-dark',
          )}
        >
          {verdict}
        </span>
      </div>
    </div>
  );
}
