import type { Flashcard, FlashcardExample } from '../store';
import type {
  DeckFieldMapping,
  DeckExampleFieldMapping,
} from '../types/fieldMapping';

type FieldOption = {
  value: string;
  label: string;
};

const SPECIAL_FIELDS = {
  FRONT_TEXT: '__front_text__',
  FRONT_SUBTEXT: '__front_subtext__',
  FRONT_HINT: '__front_hint__',
  BACK_TEXT: '__back_text__',
  BACK_SUBTEXT: '__back_subtext__',
  BACK_HINT: '__back_hint__',
  METADATA_PREFIX: '__metadata__',
  FRONT_EXAMPLE_PREFIX: '__front_example__',
  BACK_EXAMPLE_PREFIX: '__back_example__',
  FRONT_EXAMPLE_TRANSLATION_PREFIX: '__front_example_translation__',
  BACK_EXAMPLE_TRANSLATION_PREFIX: '__back_example_translation__',
} as const;

export const specialFieldOptions: FieldOption[] = [
  { value: SPECIAL_FIELDS.FRONT_TEXT, label: 'Question (existant)' },
  { value: SPECIAL_FIELDS.FRONT_SUBTEXT, label: 'Question - sous texte' },
  { value: SPECIAL_FIELDS.FRONT_HINT, label: 'Question - indice' },
  { value: SPECIAL_FIELDS.BACK_TEXT, label: 'Réponse (existante)' },
  { value: SPECIAL_FIELDS.BACK_SUBTEXT, label: 'Réponse - sous texte' },
  { value: SPECIAL_FIELDS.BACK_HINT, label: 'Réponse - indice' },
];

function getRawFields(card: Flashcard): Record<string, unknown> {
  if (card.rawFields) {
    return card.rawFields;
  }
  const rawFromExtras = card.extras?.raw;
  if (rawFromExtras && typeof rawFromExtras === 'object') {
    return rawFromExtras as Record<string, unknown>;
  }
  return {};
}

function getFieldValue(card: Flashcard, field?: string): string | undefined {
  if (!field) return undefined;
  const raw = getRawFields(card);

  switch (field) {
    case SPECIAL_FIELDS.FRONT_TEXT:
      return card.front?.text;
    case SPECIAL_FIELDS.FRONT_SUBTEXT:
      return card.front?.subText;
    case SPECIAL_FIELDS.FRONT_HINT:
      return card.front?.hint;
    case SPECIAL_FIELDS.BACK_TEXT:
      return card.back?.text;
    case SPECIAL_FIELDS.BACK_SUBTEXT:
      return card.back?.subText;
    case SPECIAL_FIELDS.BACK_HINT:
      return card.back?.hint;
    default:
      if (field.startsWith(SPECIAL_FIELDS.METADATA_PREFIX)) {
        const key = field.replace(SPECIAL_FIELDS.METADATA_PREFIX, '');
        return card.metadata
          ? String(card.metadata[key] ?? '') || undefined
          : undefined;
      }
      if (field.startsWith(SPECIAL_FIELDS.FRONT_EXAMPLE_PREFIX)) {
        const index = Number(
          field.replace(SPECIAL_FIELDS.FRONT_EXAMPLE_PREFIX, '')
        );
        return card.frontExamples?.[index]?.text;
      }
      if (field.startsWith(SPECIAL_FIELDS.BACK_EXAMPLE_PREFIX)) {
        const index = Number(
          field.replace(SPECIAL_FIELDS.BACK_EXAMPLE_PREFIX, '')
        );
        return card.backExamples?.[index]?.text;
      }
      if (field.startsWith(SPECIAL_FIELDS.FRONT_EXAMPLE_TRANSLATION_PREFIX)) {
        const index = Number(
          field.replace(SPECIAL_FIELDS.FRONT_EXAMPLE_TRANSLATION_PREFIX, '')
        );
        return card.frontExamples?.[index]?.translation;
      }
      if (field.startsWith(SPECIAL_FIELDS.BACK_EXAMPLE_TRANSLATION_PREFIX)) {
        const index = Number(
          field.replace(SPECIAL_FIELDS.BACK_EXAMPLE_TRANSLATION_PREFIX, '')
        );
        return card.backExamples?.[index]?.translation;
      }
      break;
  }

  const value = raw[field];
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map(item => (typeof item === 'string' ? item : JSON.stringify(item)))
      .join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return undefined;
}

