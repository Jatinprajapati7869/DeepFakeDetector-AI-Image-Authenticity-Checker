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
        : 'bg-green-400';

  return (
    <div className="group">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span
            title={tooltip}
            aria-label={`Info: ${tooltip}`}
            className="cursor-help text-gray-400 hover:text-gray-600"
          >
            ⓘ
          </span>
        </div>
        <span className="text-sm font-semibold text-gray-600">{percentage}%</span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label} score: ${percentage}%`}
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function AnalysisBreakdown({ artifacts }: AnalysisBreakdownProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500">
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
