import { useMemo, useState, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { buildExportPayload } from '../lib/exportPayload';
import { importFromFile } from '../lib/importPayload';
import { GIST_DECKS, type GistDeckDescriptor } from '../lib/gistDecks';
import {
  fetchGistDeckCatalog,
  persistCatalog,
  readStoredCatalog,
} from '../lib/gistCatalog';
import { getAllThemes } from '../lib/themes';
import { useAppStore } from '../store';
import { logger } from '../lib/logger';
import './SettingsPage.css';

type SettingsSectionId = 'export' | 'gist' | 'theme' | 'debug';

const SECTIONS: Array<{
  id: SettingsSectionId;
  label: string;
  description: string;
}> = [
  {
    id: 'export',
    label: 'Sauvegarde & export',
    description: 'Télécharger vos données locales',
  },
  {
    id: 'gist',
    label: 'Decks GitHub Gist',
    description: 'Choisir une source de cartes',
  },
  {
    id: 'theme',
    label: 'Apparence',
    description: 'Choisir un thème de couleurs',
  },
  {
    id: 'debug',
    label: 'Debug Gist',
    description: 'Panneau de debug pour les opérations Gist',
  },
];

export default function SettingsPage() {
  const storedCatalog = useMemo(() => readStoredCatalog(), []);
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>('export');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(
    null
  );
  const [deckStatusMessage, setDeckStatusMessage] = useState<string | null>(
    null
  );
  const [catalogStatusMessage, setCatalogStatusMessage] = useState<
    string | null
  >(null);
  const [catalogInput, setCatalogInput] = useState('');
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [mergeMode, setMergeMode] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loadProgress } = useAppStore();
  const [availableDecks, setAvailableDecks] = useState<GistDeckDescriptor[]>(
    () => storedCatalog?.decks ?? GIST_DECKS
  );
  const [catalogSource, setCatalogSource] = useState<string | undefined>(
    storedCatalog?.sourceLabel
  );
  const { selectedGist, setSelectedGist, theme, setTheme } = useAppStore();
  const themes = useMemo(() => getAllThemes(), []);

  const handleExportData = () => {
    const payload = buildExportPayload();

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flashcards-data-${new Date()
      .toISOString()
      .replace(/[:.]/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setStatusMessage('Vos données ont été exportées au format JSON.');
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatusMessage(null);

    try {
      const result = await importFromFile(file, mergeMode);

      if (result.success) {
        // Reload progress in the store
        loadProgress();

        const parts: string[] = [];
        if (result.progressCount) {
          parts.push(`${result.progressCount} entrées de progression`);
        }
        if (result.mappingsCount) {
          parts.push(`${result.mappingsCount} mappings de deck`);
        }

        const successMsg = `Données importées avec succès${parts.length > 0 ? ` : ${parts.join(', ')}` : ''}.`;
        setImportStatusMessage(successMsg);

        if (result.warnings && result.warnings.length > 0) {
          logger.warn('Import warnings', { warnings: result.warnings });
        }
      } else {
        setImportStatusMessage(`Erreur lors de l'import : ${result.error}`);
      }
    } catch (error) {
      setImportStatusMessage(
        `Erreur lors de l'import : ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      );
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeckSelection = (deckId: string) => {
    const deck = availableDecks.find(option => option.id === deckId);
    if (!deck) return;
    if (deck.id === selectedGist.id && deck.owner === selectedGist.owner) {
      setDeckStatusMessage(`Le deck "${deck.name}" est déjà sélectionné.`);
      return;
    }
    setSelectedGist({
      id: deck.id,
      owner: deck.owner,
      name: deck.name,
      rawUrl: deck.rawUrl,
    });
    setDeckStatusMessage(
      `Deck "${deck.name}" sélectionné. La page Découverte chargera ce Gist.`
    );
  };

  const handleCatalogSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!catalogInput.trim()) return;
    setIsCatalogLoading(true);
    setCatalogStatusMessage(null);
    try {
      const result = await fetchGistDeckCatalog(catalogInput.trim());
      if (!result.decks.length) {
        throw new Error('Le Gist ne contient aucun deck.');
      }
      setAvailableDecks(result.decks);
      persistCatalog(result.decks, result.source);
      setCatalogSource(result.source);
      setCatalogStatusMessage('Nouvelle liste de decks chargée avec succès.');
    } catch (error) {
      setCatalogStatusMessage(
        error instanceof Error
          ? error.message
          : 'Impossible de charger cette liste de decks.'
      );
    } finally {
      setIsCatalogLoading(false);
    }
  };

  const renderExportSection = () => (
    <section className="settings-section">
      <h2>Exporter vos données</h2>
      <p>
        Téléchargez une copie de vos progrès locaux (enregistrés dans votre
        navigateur) au format JSON pour sauvegarde ou inspection.
      </p>
      <button className="settings-button" onClick={handleExportData}>
        Télécharger mes données
      </button>
      {statusMessage && (
        <p className="settings-status" role="status">
          {statusMessage}
        </p>
      )}

      <div
        style={{
          marginTop: '2rem',
          paddingTop: '2rem',
          borderTop: '1px solid var(--border-color)',
        }}
      >
        <h3>Importer vos données</h3>
        <p>
          Restaurez vos progrès depuis un fichier JSON exporté précédemment.
        </p>
        <div style={{ marginBottom: '1rem' }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={mergeMode}
              onChange={e => setMergeMode(e.target.checked)}
            />
            <span>
              Fusionner avec les données existantes (sinon, remplacer)
            </span>
          </label>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleImportFile}
          style={{ display: 'none' }}
          aria-label="Sélectionner un fichier JSON à importer"
        />
        <button
          className="settings-button"
          onClick={handleImportClick}
          disabled={isImporting}
        >
          {isImporting ? 'Import en cours...' : 'Importer depuis un fichier'}
        </button>
        {importStatusMessage && (
          <p
            className={`settings-status ${importStatusMessage.includes('Erreur') ? 'settings-status--error' : ''}`}
            role="status"
          >
            {importStatusMessage}
          </p>
        )}
      </div>
    </section>
  );

  const renderGistSection = () => (
    <section className="settings-section">
      <h2>Decks GitHub Gist</h2>
      <p>
        Connectez-vous à un jeu de cartes public disponible sur GitHub Gist. Le
        deck sélectionné sera utilisé sur la page Découverte.
      </p>
      <form className="catalog-form" onSubmit={handleCatalogSubmit}>
        <label htmlFor="catalog-input">
          Charger une liste de decks depuis un Gist
        </label>
        <div className="catalog-form-row">
          <input
            id="catalog-input"
            type="text"
            placeholder="URL ou ID du Gist contenant decks.json"
            value={catalogInput}
            onChange={event => setCatalogInput(event.target.value)}
            aria-label="URL du Gist contenant les decks disponibles"
          />
          <button
            type="submit"
            className="settings-button"
            disabled={isCatalogLoading || !catalogInput.trim()}
          >
            {isCatalogLoading ? 'Chargement…' : 'Charger les decks'}
          </button>
        </div>
        {catalogStatusMessage && (
          <p className="settings-status" role="alert">
            {catalogStatusMessage}
          </p>
        )}
        {catalogSource && (
          <p className="settings-helper">
            Liste actuelle chargée depuis :{' '}
            <a href={catalogSource} target="_blank" rel="noreferrer">
              {catalogSource}
            </a>
          </p>
        )}
      </form>
      <div className="deck-selection-grid" role="radiogroup">
        {availableDecks.map(deck => {
          const isSelected =
            deck.id === selectedGist.id && deck.owner === selectedGist.owner;
          return (
            <label
              key={deck.id}
              className={`deck-card ${isSelected ? 'deck-card--selected' : ''}`}
            >
              <div className="deck-card-header">
                <input
                  type="radio"
                  name="gist-deck"
                  aria-label={deck.name}
                  checked={isSelected}
                  onChange={() => handleDeckSelection(deck.id)}
                />
                <div>
                  <p className="deck-card-title">{deck.name}</p>
                  <p className="deck-card-language">
                    {deck.language ?? 'Deck'}
                    {deck.sizeHint ? ` · ${deck.sizeHint}` : ''}
                  </p>
                </div>
              </div>
              <p className="deck-card-description">{deck.description}</p>
              <div className="deck-card-footer">
                <span>
                  Gist: {deck.owner}/{deck.id.slice(0, 6)}…
                </span>
                <a
                  className="deck-card-link"
                  href={deck.gistUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Voir sur GitHub
                </a>
              </div>
            </label>
          );
        })}
      </div>
      {deckStatusMessage && (
        <p className="settings-status" role="status">
          {deckStatusMessage}
        </p>
      )}
    </section>
  );

  const renderThemeSection = () => (
    <section className="settings-section">
      <h2>Choisir un thème</h2>
      <p>
        Sélectionnez un thème de couleurs pour personnaliser l'apparence de
        l'application. Chaque thème est optimisé pour la lisibilité et le
        confort visuel.
      </p>
      <div className="theme-selection-grid">
        {themes.map(themeOption => {
          const isSelected = theme === themeOption.id;
          return (
            <label
              key={themeOption.id}
              className={`theme-card ${isSelected ? 'theme-card--selected' : ''}`}
              style={
                {
                  '--theme-primary': themeOption.colors.primary,
                  '--theme-secondary': themeOption.colors.secondary,
                  '--theme-surface': themeOption.colors.surface,
                } as React.CSSProperties
              }
            >
              <div className="theme-card-header">
                <input
                  type="radio"
                  name="theme"
                  value={themeOption.id}
                  checked={isSelected}
                  onChange={() => setTheme(themeOption.id)}
                />
                <div>
                  <p className="theme-card-title">{themeOption.name}</p>
                  <p className="theme-card-description">
                    {themeOption.description}
                  </p>
                </div>
              </div>
              <div className="theme-preview">
                <div
                  className="theme-preview-primary"
                  style={{ backgroundColor: themeOption.colors.primary }}
                />
                <div
                  className="theme-preview-secondary"
                  style={{ backgroundColor: themeOption.colors.secondary }}
                />
                <div
                  className="theme-preview-surface"
                  style={{ backgroundColor: themeOption.colors.surface }}
                />
              </div>
            </label>
          );
        })}
      </div>
    </section>
  );

  const renderDebugSection = () => {
    return (
      <section>
        <h2>Panneau de Debug Gist</h2>
        <p>
          Le panneau de debug Gist est maintenant accessible depuis n'importe
          quelle page de l'application. Il reste visible même lorsque vous
          naviguez entre les différentes sections.
        </p>
        <p>
          Utilisez le panneau de debug pour suivre les opérations Gist en temps
          réel, voir les erreurs, et exporter les logs pour le diagnostic.
        </p>
        <button
          onClick={() => {
            // Toggle debug panel via custom event
            globalThis.dispatchEvent(
              new CustomEvent('toggle-gist-debug-panel')
            );
          }}
          className="btn-yellow"
          style={{ marginTop: '16px' }}
        >
          Afficher le Panneau de Debug
        </button>
      </section>
    );
  };

  const activePanel =
    activeSection === 'export'
      ? renderExportSection()
      : activeSection === 'gist'
        ? renderGistSection()
        : activeSection === 'theme'
          ? renderThemeSection()
          : renderDebugSection();

  return (
    <div className="settings-page">
      <div className="settings-shell">
        <nav
          className="settings-nav"
          role="tablist"
          aria-label="Sous-menu des paramètres"
        >
          {SECTIONS.map(section => {
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                id={`settings-tab-${section.id}`}
                role="tab"
                aria-selected={isActive}
                aria-controls="settings-panel"
                type="button"
                className={`settings-nav-item ${
                  isActive ? 'settings-nav-item--active' : ''
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="settings-nav-label">{section.label}</span>
                <span className="settings-nav-description">
                  {section.description}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="settings-main">
          <header className="settings-main-header" role="none">
            <h1>Paramètres</h1>
            <p>
              Gérez vos données locales et choisissez la source de vos decks.
            </p>
          </header>
          <div
            className="settings-card"
            role="tabpanel"
            id="settings-panel"
            aria-labelledby={`settings-tab-${activeSection}`}
          >
            {activePanel}
          </div>
        </div>
      </div>
    </div>
  );
}
