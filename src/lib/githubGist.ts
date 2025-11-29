/**
 * GitHub Gist API service for managing flashcards
 */

import type {
  GistFlashcard,
  GistResponse,
  GistError,
  GistFlashcardFace,
} from '../types/gist';

/**
 * Mandarin word format from the Gist
 */
interface MandarinWordEntry {
  word: string;
  useful_for_flashcard?: boolean;
  cefr_level?: string;
  english_translation?: string;
  romanization?: string;
  example_sentence_native?: string;
  example_sentence_english?: string;
  pos?: string;
  word_frequency?: number;
}

/**
 * Convert Mandarin word format to GistFlashcard format
 */
function convertMandarinToGistFlashcard(
  entry: MandarinWordEntry,
  index: number
): GistFlashcard {
  const front: GistFlashcardFace = {
    title: 'Mot',
    text: entry.word || '',
    subText: entry.romanization,
    hint: 'Touchez pour afficher la traduction',
  };

  const back: GistFlashcardFace = {
    title: 'Traduction',
    text: entry.english_translation || '',
    hint: 'Balayez à droite si vous le connaissez, à gauche sinon',
  };

  const tags: string[] = [];
  if (entry.pos) tags.push(entry.pos);
  if (entry.cefr_level) tags.push(entry.cefr_level);

  const examples = [];
  if (entry.example_sentence_native && entry.example_sentence_english) {
    examples.push({
      label: 'Exemple',
      text: entry.example_sentence_native,
      translation: entry.example_sentence_english,
    });
  }

  const metadata: Record<string, string | number> = {};
  if (entry.pos) metadata['Part of Speech'] = entry.pos;
  if (entry.cefr_level) metadata['Level'] = entry.cefr_level;
  if (typeof entry.word_frequency === 'number') {
    metadata['Frequency Rank'] = entry.word_frequency;
  }

  const id =
    entry.word && entry.word.trim()
      ? `mandarin-${entry.word.toLowerCase().replace(/\s+/g, '-')}-${index}`
      : `mandarin-${index}`;

  return {
    id, // This ID will be replaced by hash-based ID in convertGistFlashcardToAppFlashcard
    deckId: 'mandarin-gist', // Set a default deckId for hash generation
    front,
    back,
    category: entry.cefr_level,
    tags: tags.length > 0 ? tags : undefined,
    language: 'mandarin',
    difficulty: entry.cefr_level,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    examples: examples.length > 0 ? examples : undefined,
    extras: {
      source: 'mandarin.json',
      word_frequency: entry.word_frequency,
      useful_for_flashcard: entry.useful_for_flashcard,
    },
  };
}

/**
 * Check if data is in Mandarin format
 */
function isMandarinFormat(data: unknown): data is MandarinWordEntry[] {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return false;
  const first = data[0];
  return (
    typeof first === 'object' &&
    first !== null &&
    'word' in first &&
    'english_translation' in first
  );
}

// Re-export types for backward compatibility
export type { GistResponse, GistError } from '../types/gist';

type ParsedGistIdentifier = {
  owner?: string;
  id: string;
};

function parseGistIdentifier(identifier?: string | null): ParsedGistIdentifier {
  if (!identifier) {
    return { id: '' };
  }

  const trimmed = identifier.trim();
  if (!trimmed) {
    return { id: '' };
  }

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length >= 2) {
      return { owner: segments[0], id: segments[1] };
    }
    if (segments.length === 1) {
      return { id: segments[0] };
    }
  } catch {
    // Not a valid URL, fall back to manual parsing.
  }

  const sanitized = trimmed.replaceAll(/(^\/+|\/+$)/g, '');
  const parts = sanitized.split('/').filter(Boolean);
  if (parts.length >= 2) {
    const owner = parts.at(-2);
    const id = parts.at(-1);
    if (owner && id) {
      return { owner, id };
    }
  }

  return { id: sanitized };
}

class GitHubGistService {
  private readonly baseUrl = 'https://api.github.com/gists';
  private gistId: string | null = null;
  private gistOwner: string | null = null;
  private gistReference: string | null = null;

