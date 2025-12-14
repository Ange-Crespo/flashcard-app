import type {
  Flashcard,
  FlashcardExample,
  FlashcardMetadataValue,
} from '../store';
import { generateCardHashId } from '../utils/cardIdGenerator';

// Dynamically import all JSON files from data/cards folder
const cardFiles = import.meta.glob<{ default: unknown[] }>(
  '../../data/cards/**/*.json',
  { eager: true }
);

type DeckEntry = Record<string, unknown>;

type FieldResolver<T> = (entry: T, index: number) => string | undefined;
type ExampleResolver<T> = (
  entry: T,
  index: number
) => FlashcardExample[] | undefined;
type RecordResolver<T> = (
  entry: T,
  index: number
) => Record<string, FlashcardMetadataValue> | undefined;
type ExtrasResolver<T> = (
  entry: T,
  index: number
) => Record<string, unknown> | undefined;

type FaceConfig<T> = {
  title?: string;
  text: FieldResolver<T>;
  subText?: FieldResolver<T>;
  hint?: FieldResolver<T>;
};

export type DeckBuildOptions = {
  limit?: number;
  onlyUseful?: boolean;
};

type DeckDatasetConfig<T extends DeckEntry> = {
  deckId: string;
  deckName: string;
  language?: string;
  data: T[];
  front: FaceConfig<T>;
  back: FaceConfig<T>;
  category?: FieldResolver<T>;
  tags?: (entry: T, index: number) => string[] | undefined;
  metadata?: RecordResolver<T>;
  frontExamples?: ExampleResolver<T>;
  backExamples?: ExampleResolver<T>;
  sharedExamples?: ExampleResolver<T>;
  extras?: ExtrasResolver<T>;
  getId?: (entry: T, index: number) => string | undefined;
  filter?: (entry: T, index: number) => boolean;
  sort?: (a: Flashcard, b: Flashcard) => number;
  isUseful?: (entry: T, index: number) => boolean;
};

type LocalDeckBuilder = (options?: DeckBuildOptions) => Flashcard[];

const deckRegistry: Record<string, LocalDeckBuilder> = {};

function resolveFace<T>(
  entry: T,
  index: number,
  config: FaceConfig<T>,
  fallbackTitle: string
) {
  return {
    title: config.title ?? fallbackTitle,
    text: config.text(entry, index) ?? '',
    subText: config.subText?.(entry, index),
    hint: config.hint?.(entry, index),
  };
}

function createDeckBuilder<T extends DeckEntry>(
  config: DeckDatasetConfig<T>
): LocalDeckBuilder {
  return (options?: DeckBuildOptions) => {
    const limit = options?.limit;
    const onlyUseful = options?.onlyUseful ?? true;

    const filteredEntries = config.filter
      ? config.data.filter((entry, index) => config.filter!(entry, index))
      : [...config.data];

    const mapped = filteredEntries.map((entry, index) => {
      const metadata = config.metadata?.(entry, index);
      const extras = config.extras?.(entry, index);
      const useful = config.isUseful ? config.isUseful(entry, index) : true;

      // Build the card first (without ID)
      const card: Flashcard = {
        id: '', // Will be set after card is built
        deckId: config.deckId,
        deckName: config.deckName,
        language: config.language,
        category: config.category?.(entry, index),
        tags: config.tags?.(entry, index)?.filter(Boolean) ?? undefined,
        front: resolveFace(entry, index, config.front, 'Question'),
        back: resolveFace(entry, index, config.back, 'Answer'),
        metadata,
        frontExamples: config.frontExamples?.(entry, index),
        backExamples: config.backExamples?.(entry, index),
        examples: config.sharedExamples?.(entry, index),
        extras: extras ? { ...extras, useful } : { useful },
        rawFields: entry,
      };

      // Generate hash-based ID from the card content
      // If getId is provided, use it; otherwise generate hash from card
      const cardId = config.getId?.(entry, index) ?? generateCardHashId(card);
      card.id = cardId;

      return { card, useful };
    });

    let sorted = mapped;
    if (config.sort) {
      sorted = [...mapped].sort((a, b) => config.sort!(a.card, b.card));
    }

    const filtered = onlyUseful ? sorted.filter(item => item.useful) : sorted;

    const limited =
      typeof limit === 'number' ? filtered.slice(0, limit) : filtered;

    return limited.map(item => item.card);
  };
}

function registerLocalDeck(deckId: string, builder: LocalDeckBuilder) {
  deckRegistry[deckId] = builder;
}

function getString(entry: DeckEntry, key: string): string | undefined {
  const value = entry[key];
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : undefined;
}

function getNumber(entry: DeckEntry, key: string): number | undefined {
  const value = entry[key];
  return typeof value === 'number' ? value : undefined;
}

/**
 * Check if an entry is a Mandarin word entry
 */
function isMandarinEntry(entry: unknown): entry is DeckEntry {
  if (typeof entry !== 'object' || entry === null) return false;
  return 'word' in entry;
}

/**
 * Check if an entry is a SQuAD flashcard entry (converted format)
 */
function isSQuADEntry(entry: unknown): entry is DeckEntry {
  if (typeof entry !== 'object' || entry === null) return false;
  return 'question' in entry && 'answer' in entry;
}

