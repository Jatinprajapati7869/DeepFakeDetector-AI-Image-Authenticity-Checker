import { describe, expect, it } from 'vitest';
import { buildBatchCsv } from '@/utils/batchExport';
import type { BatchResultItem } from '@/types/analysis';

const items: BatchResultItem[] = [
  {
    filename: 'fake,sample.jpg',
    result: {
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
      filename: 'fake,sample.jpg',
    },
    error: null,
  },
  {
    filename: 'bad.jpg',
    result: null,
    error: 'Invalid image',
  },
];

describe('batchExport', () => {
  it('builds escaped CSV for success and error rows', () => {
    const csv = buildBatchCsv(items);

    expect(csv).toContain('filename,status,verdict,confidence,analysis_id,error');
    expect(csv).toContain('"fake,sample.jpg",done,FAKE,91%,analysis-1,');
    expect(csv).toContain('bad.jpg,error,,,,Invalid image');
  });
});
