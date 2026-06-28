import type { ArtifactBreakdown } from '@/types/analysis';

interface AnalysisBreakdownProps {
  artifacts: ArtifactBreakdown;
}

interface ScoreItem {
  label: string;
  key: keyof ArtifactBreakdown;
  tooltip: string;
}

const SCORES: ScoreItem[] = [
  {
    label: 'Texture',
    key: 'texture_score',
    tooltip: 'AI-generated images often have unnaturally smooth or over-blended textures.',
  },
  {
    label: 'Lighting',
    key: 'lighting_score',
    tooltip: 'Inconsistent light direction or shadow placement is a common deepfake tell.',
  },
  {
    label: 'Edge Anomaly',
    key: 'edge_score',
    tooltip: 'GAN-generated images can produce sharp halos or unnatural boundary artifacts.',
  },
  {
    label: 'Frequency',
    key: 'frequency_score',
    tooltip: 'Checkerboard patterns in the Fourier domain are a classic GAN fingerprint.',
  },
];

function ScoreBar({ label, value, tooltip }: { label: string; value: number; tooltip: string }) {
  const percentage = Math.round(value * 100);
  const barColor =
    value >= 0.7
      ? 'bg-red-500'
      : value >= 0.4
        ? 'bg-orange-400'
        : 'bg-emerald-500';

  return (
    <div className="group">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-slate-300">{label}</span>
          <span
            title={tooltip}
            aria-label={`Info: ${tooltip}`}
            className="cursor-help text-slate-500 hover:text-slate-300 text-xs"
          >
            ?
          </span>
        </div>
        <span className="font-display text-sm font-semibold text-slate-400">{percentage}%</span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded-sm bg-slate-750">
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} score: ${percentage}%`}
          className={`h-full rounded-sm transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function AnalysisBreakdown({ artifacts }: AnalysisBreakdownProps) {
  return (
    <div className="rounded-lg border border-slate-750 bg-surface-raised p-5">
      <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-slate-400">
        Artifact Analysis
      </h3>

      <div className="flex flex-col gap-4">
        {SCORES.map(({ label, key, tooltip }) => (
          <ScoreBar
            key={key}
            label={label}
            value={artifacts[key]}
            tooltip={tooltip}
          />
        ))}
      </div>
    </div>
  );
}
