import type { AnalysisResult, ModelMode } from '@/types/analysis';

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function confidenceTier(confidence: number): 'low' | 'medium' | 'high' {
  if (confidence >= 0.85) return 'high';
  if (confidence >= 0.65) return 'medium';
  return 'low';
}

export function modelModeLabel(modelMode?: ModelMode): string {
  if (modelMode === 'real') return 'Real model';
  if (modelMode === 'mock') return 'Mock model';
  return 'Demo mode';
}

export function buildMarkdownReport(result: AnalysisResult, modelMode?: ModelMode): string {
  const artifactLines = Object.entries(result.artifacts)
    .map(([name, value]) => `- ${name.replace(/_/g, ' ')}: ${formatPercent(value)}`)
    .join('\n');

  return `# DeepShield Analysis Report

## Summary

- File: ${result.filename}
- Verdict: ${result.verdict}
- Confidence: ${formatPercent(result.confidence)} (${confidenceTier(result.confidence)})
- Model mode: ${modelModeLabel(modelMode)}
- Analysis ID: ${result.id}
- Created: ${new Date(result.created_at).toLocaleString()}
- Runtime: ${result.analysis_time_ms} ms

## Artifact Signals

${artifactLines}

## Interpretation

This report is a screening result, not a forensic guarantee. Treat high-confidence results as a triage signal and review the highlighted regions, source provenance, and image metadata before making decisions.

## Limitations

- Demo or mock mode is designed for product walkthroughs, not forensic claims.
- Real-model performance depends on dataset coverage and image transformations.
- Adversarial edits, compression, cropping, and re-uploads may reduce confidence.
`;
}

export function downloadMarkdownReport(result: AnalysisResult, modelMode?: ModelMode): void {
  const blob = new Blob([buildMarkdownReport(result, modelMode)], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `deepshield-${result.id}.md`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
