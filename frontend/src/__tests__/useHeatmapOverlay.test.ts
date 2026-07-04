import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHeatmapOverlay } from '@/hooks/useHeatmapOverlay';

describe('useHeatmapOverlay', () => {
  const defaultProps = {
    imageUrl: 'test.jpg',
    heatmapUrl: 'heatmap.jpg',
  };

  it('HM1: initialShowHeatmap=true makes showHeatmap true initially', () => {
    const { result } = renderHook(() => 
      useHeatmapOverlay({ ...defaultProps, initialShowHeatmap: true })
    );
    expect(result.current.showHeatmap).toBe(true);
  });

  it('HM2: initialShowHeatmap=false makes showHeatmap false initially', () => {
    const { result } = renderHook(() => 
      useHeatmapOverlay({ ...defaultProps, initialShowHeatmap: false })
    );
    expect(result.current.showHeatmap).toBe(false);
  });

  it('HM3: toggleHeatmap flips showHeatmap', () => {
    const { result } = renderHook(() => 
      useHeatmapOverlay({ ...defaultProps, initialShowHeatmap: true })
    );
    
    expect(result.current.showHeatmap).toBe(true);
    
    act(() => {
      result.current.toggleHeatmap();
    });
    
    expect(result.current.showHeatmap).toBe(false);
    
    act(() => {
      result.current.toggleHeatmap();
    });
    
    expect(result.current.showHeatmap).toBe(true);
  });
});
