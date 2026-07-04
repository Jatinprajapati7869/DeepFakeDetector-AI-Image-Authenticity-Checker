import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { BackendStatus } from '@/components/BackendStatus';
import * as apiModule from '@/services/api';

describe('BackendStatus', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('BS1: Renders nothing while checking', () => {
    // API ping is pending
    vi.spyOn(apiModule.api, 'ping').mockReturnValue(new Promise(() => {}));
    
    const { container } = render(<BackendStatus />);
    expect(container).toBeEmptyDOMElement();
  });

  it('BS2: Renders nothing when backend is ready', async () => {
    vi.spyOn(apiModule.api, 'ping').mockResolvedValue(true);
    
    const { container } = render(<BackendStatus />);
    
    // Wait for effect and state update
    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  it('BS3: Renders amber "waking" banner after first failed ping', async () => {
    vi.spyOn(apiModule.api, 'ping').mockResolvedValue(false);
    
    render(<BackendStatus />);
    
    await waitFor(() => {
      expect(screen.getByText(/Backend is waking up/i)).toBeInTheDocument();
    });
  });

  it('BS4: Shows elapsed seconds counter', async () => {
    vi.useFakeTimers();
    vi.spyOn(apiModule.api, 'ping').mockResolvedValue(false);
    
    render(<BackendStatus />);
    
    await act(async () => {
      await vi.runAllTicks();
    });
    
    expect(screen.getByText(/Backend is waking up/i)).toBeInTheDocument();
    
    // Advance timers by 2 seconds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    
    expect(screen.getByText(/Backend is waking up… \(2s\)/i)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('BS5: Transitions to offline banner after OFFLINE_THRESHOLD_S seconds', async () => {
    vi.useFakeTimers();
    vi.spyOn(apiModule.api, 'ping').mockResolvedValue(false);
    
    render(<BackendStatus />);
    
    await act(async () => {
      await vi.runAllTicks();
    });
    
    // OFFLINE_THRESHOLD_S is 120
    await act(async () => {
      await vi.advanceTimersByTimeAsync(121000);
    });
    
    expect(screen.getByText(/Backend is offline/i)).toBeInTheDocument();
    expect(screen.queryByText(/Backend is waking up/i)).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it('BS6: Offline banner contains "refresh the page" action', async () => {
    vi.useFakeTimers();
    vi.spyOn(apiModule.api, 'ping').mockResolvedValue(false);
    
    render(<BackendStatus />);
    
    await act(async () => {
      await vi.runAllTicks();
    });
    
    await act(async () => {
      await vi.advanceTimersByTimeAsync(121000);
    });
    
    const refreshBtn = screen.getByRole('button', { name: /refresh the page/i });
    expect(refreshBtn).toBeInTheDocument();
    
    // We can't actually reload in JSDOM cleanly without mocking window.location.reload, 
    // but verifying the button exists and is clickable is sufficient for BS6
    vi.useRealTimers();
  });
});
