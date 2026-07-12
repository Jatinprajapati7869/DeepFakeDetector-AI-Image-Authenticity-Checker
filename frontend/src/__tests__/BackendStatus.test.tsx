import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { BackendStatus } from '@/components/BackendStatus';
import * as apiModule from '@/services/api';

const demoHealth = {
  status: 'ok',
  model_loaded: false,
  version: '0.1.0',
  demo_mode: true,
  model_mode: 'demo' as const,
};

describe('BackendStatus', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('BS1: Renders nothing while checking', () => {
    vi.spyOn(apiModule.api, 'getHealth').mockReturnValue(new Promise(() => {}));

    const { container } = render(<BackendStatus />);
    expect(container).toBeEmptyDOMElement();
  });

  it('BS2: Shows backend ready and model mode when backend is ready', async () => {
    vi.spyOn(apiModule.api, 'getHealth').mockResolvedValue(demoHealth);

    render(<BackendStatus />);

    await waitFor(() => {
      expect(screen.getByText(/Backend ready/i)).toBeInTheDocument();
      expect(screen.getByText(/Demo mode/i)).toBeInTheDocument();
    });
  });

  it('BS3: Renders amber waking banner after first failed health check', async () => {
    vi.spyOn(apiModule.api, 'getHealth').mockRejectedValue(new Error('offline'));

    render(<BackendStatus />);

    await waitFor(() => {
      expect(screen.getByText(/Backend is waking up/i)).toBeInTheDocument();
    });
  });

  it('BS4: Shows elapsed seconds counter', async () => {
    vi.useFakeTimers();
    vi.spyOn(apiModule.api, 'getHealth').mockRejectedValue(new Error('offline'));

    render(<BackendStatus />);

    await act(async () => {
      await vi.runAllTicks();
    });

    expect(screen.getByText(/Backend is waking up/i)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(screen.getByText(/Backend is waking up\.\.\. \(2s\)/i)).toBeInTheDocument();
  });

  it('BS5: Transitions to offline banner after OFFLINE_THRESHOLD_S seconds', async () => {
    vi.useFakeTimers();
    vi.spyOn(apiModule.api, 'getHealth').mockRejectedValue(new Error('offline'));

    render(<BackendStatus />);

    await act(async () => {
      await vi.runAllTicks();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(121000);
    });

    expect(screen.getByText(/Backend is offline/i)).toBeInTheDocument();
    expect(screen.queryByText(/Backend is waking up/i)).not.toBeInTheDocument();
  });

  it('BS6: Offline banner contains refresh action', async () => {
    vi.useFakeTimers();
    vi.spyOn(apiModule.api, 'getHealth').mockRejectedValue(new Error('offline'));

    render(<BackendStatus />);

    await act(async () => {
      await vi.runAllTicks();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(121000);
    });

    expect(screen.getByRole('button', { name: /refresh the page/i })).toBeInTheDocument();
  });
});
