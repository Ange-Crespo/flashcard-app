import { useAppStore } from '../store';
import { getProgressStats } from '../lib/cookies';
import { TrendingUp, CheckCircle, XCircle, BookOpen } from 'react-feather';
import './ProgressPage.css';

/**
 * Progress page component showing learning statistics and progress
 * Displays user progress and statistics for flashcards
 */
export default function ProgressPage() {
  const { flashcards, knownIds, unknownIds } = useAppStore();
  const stats = getProgressStats();

  const totalFlashcards = flashcards.length;
  const knownCount = knownIds.size;
  const unknownCount = unknownIds.size;
  const studiedCount = knownCount + unknownCount;
  const successRate = studiedCount > 0 ? (knownCount / studiedCount) * 100 : 0;

  return (
    <div className="progress-page">
      <div className="progress-container">
        <header className="progress-header">
          <h1>Vos Statistiques d'Apprentissage</h1>
          <p className="progress-subtitle">
            Suivez votre progression dans l'apprentissage des flashcards
          </p>
        </header>

        <div className="progress-stats-grid">
          {/* Total Cards */}
          <div className="stat-card">
            <div className="stat-icon stat-icon--total">
              <BookOpen size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{totalFlashcards}</div>
              <div className="stat-label">Flashcards Total</div>
            </div>
          </div>

          {/* Known Cards */}
          <div className="stat-card stat-card--success">
            <div className="stat-icon stat-icon--success">
              <CheckCircle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{knownCount}</div>
              <div className="stat-label">Connues</div>
            </div>
          </div>

          {/* Unknown Cards */}
          <div className="stat-card stat-card--error">
            <div className="stat-icon stat-icon--error">
              <XCircle size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{unknownCount}</div>
              <div className="stat-label">À Réviser</div>
            </div>
          </div>

          {/* Success Rate */}
          <div className="stat-card stat-card--primary">
            <div className="stat-icon stat-icon--primary">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{successRate.toFixed(1)}%</div>
              <div className="stat-label">Taux de Réussite</div>
            </div>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="progress-details">
          <h2 className="details-title">Détails</h2>
          <div className="details-grid">
            <div className="detail-item">
              <span className="detail-label">Flashcards étudiées:</span>
              <span className="detail-value">{studiedCount}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Tentatives totales:</span>
              <span className="detail-value">{stats.attempts}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Taux de réussite global:</span>
              <span className="detail-value">
                {stats.successRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Progress Message */}
        {totalFlashcards === 0 ? (
          <div className="progress-empty">
            <BookOpen size={48} />
            <h3>Aucune Flashcard</h3>
            <p>Commencez à étudier des flashcards pour voir vos statistiques</p>
          </div>
        ) : studiedCount === 0 ? (
          <div className="progress-empty">
            <BookOpen size={48} />
            <h3>Commencez votre Apprentissage</h3>
            <p>
              Étudiez vos premières flashcards pour commencer à suivre votre
              progression
            </p>
          </div>
        ) : (
          <div className="progress-encouragement">
            <p>
              {successRate >= 80
                ? 'Excellent travail ! Vous maîtrisez bien ces flashcards.'
                : successRate >= 50
                  ? 'Continuez vos efforts ! Vous progressez bien.'
                  : "C'est un bon début ! Continuez à pratiquer."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
