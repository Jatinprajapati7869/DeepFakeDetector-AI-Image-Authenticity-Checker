import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const result = {
  id: 'analysis-e2e',
  verdict: 'FAKE',
  confidence: 0.91,
  heatmap_url: '/api/heatmap/analysis-e2e',
  artifacts: {
    texture_score: 0.82,
    lighting_score: 0.44,
    edge_score: 0.71,
    frequency_score: 0.63,
  },
  analysis_time_ms: 48,
  created_at: '2026-07-12T00:00:00Z',
  filename: 'real_sample.jpg',
};

test('sample image flow renders verdict, explanation, and report action', async ({ page }) => {
  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      json: {
        status: 'ok',
        model_loaded: false,
        version: '0.1.0',
        demo_mode: true,
        model_mode: 'demo',
      },
    });
  });

  await page.route('**/api/analyze', async (route) => {
    await route.fulfill({ status: 202, json: { job_id: 'job-e2e' } });
  });

  await page.route('**/api/status/job-e2e', async (route) => {
    await route.fulfill({ json: { status: 'completed', result } });
  });

  await page.route('**/api/heatmap/analysis-e2e', async (route) => {
    await route.fulfill({ path: path.join(currentDir, '../../docs/demo/fake_result.png') });
  });

  await page.goto('/');

  await expect(page.getByText('Demo mode')).toBeVisible();

  await page.getByRole('button', { name: 'Try Real Sample' }).click();

  await expect(page.getByText('Result explanation')).toBeVisible();
  await expect(page.getByText('Download Report')).toBeVisible();
  await expect(page.getByText(/91%/).first()).toBeVisible();
  await expect(page.getByText(/synthetic-image signals/i)).toBeVisible();
});