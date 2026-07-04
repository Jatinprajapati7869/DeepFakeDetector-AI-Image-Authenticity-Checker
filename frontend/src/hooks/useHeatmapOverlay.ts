import { useCallback, useEffect, useRef, useState } from 'react';

interface UseHeatmapOverlayProps {
  imageUrl: string;
  heatmapUrl: string;
  opacity?: number;
  /** Controls the initial toggle state. Defaults to true (overlay shown). */
  initialShowHeatmap?: boolean;
}

export function useHeatmapOverlay({
  imageUrl,
  heatmapUrl,
  opacity = 0.55,
  initialShowHeatmap = true,
}: UseHeatmapOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showHeatmap, setShowHeatmap] = useState(initialShowHeatmap);
  const [isLoading, setIsLoading] = useState(true);

  const draw = useCallback(
    (showOverlay: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const original = new Image();
      original.crossOrigin = 'anonymous';
      original.src = imageUrl;

      original.onload = () => {
        canvas.width = original.naturalWidth;
        canvas.height = original.naturalHeight;
        ctx.drawImage(original, 0, 0);

        if (!showOverlay) {
          setIsLoading(false);
          return;
        }

        const heatmap = new Image();
        heatmap.crossOrigin = 'anonymous';
        heatmap.src = heatmapUrl;

        heatmap.onload = () => {
          // Clear and redraw cleanly: original at full opacity, heatmap blended on top
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1;
          ctx.drawImage(original, 0, 0);
          ctx.globalAlpha = opacity;
          ctx.drawImage(heatmap, 0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1;
          setIsLoading(false);
        };

        heatmap.onerror = () => {
          // Heatmap unavailable — show original only
          setIsLoading(false);
        };
      };
    },
    [imageUrl, heatmapUrl, opacity],
  );

  useEffect(() => {
    setIsLoading(true);
    draw(showHeatmap);
  }, [draw, showHeatmap]);

  const toggleHeatmap = useCallback(() => {
    setShowHeatmap((prev) => !prev);
  }, []);

  return { canvasRef, showHeatmap, toggleHeatmap, isLoading };
}
