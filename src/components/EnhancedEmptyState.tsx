import { BookOpen, RefreshCw, Plus } from 'react-feather';
import { motion } from 'framer-motion';
import './EnhancedEmptyState.css';

/**
 * Enhanced empty state component for when no more flashcards are available
 * Provides engaging content and clear call-to-action
 */
export function EnhancedEmptyState({
  onCreateDeck,
  onRefresh,
}: {
  onCreateDeck: () => void;
  onRefresh: () => void;
}) {
  return (
    <motion.div
      className="enhanced-empty-state"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="empty-state-content">
        <motion.div
          className="empty-state-icon"
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <BookOpen size={64} />
        </motion.div>

        <h2 className="empty-state-title">
          Plus de flashcards à étudier pour le moment
        </h2>

        <p className="empty-state-description">
          Vous avez étudié toutes les flashcards disponibles ! Revenez plus tard
          pour réviser, ou créez votre propre deck de flashcards pour continuer
          à apprendre.
        </p>

        <div className="empty-state-actions">
          <button className="action-btn primary" onClick={onCreateDeck}>
            <Plus size={20} />
            Créer un Deck
          </button>

          <button className="action-btn secondary" onClick={onRefresh}>
            <RefreshCw size={20} />
            Réinitialiser
          </button>
        </div>

        <div className="empty-state-tips">
          <h3>Et maintenant ?</h3>
          <ul>
            <li>
              Créez votre propre deck de flashcards pour continuer à apprendre
            </li>
            <li>Consultez vos statistiques pour voir votre progression</li>
            <li>Partagez vos decks avec d'autres pour les aider à apprendre</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
