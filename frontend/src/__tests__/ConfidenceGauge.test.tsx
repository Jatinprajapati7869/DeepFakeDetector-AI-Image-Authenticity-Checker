import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfidenceGauge } from '@/components/ConfidenceGauge';

describe('ConfidenceGauge', () => {
  it('renders the confidence percentage', () => {
    render(<ConfidenceGauge verdict="FAKE" confidence={0.92} />);
    expect(screen.getByText('92%')).toBeInTheDocument();
  });

  it('displays the FAKE verdict label', () => {
    render(<ConfidenceGauge verdict="FAKE" confidence={0.85} />);
    expect(screen.getByText('FAKE')).toBeInTheDocument();
  });

  it('displays the REAL verdict label', () => {
    render(<ConfidenceGauge verdict="REAL" confidence={0.78} />);
    expect(screen.getByText('REAL')).toBeInTheDocument();
  });

  it('exposes correct aria-valuenow', () => {
    render(<ConfidenceGauge verdict="REAL" confidence={0.75} />);
    const meter = screen.getByRole('meter');
    expect(meter).toHaveAttribute('aria-valuenow', '75');
  });

  it('rounds confidence to nearest integer', () => {
    render(<ConfidenceGauge verdict="FAKE" confidence={0.999} />);
    // 0.999 * 100 = 99.9 → rounds to 100
    expect(screen.getByText('100%')).toBeInTheDocument();
  });
});
