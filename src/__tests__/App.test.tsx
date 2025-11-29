import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { DEFAULT_GIST_ID } from '../lib/constants';

// Mock localStorage before any imports that might use it
const mockLocalStorage = {
  getItem: vi.fn((key: string) => {
    if (key === 'hasSeenOnboarding') return 'true';
    if (key === 'selected_gist_deck') return null;
    return null;
  }),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

// Mock the CSS imports
vi.mock('../App.css', () => ({}));
vi.mock('../pages/DiscoverPage.css', () => ({}));

// Mock DiscoverPage BEFORE importing App to ensure the mock is hoisted
vi.mock('../pages/DiscoverPage', () => ({
  __esModule: true,
  default: () => <div data-testid="discover-page">Discover Page</div>,
}));
vi.mock('../pages/MatchesPage', () => ({
  __esModule: true,
  default: () => <div data-testid="matches-page">Matches Page</div>,
}));
vi.mock('../pages/ActivistSetupPage', () => ({
  __esModule: true,
  default: () => (
    <div data-testid="activist-setup-page">Activist Setup Page</div>
  ),
}));
vi.mock('../components/Toast', () => ({
  ToastContainer: () => (
    <div data-testid="toast-container">Toast Container</div>
  ),
  useToast: () => ({
    toasts: [],
    removeToast: vi.fn(),
  }),
}));
vi.mock('../hooks/useGistFlashcards', () => ({
  useGistFlashcards: () => ({
    flashcards: [],
    isLoading: false,
    error: null,
  }),
}));
vi.mock('../store', () => ({
  useAppStore: () => ({
    flashcards: [],
    sortedFlashcards: [],
    setFlashcards: vi.fn(),
    loadProgress: vi.fn(),
    selectedGist: {
      id: DEFAULT_GIST_ID, // Use default Gist ID to prevent redirect
      owner: 'test-owner',
      rawUrl: undefined,
    },
  }),
}));

import App from '../App';

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('App', () => {
  beforeEach(() => {
    // Reset localStorage mocks before each test
    mockLocalStorage.getItem.mockImplementation((key: string) => {
      if (key === 'hasSeenOnboarding') return 'true';
      if (key === 'selected_gist_deck') return null;
      return null;
    });
  });

  it('renders the main app structure', () => {
    renderWithRouter(<App />);

    // Use getAllByRole since SettingsPage header has role="none" now
    const banners = screen.getAllByRole('banner');
    expect(banners.length).toBeGreaterThan(0);
    expect(banners[0]).toHaveClass('app-header');
    expect(screen.getByRole('main')).toBeInTheDocument(); // app-main
    expect(screen.getByRole('navigation')).toBeInTheDocument(); // nav
  });

  it('renders navigation links', () => {
    renderWithRouter(<App />);

    expect(screen.getByText('Study')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Gist')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders Discover page by default', () => {
    renderWithRouter(<App />);

    expect(screen.getByTestId('discover-page')).toBeInTheDocument();
  });

  it('renders ToastContainer', () => {
    renderWithRouter(<App />);

    expect(screen.getByTestId('toast-container')).toBeInTheDocument();
  });

  it('has proper navigation structure', () => {
    renderWithRouter(<App />);

    const nav = screen.getByRole('navigation');
    const links = nav.querySelectorAll('a');

    expect(links).toHaveLength(5);
    expect(links[0]).toHaveAttribute('href', '/');
    expect(links[1]).toHaveAttribute('href', '/progress');
    expect(links[2]).toHaveAttribute('href', '/create');
    expect(links[3]).toHaveAttribute('href', '/gist-demo');
    expect(links[4]).toHaveAttribute('href', '/settings');
  });

  it('has proper main content area', () => {
    renderWithRouter(<App />);

    const main =
      screen.getByTestId('main-content') || screen.getAllByRole('main')[0];
    expect(main).toHaveClass('app-main');
  });

  it('has proper header area', () => {
    renderWithRouter(<App />);

    const header = screen.getAllByRole('banner')[0];
    expect(header).toHaveClass('app-header');
  });
});
