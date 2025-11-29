import { FlashcardDeckCreator } from '../components/FlashcardDeckCreator';
import { useNavigate } from 'react-router-dom';

/**
 * Page component for creating flashcard decks
 * Wraps the FlashcardDeckCreator component with navigation
 */
export default function FlashcardDeckCreatorPage() {
  const navigate = useNavigate();

  const handleComplete = () => {
    navigate('/');
  };

  return <FlashcardDeckCreator onComplete={handleComplete} />;
}