  /**
   * Set the Gist ID to use for reading/writing flashcards
   */
  setGistId(gistId: string, owner?: string) {
    const reference = gistId?.trim() ?? '';
    const parsed = parseGistIdentifier(reference);
    const resolvedId = parsed.id || reference;
    const shouldReset = !resolvedId;
    const resolvedOwner = shouldReset
      ? null
      : (owner ?? parsed.owner ?? this.gistOwner ?? null);

    this.gistReference = shouldReset ? null : reference;
    this.gistId = shouldReset ? null : resolvedId;
    this.gistOwner = resolvedOwner;
  }

  /**
   * Create a new Gist with flashcards
   */
  async createFlashcardGist(
    flashcards: GistFlashcard[],
    githubToken: string,
    description: string = 'Flashcard Learning App - Flashcards'
  ): Promise<{ success: boolean; gistUrl?: string; error?: string }> {
    try {
      const gistData = {
        description,
        public: true,
        files: {
          'flashcards.json': {
            content: JSON.stringify(flashcards, null, 2),
          },
        },
      };

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          Authorization: `token ${githubToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(gistData),
      });

      if (!response.ok) {
        const errorData: GistError = await response.json();
        return {
          success: false,
          error: errorData.message || 'Erreur lors de la création du Gist',
        };
      }

      const result: GistResponse = await response.json();
      const parsedUrl = parseGistIdentifier(result.html_url);
      this.gistId = result.id ?? parsedUrl.id ?? this.gistId;
      this.gistOwner = result.owner?.login ?? parsedUrl.owner ?? this.gistOwner;
      this.gistReference = result.html_url ?? this.gistReference;

      return {
        success: true,
        gistUrl: result.html_url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Update an existing Gist with new flashcards
   */
  async updateFlashcardGist(
    flashcards: GistFlashcard[],
    githubToken: string
  ): Promise<{ success: boolean; gistUrl?: string; error?: string }> {
    if (!this.gistId) {
      return {
        success: false,
        error: 'Aucun Gist ID configuré',
      };
    }

    try {
      const gistData = {
        files: {
          'flashcards.json': {
            content: JSON.stringify(flashcards, null, 2),
          },
        },
      };

      const response = await fetch(`${this.baseUrl}/${this.gistId}`, {
        method: 'PATCH',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          Authorization: `token ${githubToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(gistData),
      });

      if (!response.ok) {
        const errorData: GistError = await response.json();
        return {
          success: false,
          error: errorData.message || 'Erreur lors de la mise à jour du Gist',
        };
      }

      const result: GistResponse = await response.json();

      if (result.owner?.login) {
        this.gistOwner = result.owner.login;
      }

      return {
        success: true,
        gistUrl: result.html_url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Read flashcards from a Gist
   * @param gistId - The Gist ID
   * @param rawUrl - Optional direct URL to the JSON file (from deck descriptor)
   */
  async readFlashcards(
    gistId: string,
    rawUrl?: string
  ): Promise<{
    success: boolean;
    flashcards?: GistFlashcard[];
    error?: string;
  }> {
    try {
      // If rawUrl is provided, use it directly (from deck descriptor)
      if (rawUrl) {
        try {
          const rawResponse = await fetch(rawUrl, {
            mode: 'cors',
            credentials: 'omit',
          });
          if (!rawResponse.ok) {
            return {
              success: false,
              error: `Erreur lors de la lecture du fichier (${rawResponse.status}): ${rawResponse.statusText}`,
            };
          }

          const rawContentType = rawResponse.headers.get('content-type');
          if (!rawContentType || !rawContentType.includes('application/json')) {
            return {
              success: false,
              error: "Le fichier n'est pas au format JSON valide",
            };
          }

          const flashcardsContent = await rawResponse.text();
          try {
            const parsed = JSON.parse(flashcardsContent);

            // Check if it's in Mandarin format and convert
            if (isMandarinFormat(parsed)) {
              const flashcards: GistFlashcard[] = parsed
                .filter(
                  (entry: MandarinWordEntry) =>
                    entry.useful_for_flashcard !== false &&
                    entry.word &&
                    entry.english_translation
                )
                .map((entry: MandarinWordEntry, index: number) =>
                  convertMandarinToGistFlashcard(entry, index)
                );

              if (flashcards.length > 0) {
                return {
                  success: true,
                  flashcards,
                };
              }
            }

            // Otherwise, treat as standard GistFlashcard format
            if (Array.isArray(parsed)) {
              const flashcards = parsed as GistFlashcard[];
              if (
                flashcards.length > 0 &&
                flashcards[0].id &&
                flashcards[0].front
              ) {
                return {
                  success: true,
                  flashcards,
                };
              }
              return {
                success: false,
                error: 'Le fichier ne contient pas de flashcards valides',
              };
            }

            return {
              success: false,
              error: 'Le fichier doit contenir un tableau de flashcards',
            };
          } catch (parseError) {
            return {
              success: false,
              error: `Impossible de parser le fichier: ${parseError instanceof Error ? parseError.message : 'Erreur de parsing'}`,
            };
          }
        } catch (fetchError) {
          return {
            success: false,
            error: `Impossible d'accéder au fichier: ${fetchError instanceof Error ? fetchError.message : 'Erreur de connexion'}`,
          };
        }
      }

      // Otherwise, try the API approach to find the file
      const apiResponse = await fetch(`${this.baseUrl}/${gistId}`, {
        mode: 'cors',
        credentials: 'omit',
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (apiResponse.ok) {
        // Check content-type before parsing
        const contentType = apiResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          return {
            success: false,
            error: 'Réponse invalide du serveur GitHub',
          };
        }

        let result: GistResponse;
        try {
          result = await apiResponse.json();
        } catch {
          return {
            success: false,
            error: 'Impossible de parser la réponse du serveur GitHub',
          };
        }

        // First try the standard filename
        let flashcardsFile = result.files?.['flashcards.json'];
        let flashcardsContent = flashcardsFile?.content;
        let fileName = 'flashcards.json';

        // If flashcards.json not found, look for any .json file
        if (!flashcardsFile && result.files) {
          const jsonFiles = Object.keys(result.files).filter(name =>
            name.endsWith('.json')
          );

          if (jsonFiles.length > 0) {
            // Prefer files that might contain flashcards
            const preferredNames = [
              'mandarin.json',
              'flashcards.json',
              'cards.json',
              'deck.json',
            ];
            const preferredFile = jsonFiles.find(name =>
              preferredNames.some(pref =>
                name.toLowerCase().includes(pref.toLowerCase())
              )
            );

            fileName = preferredFile || jsonFiles[0];
            flashcardsFile = result.files[fileName];
            flashcardsContent = flashcardsFile?.content;
          }
        }

        if (flashcardsContent) {
          try {
            const parsed = JSON.parse(flashcardsContent);

            // Check if it's in Mandarin format and convert
            if (isMandarinFormat(parsed)) {
              const flashcards: GistFlashcard[] = parsed
                .filter(
                  (entry: MandarinWordEntry) =>
                    entry.useful_for_flashcard !== false &&
                    entry.word &&
                    entry.english_translation
                )
                .map((entry: MandarinWordEntry, index: number) =>
                  convertMandarinToGistFlashcard(entry, index)
                );

              if (flashcards.length > 0) {
                return {
                  success: true,
                  flashcards,
                };
              }
            }

            // Otherwise, treat as standard GistFlashcard format
            if (Array.isArray(parsed)) {
              const flashcards = parsed as GistFlashcard[];
              if (
                flashcards.length > 0 &&
                flashcards[0].id &&
                flashcards[0].front
              ) {
                return {
                  success: true,
                  flashcards,
                };
              }
            }

            return {
              success: false,
              error: `Le fichier ${fileName} ne contient pas de flashcards valides`,
            };
          } catch (parseError) {
            return {
              success: false,
              error: `Le contenu du fichier ${fileName} est invalide: ${parseError instanceof Error ? parseError.message : 'Erreur de parsing'}`,
            };
          }
        }

        // Try raw URL if available
        if (flashcardsFile?.raw_url) {
          try {
            const rawResponse = await fetch(flashcardsFile.raw_url, {
              mode: 'cors',
              credentials: 'omit',
            });
            if (rawResponse.ok) {
              const rawContentType = rawResponse.headers.get('content-type');
              if (
                rawContentType &&
                rawContentType.includes('application/json')
              ) {
                const flashcards =
                  (await rawResponse.json()) as GistFlashcard[];
                if (Array.isArray(flashcards)) {
                  return {
                    success: true,
                    flashcards,
                  };
                }
              }
            }
          } catch {
            // Continue to return error below
          }
        }

        return {
          success: false,
          error: `Aucun fichier JSON valide trouvé dans le Gist (cherché: flashcards.json ou tout fichier .json)`,
        };
      } else {
        // Handle API errors - check content-type before parsing
        const contentType = apiResponse.headers.get('content-type');
        let errorData: Record<string, unknown> = {};
        let errorMessage = `Erreur ${apiResponse.status}: ${apiResponse.statusText}`;

        if (contentType && contentType.includes('application/json')) {
          try {
            errorData = await apiResponse.json();
            if (errorData.message && typeof errorData.message === 'string') {
              errorMessage = errorData.message;
            }
          } catch {
            // If JSON parsing fails, use default error message
          }
        }

        // Only try raw content URL for 404 errors (Gist not found)
        if (apiResponse.status === 404) {
          const rawUrl = this.buildRawFileUrl(gistId, 'flashcards.json');
          if (rawUrl) {
            try {
              const rawResponse = await fetch(rawUrl, {
                mode: 'cors',
                credentials: 'omit',
              });

              if (!rawResponse.ok) {
                if (rawResponse.status === 404) {
                  return {
                    success: false,
                    error: 'Aucun fichier flashcards.json trouvé dans le Gist',
                  };
                }
                return {
                  success: false,
                  error: `Erreur lors de la lecture du Gist (${rawResponse.status}): ${rawResponse.statusText}`,
                };
              }

              const rawContentType = rawResponse.headers.get('content-type');
              if (
                !rawContentType ||
                !rawContentType.includes('application/json')
              ) {
                return {
                  success: false,
                  error:
                    "Le fichier flashcards.json n'est pas au format JSON valide",
                };
              }

              const flashcardsContent = await rawResponse.text();
              try {
                const parsed = JSON.parse(flashcardsContent);

                // Check if it's in Mandarin format and convert
                if (isMandarinFormat(parsed)) {
                  const flashcards: GistFlashcard[] = parsed
                    .filter(
                      (entry: MandarinWordEntry) =>
                        entry.useful_for_flashcard !== false &&
                        entry.word &&
                        entry.english_translation
                    )
                    .map((entry: MandarinWordEntry, index: number) =>
                      convertMandarinToGistFlashcard(entry, index)
                    );

                  if (flashcards.length > 0) {
                    return {
                      success: true,
                      flashcards,
                    };
                  }
                }

                // Otherwise, treat as standard GistFlashcard format
                if (Array.isArray(parsed)) {
                  const flashcards = parsed as GistFlashcard[];
                  if (
                    flashcards.length > 0 &&
                    flashcards[0].id &&
                    flashcards[0].front
                  ) {
                    return {
                      success: true,
                      flashcards,
                    };
                  }
                  return {
                    success: false,
                    error:
                      'Le fichier doit contenir un tableau de flashcards valides',
                  };
                }

                return {
                  success: false,
                  error: 'Le fichier doit contenir un tableau de flashcards',
                };
              } catch (parseError) {
                return {
                  success: false,
                  error: `Impossible de parser le fichier: ${parseError instanceof Error ? parseError.message : 'Erreur de parsing'}`,
                };
              }
            } catch {
              return {
                success: false,
                error: "Impossible d'accéder au fichier flashcards.json",
              };
            }
          }
        }

        // For other API errors, return the error message directly
        return {
          success: false,
          error: errorMessage,
        };
      }
    } catch (error) {
      // Handle network errors and other exceptions
      if (error instanceof TypeError) {
        if (
          error.message.includes('fetch') ||
          error.message.includes('Failed to fetch')
        ) {
          return {
            success: false,
            error:
              'Erreur de connexion. Vérifiez votre connexion internet ou les paramètres CORS.',
          };
        }
        if (error.message.includes('CORS')) {
          return {
            success: false,
            error:
              'Erreur CORS. Le serveur GitHub peut bloquer les requêtes depuis ce domaine.',
          };
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      };
    }
  }

  /**
   * Get the current Gist ID
   */
  getGistId(): string | null {
    return this.gistId;
  }

  private buildRawFileUrl(gistId: string, fileName: string): string | null {
    const reference = gistId || this.gistReference || this.gistId || '';
    const parsed = parseGistIdentifier(reference);
    const resolvedId = parsed.id || this.gistId;
    const resolvedOwner = parsed.owner ?? this.gistOwner;

    if (!resolvedId || !resolvedOwner) {
      return null;
    }

    return `https://gist.githubusercontent.com/${resolvedOwner}/${resolvedId}/raw/${fileName}`;
  }
}

// Export singleton instance
export const githubGistService = new GitHubGistService();
