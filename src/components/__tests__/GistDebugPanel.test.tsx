/**
 * Tests for GistDebugPanel component
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GistDebugPanel } from '../GistDebugPanel';
import { gistDebugLogger } from '../../lib/gistDebug';

// Mock CSS imports
vi.mock('../GistDebugPanel.css', () => ({}));

// Note: We don't mock react-feather as it causes issues with rendering
// The icons will render normally in tests

describe('GistDebugPanel', () => {
  beforeEach(() => {
    gistDebugLogger.clear();
    gistDebugLogger.disable();
  });

  it('should render debug panel', () => {
    render(<GistDebugPanel />);

    expect(screen.getByText('Gist Debug Panel')).toBeInTheDocument();
  });

  it('should display log count', () => {
    gistDebugLogger.log('init', 'Test message');
    gistDebugLogger.log('init', 'Another message');

    render(<GistDebugPanel />);

    expect(screen.getByText(/2 logs/)).toBeInTheDocument();
  });

  it('should toggle debug mode', () => {
    render(<GistDebugPanel />);

    const toggleButton = screen.getByTitle(
      /Désactiver le debug|Activer le debug/
    );
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);

    expect(gistDebugLogger.isEnabled()).toBe(true);
  });

  it('should clear logs', () => {
    gistDebugLogger.log('init', 'Test message');

    render(<GistDebugPanel />);

    const clearButton = screen.getByTitle('Effacer les logs');
    fireEvent.click(clearButton);

    expect(gistDebugLogger.getLogs().length).toBe(0);
  });

  it('should filter logs by level', () => {
    gistDebugLogger.log('init', 'Info message');
    gistDebugLogger.error('error', 'Error message', new Error('Test'));
    gistDebugLogger.warn('validate_input', 'Warning message');
    gistDebugLogger.success('complete', 'Success message');

    render(<GistDebugPanel />);

    const errorFilter = screen.getByText(/Erreurs/);
    fireEvent.click(errorFilter);

    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.queryByText('Info message')).not.toBeInTheDocument();
  });

  it('should display log statistics', () => {
    gistDebugLogger.log('init', 'Info');
    gistDebugLogger.error('error', 'Error', new Error('Test'));
    gistDebugLogger.warn('validate_input', 'Warning');
    gistDebugLogger.success('complete', 'Success');

    render(<GistDebugPanel />);

    expect(screen.getByText(/Erreurs \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Avertissements \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Succès \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Info \(1\)/)).toBeInTheDocument();
  });

  it('should export logs', () => {
    gistDebugLogger.log('init', 'Test message');

    // Mock URL.createObjectURL and document.createElement
    const mockLink = {
      click: vi.fn(),
      href: '',
      download: '',
    };

    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation(tagName => {
        if (tagName === 'a') {
          return mockLink as unknown as HTMLElement;
        }
        return originalCreateElement(tagName);
      });

    // Mock URL methods if they don't exist
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = vi.fn().mockReturnValue('blob:test-url');
    URL.revokeObjectURL = vi.fn();

    render(<GistDebugPanel />);

    const exportButton = screen.getByTitle('Exporter les logs');
    fireEvent.click(exportButton);

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockLink.download).toContain('gist-debug-');

    createElementSpy.mockRestore();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<GistDebugPanel onClose={onClose} />);

    const closeButton = screen.getByTitle('Fermer');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('should display empty state when no logs', () => {
    render(<GistDebugPanel />);

    expect(screen.getByText(/Aucun log/)).toBeInTheDocument();
  });

  it('should display log details', () => {
    gistDebugLogger.log('init', 'Test message', { key: 'value' });

    render(<GistDebugPanel />);

    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByText('init')).toBeInTheDocument();
  });

  it('should display error details when present', () => {
    gistDebugLogger.error('error', 'Error message', new Error('Test error'));

    render(<GistDebugPanel />);

    // Error message should be visible
    expect(screen.getByText('Error message')).toBeInTheDocument();

    // The error is stored in log.data.error, and displayed in the data section
    // We need to expand the details to see it
    const details = screen.getByText(/Données/);
    fireEvent.click(details);

    // The error text appears in the JSON stringified data
    // Use a more flexible matcher
    const preElement = screen.getByText((content, element) => {
      return element?.tagName === 'PRE' && content.includes('Test error');
    });
    expect(preElement).toBeInTheDocument();
  });

  it('should display expandable data section', () => {
    gistDebugLogger.log('init', 'Test', {
      key: 'value',
      nested: { data: 'test' },
    });

    render(<GistDebugPanel />);

    const details = screen.getByText(/Données/);
    expect(details).toBeInTheDocument();

    fireEvent.click(details);

    expect(screen.getByText(/key/)).toBeInTheDocument();
  });
});
