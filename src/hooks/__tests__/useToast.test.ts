import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from '../useToast';

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with empty toasts array', () => {
    const { result } = renderHook(() => useToast());

    expect(result.current.toasts).toEqual([]);
  });

  it('should add a toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast({
        type: 'success',
        title: 'Success',
        message: 'Operation completed',
      });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe('success');
    expect(result.current.toasts[0].title).toBe('Success');
    expect(result.current.toasts[0].message).toBe('Operation completed');
    expect(result.current.toasts[0].id).toBeDefined();
    expect(result.current.toasts[0].onClose).toBeDefined();
  });

  it('should remove a toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast({
        type: 'success',
        title: 'Success',
      });
    });

    const toastId = result.current.toasts[0].id;

    act(() => {
      result.current.removeToast(toastId);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it('should show success toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showSuccess('Success', 'Operation completed');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe('success');
    expect(result.current.toasts[0].title).toBe('Success');
    expect(result.current.toasts[0].message).toBe('Operation completed');
  });

  it('should show error toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showError('Error', 'Something went wrong');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe('error');
    expect(result.current.toasts[0].title).toBe('Error');
  });

  it('should show warning toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showWarning('Warning', 'Be careful');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe('warning');
  });

  it('should show info toast', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showInfo('Info', 'Here is some information');
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].type).toBe('info');
  });

  it('should handle multiple toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showSuccess('Success 1');
      result.current.showError('Error 1');
      result.current.showWarning('Warning 1');
    });

    expect(result.current.toasts).toHaveLength(3);
  });

  it('should generate unique IDs for toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.showSuccess('Success 1');
      result.current.showSuccess('Success 2');
    });

    expect(result.current.toasts[0].id).not.toBe(result.current.toasts[1].id);
  });

  it('should call onClose when toast is removed', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.addToast({
        type: 'success',
        title: 'Success',
      });
    });

    const toast = result.current.toasts[0];
    const toastId = toast.id;

    act(() => {
      toast.onClose(toastId);
    });

    expect(result.current.toasts).toHaveLength(0);
  });
});
