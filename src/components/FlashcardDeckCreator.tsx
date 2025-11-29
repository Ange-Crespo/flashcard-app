import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, ArrowLeft, Plus, X, Book } from 'react-feather';
import { useToast } from '../hooks/useToast';
import { githubGistService } from '../lib/githubGist';
import type { GistFlashcard, GistFlashcardFace } from '../types/gist';
import './FlashcardDeckCreator.css';

/**
 * Flashcard deck creator component for creating and editing flashcard decks
 * Allows users to create flashcards with front/back content, category, and tags
 */
export function FlashcardDeckCreator({
  onComplete,
}: {
  onComplete: () => void;
}) {
  const { showSuccess, showError } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [githubToken, setGithubToken] = useState('');
  const [showGistSection, setShowGistSection] = useState(false);
  const [deckTitle, setDeckTitle] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [flashcards, setFlashcards] = useState<Array<Partial<GistFlashcard>>>([
    { id: `card_${Date.now()}`, front: '', back: '', category: '', tags: [] },
  ]);
  const getFaceValue = (face?: GistFlashcardFace) =>
    typeof face === 'string' ? face : (face?.text ?? '');

  const hasFaceValue = (face?: GistFlashcardFace) =>
    getFaceValue(face).trim().length > 0;

  // Load GitHub token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('github_token');
    if (savedToken) {
      setGithubToken(savedToken);
    }
  }, []);

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
    if (flashcards.length > 1) {
      setFlashcards(flashcards.filter((_, i) => i !== index));
    }
  };

  const updateFlashcard = (
    index: number,
    field: keyof GistFlashcard,
    value: string | string[]
  ) => {
    const updated = [...flashcards];
    updated[index] = { ...updated[index], [field]: value };
    setFlashcards(updated);
    // Clear error when user starts typing
    if (errors[`${index}_${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`${index}_${field}`];
        return newErrors;
      });
    }
  };

  // Validate form data
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!deckTitle.trim()) {
      newErrors.deckTitle = 'Le titre du deck est requis';
    }

    flashcards.forEach((card, index) => {
      if (!hasFaceValue(card.front)) {
        newErrors[`${index}_front`] = 'Le front est requis';
      }
      if (!hasFaceValue(card.back)) {
        newErrors[`${index}_back`] = 'Le back est requis';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Convert to GistFlashcard format
      const gistFlashcards: GistFlashcard[] = flashcards
        .filter(card => hasFaceValue(card.front) && hasFaceValue(card.back))
        .map((card, index) => ({
          id: card.id || `card_${Date.now()}_${index}`,
          front: getFaceValue(card.front),
          back: getFaceValue(card.back),
          category: card.category || undefined,
          tags: card.tags && card.tags.length > 0 ? card.tags : undefined,
        }));

      // Save to Gist if token provided
      if (githubToken.trim()) {
        try {
          const description = deckDescription.trim()
            ? `${deckTitle} - ${deckDescription}`
            : deckTitle;

          const result = await githubGistService.createFlashcardGist(
            gistFlashcards,
            githubToken,
            description
          );

          if (result.success) {
            showSuccess(
              'Deck Créé !',
              'Votre deck de flashcards a été créé avec succès'
            );
            onComplete();
          } else {
            showError(
              'Erreur Gist',
              result.error || "Échec de l'upload vers GitHub Gist"
            );
          }
        } catch (error) {
          console.error('Error creating Gist:', error);
          showError('Erreur Gist', "Échec de l'upload vers GitHub Gist");
        }
      } else {
        // Just show success if no token (local only)
        showSuccess(
          'Deck Prêt !',
          'Votre deck est prêt (ajoutez un token GitHub pour le sauvegarder en ligne)'
        );
        onComplete();
      }
    } catch (error) {
      console.error('Error saving deck:', error);
      showError(
        'Échec de la Sauvegarde',
        'Échec de la sauvegarde du deck. Veuillez réessayer.'
      );
      setErrors({
        submit: 'Échec de la sauvegarde du deck. Veuillez réessayer.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="flashcard-deck-creator"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="deck-creator-container">
        {/* Header */}
        <div className="deck-creator-header">
          <button
            className="back-btn"
            onClick={onComplete}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1>Créer un Deck de Flashcards</h1>
          <div className="header-spacer" />
        </div>

        <form onSubmit={handleSubmit} className="deck-form">
          {/* Deck Info */}
          <div className="form-section">
            <label htmlFor="deckTitle" className="form-label">
              <Book size={20} />
              Titre du Deck
            </label>
            <input
              id="deckTitle"
              type="text"
              value={deckTitle}
              onChange={e => {
                setDeckTitle(e.target.value);
                if (errors.deckTitle) {
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.deckTitle;
                    return newErrors;
                  });
                }
              }}
              placeholder="ex: Vocabulaire Français"
              className={`form-input ${errors.deckTitle ? 'error' : ''}`}
            />
            {errors.deckTitle && (
              <span className="error-message">{errors.deckTitle}</span>
            )}
          </div>

          <div className="form-section">
            <label htmlFor="deckDescription" className="form-label">
              Description (optionnel)
            </label>
            <textarea
              id="deckDescription"
              value={deckDescription}
              onChange={e => setDeckDescription(e.target.value)}
              placeholder="Description du deck de flashcards..."
              rows={2}
              className="form-textarea"
            />
          </div>

          {/* Flashcards */}
          <div className="form-section">
            <div className="flashcards-header">
              <h3 className="section-title">Flashcards</h3>
              <button
                type="button"
                onClick={addFlashcard}
                className="add-flashcard-btn"
              >
                <Plus size={16} />
                Ajouter une Flashcard
              </button>
            </div>

            <div className="flashcards-list">
              {flashcards.map((card, index) => (
                <div key={card.id || index} className="flashcard-item">
                  <div className="flashcard-item-header">
                    <span className="flashcard-number">
                      Flashcard {index + 1}
                    </span>
                    {flashcards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeFlashcard(index)}
                        className="remove-flashcard-btn"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>

                  <div className="flashcard-fields">
                    <div className="form-group">
                      <label>Front (Question)</label>
                      <textarea
                        value={getFaceValue(card.front)}
                        onChange={e =>
                          updateFlashcard(index, 'front', e.target.value)
                        }
                        placeholder="Question ou prompt..."
                        rows={3}
                        className={`form-textarea ${
                          errors[`${index}_front`] ? 'error' : ''
                        }`}
                      />
                      {errors[`${index}_front`] && (
                        <span className="error-message">
                          {errors[`${index}_front`]}
                        </span>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Back (Réponse)</label>
                      <textarea
                        value={getFaceValue(card.back)}
                        onChange={e =>
                          updateFlashcard(index, 'back', e.target.value)
                        }
                        placeholder="Réponse ou explication..."
                        rows={3}
                        className={`form-textarea ${
                          errors[`${index}_back`] ? 'error' : ''
                        }`}
                      />
                      {errors[`${index}_back`] && (
                        <span className="error-message">
                          {errors[`${index}_back`]}
                        </span>
                      )}
                    </div>

                    <div className="flashcard-meta">
                      <div className="form-group">
                        <label>Catégorie (optionnel)</label>
                        <input
                          type="text"
                          value={card.category || ''}
                          onChange={e =>
                            updateFlashcard(index, 'category', e.target.value)
                          }
                          placeholder="ex: Mathématiques"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label>
                          Tags (optionnel, séparés par des virgules)
                        </label>
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
                          className="form-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GitHub Token Section */}
          <div className="form-section">
            <div className="gist-toggle-section">
              <button
                type="button"
                className="gist-toggle-btn"
                onClick={() => setShowGistSection(!showGistSection)}
              >
                <Book size={20} />
                {showGistSection ? 'Masquer' : 'Afficher'} les Options Gist
              </button>
              <p className="gist-description">
                Sauvegarder votre deck sur GitHub Gist (optionnel)
              </p>
            </div>

            {showGistSection && (
              <div className="gist-section">
                <div className="form-group">
                  <label htmlFor="githubToken" className="form-label">
                    Token GitHub
                  </label>
                  <input
                    id="githubToken"
                    type="password"
                    value={githubToken}
                    onChange={e => {
                      setGithubToken(e.target.value);
                      localStorage.setItem('github_token', e.target.value);
                    }}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    className="form-input"
                  />
                  <small className="form-help">
                    Votre token personnel GitHub avec les permissions 'gist'.
                    <a
                      href="https://github.com/settings/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="help-link"
                    >
                      Créer un token
                    </a>
                  </small>
                </div>
              </div>
            )}
          </div>

          {/* Submit Error */}
          {errors.submit && <div className="submit-error">{errors.submit}</div>}

          {/* Submit Button */}
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? (
              <div className="loading-spinner" />
            ) : (
              <>
                <Save size={20} />
                Créer le Deck
              </>
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
