import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlashcardCard } from './FlashcardCard';
import { EnhancedEmptyState } from './EnhancedEmptyState';
import { SwipeDeckSkeleton } from './FlashcardSkeleton';
import { useToast } from '../hooks/useToast';
import { X, Check, Eye, EyeOff, Settings } from 'react-feather';
import { useAppStore } from '../store';
import { DeckMappingModal } from './DeckMappingModal';
import {
  loadDeckFieldMapping,
  saveDeckFieldMapping,
} from '../lib/deckFieldMapping';
import type { DeckFieldMapping } from '../types/fieldMapping';
import {
  applyDeckFieldMapping,
  getAvailableFieldOptions,
  getDefaultMapping,
} from '../utils/flashcardMapping';
import './FlashcardDeck.css';

/**
 * Main flashcard deck component that manages the card stack and user interactions.
 * Displays one flashcard at a time.
 * Handles swipe gestures and provides action buttons for marking as known/unknown.
 *
 * @returns JSX element representing the flashcard deck interface
 */
export function FlashcardDeck() {
  const {
    flashcards,
    sortedFlashcards,
    markAsKnown,
    markAsUnknown,
    loadProgress,
  } = useAppStore();
  const { showSuccess, showInfo } = useToast();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showFrontFirst, setShowFrontFirst] = useState(true);
  const [fieldMapping, setFieldMapping] = useState<DeckFieldMapping | null>(
    null
  );
  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);

  // Load user progress from cookies on mount
  useEffect(() => {
    loadProgress();
    setIsLoading(false);
  }, [loadProgress]);

  const cards = sortedFlashcards.length > 0 ? sortedFlashcards : flashcards;
  const current = cards[index];
  const deckId = current?.deckId ?? 'default';
  const deckName = current?.deckName;

  useEffect(() => {
    if (!deckId) return;
    const storedMapping = loadDeckFieldMapping(deckId);
    setFieldMapping(storedMapping);
  }, [deckId]);

  const fieldOptions = useMemo(
    () => (current ? getAvailableFieldOptions(current) : []),
    [current]
  );

  const defaultMapping = useMemo(
    () => (current ? getDefaultMapping(current, deckId) : null),
    [current, deckId]
  );

  const resolvedCard = useMemo(() => {
    if (!current) return undefined;
    if (!fieldMapping) return current;
    return applyDeckFieldMapping(current, fieldMapping);
  }, [current, fieldMapping]);

  // Handle refresh - reset to beginning of flashcards
  const handleRefresh = () => {
    setIndex(0);
  };

  /**
   * Handles user choice when swiping or clicking action buttons
   * @param known - Whether the user knows the answer (true) or doesn't (false)
   */
  const handleChoice = useCallback(
    (known: boolean) => {
      if (!current) return;

      if (known) {
        markAsKnown(current.id);
        showSuccess('Marked as Known', 'You got it right!');
      } else {
        markAsUnknown(current.id);
        showInfo('Marked as Unknown', 'Keep practicing!');
      }

      setIndex(v => v + 1);
    },
    [current, markAsKnown, markAsUnknown, showSuccess, showInfo]
  );

  // Show loading state
  if (isLoading) {
    return (
      <div className="flashcard-deck">
        <SwipeDeckSkeleton />
      </div>
    );
  }

  return (
    <div className="flashcard-deck">
      <div
        className="flashcard-settings-toggle"
        title="Configurer le mapping des champs"
      >
        <button
          type="button"
          onClick={() => setIsMappingModalOpen(true)}
          aria-label="Configurer le mapping des champs"
          disabled={!current}
        >
          <Settings size={14} />
          <span>Mapping</span>
        </button>
      </div>
      <div
        className="flashcard-view-toggle"
        title="Basculer la face affichée en premier"
      >
        <button
          type="button"
          onClick={() => setShowFrontFirst(prev => !prev)}
          aria-pressed={!showFrontFirst}
          aria-label={
            showFrontFirst
              ? 'Afficher le dos en premier'
              : 'Afficher la face en premier'
          }
        >
          {showFrontFirst ? <Eye size={14} /> : <EyeOff size={14} />}
          <span>{showFrontFirst ? 'Face' : 'Dos'} en premier</span>
        </button>
      </div>
      {/* Current card */}
      {current ? (
        <FlashcardCard
          key={current.id}
          flashcard={resolvedCard ?? current}
          onSwipeLeft={() => handleChoice(false)}
          onSwipeRight={() => handleChoice(true)}
          showFrontFirst={showFrontFirst}
        />
      ) : (
        <EnhancedEmptyState
          onCreateDeck={() => navigate('/create')}
          onRefresh={handleRefresh}
        />
      )}

      <ActionBar
        onDontKnow={() => handleChoice(false)}
        onKnow={() => handleChoice(true)}
      />

      {current && defaultMapping && (
        <DeckMappingModal
          isOpen={isMappingModalOpen}
          deckId={deckId}
          deckName={deckName}
          fieldOptions={fieldOptions}
          initialMapping={fieldMapping ?? defaultMapping}
          onClose={() => setIsMappingModalOpen(false)}
          onSave={mapping => {
            saveDeckFieldMapping(mapping);
            setFieldMapping(mapping);
            setIsMappingModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * Action bar component with buttons for marking flashcards as known/unknown
 */
function ActionBar({
  onDontKnow,
  onKnow,
}: {
  onDontKnow: () => void;
  onKnow: () => void;
}) {
  return (
    <div className="flashcard-action-bar">
      <button
        aria-label="Don't Know"
        onClick={onDontKnow}
        className="action-btn action-btn--dont-know"
      >
        <X />
      </button>
      <button
        aria-label="Know"
        onClick={onKnow}
        className="action-btn action-btn--know"
      >
        <Check />
      </button>
    </div>
  );
}