function getAvailableRawFields(card: Flashcard): FieldOption[] {
  const raw = getRawFields(card);
  return Object.keys(raw)
    .filter(key => {
      const value = raw[key];
      return (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      );
    })
    .map(key => ({
      value: key,
      label: key,
    }));
}

export function getAvailableFieldOptions(card: Flashcard): FieldOption[] {
  const options: FieldOption[] = [
    ...specialFieldOptions,
    ...getAvailableRawFields(card),
  ];

  if (card.metadata) {
    Object.keys(card.metadata).forEach(key => {
      options.push({
        value: `${SPECIAL_FIELDS.METADATA_PREFIX}${key}`,
        label: `Métadonnée: ${key}`,
      });
    });
  }

  if (card.frontExamples) {
    card.frontExamples.forEach((example, index) => {
      options.push({
        value: `${SPECIAL_FIELDS.FRONT_EXAMPLE_PREFIX}${index}`,
        label: `Exemple question #${index + 1}`,
      });
      if (example.translation) {
        options.push({
          value: `${SPECIAL_FIELDS.FRONT_EXAMPLE_TRANSLATION_PREFIX}${index}`,
          label: `Exemple question #${index + 1} (traduction)`,
        });
      }
    });
  }

  if (card.backExamples) {
    card.backExamples.forEach((example, index) => {
      options.push({
        value: `${SPECIAL_FIELDS.BACK_EXAMPLE_PREFIX}${index}`,
        label: `Exemple réponse #${index + 1}`,
      });
      if (example.translation) {
        options.push({
          value: `${SPECIAL_FIELDS.BACK_EXAMPLE_TRANSLATION_PREFIX}${index}`,
          label: `Exemple réponse #${index + 1} (traduction)`,
        });
      }
    });
  }

  return options;
}

export function getDefaultMapping(
  card: Flashcard,
  deckId: string
): DeckFieldMapping {
  const defaultExampleMappings: DeckExampleFieldMapping[] = [];

  card.frontExamples?.forEach((example, index) => {
    defaultExampleMappings.push({
      id: `front_example_${index}`,
      side: 'front',
      textField: `${SPECIAL_FIELDS.FRONT_EXAMPLE_PREFIX}${index}`,
      translationField: example.translation
        ? `${SPECIAL_FIELDS.FRONT_EXAMPLE_TRANSLATION_PREFIX}${index}`
        : undefined,
    });
  });

  card.backExamples?.forEach((example, index) => {
    defaultExampleMappings.push({
      id: `back_example_${index}`,
      side: 'back',
      textField: `${SPECIAL_FIELDS.BACK_EXAMPLE_PREFIX}${index}`,
      translationField: example.translation
        ? `${SPECIAL_FIELDS.BACK_EXAMPLE_TRANSLATION_PREFIX}${index}`
        : undefined,
    });
  });

  return {
    deckId,
    front: {
      textField: SPECIAL_FIELDS.FRONT_TEXT,
      subTextField: SPECIAL_FIELDS.FRONT_SUBTEXT,
      hintField: SPECIAL_FIELDS.FRONT_HINT,
    },
    back: {
      textField: SPECIAL_FIELDS.BACK_TEXT,
      subTextField: SPECIAL_FIELDS.BACK_SUBTEXT,
      hintField: SPECIAL_FIELDS.BACK_HINT,
    },
    examples: defaultExampleMappings,
    frontExamplesEnabled: (card.frontExamples?.length ?? 0) > 0,
    backExamplesEnabled: (card.backExamples?.length ?? 0) > 0,
    sharedExamplesEnabled: (card.examples?.length ?? 0) > 0,
    tagFields: [],
    tagsEnabled: (card.tags?.length ?? 0) > 0,
    metadataFields: card.metadata
      ? Object.keys(card.metadata).map(
          key => `${SPECIAL_FIELDS.METADATA_PREFIX}${key}`
        )
      : [],
    metadataEnabled: card.metadata
      ? Object.keys(card.metadata).length > 0
      : false,
  };
}