// Load all card files and separate by format
function loadAllCardDecks() {
  const mandarinCards: DeckEntry[] = [];
  const squadCards: DeckEntry[] = [];

  // Process all imported JSON files
  for (const [, module] of Object.entries(cardFiles)) {
    const data = module.default;

    // Must be an array to process
    if (!Array.isArray(data)) continue;

    // Type assertion: we assume array items are DeckEntry-compatible
    const entries = data as DeckEntry[];

    // Check first entry to determine format
    if (entries.length > 0) {
      if (isMandarinEntry(entries[0])) {
        mandarinCards.push(...entries);
      } else if (isSQuADEntry(entries[0])) {
        squadCards.push(...entries);
      }
    }
  }

  return { mandarinCards, squadCards };
}

const { mandarinCards, squadCards } = loadAllCardDecks();

const mandarinDeckBuilder = createDeckBuilder({
  deckId: 'mandarin-core',
  deckName: 'Mandarin Core Vocabulary',
  language: 'mandarin',
  data: mandarinCards,
  front: {
    title: 'Mot',
    text: entry => getString(entry, 'word') ?? '',
    subText: entry => getString(entry, 'romanization'),
    hint: () => 'Touchez pour afficher la traduction',
  },
  back: {
    title: 'Traduction',
    text: entry => getString(entry, 'english_translation') ?? '',
    hint: () => 'Balayez à droite si vous le connaissez, à gauche sinon',
  },
  category: entry => getString(entry, 'cefr_level'),
  tags: entry => {
    const pos = getString(entry, 'pos');
    const cefr = getString(entry, 'cefr_level');
    return [pos, cefr].filter(Boolean) as string[] | undefined;
  },
  metadata: entry => {
    const metadata: Record<string, FlashcardMetadataValue> = {};
    const pos = getString(entry, 'pos');
    const cefr = getString(entry, 'cefr_level');
    const freq = getNumber(entry, 'word_frequency');
    if (pos) metadata['Part of Speech'] = pos;
    if (cefr) metadata['Level'] = cefr;
    if (typeof freq === 'number') metadata['Frequency Rank'] = freq;
    return Object.keys(metadata).length > 0 ? metadata : undefined;
  },
  frontExamples: entry => {
    const sentence = getString(entry, 'example_sentence_native');
    if (!sentence) return undefined;
    return [
      {
        label: 'Exemple',
        text: sentence,
      },
    ];
  },
  backExamples: entry => {
    const sentence = getString(entry, 'example_sentence_english');
    if (!sentence) return undefined;
    return [
      {
        label: 'Traduction',
        text: sentence,
      },
    ];
  },
  extras: entry => ({
    source: 'data/cards',
    word_frequency: getNumber(entry, 'word_frequency'),
    useful_for_flashcard: entry['useful_for_flashcard'],
  }),
  // getId is not provided, so generateCardHashId will be used automatically
  // based on the final card content
  isUseful: entry => entry['useful_for_flashcard'] !== false,
  sort: (a, b) => {
    const getRank = (card: Flashcard) => {
      const rank = card.metadata?.['Frequency Rank'];
      return typeof rank === 'number' ? rank : Number.POSITIVE_INFINITY;
    };
    return getRank(a) - getRank(b);
  },
});

registerLocalDeck('mandarin-core', mandarinDeckBuilder);

// Create SQuAD deck builder
const squadDeckBuilder = createDeckBuilder({
  deckId: 'squad-qa',
  deckName: 'Stanford Question Answering Dataset',
  language: 'english',
  data: squadCards,
  front: {
    title: 'Question',
    text: entry => getString(entry, 'question') ?? '',
    hint: () => 'Lisez la question et réfléchissez à la réponse',
  },
  back: {
    title: 'Réponse',
    text: entry => getString(entry, 'answer') ?? '',
    hint: () => 'Vérifiez votre réponse',
  },
  category: entry => getString(entry, 'title'),
  tags: entry => {
    const title = getString(entry, 'title');
    return title ? [title, 'QA', 'SQuAD'] : ['QA', 'SQuAD'];
  },
  metadata: entry => {
    const metadata: Record<string, FlashcardMetadataValue> = {};
    const title = getString(entry, 'title');
    const answerStart = getNumber(entry, 'answer_start');
    if (title) metadata['Topic'] = title;
    if (typeof answerStart === 'number')
      metadata['Answer Position'] = answerStart;
    return Object.keys(metadata).length > 0 ? metadata : undefined;
  },
  frontExamples: entry => {
    const context = getString(entry, 'context');
    if (!context) return undefined;
    // Show a truncated context as example
    const truncatedContext =
      context.length > 200 ? context.substring(0, 200) + '...' : context;
    return [
      {
        label: 'Contexte',
        text: truncatedContext,
      },
    ];
  },
  backExamples: entry => {
    const allAnswers = entry['all_answers'];
    if (!Array.isArray(allAnswers) || allAnswers.length <= 1) return undefined;
    return [
      {
        label: 'Autres réponses possibles',
        text: allAnswers.slice(1).join(', '),
      },
    ];
  },
  extras: entry => ({
    source: 'SQuAD',
    qa_id: getString(entry, 'qa_id'),
    context: getString(entry, 'context'),
    title: getString(entry, 'title'),
  }),
  isUseful: () => true, // All SQuAD entries are useful
});

registerLocalDeck('squad-qa', squadDeckBuilder);

export const DEFAULT_LOCAL_DECK_ID = 'mandarin-core';

export function getLocalDeckFlashcards(
  deckId: string,
  options?: DeckBuildOptions
): Flashcard[] {
  const builder = deckRegistry[deckId];
  if (!builder) {
    return [];
  }
  return builder(options);
}

export function listLocalDeckIds(): string[] {
  return Object.keys(deckRegistry);
}
