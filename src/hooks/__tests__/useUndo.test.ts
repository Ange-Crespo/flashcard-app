import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useUndo, useSwipeHistory } from '../useUndo';

describe('useUndo', () => {
  it('should initialize with empty history', () => {
    const { result } = renderHook(() => useUndo());

    expect(result.current.historyLength).toBe(0);
    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should add an action', () => {
    const { result } = renderHook(() => useUndo());

    act(() => {
      result.current.addAction({ type: 'like', cardId: 'card-1' });
    });

    expect(result.current.historyLength).toBe(1);
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.canUndo).toBe(true);
  });

  it('should undo an action', () => {
    const { result } = renderHook(() => useUndo());

    act(() => {
      result.current.addAction({ type: 'like', cardId: 'card-1' });
    });

    expect(result.current.currentIndex).toBe(0);

    act(() => {
      result.current.undo();
    });

    expect(result.current.currentIndex).toBe(-1);
    expect(result.current.canUndo).toBe(false);
  });

  it('should redo an action', () => {
    const { result } = renderHook(() => useUndo());

    act(() => {
      result.current.addAction({ type: 'like', cardId: 'card-1' });
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.redo();
    });

    expect(result.current.currentIndex).toBe(0);
  });

  it('should limit history size', () => {
    const { result } = renderHook(() => useUndo(3));

    act(() => {
      result.current.addAction({ type: 'like', cardId: 'card-1' });
      result.current.addAction({ type: 'pass', cardId: 'card-2' });
      result.current.addAction({ type: 'like', cardId: 'card-3' });
      result.current.addAction({ type: 'pass', cardId: 'card-4' });
    });

    expect(result.current.historyLength).toBe(3);
  });

  it('should get current action', () => {
    const { result } = renderHook(() => useUndo());

    act(() => {
      result.current.addAction({ type: 'like', cardId: 'card-1' });
    });

    const action = result.current.getCurrentAction();
    expect(action).toBeTruthy();
    expect(action?.type).toBe('like');
    expect(action?.cardId).toBe('card-1');
  });

  it('should get last action', () => {
    const { result } = renderHook(() => useUndo());

    act(() => {
      result.current.addAction({ type: 'like', cardId: 'card-1' });
      result.current.addAction({ type: 'pass', cardId: 'card-2' });
    });

    const action = result.current.getLastAction();
    expect(action?.type).toBe('pass');
    expect(action?.cardId).toBe('card-2');
  });

  it('should clear history', () => {
    const { result } = renderHook(() => useUndo());

    act(() => {
      result.current.addAction({ type: 'like', cardId: 'card-1' });
      result.current.addAction({ type: 'pass', cardId: 'card-2' });
      result.current.clearHistory();
    });

    expect(result.current.historyLength).toBe(0);
    expect(result.current.currentIndex).toBe(-1);
  });

  it('should handle multiple undo/redo operations', () => {
    const { result } = renderHook(() => useUndo());

    act(() => {
      result.current.addAction({ type: 'like', cardId: 'card-1' });
      result.current.addAction({ type: 'pass', cardId: 'card-2' });
      result.current.addAction({ type: 'like', cardId: 'card-3' });
    });

    expect(result.current.currentIndex).toBe(2);

    act(() => {
      result.current.undo();
      result.current.undo();
    });

    expect(result.current.currentIndex).toBe(0);

    act(() => {
      result.current.redo();
    });

    expect(result.current.currentIndex).toBe(1);
  });
});

describe('useSwipeHistory', () => {
  it('should initialize with no last swipe', () => {
    const { result } = renderHook(() => useSwipeHistory());

    expect(result.current.lastSwipe).toBeNull();
    expect(result.current.canUndo).toBe(false);
  });

  it('should record a swipe', () => {
    const { result } = renderHook(() => useSwipeHistory());

    act(() => {
      result.current.recordSwipe('like', 'card-1');
    });

    expect(result.current.lastSwipe).toBeTruthy();
    expect(result.current.lastSwipe?.type).toBe('like');
    expect(result.current.lastSwipe?.cardId).toBe('card-1');
    expect(result.current.canUndo).toBe(true);
  });

  it('should undo last swipe', () => {
    const { result } = renderHook(() => useSwipeHistory());

    act(() => {
      result.current.recordSwipe('like', 'card-1');
      result.current.recordSwipe('pass', 'card-2');
      result.current.undoLastSwipe();
    });

    expect(result.current.canUndo).toBe(true);
  });

  it('should get undoable action', () => {
    const { result } = renderHook(() => useSwipeHistory());

    act(() => {
      result.current.recordSwipe('like', 'card-1');
    });

    const action = result.current.getUndoableAction();
    expect(action).toBeTruthy();
    expect(action?.type).toBe('like');
    expect(action?.cardId).toBe('card-1');
  });

  it('should clear history', () => {
    const { result } = renderHook(() => useSwipeHistory());

    act(() => {
      result.current.recordSwipe('like', 'card-1');
      result.current.clearHistory();
    });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.getUndoableAction()).toBeNull();
  });
});
