import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SettingsPage from '../SettingsPage';
import { buildExportPayload } from '../../lib/exportPayload';
import { useAppStore } from '../../store';
import { GIST_DECKS } from '../../lib/gistDecks';
import {
  fetchGistDeckCatalog,
  persistCatalog,
  readStoredCatalog,
} from '../../lib/gistCatalog';
import {
  DEFAULT_GIST_ID,
  DEFAULT_GIST_OWNER,
  DEFAULT_GIST_NAME,
} from '../../lib/constants';

vi.mock('../../lib/cookies', () => ({
  loadUserProgress: vi.fn(() => ({
    'card-1': {
      known: true,
      lastSeen: 1234567890,
      attempts: 1,
      successes: 1,
      failures: 0,
      stability: 1.5,
      difficulty: 3.5,
      history: [
        {
          timestamp: 1234567890,
          grade: 3,
          interval: 1,
          stability: 1.5,
          difficulty: 3.5,
          retrievability: 0.9,
          due: 1234567890,
        },
      ],
    },
  })),
}));

vi.mock('../../lib/deckFieldMapping', () => ({
  loadAllDeckFieldMappings: vi.fn(() => ({
    'mandarin-core': {
      deckId: 'mandarin-core',
      front: {
        textField: '__front_text__',
      },
      back: {
        textField: '__back_text__',
      },
      examples: [],
    },
  })),
}));

vi.mock('../../lib/gistCatalog', () => {
  return {
    fetchGistDeckCatalog: vi.fn(),
    persistCatalog: vi.fn(),
    readStoredCatalog: vi.fn(() => null),
  };
});

const mockFetchCatalog = vi.mocked(fetchGistDeckCatalog);
const mockPersistCatalog = vi.mocked(persistCatalog);
const mockReadStoredCatalog = vi.mocked(readStoredCatalog);

const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('SettingsPage', () => {
  const openGistTab = () => {
    fireEvent.click(screen.getByRole('tab', { name: /Decks GitHub Gist/i }));
  };

  beforeEach(() => {
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockReset();
    mockFetchCatalog.mockReset();
    mockPersistCatalog.mockReset();
    mockReadStoredCatalog.mockReturnValue(null);
    act(() => {
      useAppStore.setState({
        selectedGist: {
          id: DEFAULT_GIST_ID,
          owner: DEFAULT_GIST_OWNER,
          name: DEFAULT_GIST_NAME,
        },
      });
    });
  });

  it('builds export payload with progress and mappings', () => {
    const payload = buildExportPayload();
    expect(payload.version).toBe('1.0');
    expect(payload.progress['card-1']).toBeDefined();
    expect(payload.mappings['mandarin-core']).toBeDefined();
  });

  it('triggers download when clicking export button', () => {
    const createElementSpy = vi.spyOn(document, 'createElement');
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();

    render(<SettingsPage />);
    fireEvent.click(screen.getByText(/Télécharger mes données/i));

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');

    createElementSpy.mockRestore();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevoke;
  });

  it('lists available Gist decks with radio inputs', () => {
    render(<SettingsPage />);
    openGistTab();

    GIST_DECKS.forEach(deck => {
      expect(
        screen.getByRole('radio', { name: deck.name })
      ).toBeInTheDocument();
    });
  });

  it('updates selected gist when choosing another deck', () => {
    render(<SettingsPage />);
    openGistTab();

    const alternativeDeck = GIST_DECKS.find(
      deck => deck.id !== DEFAULT_GIST_ID
    );
    expect(alternativeDeck).toBeDefined();
    const radio = screen.getByRole('radio', { name: alternativeDeck!.name });

    fireEvent.click(radio);

    const updatedSelection = useAppStore.getState().selectedGist;
    expect(updatedSelection.id).toBe(alternativeDeck!.id);
    expect(mockLocalStorage.setItem).toHaveBeenCalled();
    expect(
      screen.getByText(
        new RegExp(`Deck "${alternativeDeck!.name}" sélectionné`, 'i')
      )
    ).toBeInTheDocument();
  });

  it('loads deck catalog from a gist URL', async () => {
    mockFetchCatalog.mockResolvedValue({
      decks: [
        {
          id: 'custom',
          owner: 'owner',
          name: 'Custom Deck',
          gistUrl: 'https://gist.github.com/owner/custom',
        },
      ],
      id: 'custom',
      owner: 'owner',
      source: 'https://gist.github.com/owner/custom',
    });

    render(<SettingsPage />);
    openGistTab();

    fireEvent.change(screen.getByLabelText(/URL du Gist/i), {
      target: { value: 'https://gist.github.com/owner/custom' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Charger les decks/i }));

    await waitFor(() => expect(mockFetchCatalog).toHaveBeenCalled());
    expect(
      screen.getByRole('radio', { name: 'Custom Deck' })
    ).toBeInTheDocument();
    expect(mockPersistCatalog).toHaveBeenCalled();
    expect(
      screen.getByText(/Nouvelle liste de decks chargée/i)
    ).toBeInTheDocument();
  });

  it('shows an error when catalog loading fails', async () => {
    mockFetchCatalog.mockRejectedValue(new Error('Erreur réseau'));

    render(<SettingsPage />);
    openGistTab();

    fireEvent.change(screen.getByLabelText(/URL du Gist/i), {
      target: { value: 'https://gist.github.com/owner/custom' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Charger les decks/i }));

    await waitFor(() =>
      expect(screen.getByText(/Erreur réseau/i)).toBeInTheDocument()
    );
  });
});
