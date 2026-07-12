import { describe, expect, it } from 'vitest';
import { buildMarkdownReport, confidenceTier, formatPercent } from '@/utils/reportExport';
import type { AnalysisResult } from '@/types/analysis';

const result: AnalysisResult = {
  id: 'analysis-1',
  verdict: 'FAKE',
  confidence: 0.91,
  heatmap_url: '/api/heatmap/analysis-1',
  artifacts: {
    texture_score: 0.8,
    lighting_score: 0.4,
    edge_score: 0.7,
    frequency_score: 0.6,
  },
  analysis_time_ms: 42,
  created_at: '2026-07-12T00:00:00Z',
  filename: 'sample.jpg',
};

describe('reportExport', () => {
  it('formats percentages and confidence tiers', () => {
    expect(formatPercent(0.912)).toBe('91%');
    expect(confidenceTier(0.9)).toBe('high');
    expect(confidenceTier(0.7)).toBe('medium');
    expect(confidenceTier(0.4)).toBe('low');
  });

  it('builds recruiter-readable markdown report', () => {
    const report = buildMarkdownReport(result, 'demo');

    expect(report).toContain('# DeepShield Analysis Report');
    expect(report).toContain('- Verdict: FAKE');
    expect(report).toContain('- Model mode: Demo mode');
    expect(report).toContain('- texture score: 80%');
    expect(report).toContain('not a forensic guarantee');
  });
});
