import { useState } from 'react';
import {
  GitHub,
  CheckCircle,
  AlertCircle,
  Loader,
  Plus,
  X,
} from 'react-feather';
import { githubGistService } from '../lib/githubGist';
import { gistDebugLogger, formatGistError } from '../lib/gistDebug';
import type { GistFlashcard, GistFlashcardFace } from '../types/gist';
import './GistFlashcardWriter.css';

interface GistFlashcardWriterProps {
  readonly onSuccess?: (gistUrl: string) => void;
  readonly onError?: (error: string) => void;
}

export function GistFlashcardWriter({
  onSuccess,
  onError,
}: GistFlashcardWriterProps) {
  const [githubToken, setGithubToken] = useState('');
  const [gistDescription, setGistDescription] = useState(
    'Flashcard Learning App - Flashcards'
  );
  const [flashcards, setFlashcards] = useState<GistFlashcard[]>([
    { id: `card_${Date.now()}`, front: '', back: '', category: '', tags: [] },
  ]);
  const getFaceValue = (face?: GistFlashcardFace) =>
    typeof face === 'string' ? face : (face?.text ?? '');

  const hasFaceValue = (face?: GistFlashcardFace) =>
    getFaceValue(face).trim().length > 0;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | 'idle';
    message: string;
    gistUrl?: string;
  }>({ type: 'idle', message: '' });

  const addFlashcard = () => {
    setFlashcards([
      ...flashcards,
      {
        id: `card_${Date.now()}_${Math.random()}`,
        front: '',
        back: '',
        category: '',
        tags: [],
      },
    ]);
  };

  const removeFlashcard = (index: number) => {
    setFlashcards(flashcards.filter((_, i) => i !== index));
  };

  const updateFlashcard = (
    index: number,
    field: keyof GistFlashcard,
    value: string | string[]
  ) => {
    const updated = [...flashcards];
    updated[index] = { ...updated[index], [field]: value };
    setFlashcards(updated);
  };

  const handleUpload = async () => {
    gistDebugLogger.log('init', "GistFlashcardWriter: Début de l'upload", {
      flashcardsCount: flashcards.length,
      hasToken: !!githubToken,
      description: gistDescription,
    });

    if (!githubToken.trim()) {
      const errorMsg =
        'Token GitHub manquant. Veuillez entrer un token GitHub valide avec les permissions "gist".';
      gistDebugLogger.error('validate_token', errorMsg, new Error(errorMsg), {
        component: 'GistFlashcardWriter',
      });
      setUploadStatus({
        type: 'error',
        message: formatGistError('validate_token', errorMsg),
      });
      onError?.(formatGistError('validate_token', errorMsg));
      return;
    }

    // Validate flashcards
    const validFlashcards = flashcards.filter(
      card => hasFaceValue(card.front) && hasFaceValue(card.back)
    );

    gistDebugLogger.log(
      'validate_input',
      'GistFlashcardWriter: Validation des flashcards',
      {
        totalCount: flashcards.length,
        validCount: validFlashcards.length,
        invalidCount: flashcards.length - validFlashcards.length,
      }
    );

    if (validFlashcards.length === 0) {
      const errorMsg =
        'Aucune flashcard valide. Veuillez créer au moins une flashcard avec un front (question) et un back (réponse) remplis.';
      gistDebugLogger.error('validate_input', errorMsg, new Error(errorMsg), {
        component: 'GistFlashcardWriter',
        totalCount: flashcards.length,
      });
      setUploadStatus({
        type: 'error',
        message: formatGistError('validate_input', errorMsg),
      });
      onError?.(formatGistError('validate_input', errorMsg));
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: 'idle', message: '' });

    try {
      gistDebugLogger.log(
        'create_gist',
        'GistFlashcardWriter: Appel à createFlashcardGist',
        {
          validFlashcardsCount: validFlashcards.length,
          description: gistDescription,
        }
      );

      // Upload to Gist
      const result = await githubGistService.createFlashcardGist(
        validFlashcards,
        githubToken,
        gistDescription
      );

      if (result.success) {
        gistDebugLogger.success(
          'complete',
          'GistFlashcardWriter: Upload réussi',
          {
            flashcardsCount: validFlashcards.length,
            gistUrl: result.gistUrl,
          }
        );
        setUploadStatus({
          type: 'success',
          message: `${validFlashcards.length} flashcards uploadés avec succès! Gist créé: ${result.gistUrl}`,
          gistUrl: result.gistUrl,
        });
        onSuccess?.(result.gistUrl!);
      } else {
        const errorMsg =
          result.error || "Erreur lors de l'upload vers GitHub Gist";
        gistDebugLogger.error(
          'create_gist',
          "GistFlashcardWriter: Échec de l'upload",
          new Error(errorMsg),
          {
            component: 'GistFlashcardWriter',
            flashcardsCount: validFlashcards.length,
          }
        );
        setUploadStatus({
          type: 'error',
          message: formatGistError('create_gist', errorMsg, {
            flashcardsCount: validFlashcards.length,
          }),
        });
        onError?.(
          formatGistError('create_gist', errorMsg, {
            flashcardsCount: validFlashcards.length,
          })
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erreur inconnue lors de l'upload";
      gistDebugLogger.error(
        'error',
        'GistFlashcardWriter: Exception non gérée',
        error,
        {
          component: 'GistFlashcardWriter',
          flashcardsCount: validFlashcards.length,
        }
      );
      const formattedError = formatGistError('error', errorMessage, {
        flashcardsCount: validFlashcards.length,
      });
      setUploadStatus({
        type: 'error',
        message: formattedError,
      });
      onError?.(formattedError);
    } finally {
      setIsUploading(false);
    }
  };

  const copyGistUrl = () => {
    if (uploadStatus.gistUrl) {
      navigator.clipboard.writeText(uploadStatus.gistUrl);
      setUploadStatus(prev => ({
        ...prev,
        message: 'URL copiée dans le presse-papiers!',
      }));
    }
  };

  const resetForm = () => {
    setUploadStatus({ type: 'idle', message: '' });
    setFlashcards([
      { id: `card_${Date.now()}`, front: '', back: '', category: '', tags: [] },
    ]);
  };

  return (
    <div className="gist-flashcard-writer">
      <div className="gist-writer-header">
        <GitHub className="gist-icon" size={24} />
        <h3>Créer et Uploader des Flashcards</h3>
      </div>

      <div className="gist-writer-content">
        <div className="gist-form-grid">
          <div className="gist-form-group">
            <label htmlFor="github-token">
              Token GitHub <span className="required">*</span>
            </label>
            <input
              id="github-token"
              type="password"
              value={githubToken}
              onChange={e => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="gist-input"
              disabled={isUploading}
            />
            <small className="gist-help-text">
              Votre token personnel GitHub avec les permissions 'gist'
            </small>
          </div>

          <div className="gist-form-group">
            <label htmlFor="gist-description">Description du Gist</label>
            <input
              id="gist-description"
              type="text"
              value={gistDescription}
              onChange={e => setGistDescription(e.target.value)}
              className="gist-input"
              disabled={isUploading}
            />
          </div>
        </div>

        <div className="gist-flashcards-section">
          <div className="gist-flashcards-header">
            <h4>Flashcards</h4>
            <button
              type="button"
              onClick={addFlashcard}
              className="gist-add-button"
              disabled={isUploading}
            >
              <Plus size={16} />
              Ajouter une Flashcard
            </button>
          </div>

          <div className="gist-flashcards-list">
            {flashcards.map((card, index) => (
              <div key={card.id} className="gist-flashcard-item">
                <div className="gist-flashcard-header">
                  <span className="gist-flashcard-number">
                    Flashcard {index + 1}
                  </span>
                  {flashcards.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeFlashcard(index)}
                      className="gist-remove-button"
                      disabled={isUploading}
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="gist-flashcard-fields">
                  <div className="gist-form-group">
                    <label>Front (Question)</label>
                    <textarea
                      value={getFaceValue(card.front)}
                      onChange={e =>
                        updateFlashcard(index, 'front', e.target.value)
                      }
                      placeholder="Question ou prompt..."
                      className="gist-textarea"
                      disabled={isUploading}
                      rows={3}
                    />
                  </div>
                  <div className="gist-form-group">
                    <label>Back (Réponse)</label>
                    <textarea
                      value={getFaceValue(card.back)}
                      onChange={e =>
                        updateFlashcard(index, 'back', e.target.value)
                      }
                      placeholder="Réponse ou explication..."
                      className="gist-textarea"
                      disabled={isUploading}
                      rows={3}
                    />
                  </div>
                  <div className="gist-flashcard-meta">
                    <div className="gist-form-group">
                      <label>Catégorie (optionnel)</label>
                      <input
                        type="text"
                        value={card.category || ''}
                        onChange={e =>
                          updateFlashcard(index, 'category', e.target.value)
                        }
                        placeholder="ex: Mathématiques"
                        className="gist-input"
                        disabled={isUploading}
                      />
                    </div>
                    <div className="gist-form-group">
                      <label>Tags (optionnel, séparés par des virgules)</label>
                      <input
                        type="text"
                        value={card.tags?.join(', ') || ''}
                        onChange={e =>
                          updateFlashcard(
                            index,
                            'tags',
                            e.target.value
                              .split(',')
                              .map(t => t.trim())
                              .filter(t => t)
                          )
                        }
                        placeholder="ex: algèbre, équations"
                        className="gist-input"
                        disabled={isUploading}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {uploadStatus.type !== 'idle' && (
          <div className={`gist-status gist-status--${uploadStatus.type}`}>
            {isUploading && <Loader className="gist-status-icon" size={16} />}
            {uploadStatus.type === 'success' && (
              <CheckCircle className="gist-status-icon" size={16} />
            )}
            {uploadStatus.type === 'error' && (
              <AlertCircle className="gist-status-icon" size={16} />
            )}
            <span>{uploadStatus.message}</span>
          </div>
        )}

        {uploadStatus.type === 'success' && uploadStatus.gistUrl && (
          <div className="gist-success-actions">
            <a
              href={uploadStatus.gistUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gist-link-button"
            >
              <GitHub size={16} />
              Voir le Gist
            </a>
            <button onClick={copyGistUrl} className="gist-copy-button">
              Copier l'URL
            </button>
          </div>
        )}

        <div className="gist-actions">
          {uploadStatus.type === 'idle' || uploadStatus.type === 'error' ? (
            <button
              onClick={handleUpload}
              disabled={isUploading || !githubToken.trim()}
              className="gist-upload-button"
            >
              {isUploading ? (
                <>
                  <Loader size={16} />
                  Upload en cours...
                </>
              ) : (
                <>
                  <GitHub size={16} />
                  Uploader{' '}
                  {
                    flashcards.filter(
                      card =>
                        hasFaceValue(card.front) && hasFaceValue(card.back)
                    ).length
                  }{' '}
                  Flashcards
                </>
              )}
            </button>
          ) : (
            <button onClick={resetForm} className="gist-reset-button">
              Créer un Nouveau Deck
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
