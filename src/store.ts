import { create } from 'zustand';
import {
  loadUserProgress,
  saveUserProgress,
  updateFlashcardProgress,
  type UserProgress,
} from './lib/cookies';
import {
  DEFAULT_GIST_ID,
  DEFAULT_GIST_OWNER,
  DEFAULT_GIST_NAME,
} from './lib/constants';
import type { ThemeId } from './lib/themes';
import { loadStoredTheme, persistTheme, applyTheme } from './lib/themes';

export type FlashcardFace = {
  /** Optional heading shown above the text */
  title?: string;
  /** Primary content displayed on the face */
  text: string;
  /** Optional supporting text (eg. pronunciation, short note) */
  subText?: string;
  /** Optional hint displayed near the bottom of the face */
  hint?: string;
};

export type FlashcardExample = {
  /** Optional identifier for this example */
  id?: string;
  /** Optional label such as “Example”, “Usage”, etc. */
  label?: string;
  /** Example text shown to the learner */
  text: string;
  /** Companion translation or explanation */
  translation?: string;
  /** Additional context or note */
  note?: string;
};

export type FlashcardMetadataValue =
  | string
  | number
  | boolean
  | string[]
  | number[];

export type FlashcardMetadata = Record<string, FlashcardMetadataValue>;

function sortFlashcardsBySchedule(
  cards: Flashcard[],
  progress: UserProgress
): Flashcard[] {
  if (!cards.length) return [];

  return cards
    .map((card, index) => {
      const entry = progress[card.id];
      const due = entry?.due ?? Number.POSITIVE_INFINITY;
      const lastRetrievability =
        entry?.history && entry.history.length > 0
          ? (entry.history[entry.history.length - 1]?.retrievability ?? 0)
          : 0;
      return { card, due, lastRetrievability, index };
    })
    .sort((a, b) => {
      if (a.due !== b.due) {
        return a.due - b.due;
      }
      if (a.lastRetrievability !== b.lastRetrievability) {
        return a.lastRetrievability - b.lastRetrievability;
      }
      return a.index - b.index;
    })
    .map(item => item.card);
}

/**
 * Generic flashcard structure that supports multiple data sources (languages, trivia, etc.)
 */
export type Flashcard = {
  /** Unique identifier for the flashcard */
  id: string;
  /** Optional identifier of the deck or dataset */
  deckId?: string;
  /** Optional friendly name for the dataset */
  deckName?: string;
  /** Optional language or domain */
  language?: string;
  /** Optional category or grouping */
  category?: string;
  /** Optional difficulty indicator */
  difficulty?: string;
  /** Tags for filtering or search */
  tags?: string[];
  /** Content shown on the question side */
  front: FlashcardFace;
  /** Content shown on the answer side */
  back: FlashcardFace;
  /** Optional example sentences or usage notes */
  examples?: FlashcardExample[];
  /** Examples shown specifically on the front face */
  frontExamples?: FlashcardExample[];
  /** Examples shown specifically on the back face */
  backExamples?: FlashcardExample[];
  /** Arbitrary metadata describing the card */
  metadata?: FlashcardMetadata;
  /** Additional payload for dataset-specific information */
  extras?: Record<string, unknown>;
  /** Raw fields from the source dataset */
  rawFields?: Record<string, unknown>;
};

/**
 * Application state type managed by Zustand store
 */
type GistSelection = {
  id: string;
  owner?: string;
  name?: string;
  rawUrl?: string;
};

type AppState = {
  /** Array of all flashcards in the app */
  flashcards: Flashcard[];
  /** Array of flashcards sorted by FSRS scheduling */
  sortedFlashcards: Flashcard[];
  /** Set of flashcard IDs that the user knows (succeeded) */
  knownIds: Set<string>;
  /** Set of flashcard IDs that the user doesn't know (failed) */
  unknownIds: Set<string>;
  /** User progress data loaded from cookies */
  userProgress: UserProgress;
  /** Returns flashcards ordered according to FSRS schedule */
  getOrderedCards: () => Flashcard[];
  /** Function to mark a flashcard as known (succeeded) */
  markAsKnown: (id: string) => void;
  /** Function to mark a flashcard as unknown (failed) */
  markAsUnknown: (id: string) => void;
  /** Function to set all flashcards */
  setFlashcards: (flashcards: Flashcard[]) => void;
  /** Function to load user progress from cookies */
  loadProgress: () => void;
  /** Function to save user progress to cookies */
  saveProgress: () => void;
  /** Currently selected gist deck */
  selectedGist: GistSelection;
  /** Update gist selection */
  setSelectedGist: (selection: GistSelection) => void;
  /** Currently selected theme */
  theme: ThemeId;
  /** Update theme */
  setTheme: (themeId: ThemeId) => void;
};

