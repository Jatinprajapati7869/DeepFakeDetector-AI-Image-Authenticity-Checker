import { clsx } from 'clsx';
import { useHeatmapOverlay } from '@/hooks/useHeatmapOverlay';

interface HeatmapCanvasProps {
  imageUrl: string;
  heatmapUrl: string;
  className?: string;
}

export function HeatmapCanvas({ imageUrl, heatmapUrl, className }: HeatmapCanvasProps) {
  const { canvasRef, showHeatmap, toggleHeatmap, isLoading } = useHeatmapOverlay({
    imageUrl,
    heatmapUrl,
  });

  return (
    <div className={clsx('relative flex flex-col gap-3', className)}>
      <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-900">
        {isLoading && (
          <div
            aria-label="Loading heatmap"
            className="absolute inset-0 flex items-center justify-center bg-gray-900/60"
          >
            <Spinner />
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="block max-h-[480px] w-full object-contain"
          aria-label={showHeatmap ? 'Image with Grad-CAM heatmap overlay' : 'Original image'}
        />
      </div>

      <button
        type="button"
        onClick={toggleHeatmap}
        className="self-center rounded-lg border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        aria-pressed={showHeatmap}
      >
        {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-8 w-8 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}
