import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, X, RotateCcw, Book, Target } from 'react-feather';
import './OnboardingFlow.css';

/**
 * Onboarding flow component that introduces users to the flashcard learning app
 * Explains how the app works and its philosophy
 */
export function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const steps = [
    {
      title: 'Welcome to Flashcard Learning',
      subtitle: 'Learn effectively with spaced repetition',
      content:
        'This app helps you learn and memorize information using flashcards. Each card has a question on the front and an answer on the back. Your progress is tracked locally in your browser for privacy.',
      icon: <Book size={48} />,
      color: 'var(--primary-yellow)',
    },
    {
      title: 'How to Use Flashcards',
      subtitle: 'Simple and intuitive',
      content:
        "Tap or click a card to flip it and see the answer. Swipe right if you know it, swipe left if you don't. Your progress is automatically saved to help you focus on what you need to practice.",
      icon: <Target size={48} />,
      color: '#10b981',
      gestures: true,
    },
    {
      title: 'Track Your Progress',
      subtitle: 'Privacy-first learning',
      content:
        "All your progress is stored locally in your browser. We don't collect any personal data. The app tracks what you know and what you need to review, helping you study more efficiently.",
      icon: <Check size={48} />,
      color: '#667eea',
    },
    {
      title: 'Science-Based Learning',
      subtitle: 'Built for effective memorization',
      content:
        'The app is designed to support spaced repetition algorithms. By tracking your performance, it can help you review cards at optimal intervals to maximize long-term retention.',
      icon: <RotateCcw size={48} />,
      color: 'var(--primary-yellow)',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    setIsVisible(false);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="onboarding-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="onboarding-container">
          {/* Progress indicator */}
          <div className="progress-indicator">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`progress-dot ${index <= currentStep ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Step content */}
          <motion.div
            key={currentStep}
            className="step-content"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div
              className="step-icon"
              style={{ color: steps[currentStep].color }}
            >
              {steps[currentStep].icon}
            </div>

            <h1 className="step-title">{steps[currentStep].title}</h1>
            <h2 className="step-subtitle">{steps[currentStep].subtitle}</h2>
            <p className="step-description">{steps[currentStep].content}</p>

            {/* Gesture tutorial for step 2 */}
            {steps[currentStep].gestures && (
              <div className="gesture-tutorial">
                <div className="gesture-demo">
                  <div className="gesture-card">
                    <div className="gesture-arrows">
                      <div className="arrow-left">
                        <X size={24} />
                        <span>Don't Know</span>
                      </div>
                      <div className="arrow-right">
                        <Check size={24} />
                        <span>Know It</span>
                      </div>
                    </div>
                    <div className="gesture-hint">Tap to flip the card</div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Action buttons */}
          <div className="onboarding-actions">
            <button className="skip-btn" onClick={handleSkip}>
              Skip
            </button>
            <button className="next-btn" onClick={handleNext}>
              {currentStep === steps.length - 1 ? 'Start Learning' : 'Next'}
              <span className="sr-only">
                {currentStep === steps.length - 1 ? 'Commencer' : 'Suivant'}
              </span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
