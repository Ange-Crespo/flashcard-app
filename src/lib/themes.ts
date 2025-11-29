/**
 * Theme system for the flashcard app
 * Provides multiple color palette options
 */

export type ThemeId = 'ocean' | 'purple' | 'emerald' | 'slate';

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  colors: {
    primary: string;
    primaryHover: string;
    secondary: string;
    background: string;
    surface: string;
    surfaceHover: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
    success: string;
    error: string;
  };
}

export const THEMES: Record<ThemeId, Theme> = {
  ocean: {
    id: 'ocean',
    name: 'Ocean Blue & Teal',
    description:
      'Focus-friendly, professional, perfect for extended study sessions',
    colors: {
      primary: '#3B82F6',
      primaryHover: '#2563EB',
      secondary: '#06B6D4',
      background: '#0F172A',
      surface: '#1E293B',
      surfaceHover: '#334155',
      textPrimary: '#F8FAFC',
      textSecondary: '#94A3B8',
      border: '#334155',
      success: '#10B981',
      error: '#EF4444',
    },
  },
  purple: {
    id: 'purple',
    name: 'Purple & Indigo',
    description: 'Creative, modern, engaging learning experience',
    colors: {
      primary: '#8B5CF6',
      primaryHover: '#7C3AED',
      secondary: '#A78BFA',
      background: '#0F0F23',
      surface: '#1E1B4B',
      surfaceHover: '#312E81',
      textPrimary: '#F5F3FF',
      textSecondary: '#C4B5FD',
      border: '#4C1D95',
      success: '#10B981',
      error: '#F87171',
    },
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald & Mint',
    description: 'Fresh, energetic, positive learning experience',
    colors: {
      primary: '#10B981',
      primaryHover: '#059669',
      secondary: '#34D399',
      background: '#0A0E0D',
      surface: '#1A2E28',
      surfaceHover: '#2D4A3F',
      textPrimary: '#ECFDF5',
      textSecondary: '#9CA3AF',
      border: '#374151',
      success: '#10B981',
      error: '#F87171',
    },
  },
  slate: {
    id: 'slate',
    name: 'Slate & Cyan',
    description: 'Minimalist, professional, distraction-free',
    colors: {
      primary: '#06B6D4',
      primaryHover: '#0891B2',
      secondary: '#22D3EE',
      background: '#0F172A',
      surface: '#1E293B',
      surfaceHover: '#334155',
      textPrimary: '#F1F5F9',
      textSecondary: '#94A3B8',
      border: '#334155',
      success: '#10B981',
      error: '#EF4444',
    },
  },
};

const THEME_STORAGE_KEY = 'app_theme';

/**
 * Load theme from localStorage
 */
export function loadStoredTheme(): ThemeId {
  if (typeof globalThis.window === 'undefined') {
    return 'ocean'; // Default theme
  }
  try {
    const stored = globalThis.window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && stored in THEMES) {
      return stored as ThemeId;
    }
  } catch {
    // ignore
  }
  return 'ocean';
}

/**
 * Save theme to localStorage
 */
export function persistTheme(themeId: ThemeId): void {
  if (typeof globalThis.window === 'undefined') return;
  try {
    globalThis.window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    // ignore
  }
}

/**
 * Apply theme to the document root
 */
export function applyTheme(themeId: ThemeId): void {
  const theme = THEMES[themeId];
  if (!theme) return;

  const root = document.documentElement;

  // Map theme colors to CSS variables
  root.style.setProperty('--primary-yellow', theme.colors.primary);
  root.style.setProperty('--primary-yellow-hover', theme.colors.primaryHover);
  root.style.setProperty('--secondary-color', theme.colors.secondary);
  root.style.setProperty('--secondary-black', theme.colors.background);
  root.style.setProperty('--surface-color', theme.colors.surface);
  root.style.setProperty('--surface-hover', theme.colors.surfaceHover);
  root.style.setProperty('--text-primary', theme.colors.textPrimary);
  root.style.setProperty('--text-secondary', theme.colors.textSecondary);
  root.style.setProperty('--border-color', theme.colors.border);
  root.style.setProperty('--success-color', theme.colors.success);
  root.style.setProperty('--error-color', theme.colors.error);
}

/**
 * Get all available themes
 */
export function getAllThemes(): Theme[] {
  return Object.values(THEMES);
}

/**
 * Get theme by ID
 */
export function getTheme(themeId: ThemeId): Theme {
  return THEMES[themeId] || THEMES.ocean;
}
