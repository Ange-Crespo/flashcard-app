import {
  getCookieValue,
  setCookieValue,
  deleteCookieValue,
  listStoredKeys,
} from './cookies';
import type { DeckFieldMapping } from '../types/fieldMapping';

const COOKIE_PREFIX = 'flashcard_mapping_';

function getCookieName(deckId: string) {
  return `${COOKIE_PREFIX}${deckId}`;
}

export function loadDeckFieldMapping(deckId: string): DeckFieldMapping | null {
  const raw = getCookieValue(getCookieName(deckId));
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(raw)) as DeckFieldMapping;
  } catch {
    return null;
  }
}

export function saveDeckFieldMapping(mapping: DeckFieldMapping) {
  const encoded = encodeURIComponent(JSON.stringify(mapping));
  setCookieValue(getCookieName(mapping.deckId), encoded);
}

export function clearDeckFieldMapping(deckId: string) {
  deleteCookieValue(getCookieName(deckId));
}

export function loadAllDeckFieldMappings(): Record<string, DeckFieldMapping> {
  const mappings: Record<string, DeckFieldMapping> = {};
  const storageKeys = listStoredKeys(COOKIE_PREFIX);
  storageKeys.forEach(key => {
    const value = getCookieValue(key);
    if (!value) {
      return;
    }
    const deckId = key.replace(COOKIE_PREFIX, '');
    try {
      mappings[deckId] = JSON.parse(
        decodeURIComponent(value)
      ) as DeckFieldMapping;
    } catch {
      // ignore malformed entries
    }
  });

  return mappings;
}
