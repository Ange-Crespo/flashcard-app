/**
 * Shared utility for generating hash-based flashcard IDs
 * Used by both local decks and Gist flashcards to ensure consistency
 */

import type { Flashcard } from '../store';

/**
 * Simple string hash function for generating deterministic IDs
 * Creates a hash from the input string
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.codePointAt(i) ?? 0;
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive hex string
  const hex = Math.abs(hash).toString(16);
  return hex.padStart(8, '0').substring(0, 16);
}

/**
 * Generate a hash-based ID from a Flashcard object
 * Creates a deterministic ID based on the card's content
 * This ensures uniqueness and avoids ambiguity even if similar cards exist
 * Works with any deck type by using the final card structure
 *
 * @param card - The flashcard object to generate an ID for
 * @returns A hash-based ID in the format: {deckId}-{hash}
 */
export function generateCardHashId(card: Flashcard): string {
  const parts: string[] = [];

  // Add deck identifier
  if (card.deckId) {
    parts.push(card.deckId);
  }

  // Add front face content
  if (card.front) {
    parts.push('front', card.front.text || '');
    if (card.front.subText) parts.push(card.front.subText);
  }

  // Add back face content
  if (card.back) {
    parts.push('back', card.back.text || '');
    if (card.back.subText) parts.push(card.back.subText);
  }

  // Add category
  if (card.category) {
    parts.push('cat', card.category);
  }

  // Add sorted tags
  if (card.tags && card.tags.length > 0) {
    const sortedTags = [...card.tags].sort((a: string, b: string) =>
      a.localeCompare(b)
    );
    parts.push('tags', sortedTags.join(','));
  }

  // Add sorted metadata
  if (card.metadata) {
    const metaKeys = Object.keys(card.metadata).sort((a: string, b: string) =>
      a.localeCompare(b)
    );
    for (const key of metaKeys) {
      const value = card.metadata[key];
      if (value != null) {
        const valueStr = Array.isArray(value)
          ? [...value]
              .sort((a: string | number, b: string | number) =>
                String(a).localeCompare(String(b))
              )
              .join(',')
          : String(value);
        parts.push(`meta:${key}`, valueStr);
      }
    }
  }

  // Create content string
  const content = parts.filter(Boolean).join('|');

  // Generate hash
  if (!content || content === card.deckId) {
    // Fallback: use front and back text if available
    const fallback = [card.front?.text || '', card.back?.text || '']
      .filter(Boolean)
      .join('|');

    if (fallback) {
      return `${card.deckId || 'card'}-${simpleHash(fallback)}`;
    }
    // Last resort: use a hash of the card object (less ideal but ensures uniqueness)
    return `${card.deckId || 'card'}-${simpleHash(JSON.stringify(card))}`;
  }

  return `${card.deckId || 'card'}-${simpleHash(content)}`;
}
