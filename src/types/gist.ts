/**
 * Type definitions for GitHub Gist integration
 */

export type GistFlashcardFace =
  | string
  | {
      title?: string;
      text: string;
      subText?: string;
      hint?: string;
    };

export type GistFlashcardExample = {
  id?: string;
  label?: string;
  text: string;
  translation?: string;
  note?: string;
};

export interface GistFlashcard {
  id: string;
  front?: GistFlashcardFace;
  back?: GistFlashcardFace;
  category?: string;
  tags?: string[];
  deckId?: string;
  language?: string;
  difficulty?: string;
  metadata?: Record<string, string | number | boolean | string[] | number[]>;
  examples?: GistFlashcardExample[];
  extras?: Record<string, unknown>;
}

/**
 * Flashcard deck metadata stored in Gist
 * This lists all available flashcard decks
 */
export interface FlashcardDeck {
  id: string;
  title: string;
  description?: string;
  gistId: string; // Gist ID where the flashcards.json file is stored
  createdAt?: string;
  updatedAt?: string;
}

export interface GistResponse {
  id?: string;
  html_url: string;
  owner?: {
    login?: string;
  };
  files: {
    [filename: string]: {
      content?: string;
      raw_url?: string;
    };
  };
}

export interface GistError {
  message: string;
  documentation_url?: string;
}
