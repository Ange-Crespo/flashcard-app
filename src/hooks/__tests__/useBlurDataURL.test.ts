import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBlurDataURL } from '../useBlurDataURL';

// Mock canvas
const mockToDataURL = vi.fn(() => 'data:image/png;base64,mockdata');

beforeEach(() => {
  vi.clearAllMocks();
  // Mock HTMLCanvasElement
  HTMLCanvasElement.prototype.getContext = vi.fn(() => {
    const ctx = {
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillStyle: '',
      fillRect: vi.fn(),
    };
    return ctx as unknown as CanvasRenderingContext2D;
  });
  HTMLCanvasElement.prototype.toDataURL = mockToDataURL;
});

describe('useBlurDataURL', () => {
  it('should generate a blur data URL', async () => {
    const { result } = renderHook(() => useBlurDataURL(10, 10));

    await waitFor(() => {
      expect(result.current).toBeTruthy();
      expect(result.current).toMatch(/^data:image\/png;base64,/);
    });
  });

  it('should use default dimensions when not provided', async () => {
    const { result } = renderHook(() => useBlurDataURL());

    await waitFor(() => {
      expect(result.current).toBeTruthy();
      expect(result.current).toMatch(/^data:image\/png;base64,/);
    });
  });

  it('should generate different URLs for different dimensions', async () => {
    const { result: result1 } = renderHook(() => useBlurDataURL(10, 10));
    const { result: result2 } = renderHook(() => useBlurDataURL(20, 20));

    await waitFor(() => {
      // They should both be valid data URLs
      expect(result1.current).toMatch(/^data:image\/png;base64,/);
      expect(result2.current).toMatch(/^data:image\/png;base64,/);
    });
  });
});
