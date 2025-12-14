import { useEffect, useState, useMemo } from 'react';
import { X, Plus, Trash, Save, Info } from 'react-feather';
import type {
  DeckFieldMapping,
  DeckExampleFieldMapping,
} from '../types/fieldMapping';
import type { Flashcard } from '../store';
import { getRawFields } from '../utils/flashcardMapping';
import './DeckMappingModal.css';

type FieldOption = {
  value: string;
  label: string;
};

interface DeckMappingModalProps {
  isOpen: boolean;
  deckId: string;
  deckName?: string;
  fieldOptions: FieldOption[];
  initialMapping: DeckFieldMapping;
  sampleCard?: Flashcard; // Add sample card to show all fields and example data
  onClose: () => void;
  onSave: (mapping: DeckFieldMapping) => void;
}

export function DeckMappingModal({
  isOpen,
  deckId,
  deckName,
  fieldOptions,
  initialMapping,
  sampleCard,
  onClose,
  onSave,
}: DeckMappingModalProps) {
  const [frontTextField, setFrontTextField] = useState(
    initialMapping.front.textField
  );
  const [frontSubTextField, setFrontSubTextField] = useState(
    initialMapping.front.subTextField ?? ''
  );
  const [frontHintField, setFrontHintField] = useState(
    initialMapping.front.hintField ?? ''
  );

  const [backTextField, setBackTextField] = useState(
    initialMapping.back.textField
  );
  const [backSubTextField, setBackSubTextField] = useState(
    initialMapping.back.subTextField ?? ''
  );
  const [backHintField, setBackHintField] = useState(
    initialMapping.back.hintField ?? ''
  );

  const [exampleMappings, setExampleMappings] = useState<
    DeckExampleFieldMapping[]
  >(initialMapping.examples ?? []);
  const [frontExamplesEnabled, setFrontExamplesEnabled] = useState(
    initialMapping.frontExamplesEnabled ?? false
  );
  const [backExamplesEnabled, setBackExamplesEnabled] = useState(
    initialMapping.backExamplesEnabled ?? false
  );
  const [tagFields, setTagFields] = useState(initialMapping.tagFields ?? []);
  const [tagsEnabled, setTagsEnabled] = useState(
    initialMapping.tagsEnabled ?? (initialMapping.tagFields?.length ?? 0) > 0
  );
  const [metadataFields, setMetadataFields] = useState(
    initialMapping.metadataFields ?? []
  );
  const [metadataEnabled, setMetadataEnabled] = useState(
    initialMapping.metadataEnabled ??
      ((initialMapping.metadataFields?.length ?? 0) > 0 ||
        Boolean(initialMapping.metadataEnabled))
  );

  useEffect(() => {
    setFrontTextField(initialMapping.front.textField);
    setFrontSubTextField(initialMapping.front.subTextField ?? '');
    setFrontHintField(initialMapping.front.hintField ?? '');
    setBackTextField(initialMapping.back.textField);
    setBackSubTextField(initialMapping.back.subTextField ?? '');
    setBackHintField(initialMapping.back.hintField ?? '');
    setExampleMappings(initialMapping.examples ?? []);
    setFrontExamplesEnabled(initialMapping.frontExamplesEnabled ?? false);
    setBackExamplesEnabled(initialMapping.backExamplesEnabled ?? false);
    setTagFields(initialMapping.tagFields ?? []);
    setTagsEnabled(
      initialMapping.tagsEnabled ?? (initialMapping.tagFields?.length ?? 0) > 0
    );
    setMetadataFields(initialMapping.metadataFields ?? []);
    setMetadataEnabled(
      initialMapping.metadataEnabled ??
        ((initialMapping.metadataFields?.length ?? 0) > 0 ||
          Boolean(initialMapping.metadataEnabled))
    );
  }, [initialMapping]);

  // Extract all fields from the sample card (including nested ones)
  // Must be called before early return to follow Rules of Hooks
  const allFields = useMemo(() => {
    if (!sampleCard) return [];

    const fields: Array<{
      key: string;
      type: string;
      value: unknown;
      path: string;
    }> = [];

    // Get raw fields using the same logic as the mapping utility
    const rawFields = getRawFields(sampleCard);

    // Helper to recursively extract all fields
    const extractFields = (obj: unknown, prefix = '', path = ''): void => {
      if (obj === null || obj === undefined) return;

      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          const newPath = path ? `${path}[${index}]` : `[${index}]`;
          if (typeof item === 'object' && item !== null) {
            extractFields(item, prefix, newPath);
          } else {
            fields.push({
              key: prefix || newPath,
              type: Array.isArray(item) ? 'array' : typeof item,
              value: item,
              path: newPath,
            });
          }
        });
      } else if (typeof obj === 'object') {
        Object.entries(obj).forEach(([key, value]) => {
          const newPath = path ? `${path}.${key}` : key;
          const newPrefix = prefix ? `${prefix}.${key}` : key;

          if (value === null || value === undefined) {
            fields.push({ key: newPrefix, type: 'null', value, path: newPath });
          } else if (Array.isArray(value)) {
            fields.push({
              key: newPrefix,
              type: 'array',
              value,
              path: newPath,
            });
            extractFields(value, newPrefix, newPath);
          } else if (typeof value === 'object') {
            fields.push({
              key: newPrefix,
              type: 'object',
              value,
              path: newPath,
            });
            extractFields(value, newPrefix, newPath);
          } else {
            fields.push({
              key: newPrefix,
              type: typeof value,
              value,
              path: newPath,
            });
          }
        });
      }
    };

    extractFields(rawFields);

    // Also add metadata fields
    if (sampleCard.metadata) {
      Object.entries(sampleCard.metadata).forEach(([key, value]) => {
        fields.push({
          key: `metadata.${key}`,
          type: typeof value,
          value,
          path: `metadata.${key}`,
        });
      });
    }

    return fields.sort((a, b) => a.key.localeCompare(b.key));
  }, [sampleCard]);

  // Format JSON for display
  // Must be called before early return to follow Rules of Hooks
  const formattedJson = useMemo(() => {
    if (!sampleCard) return null;

    // Get raw fields using the same logic as the mapping utility
    const rawFields = getRawFields(sampleCard);

    // If no raw fields found, return empty object representation
    if (Object.keys(rawFields).length === 0) {
      return '{}';
    }

    try {
      return JSON.stringify(rawFields, null, 2);
    } catch {
      return JSON.stringify(rawFields);
    }
  }, [sampleCard]);

  const handleAddExample = (side: 'front' | 'back') => {
    setExampleMappings(prev => [
      ...prev,
      {
        id: `${side}_${Date.now()}`,
        side,
        textField: '',
      },
    ]);
  };

  const handleExampleChange = (
    id: string,
    field: 'textField' | 'translationField',
    value: string
  ) => {
    setExampleMappings(prev =>
      prev.map(example =>
        example.id === id ? { ...example, [field]: value } : example
      )
    );
  };

  const handleRemoveExample = (id: string) => {
    setExampleMappings(prev => prev.filter(example => example.id !== id));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!frontTextField || !backTextField) {
      return;
    }

    onSave({
      deckId,
      front: {
        textField: frontTextField,
        subTextField: frontSubTextField || undefined,
        hintField: frontHintField || undefined,
      },
      back: {
        textField: backTextField,
        subTextField: backSubTextField || undefined,
        hintField: backHintField || undefined,
      },
      examples: exampleMappings.filter(example => example.textField),
      frontExamplesEnabled,
      backExamplesEnabled,
      tagFields: tagsEnabled ? tagFields.filter(Boolean) : undefined,
      tagsEnabled,
      metadataFields: metadataEnabled
        ? metadataFields.filter(Boolean)
        : undefined,
      metadataEnabled,
    });
  };

  if (!isOpen) {
    return null;
  }

  const renderFieldSelect = (
    value: string,
    onChange: (val: string) => void,
    placeholder: string,
    required = false,
    selectId?: string
  ) => (
    <select
      id={selectId}
      value={value}
      onChange={e => onChange(e.target.value)}
      required={required}
    >
      <option value="">{placeholder}</option>
      {fieldOptions.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  const renderExampleList = (side: 'front' | 'back') => {
    const entries = exampleMappings.filter(example => example.side === side);
    return (
      <div className="mapping-section">
        <div className="mapping-section-header">
          <h4>
            {side === 'front'
              ? 'Exemples pour la question'
              : 'Exemples pour la réponse'}
          </h4>
          <div className="mapping-toggle-group">
            <label className="mapping-toggle">
              <input
                type="checkbox"
                checked={
                  side === 'front' ? frontExamplesEnabled : backExamplesEnabled
                }
                onChange={event =>
                  side === 'front'
                    ? setFrontExamplesEnabled(event.target.checked)
                    : setBackExamplesEnabled(event.target.checked)
                }
              />
              <span>Afficher les exemples</span>
            </label>
            <button
              type="button"
              onClick={() => handleAddExample(side)}
              disabled={
                side === 'front' ? !frontExamplesEnabled : !backExamplesEnabled
              }
            >
              <Plus size={14} />
              Ajouter un exemple
            </button>
          </div>
        </div>
        {!(side === 'front' ? frontExamplesEnabled : backExamplesEnabled) && (
          <p className="mapping-section-helper">
            Cette face n'affichera pas d'exemples tant que l'option n'est pas
            activée.
          </p>
        )}
        {entries.length === 0 &&
          (side === 'front' ? frontExamplesEnabled : backExamplesEnabled) && (
            <p className="mapping-section-helper">
              Aucun exemple configuré pour cette face.
            </p>
          )}
        {entries.map(example => (
          <div key={example.id} className="mapping-example-row">
            <div className="mapping-field-group">
              <label>Champ texte</label>
              {renderFieldSelect(
                example.textField,
                val => handleExampleChange(example.id, 'textField', val),
                'Sélectionner un champ',
                true
              )}
            </div>
            <div className="mapping-field-group">
              <label>Champ traduction (optionnel)</label>
              {renderFieldSelect(
                example.translationField ?? '',
                val => handleExampleChange(example.id, 'translationField', val),
                'Sélectionner un champ'
              )}
            </div>
            <button
              type="button"
              className="mapping-icon-button"
              onClick={() => handleRemoveExample(example.id)}
              aria-label="Supprimer cet exemple"
            >
              <Trash size={14} />
            </button>
          </div>
        ))}
      </div>
    );
  };

  const handleAddTagField = () => {
    setTagFields(prev => [...prev, '']);
  };

  const handleTagFieldChange = (index: number, value: string) => {
    setTagFields(prev =>
      prev.map((field, idx) => (idx === index ? value : field))
    );
  };

  const handleRemoveTagField = (index: number) => {
    setTagFields(prev => prev.filter((_, idx) => idx !== index));
  };

  const renderTagsSection = () => (
    <div className="mapping-section">
      <div className="mapping-section-header">
        <h4>Tags</h4>
        <div className="mapping-toggle-group">
          <label className="mapping-toggle">
            <input
              type="checkbox"
              checked={tagsEnabled}
              onChange={event => setTagsEnabled(event.target.checked)}
            />
            <span>Afficher les tags</span>
          </label>
          <button
            type="button"
            onClick={handleAddTagField}
            disabled={!tagsEnabled}
          >
            <Plus size={14} />
            Ajouter un champ
          </button>
        </div>
      </div>
      {!tagsEnabled && (
        <p className="mapping-section-helper">
          Les tags ne seront pas affichés tant que cette option n'est pas
          activée.
        </p>
      )}
      {tagsEnabled && tagFields.length === 0 && (
        <p className="mapping-section-helper">
          Aucun champ sélectionné pour les tags. Seuls les tags existants du
          deck seront affichés.
        </p>
      )}
      {tagsEnabled &&
        tagFields.map((field, index) => (
          <div key={`tag-field-${index}`} className="mapping-example-row">
            <div className="mapping-field-group mapping-field-group--full">
              <label>Champ de tag #{index + 1}</label>
              {renderFieldSelect(
                field,
                value => handleTagFieldChange(index, value),
                'Sélectionner un champ'
              )}
            </div>
            <button
              type="button"
              className="mapping-icon-button"
              onClick={() => handleRemoveTagField(index)}
              aria-label="Supprimer ce champ de tag"
            >
              <Trash size={14} />
            </button>
          </div>
        ))}
    </div>
  );

  const handleAddMetadataField = () => {
    setMetadataFields(prev => [...prev, '']);
  };

  const handleMetadataFieldChange = (index: number, value: string) => {
    setMetadataFields(prev =>
      prev.map((field, idx) => (idx === index ? value : field))
    );
  };

  const handleRemoveMetadataField = (index: number) => {
    setMetadataFields(prev => prev.filter((_, idx) => idx !== index));
  };

  const renderMetadataSection = () => (
    <div className="mapping-section">
      <div className="mapping-section-header">
        <h4>Métadonnées</h4>
        <div className="mapping-toggle-group">
          <label className="mapping-toggle">
            <input
              type="checkbox"
              checked={metadataEnabled}
              onChange={event => setMetadataEnabled(event.target.checked)}
            />
            <span>Afficher les métadonnées</span>
          </label>
          <button
            type="button"
            onClick={handleAddMetadataField}
            disabled={!metadataEnabled}
          >
            <Plus size={14} />
            Ajouter un champ
          </button>
        </div>
      </div>
      {!metadataEnabled && (
        <p className="mapping-section-helper">
          Les métadonnées ne seront pas affichées tant que cette option n'est
          pas activée.
        </p>
      )}
      {metadataEnabled && metadataFields.length === 0 && (
        <p className="mapping-section-helper">
          Aucun champ supplémentaire sélectionné. Le deck utilisera uniquement
          ses métadonnées natives.
        </p>
      )}
      {metadataEnabled &&
        metadataFields.map((field, index) => (
          <div key={`metadata-field-${index}`} className="mapping-example-row">
            <div className="mapping-field-group mapping-field-group--full">
              <label>Champ de métadonnée #{index + 1}</label>
              {renderFieldSelect(
                field,
                value => handleMetadataFieldChange(index, value),
                'Sélectionner un champ'
              )}
            </div>
            <button
              type="button"
              className="mapping-icon-button"
              onClick={() => handleRemoveMetadataField(index)}
              aria-label="Supprimer ce champ de métadonnée"
            >
              <Trash size={14} />
            </button>
          </div>
        ))}
    </div>
  );

  const renderDataPreviewSection = () => {
    if (!sampleCard) return null;

    return (
      <div className="mapping-section mapping-section--data-preview">
        <div className="mapping-section-header">
          <h4>
            <Info size={16} />
            Structure des données (exemple)
          </h4>
        </div>
        <p className="mapping-section-helper">
          Voici tous les champs disponibles dans la première carte de ce deck.
          Utilisez ces informations pour configurer le mapping.
        </p>

        <div className="mapping-data-preview">
          <div className="mapping-fields-list">
            <h5>Tous les champs disponibles ({allFields.length})</h5>
            <div className="mapping-fields-grid">
              {allFields.map((field, index) => {
                let displayValue: string;
                if (typeof field.value === 'string') {
                  displayValue =
                    field.value.length > 50
                      ? `${field.value.substring(0, 50)}...`
                      : field.value;
                } else if (
                  typeof field.value === 'object' &&
                  field.value !== null
                ) {
                  const jsonStr = JSON.stringify(field.value);
                  displayValue =
                    jsonStr.length > 50
                      ? `${jsonStr.substring(0, 50)}...`
                      : jsonStr;
                } else {
                  displayValue = String(field.value);
                }

                return (
                  <div
                    key={`field-${field.key}-${index}`}
                    className="mapping-field-item"
                  >
                    <div className="mapping-field-key">
                      <code>{field.key}</code>
                      <span className="mapping-field-type">{field.type}</span>
                    </div>
                    <div className="mapping-field-value">{displayValue}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {formattedJson && (
            <div className="mapping-json-preview">
              <h5>JSON complet (première carte)</h5>
              <details>
                <summary>Voir le JSON complet</summary>
                <pre className="mapping-json-code">
                  <code>{formattedJson}</code>
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mapping-modal-overlay">
      <div className="mapping-modal">
        <div className="mapping-modal-header">
          <div>
            <h3>Configurer les champs du deck</h3>
            <p>{deckName || deckId}</p>
          </div>
          <button
            className="mapping-icon-button"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>
        <form className="mapping-form" onSubmit={handleSubmit}>
          <div className="mapping-columns">
            <div className="mapping-column">
              <h4>Question (face avant)</h4>
              <div className="mapping-field-group">
                <label htmlFor="front-text-field">Texte principal</label>
                {renderFieldSelect(
                  frontTextField,
                  setFrontTextField,
                  'Sélectionner un champ',
                  true,
                  'front-text-field'
                )}
              </div>
              <div className="mapping-field-group">
                <label>Sous-texte (optionnel)</label>
                {renderFieldSelect(
                  frontSubTextField,
                  setFrontSubTextField,
                  'Sélectionner un champ',
                  false,
                  'front-sub-field'
                )}
              </div>
              <div className="mapping-field-group">
                <label>Indice (optionnel)</label>
                {renderFieldSelect(
                  frontHintField,
                  setFrontHintField,
                  'Sélectionner un champ',
                  false,
                  'front-hint-field'
                )}
              </div>
            </div>
            <div className="mapping-column">
              <h4>Réponse (face arrière)</h4>
              <div className="mapping-field-group">
                <label htmlFor="back-text-field">Texte principal</label>
                {renderFieldSelect(
                  backTextField,
                  setBackTextField,
                  'Sélectionner un champ',
                  true,
                  'back-text-field'
                )}
              </div>
              <div className="mapping-field-group">
                <label htmlFor="back-sub-field">Sous-texte (optionnel)</label>
                {renderFieldSelect(
                  backSubTextField,
                  setBackSubTextField,
                  'Sélectionner un champ',
                  false,
                  'back-sub-field'
                )}
              </div>
              <div className="mapping-field-group">
                <label htmlFor="back-hint-field">Indice (optionnel)</label>
                {renderFieldSelect(
                  backHintField,
                  setBackHintField,
                  'Sélectionner un champ',
                  false,
                  'back-hint-field'
                )}
              </div>
            </div>
          </div>

          {renderDataPreviewSection()}

          {renderExampleList('front')}
          {renderExampleList('back')}
          {renderTagsSection()}
          {renderMetadataSection()}

          <div className="mapping-actions">
            <button
              type="button"
              className="mapping-secondary-button"
              onClick={onClose}
            >
              Annuler
            </button>
            <button type="submit" className="mapping-primary-button">
              <Save size={16} />
              Enregistrer le mapping
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
