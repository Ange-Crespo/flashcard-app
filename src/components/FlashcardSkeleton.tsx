import './FlashcardSkeleton.css';

interface FlashcardSkeletonProps {
  className?: string;
}

/**
 * Skeleton component for flashcard cards during loading
 */
export function FlashcardSkeleton({ className = '' }: FlashcardSkeletonProps) {
  return (
    <div className={`flashcard-skeleton ${className}`}>
      <div className="flashcard-skeleton__content">
        <div className="flashcard-skeleton__front">
          <div className="flashcard-skeleton__line flashcard-skeleton__line--title" />
          <div className="flashcard-skeleton__line" />
          <div className="flashcard-skeleton__line flashcard-skeleton__line--short" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for the flashcard deck when loading flashcards
 */
export function SwipeDeckSkeleton() {
  return (
    <div className="swipe-deck-skeleton">
      <FlashcardSkeleton className="flashcard-skeleton--current" />
      <FlashcardSkeleton className="flashcard-skeleton--next" />
    </div>
  );
}
