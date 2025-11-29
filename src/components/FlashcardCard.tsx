import { useState, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { useKeyboardNavigation } from '../hooks/useKeyboardNavigation';
import type { PanInfo } from 'framer-motion';
import type { Flashcard } from '../store';
import './FlashcardCard.css';

/**
 * Props for the FlashcardCard component
 */
export type FlashcardCardProps = {
  /** Flashcard data containing front and back content */
  flashcard: Flashcard;
  /** Callback function triggered when card is swiped left (doesn't know) */
  onSwipeLeft?: () => void;
  /** Callback function triggered when card is swiped right (knows) */
  onSwipeRight?: () => void;
  /** Additional CSS styles to apply to the card */
  style?: React.CSSProperties;
  /** Whether the card is disabled (non-draggable) */
  disabled?: boolean;
  /** Whether to show the front face first */
  showFrontFirst?: boolean;
};

/**
 * A swipeable flashcard component that displays front and back content with flip animation.
 * Supports swipe left (doesn't know), right (knows), and tap/click to flip.
 *
 * @param props - The component props
 * @returns JSX element representing a swipeable flashcard
 */
export function FlashcardCard({
  flashcard,
  onSwipeLeft,
  onSwipeRight,
  style,
  disabled,
  showFrontFirst = true,
}: FlashcardCardProps) {
  const controls = useAnimation();
  const [isFlipped, setIsFlipped] = useState(!showFrontFirst);
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  const frontFace = {
    title: flashcard.front?.title ?? 'Question',
    text: flashcard.front?.text ?? 'Flashcard',
    subText: flashcard.front?.subText,
    hint: flashcard.front?.hint,
  };
  const backFace = {
    title: flashcard.back?.title ?? 'Answer',
    text: flashcard.back?.text ?? 'Answer',
    subText: flashcard.back?.subText,
    hint: flashcard.back?.hint,
  };
  const metadataEntries = Object.entries(flashcard.metadata ?? {});
  const activeFace = isFlipped ? backFace : frontFace;

  useEffect(() => {
    setIsFlipped(!showFrontFirst);
  }, [showFrontFirst, flashcard.id]);

  // Keyboard navigation
  const { elementRef } = useKeyboardNavigation({
    onSwipeLeft: () => onSwipeLeft?.(),
    onSwipeRight: () => onSwipeRight?.(),
    onSwipeUp: () => handleFlip(),
    enabled: !disabled,
  });

  // Threshold values for determining swipe direction
  const threshold = 80; // Horizontal swipe threshold

  /**
   * Handle card flip on tap/click
   */
  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  /**
   * Handles drag movement to provide visual feedback
   */
  const handleDrag = (_: unknown, info: PanInfo) => {
    const x = info.offset.x;

    // Provide visual feedback based on drag direction
    if (x > threshold * 0.5) {
      setSwipeDirection('know');
    } else if (x < -threshold * 0.5) {
      setSwipeDirection('dont-know');
    } else {
      setSwipeDirection(null);
    }
  };

  /**
   * Handles the end of a drag gesture and determines the swipe direction
   */
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const x = info.offset.x;

    // Swipe right to mark as known
    if (x > threshold) {
      controls.start({
        x: 1000,
        rotate: 20,
        opacity: 0,
        scale: 0.8,
        transition: {
          duration: 0.4,
          ease: [0.25, 0.46, 0.45, 0.94],
        },
      });
      onSwipeRight?.();
    }
    // Swipe left to mark as unknown
    else if (x < -threshold) {
      controls.start({
        x: -1000,
        rotate: -20,
        opacity: 0,
        scale: 0.8,
        transition: {
          duration: 0.4,
          ease: [0.25, 0.46, 0.45, 0.94],
        },
      });
      onSwipeLeft?.();
    }
    // Return to original position if threshold not met
    else {
      controls.start({
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        transition: {
          duration: 0.3,
          ease: [0.34, 1.56, 0.64, 1], // Bouncy ease for return
        },
      });
    }
    setSwipeDirection(null);
  };

  return (
    <motion.div
      ref={elementRef as React.Ref<HTMLDivElement>}
      className={`flashcard-swipeable ${disabled ? 'disabled' : ''}`}
      style={style}
      data-swipe={swipeDirection}
      drag={!disabled}
      dragConstraints={{ left: -300, right: 300, top: 0, bottom: 0 }}
      dragElastic={0.1}
      dragMomentum={false}
      dragTransition={{
        bounceStiffness: 300,
        bounceDamping: 20,
        power: 0.3,
        timeConstant: 200,
      }}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      animate={controls}
      whileDrag={{
        scale: 1.05,
        transition: {
          type: 'spring',
          stiffness: 300,
          damping: 30,
        },
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`Flashcard: ${activeFace.text}`}
    >
      <div
        className={`flashcard-inner ${isFlipped ? 'flipped' : ''}`}
        onClick={handleFlip}
      >
        {/* Front side */}
        <div className="flashcard-front">
          <div className="flashcard-content">
            {frontFace.title && (
              <div className="flashcard-label">{frontFace.title}</div>
            )}
            <div className="flashcard-primary-text">{frontFace.text}</div>
            {frontFace.subText && (
              <div className="flashcard-subtext">{frontFace.subText}</div>
            )}
            {metadataEntries.length > 0 && (
              <div className="flashcard-meta">
                {metadataEntries.map(([key, value]) => (
                  <span
                    key={`${key}-${String(value)}`}
                    className="flashcard-meta-chip"
                  >
                    <span className="flashcard-meta-key">{key}:</span>{' '}
                    <span className="flashcard-meta-value">
                      {Array.isArray(value) ? value.join(', ') : String(value)}
                    </span>
                  </span>
                ))}
              </div>
            )}
            {flashcard.frontExamples && flashcard.frontExamples.length > 0 && (
              <div className="flashcard-examples">
                {flashcard.frontExamples.map(example => (
                  <div
                    key={
                      example.id ??
                      `${example.text}-${example.translation ?? 'translation'}`
                    }
                    className="flashcard-example"
                  >
                    {example.label && (
                      <div className="flashcard-example-label">
                        {example.label}
                      </div>
                    )}
                    <div className="flashcard-example-text">{example.text}</div>
                    {example.translation && (
                      <div className="flashcard-example-translation">
                        {example.translation}
                      </div>
                    )}
                    {example.note && (
                      <div className="flashcard-example-note">
                        {example.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flashcard-hint">
            {frontFace.hint ?? 'Tap to flip the card'}
          </div>
        </div>

        {/* Back side */}
        <div className="flashcard-back">
          <div className="flashcard-content">
            {backFace.title && (
              <div className="flashcard-label">{backFace.title}</div>
            )}
            <div className="flashcard-translation">{backFace.text}</div>
            {backFace.subText && (
              <div className="flashcard-subtext">{backFace.subText}</div>
            )}
            {flashcard.backExamples && flashcard.backExamples.length > 0 && (
              <div className="flashcard-examples">
                {flashcard.backExamples.map(example => (
                  <div
                    key={
                      example.id ??
                      `${example.text}-${example.translation ?? 'translation'}`
                    }
                    className="flashcard-example"
                  >
                    {example.label && (
                      <div className="flashcard-example-label">
                        {example.label}
                      </div>
                    )}
                    <div className="flashcard-example-text">{example.text}</div>
                    {example.translation && (
                      <div className="flashcard-example-translation">
                        {example.translation}
                      </div>
                    )}
                    {example.note && (
                      <div className="flashcard-example-note">
                        {example.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {flashcard.examples && flashcard.examples.length > 0 && (
              <div className="flashcard-examples">
                {flashcard.examples.map(example => (
                  <div
                    key={
                      example.id ??
                      `${example.text}-${example.translation ?? 'translation'}`
                    }
                    className="flashcard-example"
                  >
                    {example.label && (
                      <div className="flashcard-example-label">
                        {example.label}
                      </div>
                    )}
                    <div className="flashcard-example-text">{example.text}</div>
                    {example.translation && (
                      <div className="flashcard-example-translation">
                        {example.translation}
                      </div>
                    )}
                    {example.note && (
                      <div className="flashcard-example-note">
                        {example.note}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {flashcard.tags && flashcard.tags.length > 0 && (
              <div className="flashcard-tags">
                {flashcard.tags.map(tag => (
                  <span key={tag} className="flashcard-tag">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flashcard-hint">
            {backFace.hint ??
              'Swipe right if you know it, left to review later'}
          </div>
        </div>
      </div>

      {/* Swipe badges */}
      {swipeDirection === 'know' && (
        <div className="swipe-badge know">✓ Know</div>
      )}
      {swipeDirection === 'dont-know' && (
        <div className="swipe-badge dont-know">✗ Don't Know</div>
      )}

      {/* Screen reader instructions */}
      <div className="sr-only">
        Tap to flip the card. Use arrow keys left/right to mark as known or
        unknown, or swipe with your finger.
      </div>
    </motion.div>
  );
}
