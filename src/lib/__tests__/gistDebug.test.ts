/**
 * Tests for Gist Debug Logger
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  gistDebugLogger,
  formatGistError,
  createErrorContext,
  safeStringify,
} from '../gistDebug';

describe('GistDebugLogger', () => {
  beforeEach(() => {
    gistDebugLogger.clear();
    gistDebugLogger.disable();
  });

  describe('enable/disable', () => {
    it('should enable debug mode', () => {
      gistDebugLogger.enable();
      expect(gistDebugLogger.isEnabled()).toBe(true);
    });

    it('should disable debug mode', () => {
      gistDebugLogger.enable();
      gistDebugLogger.disable();
      expect(gistDebugLogger.isEnabled()).toBe(false);
    });
  });

  describe('logging', () => {
    it('should log info messages', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      gistDebugLogger.enable();

      gistDebugLogger.log('init', 'Test message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Gist Debug]'),
        'Test message'
      );

      consoleSpy.mockRestore();
    });

    it('should log error messages', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      gistDebugLogger.enable();

      const error = new Error('Test error');
      gistDebugLogger.error('error', 'Error message', error);

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should log success messages', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      gistDebugLogger.enable();

      gistDebugLogger.success('complete', 'Success message');

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should log warning messages', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      gistDebugLogger.enable();

      gistDebugLogger.warn('validate_input', 'Warning message');

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should not log when disabled', () => {
      const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
      gistDebugLogger.disable();

      gistDebugLogger.log('init', 'Test message');

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should store logs even when disabled', () => {
      gistDebugLogger.disable();
      gistDebugLogger.log('init', 'Test message');

      const logs = gistDebugLogger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].message).toBe('Test message');
    });

    it('should include data in logs', () => {
      gistDebugLogger.log('init', 'Test message', { key: 'value' });

      const logs = gistDebugLogger.getLogs();
      expect(logs[0].data).toEqual({ key: 'value' });
    });

    it('should limit log entries to maxLogs', () => {
      gistDebugLogger.enable();

      // Log more than maxLogs (100)
      for (let i = 0; i < 150; i++) {
        gistDebugLogger.log('init', `Message ${i}`);
      }

      const logs = gistDebugLogger.getLogs();
      expect(logs.length).toBeLessThanOrEqual(100);
    });
  });

  describe('getLogsForStep', () => {
    it('should filter logs by step', () => {
      gistDebugLogger.log('init', 'Init message');
      gistDebugLogger.log('parse_identifier', 'Parse message');
      gistDebugLogger.log('init', 'Another init message');

      const initLogs = gistDebugLogger.getLogsForStep('init');
      expect(initLogs.length).toBe(2);
      expect(initLogs.every(log => log.step === 'init')).toBe(true);
    });
  });

  describe('getLastError', () => {
    it('should return the last error log', () => {
      gistDebugLogger.log('init', 'Info message');
      gistDebugLogger.error('error', 'First error', new Error('First'));
      gistDebugLogger.log('init', 'Another info');
      gistDebugLogger.error('error', 'Second error', new Error('Second'));

      const lastError = gistDebugLogger.getLastError();
      expect(lastError).not.toBeNull();
      expect(lastError?.message).toBe('Second error');
    });

    it('should return null if no errors', () => {
      gistDebugLogger.log('init', 'Info message');

      const lastError = gistDebugLogger.getLastError();
      expect(lastError).toBeNull();
    });
  });

  describe('getFlowSummary', () => {
    it('should return flow summary', () => {
      gistDebugLogger.log('init', 'Init');
      gistDebugLogger.error('error', 'Error', new Error('Test'));
      gistDebugLogger.warn('validate_input', 'Warning');
      gistDebugLogger.success('complete', 'Success');

      const summary = gistDebugLogger.getFlowSummary();

      expect(summary.steps.length).toBe(4);
      expect(summary.errors.length).toBe(1);
      expect(summary.warnings.length).toBe(1);
      expect(summary.lastStep).toBe('complete');
    });
  });

  describe('clear', () => {
    it('should clear all logs', () => {
      gistDebugLogger.log('init', 'Message 1');
      gistDebugLogger.log('init', 'Message 2');

      expect(gistDebugLogger.getLogs().length).toBe(2);

      gistDebugLogger.clear();

      expect(gistDebugLogger.getLogs().length).toBe(0);
    });
  });
});

describe('formatGistError', () => {
  it('should format error with step name', () => {
    const error = formatGistError('init', 'Test error');
    expect(error).toContain('Initialisation');
    expect(error).toContain('Test error');
  });

  it('should include context in error message', () => {
    const error = formatGistError('parse_identifier', 'Test error', {
      gistId: 'test-id',
      owner: 'test-owner',
      statusCode: 404,
    });

    expect(error).toContain('Test error');
    expect(error).toContain('test-id');
    expect(error).toContain('test-owner');
    expect(error).toContain('404');
  });

  it('should handle missing context gracefully', () => {
    const error = formatGistError('error', 'Test error');
    expect(error).toContain('Test error');
  });
});

describe('createErrorContext', () => {
  it('should create error context with step and timestamp', () => {
    const context = createErrorContext('init');

    expect(context.step).toBe('init');
    expect(context.timestamp).toBeTypeOf('number');
  });

  it('should include additional data in context', () => {
    const context = createErrorContext('init', {
      gistId: 'test-id',
      owner: 'test-owner',
    });

    expect(context.step).toBe('init');
    expect(context.gistId).toBe('test-id');
    expect(context.owner).toBe('test-owner');
  });
});

describe('safeStringify', () => {
  it('should stringify simple objects', () => {
    const obj = { key: 'value' };
    const result = safeStringify(obj);

    expect(result).toContain('key');
    expect(result).toContain('value');
  });

  it('should truncate long strings', () => {
    const longString = 'a'.repeat(2000);
    const obj = { data: longString };
    const result = safeStringify(obj, 100);

    expect(result.length).toBeLessThanOrEqual(100 + 20); // +20 for truncation message
    expect(result).toContain('truncated');
  });

  it('should handle circular references', () => {
    const obj: Record<string, unknown> = { key: 'value' };
    obj.circular = obj; // Create circular reference

    const result = safeStringify(obj);
    expect(result).toBe('[Unable to stringify]');
  });

  it('should handle non-stringifiable objects', () => {
    const obj = { func: () => {} };
    const result = safeStringify(obj);

    // Should not throw, but may return truncated or error message
    expect(typeof result).toBe('string');
  });
});
