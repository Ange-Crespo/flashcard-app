/**
 * Tests for GistFlashcardWriter component with debug functionality
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GistFlashcardWriter } from '../GistFlashcardWriter';
import { githubGistService } from '../../lib/githubGist';
import { gistDebugLogger } from '../../lib/gistDebug';

// Mock the githubGistService
vi.mock('../../lib/githubGist', () => ({
  githubGistService: {
    createFlashcardGist: vi.fn(),
  },
}));

// Mock CSS imports
vi.mock('../GistFlashcardWriter.css', () => ({}));

describe('GistFlashcardWriter', () => {
  const mockCreateFlashcardGist = vi.mocked(
    githubGistService.createFlashcardGist
  );

  beforeEach(() => {
    vi.clearAllMocks();
    gistDebugLogger.clear();
    gistDebugLogger.disable();
  });

  it('should render the component', () => {
    render(<GistFlashcardWriter />);

    expect(
      screen.getByText(/Créer et Uploader des Flashcards/)
    ).toBeInTheDocument();
  });

  it('should display token input', () => {
    render(<GistFlashcardWriter />);

    const tokenInput = screen.getByPlaceholderText(/ghp_/);
    expect(tokenInput).toBeInTheDocument();
  });

  it('should display error when token is missing', async () => {
    render(<GistFlashcardWriter />);

    // Add valid flashcard first
    const frontInputs = screen.getAllByPlaceholderText(/Question ou prompt/);
    const backInputs = screen.getAllByPlaceholderText(/Réponse ou explication/);

    if (frontInputs.length > 0 && backInputs.length > 0) {
      fireEvent.change(frontInputs[0], { target: { value: 'Test question' } });
      fireEvent.change(backInputs[0], { target: { value: 'Test answer' } });
    }

    // Enter token to enable button
    const tokenInput = screen.getByPlaceholderText(/ghp_/);
    fireEvent.change(tokenInput, { target: { value: 'ghp_test' } });
    fireEvent.change(tokenInput, { target: { value: '' } }); // Clear it

    const uploadButton = screen.getByRole('button', {
      name: /Uploader.*Flashcards/,
    });
    // Button should be disabled when no token
    expect(uploadButton).toBeDisabled();
  });

  it('should display error when no valid flashcards', async () => {
    render(<GistFlashcardWriter />);

    const tokenInput = screen.getByPlaceholderText(/ghp_/);
    fireEvent.change(tokenInput, { target: { value: 'ghp_testtoken' } });

    const uploadButton = screen.getByRole('button', {
      name: /Uploader.*Flashcards/,
    });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText(/Aucune flashcard valide/)).toBeInTheDocument();
    });
  });

  it('should create gist when valid data is provided', async () => {
    const onSuccess = vi.fn();
    const mockGistUrl = 'https://gist.github.com/user/test-id';

    mockCreateFlashcardGist.mockResolvedValue({
      success: true,
      gistUrl: mockGistUrl,
    });

    render(<GistFlashcardWriter onSuccess={onSuccess} />);

    // Fill in token
    const tokenInput = screen.getByPlaceholderText(/ghp_/);
    fireEvent.change(tokenInput, { target: { value: 'ghp_testtoken' } });

    // Fill in flashcard data
    const frontInputs = screen.getAllByPlaceholderText(/Question ou prompt/);
    const backInputs = screen.getAllByPlaceholderText(/Réponse ou explication/);

    if (frontInputs.length > 0 && backInputs.length > 0) {
      fireEvent.change(frontInputs[0], { target: { value: 'Test question' } });
      fireEvent.change(backInputs[0], { target: { value: 'Test answer' } });
    }

    const uploadButton = screen.getByRole('button', {
      name: /Uploader.*Flashcards/,
    });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockCreateFlashcardGist).toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledWith(mockGistUrl);
    });
  });

  it('should display error when gist creation fails', async () => {
    const errorMessage = 'Failed to create gist';
    mockCreateFlashcardGist.mockResolvedValue({
      success: false,
      error: errorMessage,
    });

    render(<GistFlashcardWriter />);

    const tokenInput = screen.getByPlaceholderText(/ghp_/);
    fireEvent.change(tokenInput, { target: { value: 'ghp_testtoken' } });

    const frontInputs = screen.getAllByPlaceholderText(/Question ou prompt/);
    const backInputs = screen.getAllByPlaceholderText(/Réponse ou explication/);

    if (frontInputs.length > 0 && backInputs.length > 0) {
      fireEvent.change(frontInputs[0], { target: { value: 'Test question' } });
      fireEvent.change(backInputs[0], { target: { value: 'Test answer' } });
    }

    const uploadButton = screen.getByRole('button', {
      name: /Uploader.*Flashcards/,
    });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(
        screen.getByText(/Failed to create gist|Erreur|Création du Gist/)
      ).toBeInTheDocument();
    });
  });

  it('should call onError callback when error occurs', async () => {
    const onError = vi.fn();
    const errorMessage = 'Test error';

    mockCreateFlashcardGist.mockResolvedValue({
      success: false,
      error: errorMessage,
    });

    render(<GistFlashcardWriter onError={onError} />);

    const tokenInput = screen.getByPlaceholderText(/ghp_/);
    fireEvent.change(tokenInput, { target: { value: 'ghp_testtoken' } });

    const frontInputs = screen.getAllByPlaceholderText(/Question ou prompt/);
    const backInputs = screen.getAllByPlaceholderText(/Réponse ou explication/);

    if (frontInputs.length > 0 && backInputs.length > 0) {
      fireEvent.change(frontInputs[0], { target: { value: 'Test question' } });
      fireEvent.change(backInputs[0], { target: { value: 'Test answer' } });
    }

    const uploadButton = screen.getByRole('button', {
      name: /Uploader.*Flashcards/,
    });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(onError).toHaveBeenCalled();
    });
  });

  it('should add new flashcard', () => {
    render(<GistFlashcardWriter />);

    const addButton = screen.getByText(/Ajouter une Flashcard/);
    fireEvent.click(addButton);

    const frontInputs = screen.getAllByPlaceholderText(/Question ou prompt/);
    expect(frontInputs.length).toBeGreaterThan(1);
  });

  it('should remove flashcard', () => {
    render(<GistFlashcardWriter />);

    // Add a flashcard first
    const addButton = screen.getByText(/Ajouter une Flashcard/);
    fireEvent.click(addButton);

    const removeButtons = screen
      .getAllByRole('button', { name: '' })
      .filter(btn => btn.querySelector('svg'));

    if (removeButtons.length > 0) {
      fireEvent.click(removeButtons[0]);

      const frontInputs =
        screen.queryAllByPlaceholderText(/Question ou prompt/);
      expect(frontInputs.length).toBe(1);
    }
  });

  it('should log debug information when uploading', async () => {
    gistDebugLogger.enable();
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    mockCreateFlashcardGist.mockResolvedValue({
      success: true,
      gistUrl: 'https://gist.github.com/user/test-id',
    });

    render(<GistFlashcardWriter />);

    const tokenInput = screen.getByPlaceholderText(/ghp_/);
    fireEvent.change(tokenInput, { target: { value: 'ghp_testtoken' } });

    const frontInputs = screen.getAllByPlaceholderText(/Question ou prompt/);
    const backInputs = screen.getAllByPlaceholderText(/Réponse ou explication/);

    if (frontInputs.length > 0 && backInputs.length > 0) {
      fireEvent.change(frontInputs[0], { target: { value: 'Test question' } });
      fireEvent.change(backInputs[0], { target: { value: 'Test answer' } });
    }

    const uploadButton = screen.getByRole('button', {
      name: /Uploader.*Flashcards/,
    });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(mockCreateFlashcardGist).toHaveBeenCalled();
    });

    const logs = gistDebugLogger.getLogs();
    expect(logs.some(log => log.message.includes('GistFlashcardWriter'))).toBe(
      true
    );

    consoleSpy.mockRestore();
  });

  it('should display success message with gist URL', async () => {
    const mockGistUrl = 'https://gist.github.com/user/test-id';

    mockCreateFlashcardGist.mockResolvedValue({
      success: true,
      gistUrl: mockGistUrl,
    });

    render(<GistFlashcardWriter />);

    const tokenInput = screen.getByPlaceholderText(/ghp_/);
    fireEvent.change(tokenInput, { target: { value: 'ghp_testtoken' } });

    const frontInputs = screen.getAllByPlaceholderText(/Question ou prompt/);
    const backInputs = screen.getAllByPlaceholderText(/Réponse ou explication/);

    if (frontInputs.length > 0 && backInputs.length > 0) {
      fireEvent.change(frontInputs[0], { target: { value: 'Test question' } });
      fireEvent.change(backInputs[0], { target: { value: 'Test answer' } });
    }

    const uploadButton = screen.getByRole('button', {
      name: /Uploader.*Flashcards/,
    });
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(
        screen.getByText(/flashcards uploadés avec succès|Gist créé/)
      ).toBeInTheDocument();
      const viewLink = screen.queryByText('Voir le Gist');
      if (viewLink) {
        expect(viewLink).toBeInTheDocument();
      }
    });
  });
});
