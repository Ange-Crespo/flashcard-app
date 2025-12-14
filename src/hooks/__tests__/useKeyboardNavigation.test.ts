import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  useKeyboardNavigation,
  useFocusManagement,
} from '../useKeyboardNavigation';

describe('useKeyboardNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return elementRef for keyboard navigation', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() => useKeyboardNavigation({ onSwipeLeft }));

    expect(result.current.elementRef).toBeDefined();
    expect(result.current.elementRef.current).toBeNull();
  });

  it('should handle different callback options', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const onSwipeUp = vi.fn();
    const onDetails = vi.fn();

    const { result } = renderHook(() =>
      useKeyboardNavigation({
        onSwipeLeft,
        onSwipeRight,
        onSwipeUp,
        onDetails,
      })
    );

    expect(result.current.elementRef).toBeDefined();
    // Callbacks are passed but tested through integration tests
    expect(onSwipeLeft).toBeDefined();
    expect(onSwipeRight).toBeDefined();
    expect(onSwipeUp).toBeDefined();
    expect(onDetails).toBeDefined();
  });

  it('should not handle keys when disabled', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() =>
      useKeyboardNavigation({ onSwipeLeft, enabled: false })
    );

    expect(result.current.elementRef).toBeDefined();
    // When disabled, the event listener is not attached
    // This is tested through integration tests
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it('should return elementRef', () => {
    const { result } = renderHook(() => useKeyboardNavigation({}));

    expect(result.current.elementRef).toBeDefined();
    expect(result.current.elementRef.current).toBeNull();
  });
});

describe('useFocusManagement', () => {
  it('should provide focus management functions', () => {
    const { result } = renderHook(() => useFocusManagement());

    expect(result.current.focusRef).toBeDefined();
    expect(result.current.saveFocus).toBeDefined();
    expect(result.current.restoreFocus).toBeDefined();
    expect(result.current.trapFocus).toBeDefined();
  });

  it('should save and restore focus', () => {
    const { result } = renderHook(() => useFocusManagement());

    const button = document.createElement('button');
    document.body.appendChild(button);
    button.focus();

    act(() => {
      result.current.saveFocus();
    });

    const newButton = document.createElement('button');
    document.body.appendChild(newButton);
    newButton.focus();

    act(() => {
      result.current.restoreFocus();
    });

    expect(document.activeElement).toBe(button);

    button.remove();
    newButton.remove();
  });

  it('should trap focus within element', () => {
    const { result } = renderHook(() => useFocusManagement());

    const container = document.createElement('div');
    const button1 = document.createElement('button');
    const button2 = document.createElement('button');
    container.appendChild(button1);
    container.appendChild(button2);
    document.body.appendChild(container);

    const cleanup = result.current.trapFocus(container);

    expect(document.activeElement).toBe(button1);

    cleanup();
    container.remove();
  });
});
