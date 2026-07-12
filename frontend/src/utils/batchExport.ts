import type { BatchResultItem } from '@/types/analysis';
import { formatPercent } from '@/utils/reportExport';

function csvCell(value: string | number): string {
  const text = String(value);
  if (!/[",\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function buildBatchCsv(results: BatchResultItem[]): string {
  const rows = [
    ['filename', 'status', 'verdict', 'confidence', 'analysis_id', 'error'],
    ...results.map((item) => [
      item.filename,
      item.error ? 'error' : 'done',
      item.result?.verdict ?? '',
      item.result ? formatPercent(item.result.confidence) : '',
      item.result?.id ?? '',
      item.error ?? '',
    ]),
  ];

  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

export function downloadBatchCsv(results: BatchResultItem[]): void {
  const blob = new Blob([buildBatchCsv(results)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `deepshield-batch-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
