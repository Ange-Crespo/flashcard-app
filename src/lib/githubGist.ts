/**
 * GitHub Gist API service for managing flashcards
 */

import type {
  GistFlashcard,
  GistResponse,
  GistError,
  GistFlashcardFace,
} from '../types/gist';
import {
  gistDebugLogger,
  formatGistError,
  createErrorContext,
  safeStringify,
} from './gistDebug';

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
  gistDebugLogger.log(
    'parse_identifier',
    "Début de l'analyse de l'identifiant",
    {
      identifier: identifier ? `${identifier.substring(0, 50)}...` : 'null',
    }
  );

  if (!identifier) {
    gistDebugLogger.warn('parse_identifier', 'Identifiant vide ou null');
    return { id: '' };
  }

  const trimmed = identifier.trim();
  if (!trimmed) {
    gistDebugLogger.warn('parse_identifier', 'Identifiant vide après trim');
    return { id: '' };
  }

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length >= 2) {
      const result = { owner: segments[0], id: segments[1] };
      gistDebugLogger.success(
        'parse_identifier',
        'Identifiant parsé depuis URL',
        {
          owner: result.owner,
          id: result.id,
          segments: segments.length,
        }
      );
      return result;
    }
    if (segments.length === 1) {
      const result = { id: segments[0] };
      gistDebugLogger.success(
        'parse_identifier',
        'ID extrait depuis URL (sans owner)',
        {
          id: result.id,
        }
      );
      return result;
    }
    gistDebugLogger.warn(
      'parse_identifier',
      'URL valide mais segments insuffisants',
      {
        segments: segments.length,
      }
    );
  } catch (error) {
    gistDebugLogger.warn(
      'parse_identifier',
      'Pas une URL valide, tentative de parsing manuel',
      {
        error: error instanceof Error ? error.message : String(error),
      }
    );
  }

  const sanitized = trimmed.replaceAll(/(^\/+|\/+$)/g, '');
  const parts = sanitized.split('/').filter(Boolean);
  if (parts.length >= 2) {
    const owner = parts.at(-2);
    const id = parts.at(-1);
    if (owner && id) {
      const result = { owner, id };
      gistDebugLogger.success(
        'parse_identifier',
        'Identifiant parsé manuellement',
        result
      );
      return result;
    }
  }

  const result = { id: sanitized };
  gistDebugLogger.log(
    'parse_identifier',
    'Identifiant traité comme ID simple',
    {
      id: result.id,
    }
  );
  return result;
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
    gistDebugLogger.log('init', 'Configuration du Gist ID', {
      gistId: gistId ? `${gistId.substring(0, 20)}...` : 'null',
      owner: owner ? `${owner.substring(0, 20)}...` : 'undefined',
    });

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

    if (shouldReset) {
      gistDebugLogger.warn('init', 'Gist ID réinitialisé (ID vide)');
    } else {
      gistDebugLogger.success('init', 'Gist ID configuré avec succès', {
        id: this.gistId,
        owner: this.gistOwner,
      });
    }
  }

  /**
   * Create a new Gist with flashcards
   */
  async createFlashcardGist(
    flashcards: GistFlashcard[],
    githubToken: string,
    description: string = 'Flashcard Learning App - Flashcards'
  ): Promise<{ success: boolean; gistUrl?: string; error?: string }> {
    gistDebugLogger.log('create_gist', 'Début de la création du Gist', {
      flashcardsCount: flashcards.length,
      description,
      hasToken: !!githubToken,
      tokenLength: githubToken.length,
    });

    try {
      // Validate token
      if (!githubToken || !githubToken.trim()) {
        const errorMsg = 'Token GitHub manquant ou vide';
        gistDebugLogger.error('validate_token', errorMsg, new Error(errorMsg), {
          step: 'create_gist',
        });
        return {
          success: false,
          error: formatGistError('validate_token', errorMsg),
        };
      }

      if (
        !githubToken.startsWith('ghp_') &&
        !githubToken.startsWith('github_pat_')
      ) {
        gistDebugLogger.warn('validate_token', 'Format de token suspect', {
          tokenPrefix: githubToken.substring(0, 10),
        });
      }

      // Validate flashcards
      if (!flashcards || flashcards.length === 0) {
        const errorMsg = 'Aucune flashcard fournie';
        gistDebugLogger.error('validate_input', errorMsg, new Error(errorMsg));
        return {
          success: false,
          error: formatGistError('validate_input', errorMsg),
        };
      }

      gistDebugLogger.log('create_gist', 'Préparation des données du Gist', {
        flashcardsCount: flashcards.length,
        description,
      });

      const gistData = {
        description,
        public: true,
        files: {
          'flashcards.json': {
            content: JSON.stringify(flashcards, null, 2),
          },
        },
      };

      gistDebugLogger.log(
        'fetch_api',
        "Envoi de la requête POST à l'API GitHub",
        {
          url: this.baseUrl,
          filesCount: Object.keys(gistData.files).length,
        }
      );

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

      gistDebugLogger.log('parse_response', "Réponse reçue de l'API GitHub", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        let errorData: GistError;
        try {
          errorData = await response.json();
        } catch (parseError) {
          const errorMsg = `Erreur HTTP ${response.status}: ${response.statusText}`;
          gistDebugLogger.error(
            'parse_response',
            "Impossible de parser la réponse d'erreur",
            parseError,
            {
              status: response.status,
              statusText: response.statusText,
            }
          );
          return {
            success: false,
            error: formatGistError('parse_response', errorMsg, {
              statusCode: response.status,
            }),
          };
        }

        const errorMsg =
          errorData.message || 'Erreur lors de la création du Gist';
        gistDebugLogger.error('create_gist', errorMsg, new Error(errorMsg), {
          status: response.status,
          githubError: errorData,
        });
        return {
          success: false,
          error: formatGistError('create_gist', errorMsg, {
            statusCode: response.status,
          }),
        };
      }

      let result: GistResponse;
      try {
        result = await response.json();
        gistDebugLogger.log(
          'parse_response',
          'Réponse JSON parsée avec succès',
          {
            gistId: result.id,
            owner: result.owner?.login,
            filesCount: result.files ? Object.keys(result.files).length : 0,
          }
        );
      } catch (parseError) {
        const errorMsg = 'Impossible de parser la réponse JSON';
        gistDebugLogger.error('parse_response', errorMsg, parseError);
        return {
          success: false,
          error: formatGistError('parse_response', errorMsg),
        };
      }

      const parsedUrl = parseGistIdentifier(result.html_url);
      this.gistId = result.id ?? parsedUrl.id ?? this.gistId;
      this.gistOwner = result.owner?.login ?? parsedUrl.owner ?? this.gistOwner;
      this.gistReference = result.html_url ?? this.gistReference;

      gistDebugLogger.success('create_gist', 'Gist créé avec succès', {
        gistId: this.gistId,
        owner: this.gistOwner,
        gistUrl: result.html_url,
      });

      return {
        success: true,
        gistUrl: result.html_url,
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Erreur inconnue';
      gistDebugLogger.error(
        'create_gist',
        'Erreur lors de la création du Gist',
        error,
        {
          flashcardsCount: flashcards.length,
        }
      );
      return {
        success: false,
        error: formatGistError('create_gist', errorMsg),
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
    gistDebugLogger.log('update_gist', 'Début de la mise à jour du Gist', {
      gistId: this.gistId,
      owner: this.gistOwner,
      flashcardsCount: flashcards.length,
      hasToken: !!githubToken,
    });

    if (!this.gistId) {
      const errorMsg = 'Aucun Gist ID configuré';
      gistDebugLogger.error('validate_input', errorMsg, new Error(errorMsg));
      return {
        success: false,
        error: formatGistError('validate_input', errorMsg),
      };
    }

    try {
      // Validate token
      if (!githubToken || !githubToken.trim()) {
        const errorMsg = 'Token GitHub manquant ou vide';
        gistDebugLogger.error('validate_token', errorMsg, new Error(errorMsg));
        return {
          success: false,
          error: formatGistError('validate_token', errorMsg),
        };
      }

      // Validate flashcards
      if (!flashcards || flashcards.length === 0) {
        const errorMsg = 'Aucune flashcard fournie';
        gistDebugLogger.error('validate_input', errorMsg, new Error(errorMsg));
        return {
          success: false,
          error: formatGistError('validate_input', errorMsg),
        };
      }

      const gistData = {
        files: {
          'flashcards.json': {
            content: JSON.stringify(flashcards, null, 2),
          },
        },
      };

      const url = `${this.baseUrl}/${this.gistId}`;
      gistDebugLogger.log(
        'fetch_api',
        "Envoi de la requête PATCH à l'API GitHub",
        {
          url,
          gistId: this.gistId,
        }
      );

      const response = await fetch(url, {
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

      gistDebugLogger.log('parse_response', "Réponse reçue de l'API GitHub", {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
      });

      if (!response.ok) {
        let errorData: GistError;
        try {
          errorData = await response.json();
        } catch (parseError) {
          const errorMsg = `Erreur HTTP ${response.status}: ${response.statusText}`;
          gistDebugLogger.error(
            'parse_response',
            "Impossible de parser la réponse d'erreur",
            parseError,
            { status: response.status }
          );
          return {
            success: false,
            error: formatGistError('update_gist', errorMsg, {
              statusCode: response.status,
            }),
          };
        }

        const errorMsg =
          errorData.message || 'Erreur lors de la mise à jour du Gist';
        gistDebugLogger.error('update_gist', errorMsg, new Error(errorMsg), {
          status: response.status,
          githubError: errorData,
        });
        return {
          success: false,
          error: formatGistError('update_gist', errorMsg, {
            statusCode: response.status,
          }),
        };
      }

      let result: GistResponse;
      try {
        result = await response.json();
        gistDebugLogger.log(
          'parse_response',
          'Réponse JSON parsée avec succès',
          {
            gistId: result.id,
            owner: result.owner?.login,
          }
        );
      } catch (parseError) {
        const errorMsg = 'Impossible de parser la réponse JSON';
        gistDebugLogger.error('parse_response', errorMsg, parseError);
        return {
          success: false,
          error: formatGistError('parse_response', errorMsg),
        };
      }

      if (result.owner?.login) {
        this.gistOwner = result.owner.login;
        gistDebugLogger.log('update_gist', 'Owner mis à jour', {
          owner: this.gistOwner,
        });
      }

      gistDebugLogger.success('update_gist', 'Gist mis à jour avec succès', {
        gistId: this.gistId,
        owner: this.gistOwner,
        gistUrl: result.html_url,
      });

      return {
        success: true,
        gistUrl: result.html_url,
      };
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : 'Erreur inconnue';
      gistDebugLogger.error(
        'update_gist',
        'Erreur lors de la mise à jour du Gist',
        error,
        {
          gistId: this.gistId,
        }
      );
      return {
        success: false,
        error: formatGistError('update_gist', errorMsg),
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
    gistDebugLogger.log(
      'init',
      'Début de la lecture des flashcards depuis Gist',
      {
        gistId: gistId ? `${gistId.substring(0, 20)}...` : 'null',
        hasRawUrl: !!rawUrl,
        rawUrl: rawUrl ? `${rawUrl.substring(0, 50)}...` : undefined,
        owner: this.gistOwner,
      }
    );

    // Validate input
    if (!gistId || !gistId.trim()) {
      const errorMsg = 'Gist ID manquant ou vide';
      gistDebugLogger.error('validate_input', errorMsg, new Error(errorMsg));
      return {
        success: false,
        error: formatGistError('validate_input', errorMsg),
      };
    }

    const parsed = parseGistIdentifier(gistId);
    const resolvedId = parsed.id || gistId;
    const resolvedOwner = parsed.owner ?? this.gistOwner;

    gistDebugLogger.log('parse_identifier', 'Identifiant résolu', {
      originalId: gistId.substring(0, 20),
      resolvedId,
      resolvedOwner,
    });

    try {
      // If rawUrl is provided, use it directly (from deck descriptor)
      if (rawUrl) {
        gistDebugLogger.log(
          'fetch_raw_url',
          'Tentative de récupération via URL directe',
          {
            rawUrl: rawUrl.substring(0, 100),
          }
        );
        try {
          gistDebugLogger.log(
            'fetch_raw_url',
            "Envoi de la requête fetch vers l'URL directe"
          );
          const rawResponse = await fetch(rawUrl, {
            mode: 'cors',
            credentials: 'omit',
          });

          gistDebugLogger.log(
            'parse_response',
            "Réponse reçue de l'URL directe",
            {
              status: rawResponse.status,
              statusText: rawResponse.statusText,
              ok: rawResponse.ok,
              contentType: rawResponse.headers.get('content-type'),
            }
          );

          if (!rawResponse.ok) {
            const errorMsg = `Erreur lors de la lecture du fichier (${rawResponse.status}): ${rawResponse.statusText}`;
            gistDebugLogger.error(
              'fetch_raw_url',
              errorMsg,
              new Error(errorMsg),
              {
                status: rawResponse.status,
                statusText: rawResponse.statusText,
              }
            );
            return {
              success: false,
              error: formatGistError('fetch_raw_url', errorMsg, {
                statusCode: rawResponse.status,
              }),
            };
          }

          const rawContentType = rawResponse.headers.get('content-type');
          gistDebugLogger.log(
            'validate_flashcards',
            'Vérification du type de contenu',
            {
              contentType: rawContentType,
            }
          );

          // Warn if content-type is not JSON, but try to parse anyway
          if (!rawContentType || !rawContentType.includes('application/json')) {
            gistDebugLogger.warn(
              'validate_flashcards',
              'Content-type non-JSON détecté, tentative de parsing quand même',
              {
                contentType: rawContentType || 'unknown',
                note: 'Le fichier pourrait être du JSON valide malgré le content-type incorrect',
              }
            );
          }

          gistDebugLogger.log('parse_json', 'Lecture du contenu du fichier');
          const flashcardsContent = await rawResponse.text();
          gistDebugLogger.log('parse_json', 'Contenu lu', {
            contentLength: flashcardsContent.length,
            preview: flashcardsContent.substring(0, 200),
          });

          try {
            gistDebugLogger.log('parse_json', 'Début du parsing JSON');
            const parsed = JSON.parse(flashcardsContent);
            gistDebugLogger.success('parse_json', 'JSON parsé avec succès', {
              isArray: Array.isArray(parsed),
              length: Array.isArray(parsed) ? parsed.length : 'N/A',
            });

            // Check if it's in Mandarin format and convert
            gistDebugLogger.log(
              'validate_flashcards',
              'Vérification du format des données'
            );
            if (isMandarinFormat(parsed)) {
              gistDebugLogger.log(
                'convert_format',
                'Format Mandarin détecté, conversion en cours',
                {
                  entriesCount: parsed.length,
                }
              );
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

              gistDebugLogger.log('convert_format', 'Conversion terminée', {
                originalCount: parsed.length,
                convertedCount: flashcards.length,
              });

              if (flashcards.length > 0) {
                gistDebugLogger.success(
                  'complete',
                  'Flashcards chargées avec succès depuis URL directe',
                  {
                    flashcardsCount: flashcards.length,
                    source: 'raw_url',
                  }
                );
                return {
                  success: true,
                  flashcards,
                };
              } else {
                const errorMsg =
                  'Aucune flashcard valide après conversion du format Mandarin';
                gistDebugLogger.error(
                  'validate_flashcards',
                  errorMsg,
                  new Error(errorMsg),
                  {
                    originalCount: parsed.length,
                  }
                );
                return {
                  success: false,
                  error: formatGistError('validate_flashcards', errorMsg),
                };
              }
            }

            // Otherwise, treat as standard GistFlashcard format
            if (Array.isArray(parsed)) {
              gistDebugLogger.log(
                'validate_flashcards',
                'Format standard détecté, validation en cours',
                {
                  arrayLength: parsed.length,
                }
              );
              const flashcards = parsed as GistFlashcard[];
              if (
                flashcards.length > 0 &&
                flashcards[0].id &&
                flashcards[0].front
              ) {
                gistDebugLogger.success(
                  'complete',
                  'Flashcards chargées avec succès depuis URL directe',
                  {
                    flashcardsCount: flashcards.length,
                    source: 'raw_url',
                    format: 'standard',
                  }
                );
                return {
                  success: true,
                  flashcards,
                };
              }
              const errorMsg =
                'Le fichier ne contient pas de flashcards valides (structure invalide)';
              gistDebugLogger.error(
                'validate_flashcards',
                errorMsg,
                new Error(errorMsg),
                {
                  arrayLength: flashcards.length,
                  firstCardHasId:
                    flashcards.length > 0 ? !!flashcards[0].id : false,
                  firstCardHasFront:
                    flashcards.length > 0 ? !!flashcards[0].front : false,
                }
              );
              return {
                success: false,
                error: formatGistError('validate_flashcards', errorMsg),
              };
            }

            const errorMsg =
              'Le fichier doit contenir un tableau de flashcards';
            gistDebugLogger.error(
              'validate_flashcards',
              errorMsg,
              new Error(errorMsg),
              {
                dataType: typeof parsed,
                isArray: Array.isArray(parsed),
              }
            );
            return {
              success: false,
              error: formatGistError('validate_flashcards', errorMsg),
            };
          } catch (parseError) {
            const errorMsg = `Impossible de parser le fichier: ${parseError instanceof Error ? parseError.message : 'Erreur de parsing'}`;
            gistDebugLogger.error('parse_json', errorMsg, parseError, {
              contentLength: flashcardsContent.length,
              contentPreview: flashcardsContent.substring(0, 500),
            });
            return {
              success: false,
              error: formatGistError('parse_json', errorMsg),
            };
          }
        } catch (fetchError) {
          const errorMsg = `Impossible d'accéder au fichier: ${fetchError instanceof Error ? fetchError.message : 'Erreur de connexion'}`;
          gistDebugLogger.error('fetch_raw_url', errorMsg, fetchError, {
            rawUrl: rawUrl.substring(0, 100),
          });
          return {
            success: false,
            error: formatGistError('fetch_raw_url', errorMsg),
          };
        }
      }

      // Otherwise, try the API approach to find the file
      const apiUrl = `${this.baseUrl}/${resolvedId}`;
      gistDebugLogger.log(
        'fetch_api',
        'Tentative de récupération via API GitHub',
        {
          url: apiUrl,
          gistId: resolvedId,
          owner: resolvedOwner,
        }
      );

      const apiResponse = await fetch(apiUrl, {
        mode: 'cors',
        credentials: 'omit',
        headers: {
          Accept: 'application/vnd.github.v3+json',
        },
      });

      gistDebugLogger.log('parse_response', "Réponse reçue de l'API GitHub", {
        status: apiResponse.status,
        statusText: apiResponse.statusText,
        ok: apiResponse.ok,
        contentType: apiResponse.headers.get('content-type'),
      });

      if (apiResponse.ok) {
        // Check content-type before parsing
        const contentType = apiResponse.headers.get('content-type');
        gistDebugLogger.log(
          'parse_response',
          'Vérification du type de contenu',
          {
            contentType,
          }
        );

        if (!contentType || !contentType.includes('application/json')) {
          const errorMsg =
            'Réponse invalide du serveur GitHub (type de contenu incorrect)';
          gistDebugLogger.error(
            'parse_response',
            errorMsg,
            new Error(errorMsg),
            {
              contentType: contentType || 'unknown',
            }
          );
          return {
            success: false,
            error: formatGistError('parse_response', errorMsg, {
              contentType: contentType || 'unknown',
            }),
          };
        }

        let result: GistResponse;
        try {
          gistDebugLogger.log(
            'parse_json',
            'Début du parsing de la réponse JSON'
          );
          result = await apiResponse.json();
          gistDebugLogger.success(
            'parse_json',
            'Réponse JSON parsée avec succès',
            {
              gistId: result.id,
              owner: result.owner?.login,
              filesCount: result.files ? Object.keys(result.files).length : 0,
              fileNames: result.files ? Object.keys(result.files) : [],
            }
          );
        } catch (parseError) {
          const errorMsg = 'Impossible de parser la réponse du serveur GitHub';
          gistDebugLogger.error('parse_json', errorMsg, parseError, {
            status: apiResponse.status,
            contentType,
          });
          return {
            success: false,
            error: formatGistError('parse_json', errorMsg),
          };
        }

        // First try the standard filename
        gistDebugLogger.log(
          'find_file',
          'Recherche du fichier flashcards.json'
        );
        let flashcardsFile = result.files?.['flashcards.json'];
        let flashcardsContent = flashcardsFile?.content;
        let fileName = 'flashcards.json';

        if (flashcardsFile) {
          gistDebugLogger.success(
            'find_file',
            'Fichier flashcards.json trouvé',
            {
              fileName: 'flashcards.json',
              hasContent: !!flashcardsContent,
              contentLength: flashcardsContent?.length || 0,
            }
          );
        } else {
          gistDebugLogger.warn(
            'find_file',
            "Fichier flashcards.json non trouvé, recherche d'autres fichiers JSON"
          );
        }

        // If flashcards.json not found, look for any .json file
        if (!flashcardsFile && result.files) {
          const jsonFiles = Object.keys(result.files).filter(name =>
            name.endsWith('.json')
          );

          gistDebugLogger.log('find_file', 'Fichiers JSON disponibles', {
            jsonFiles,
            count: jsonFiles.length,
          });

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

            gistDebugLogger.log('find_file', 'Fichier sélectionné', {
              fileName,
              isPreferred: !!preferredFile,
              hasContent: !!flashcardsContent,
              contentLength: flashcardsContent?.length || 0,
            });
          } else {
            gistDebugLogger.error(
              'find_file',
              'Aucun fichier JSON trouvé dans le Gist',
              new Error('No JSON files'),
              {
                allFiles: Object.keys(result.files || {}),
              }
            );
          }
        }

        if (flashcardsContent) {
          try {
            gistDebugLogger.log(
              'parse_json',
              'Début du parsing du contenu du fichier',
              {
                fileName,
                contentLength: flashcardsContent.length,
                preview: flashcardsContent.substring(0, 200),
              }
            );
            const parsed = JSON.parse(flashcardsContent);
            gistDebugLogger.success(
              'parse_json',
              'Contenu JSON parsé avec succès',
              {
                fileName,
                isArray: Array.isArray(parsed),
                length: Array.isArray(parsed) ? parsed.length : 'N/A',
              }
            );

            // Check if it's in Mandarin format and convert
            if (isMandarinFormat(parsed)) {
              gistDebugLogger.log(
                'convert_format',
                'Format Mandarin détecté, conversion en cours',
                {
                  fileName,
                  entriesCount: parsed.length,
                }
              );
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

              gistDebugLogger.log('convert_format', 'Conversion terminée', {
                fileName,
                originalCount: parsed.length,
                convertedCount: flashcards.length,
              });

              if (flashcards.length > 0) {
                gistDebugLogger.success(
                  'complete',
                  'Flashcards chargées avec succès depuis API',
                  {
                    flashcardsCount: flashcards.length,
                    source: 'api',
                    fileName,
                    format: 'mandarin',
                  }
                );
                return {
                  success: true,
                  flashcards,
                };
              } else {
                const errorMsg = `Aucune flashcard valide après conversion du format Mandarin dans ${fileName}`;
                gistDebugLogger.error(
                  'validate_flashcards',
                  errorMsg,
                  new Error(errorMsg),
                  {
                    fileName,
                    originalCount: parsed.length,
                  }
                );
                return {
                  success: false,
                  error: formatGistError('validate_flashcards', errorMsg, {
                    fileName,
                  }),
                };
              }
            }

            // Otherwise, treat as standard GistFlashcard format
            if (Array.isArray(parsed)) {
              gistDebugLogger.log(
                'validate_flashcards',
                'Format standard détecté, validation en cours',
                {
                  fileName,
                  arrayLength: parsed.length,
                }
              );
              const flashcards = parsed as GistFlashcard[];
              if (
                flashcards.length > 0 &&
                flashcards[0].id &&
                flashcards[0].front
              ) {
                gistDebugLogger.success(
                  'complete',
                  'Flashcards chargées avec succès depuis API',
                  {
                    flashcardsCount: flashcards.length,
                    source: 'api',
                    fileName,
                    format: 'standard',
                  }
                );
                return {
                  success: true,
                  flashcards,
                };
              } else {
                const errorMsg = `Le fichier ${fileName} ne contient pas de flashcards valides (structure invalide)`;
                gistDebugLogger.error(
                  'validate_flashcards',
                  errorMsg,
                  new Error(errorMsg),
                  {
                    fileName,
                    arrayLength: flashcards.length,
                    firstCardHasId:
                      flashcards.length > 0 ? !!flashcards[0].id : false,
                    firstCardHasFront:
                      flashcards.length > 0 ? !!flashcards[0].front : false,
                  }
                );
                return {
                  success: false,
                  error: formatGistError('validate_flashcards', errorMsg, {
                    fileName,
                  }),
                };
              }
            }

            const errorMsg = `Le fichier ${fileName} doit contenir un tableau de flashcards`;
            gistDebugLogger.error(
              'validate_flashcards',
              errorMsg,
              new Error(errorMsg),
              {
                fileName,
                dataType: typeof parsed,
                isArray: Array.isArray(parsed),
              }
            );
            return {
              success: false,
              error: formatGistError('validate_flashcards', errorMsg, {
                fileName,
              }),
            };
          } catch (parseError) {
            const errorMsg = `Le contenu du fichier ${fileName} est invalide: ${parseError instanceof Error ? parseError.message : 'Erreur de parsing'}`;
            gistDebugLogger.error('parse_json', errorMsg, parseError, {
              fileName,
              contentLength: flashcardsContent.length,
              contentPreview: flashcardsContent.substring(0, 500),
            });
            return {
              success: false,
              error: formatGistError('parse_json', errorMsg, { fileName }),
            };
          }
        }

        // Try raw URL if available
        if (flashcardsFile?.raw_url) {
          gistDebugLogger.log(
            'fetch_raw_url',
            'Tentative de récupération via raw_url du fichier',
            {
              rawUrl: flashcardsFile.raw_url.substring(0, 100),
              fileName,
            }
          );
          try {
            const rawResponse = await fetch(flashcardsFile.raw_url, {
              mode: 'cors',
              credentials: 'omit',
            });

            gistDebugLogger.log('parse_response', 'Réponse reçue du raw_url', {
              status: rawResponse.status,
              statusText: rawResponse.statusText,
              ok: rawResponse.ok,
              contentType: rawResponse.headers.get('content-type'),
            });

            if (rawResponse.ok) {
              const rawContentType = rawResponse.headers.get('content-type');

              // Warn if content-type is not JSON, but try to parse anyway
              if (
                !rawContentType ||
                !rawContentType.includes('application/json')
              ) {
                gistDebugLogger.warn(
                  'validate_flashcards',
                  'Content-type non-JSON détecté depuis raw_url, tentative de parsing quand même',
                  {
                    fileName,
                    contentType: rawContentType || 'unknown',
                    note: 'Le fichier pourrait être du JSON valide malgré le content-type incorrect',
                  }
                );
              }

              try {
                gistDebugLogger.log(
                  'parse_json',
                  'Parsing du contenu depuis raw_url'
                );
                const flashcardsContent = await rawResponse.text();
                const flashcards = JSON.parse(
                  flashcardsContent
                ) as GistFlashcard[];

                if (Array.isArray(flashcards)) {
                  gistDebugLogger.success(
                    'complete',
                    'Flashcards chargées avec succès depuis raw_url',
                    {
                      flashcardsCount: flashcards.length,
                      source: 'raw_url_fallback',
                      fileName,
                    }
                  );
                  return {
                    success: true,
                    flashcards,
                  };
                } else {
                  gistDebugLogger.error(
                    'validate_flashcards',
                    'Les données du raw_url ne sont pas un tableau',
                    new Error('Not an array'),
                    {
                      fileName,
                      dataType: typeof flashcards,
                    }
                  );
                }
              } catch (parseError) {
                const errorMsg = `Impossible de parser le fichier depuis raw_url: ${parseError instanceof Error ? parseError.message : 'Erreur de parsing'}`;
                gistDebugLogger.error('parse_json', errorMsg, parseError, {
                  fileName,
                  contentType: rawContentType,
                });
              }
            } else {
              gistDebugLogger.warn(
                'fetch_raw_url',
                'Échec de la récupération depuis raw_url',
                {
                  status: rawResponse.status,
                  statusText: rawResponse.statusText,
                  fileName,
                }
              );
            }
          } catch (fetchError) {
            gistDebugLogger.error(
              'fetch_raw_url',
              'Erreur lors de la récupération depuis raw_url',
              fetchError,
              {
                fileName,
                rawUrl: flashcardsFile.raw_url.substring(0, 100),
              }
            );
            // Continue to return error below
          }
        }

        const errorMsg = `Aucun fichier JSON valide trouvé dans le Gist (cherché: flashcards.json ou tout fichier .json)`;
        gistDebugLogger.error('find_file', errorMsg, new Error(errorMsg), {
          gistId: resolvedId,
          availableFiles: result.files ? Object.keys(result.files) : [],
        });
        return {
          success: false,
          error: formatGistError('find_file', errorMsg, {
            gistId: resolvedId,
            availableFiles: result.files
              ? Object.keys(result.files).join(', ')
              : 'none',
          }),
        };
      } else {
        // Handle API errors - check content-type before parsing
        gistDebugLogger.warn('fetch_api', 'Erreur API GitHub', {
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          gistId: resolvedId,
        });

        const contentType = apiResponse.headers.get('content-type');
        let errorData: Record<string, unknown> = {};
        let errorMessage = `Erreur ${apiResponse.status}: ${apiResponse.statusText}`;

        if (contentType && contentType.includes('application/json')) {
          try {
            gistDebugLogger.log(
              'parse_response',
              "Tentative de parsing de la réponse d'erreur JSON"
            );
            errorData = await apiResponse.json();
            if (errorData.message && typeof errorData.message === 'string') {
              errorMessage = errorData.message;
              gistDebugLogger.log(
                'parse_response',
                "Message d'erreur extrait",
                {
                  message: errorMessage,
                }
              );
            }
          } catch (parseError) {
            gistDebugLogger.warn(
              'parse_response',
              "Impossible de parser la réponse d'erreur JSON",
              {
                error:
                  parseError instanceof Error
                    ? parseError.message
                    : String(parseError),
              }
            );
            // If JSON parsing fails, use default error message
          }
        }

        // Only try raw content URL for 404 errors (Gist not found)
        if (apiResponse.status === 404) {
          gistDebugLogger.log(
            'fetch_raw_url',
            'Erreur 404 détectée, tentative de récupération via raw URL',
            {
              gistId: resolvedId,
              owner: resolvedOwner,
            }
          );
          const rawUrl = this.buildRawFileUrl(gistId, 'flashcards.json');
          gistDebugLogger.log('build_url', "Construction de l'URL raw", {
            rawUrl: rawUrl || 'null',
            gistId: resolvedId,
            owner: resolvedOwner,
          });

          if (rawUrl) {
            try {
              gistDebugLogger.log(
                'fetch_raw_url',
                'Envoi de la requête vers raw URL (fallback 404)'
              );
              const rawResponse = await fetch(rawUrl, {
                mode: 'cors',
                credentials: 'omit',
              });

              gistDebugLogger.log(
                'parse_response',
                'Réponse reçue du raw URL (fallback)',
                {
                  status: rawResponse.status,
                  statusText: rawResponse.statusText,
                  ok: rawResponse.ok,
                  contentType: rawResponse.headers.get('content-type'),
                }
              );

              if (!rawResponse.ok) {
                if (rawResponse.status === 404) {
                  const errorMsg =
                    'Aucun fichier flashcards.json trouvé dans le Gist';
                  gistDebugLogger.error(
                    'fetch_raw_url',
                    errorMsg,
                    new Error(errorMsg),
                    {
                      status: rawResponse.status,
                      rawUrl: rawUrl.substring(0, 100),
                    }
                  );
                  return {
                    success: false,
                    error: formatGistError('fetch_raw_url', errorMsg, {
                      statusCode: rawResponse.status,
                    }),
                  };
                }
                const errorMsg = `Erreur lors de la lecture du Gist (${rawResponse.status}): ${rawResponse.statusText}`;
                gistDebugLogger.error(
                  'fetch_raw_url',
                  errorMsg,
                  new Error(errorMsg),
                  {
                    status: rawResponse.status,
                    statusText: rawResponse.statusText,
                    rawUrl: rawUrl.substring(0, 100),
                  }
                );
                return {
                  success: false,
                  error: formatGistError('fetch_raw_url', errorMsg, {
                    statusCode: rawResponse.status,
                  }),
                };
              }

              const rawContentType = rawResponse.headers.get('content-type');
              gistDebugLogger.log(
                'validate_flashcards',
                'Vérification du type de contenu (fallback)',
                {
                  contentType: rawContentType,
                }
              );

              // Warn if content-type is not JSON, but try to parse anyway
              if (
                !rawContentType ||
                !rawContentType.includes('application/json')
              ) {
                gistDebugLogger.warn(
                  'validate_flashcards',
                  'Content-type non-JSON détecté (fallback), tentative de parsing quand même',
                  {
                    contentType: rawContentType || 'unknown',
                    note: 'Le fichier pourrait être du JSON valide malgré le content-type incorrect',
                  }
                );
              }

              gistDebugLogger.log(
                'parse_json',
                'Lecture du contenu depuis raw URL (fallback)'
              );
              const flashcardsContent = await rawResponse.text();
              gistDebugLogger.log('parse_json', 'Contenu lu (fallback)', {
                contentLength: flashcardsContent.length,
                preview: flashcardsContent.substring(0, 200),
              });

              try {
                gistDebugLogger.log(
                  'parse_json',
                  'Début du parsing JSON (fallback)'
                );
                const parsed = JSON.parse(flashcardsContent);
                gistDebugLogger.success(
                  'parse_json',
                  'JSON parsé avec succès (fallback)',
                  {
                    isArray: Array.isArray(parsed),
                    length: Array.isArray(parsed) ? parsed.length : 'N/A',
                  }
                );

                // Check if it's in Mandarin format and convert
                if (isMandarinFormat(parsed)) {
                  gistDebugLogger.log(
                    'convert_format',
                    'Format Mandarin détecté (fallback), conversion en cours',
                    {
                      entriesCount: parsed.length,
                    }
                  );
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

                  gistDebugLogger.log(
                    'convert_format',
                    'Conversion terminée (fallback)',
                    {
                      originalCount: parsed.length,
                      convertedCount: flashcards.length,
                    }
                  );

                  if (flashcards.length > 0) {
                    gistDebugLogger.success(
                      'complete',
                      'Flashcards chargées avec succès depuis raw URL (fallback 404)',
                      {
                        flashcardsCount: flashcards.length,
                        source: 'raw_url_404_fallback',
                        format: 'mandarin',
                      }
                    );
                    return {
                      success: true,
                      flashcards,
                    };
                  } else {
                    const errorMsg =
                      'Aucune flashcard valide après conversion du format Mandarin (fallback)';
                    gistDebugLogger.error(
                      'validate_flashcards',
                      errorMsg,
                      new Error(errorMsg),
                      {
                        originalCount: parsed.length,
                      }
                    );
                    return {
                      success: false,
                      error: formatGistError('validate_flashcards', errorMsg),
                    };
                  }
                }

                // Otherwise, treat as standard GistFlashcard format
                if (Array.isArray(parsed)) {
                  gistDebugLogger.log(
                    'validate_flashcards',
                    'Format standard détecté (fallback), validation en cours',
                    {
                      arrayLength: parsed.length,
                    }
                  );
                  const flashcards = parsed as GistFlashcard[];
                  if (
                    flashcards.length > 0 &&
                    flashcards[0].id &&
                    flashcards[0].front
                  ) {
                    gistDebugLogger.success(
                      'complete',
                      'Flashcards chargées avec succès depuis raw URL (fallback 404)',
                      {
                        flashcardsCount: flashcards.length,
                        source: 'raw_url_404_fallback',
                        format: 'standard',
                      }
                    );
                    return {
                      success: true,
                      flashcards,
                    };
                  }
                  const errorMsg =
                    'Le fichier doit contenir un tableau de flashcards valides';
                  gistDebugLogger.error(
                    'validate_flashcards',
                    errorMsg,
                    new Error(errorMsg),
                    {
                      arrayLength: flashcards.length,
                      firstCardHasId:
                        flashcards.length > 0 ? !!flashcards[0].id : false,
                      firstCardHasFront:
                        flashcards.length > 0 ? !!flashcards[0].front : false,
                    }
                  );
                  return {
                    success: false,
                    error: formatGistError('validate_flashcards', errorMsg),
                  };
                }

                const errorMsg =
                  'Le fichier doit contenir un tableau de flashcards';
                gistDebugLogger.error(
                  'validate_flashcards',
                  errorMsg,
                  new Error(errorMsg),
                  {
                    dataType: typeof parsed,
                    isArray: Array.isArray(parsed),
                  }
                );
                return {
                  success: false,
                  error: formatGistError('validate_flashcards', errorMsg),
                };
              } catch (parseError) {
                const errorMsg = `Impossible de parser le fichier: ${parseError instanceof Error ? parseError.message : 'Erreur de parsing'}`;
                gistDebugLogger.error('parse_json', errorMsg, parseError, {
                  contentLength: flashcardsContent.length,
                  contentPreview: flashcardsContent.substring(0, 500),
                });
                return {
                  success: false,
                  error: formatGistError('parse_json', errorMsg),
                };
              }
            } catch (fetchError) {
              const errorMsg =
                "Impossible d'accéder au fichier flashcards.json";
              gistDebugLogger.error('fetch_raw_url', errorMsg, fetchError, {
                rawUrl: rawUrl.substring(0, 100),
              });
              return {
                success: false,
                error: formatGistError('fetch_raw_url', errorMsg),
              };
            }
          } else {
            gistDebugLogger.warn(
              'build_url',
              "Impossible de construire l'URL raw (owner ou ID manquant)",
              {
                gistId: resolvedId,
                owner: resolvedOwner,
              }
            );
          }
        }

        // For other API errors, return the error message directly
        const finalErrorMsg = formatGistError('fetch_api', errorMessage, {
          statusCode: apiResponse.status,
          gistId: resolvedId,
        });
        gistDebugLogger.error(
          'fetch_api',
          finalErrorMsg,
          new Error(errorMessage),
          {
            status: apiResponse.status,
            statusText: apiResponse.statusText,
            gistId: resolvedId,
            owner: resolvedOwner,
            errorData: safeStringify(errorData, 500),
          }
        );
        return {
          success: false,
          error: finalErrorMsg,
        };
      }
    } catch (error) {
      // Handle network errors and other exceptions
      const errorContext = createErrorContext('error', {
        gistId: resolvedId,
        owner: resolvedOwner,
        hasRawUrl: !!rawUrl,
      });

      if (error instanceof TypeError) {
        if (
          error.message.includes('fetch') ||
          error.message.includes('Failed to fetch')
        ) {
          const errorMsg =
            'Erreur de connexion. Vérifiez votre connexion internet ou les paramètres CORS.';
          gistDebugLogger.error('error', errorMsg, error, errorContext);
          return {
            success: false,
            error: formatGistError('error', errorMsg, errorContext),
          };
        }
        if (error.message.includes('CORS')) {
          const errorMsg =
            'Erreur CORS. Le serveur GitHub peut bloquer les requêtes depuis ce domaine.';
          gistDebugLogger.error('error', errorMsg, error, errorContext);
          return {
            success: false,
            error: formatGistError('error', errorMsg, errorContext),
          };
        }
      }

      const errorMsg =
        error instanceof Error ? error.message : 'Erreur inconnue';
      gistDebugLogger.error(
        'error',
        'Erreur inattendue lors de la lecture des flashcards',
        error,
        errorContext
      );
      return {
        success: false,
        error: formatGistError('error', errorMsg, errorContext),
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