function mapExamples(
  card: Flashcard,
  exampleMappings: DeckExampleFieldMapping[],
  targetSide: 'front' | 'back'
): FlashcardExample[] {
  return exampleMappings
    .filter(example => example.side === targetSide)
    .flatMap(example => {
      const text = getFieldValue(card, example.textField);
      if (!text) {
        return [];
      }
      return [
        {
          label:
            targetSide === 'front' ? 'Exemple (Question)' : 'Exemple (Réponse)',
          text,
          translation: getFieldValue(card, example.translationField),
        },
      ];
    });
}

export function applyDeckFieldMapping(
  card: Flashcard,
  mapping: DeckFieldMapping | null
): Flashcard {
  if (!mapping) {
    return card;
  }

  const resolvedFront = {
    title: card.front?.title ?? 'Question',
    text:
      getFieldValue(card, mapping.front.textField) ?? card.front?.text ?? '',
    subText:
      getFieldValue(card, mapping.front.subTextField) ?? card.front?.subText,
    hint: getFieldValue(card, mapping.front.hintField) ?? card.front?.hint,
  };

  const resolvedBack = {
    title: card.back?.title ?? 'Answer',
    text: getFieldValue(card, mapping.back.textField) ?? card.back?.text ?? '',
    subText:
      getFieldValue(card, mapping.back.subTextField) ?? card.back?.subText,
    hint: getFieldValue(card, mapping.back.hintField) ?? card.back?.hint,
  };

  const derivedFrontExamples = mapping.examples.length
    ? mapExamples(card, mapping.examples, 'front')
    : [];
  const derivedBackExamples = mapping.examples.length
    ? mapExamples(card, mapping.examples, 'back')
    : [];

  const combinedFrontExamples = [
    ...derivedFrontExamples,
    ...(card.frontExamples ?? []),
  ];
  const combinedBackExamples = [
    ...derivedBackExamples,
    ...(card.backExamples ?? []),
  ];

  const frontExamples =
    mapping.frontExamplesEnabled === false
      ? undefined
      : combinedFrontExamples.length > 0
        ? combinedFrontExamples
        : undefined;
  const backExamples =
    mapping.backExamplesEnabled === false
      ? undefined
      : combinedBackExamples.length > 0
        ? combinedBackExamples
        : undefined;
  const sharedExamples =
    mapping.sharedExamplesEnabled === false ? undefined : card.examples;

  const mappedTagFields =
    mapping.tagsEnabled === false ? [] : (mapping.tagFields ?? []);
  const mappedTags = mappedTagFields.flatMap(field => {
    const value = getFieldValue(card, field);
    if (!value) return [];
    return value
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean);
  });

  const tags =
    mapping.tagsEnabled === false
      ? undefined
      : [...new Set([...(card.tags ?? []), ...mappedTags])];

  const mappedMetadataFields =
    mapping.metadataEnabled === false ? [] : (mapping.metadataFields ?? []);
  let metadata =
    mapping.metadataEnabled === false
      ? undefined
      : card.metadata
        ? { ...card.metadata }
        : undefined;

  mappedMetadataFields.forEach(field => {
    const value = getFieldValue(card, field);
    if (!value) return;
    if (!metadata) {
      metadata = {};
    }
    metadata[field] = value;
  });

  return {
    ...card,
    front: resolvedFront,
    back: resolvedBack,
    frontExamples,
    backExamples,
    examples: sharedExamples,
    tags,
    metadata,
  };
}