const GIST_STORAGE_KEY = 'selected_gist_deck';

function loadStoredGistSelection(): GistSelection {
  if (typeof window === 'undefined') {
    return {
      id: DEFAULT_GIST_ID,
      owner: DEFAULT_GIST_OWNER,
      name: DEFAULT_GIST_NAME,
    };
  }
  try {
    const raw = window.localStorage.getItem(GIST_STORAGE_KEY);
    if (!raw) {
      return {
        id: DEFAULT_GIST_ID,
        owner: DEFAULT_GIST_OWNER,
        name: DEFAULT_GIST_NAME,
      };
    }
    const parsed = JSON.parse(raw) as GistSelection;
    if (!parsed.id) {
      return {
        id: DEFAULT_GIST_ID,
        owner: DEFAULT_GIST_OWNER,
        name: DEFAULT_GIST_NAME,
      };
    }
    return parsed;
  } catch {
    return {
      id: DEFAULT_GIST_ID,
      owner: DEFAULT_GIST_OWNER,
      name: DEFAULT_GIST_NAME,
    };
  }
}

function persistGistSelection(selection: GistSelection) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(GIST_STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // ignore
  }
}

/**
 * Zustand store for managing application state
 * Handles flashcards and user progress tracking
 */
export const useAppStore = create<AppState>((set, get) => {
  // Initialize theme
  const initialTheme = loadStoredTheme();
  applyTheme(initialTheme);

  return {
    selectedGist: loadStoredGistSelection(),
    theme: initialTheme,
    flashcards: [],
    sortedFlashcards: [],
    knownIds: new Set<string>(),
    unknownIds: new Set<string>(),
    userProgress: {},
    getOrderedCards: () => {
      const state = get();
      return state.sortedFlashcards.length > 0
        ? state.sortedFlashcards
        : state.flashcards;
    },

    /**
     * Mark a flashcard as known (user succeeded)
     * @param id - Flashcard ID to mark as known
     */
    markAsKnown: (id: string) => {
      updateFlashcardProgress(id, true);
      set(state => {
        const knownIds = new Set(state.knownIds);
        knownIds.add(id);
        const unknownIds = new Set(state.unknownIds);
        unknownIds.delete(id);
        return { knownIds, unknownIds };
      });
      const updatedProgress = loadUserProgress();
      set(state => ({
        userProgress: updatedProgress,
        sortedFlashcards: sortFlashcardsBySchedule(
          state.flashcards,
          updatedProgress
        ),
      }));
    },

    /**
     * Mark a flashcard as unknown (user failed)
     * @param id - Flashcard ID to mark as unknown
     */
    markAsUnknown: (id: string) => {
      updateFlashcardProgress(id, false);
      set(state => {
        const unknownIds = new Set(state.unknownIds);
        unknownIds.add(id);
        const knownIds = new Set(state.knownIds);
        knownIds.delete(id);
        return { knownIds, unknownIds };
      });
      const updatedProgress = loadUserProgress();
      set(state => ({
        userProgress: updatedProgress,
        sortedFlashcards: sortFlashcardsBySchedule(
          state.flashcards,
          updatedProgress
        ),
      }));
    },

    /**
     * Set all flashcards in the store
     * @param flashcards - Array of flashcards to set
     */
    setFlashcards: (flashcards: Flashcard[]) =>
      set(state => ({
        flashcards,
        sortedFlashcards: sortFlashcardsBySchedule(
          flashcards,
          state.userProgress
        ),
      })),

    /**
     * Load user progress from cookies
     */
    loadProgress: () => {
      const progress = loadUserProgress();
      const knownIds = new Set<string>();
      const unknownIds = new Set<string>();

      Object.entries(progress).forEach(([id, data]) => {
        if (data.known) {
          knownIds.add(id);
        } else {
          unknownIds.add(id);
        }
      });

      set(state => ({
        userProgress: progress,
        knownIds,
        unknownIds,
        sortedFlashcards: sortFlashcardsBySchedule(state.flashcards, progress),
      }));
    },

    /**
     * Save user progress to cookies
     */
    saveProgress: () => {
      const { userProgress } = get();
      saveUserProgress(userProgress);
    },
    setSelectedGist: (selection: GistSelection) => {
      persistGistSelection(selection);
      set({ selectedGist: selection });
    },
    setTheme: (themeId: ThemeId) => {
      persistTheme(themeId);
      applyTheme(themeId);
      set({ theme: themeId });
    },
  };
});
