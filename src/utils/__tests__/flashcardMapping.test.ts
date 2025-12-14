import { describe, it, expect } from 'vitest';
import { getDefaultMapping, applyDeckFieldMapping } from '../flashcardMapping';
import type { Flashcard } from '../../store';

const baseCard: Flashcard = {
  id: 'card-1',
  deckId: 'demo',
  front: {
    title: 'Front',
    text: 'Hello',
    subText: 'Front sub',
    hint: 'front hint',
  },
  back: {
    title: 'Back',
    text: 'World',
    subText: 'Back sub',
    hint: 'back hint',
  },
  tags: ['default'],
  metadata: {
    Level: 'A1',
  },
  frontExamples: [{ text: 'Bonjour', translation: 'Hello' }],
  backExamples: [{ text: 'Monde', translation: 'World' }],
  rawFields: {
    customFront: 'Custom Front',
    customBack: 'Custom Back',
    customTag: 'tag-one,tag-two',
  },
};

describe('flashcard mapping utils', () => {
  it('includes metadata fields in default mapping when metadata exists', () => {
    const mapping = getDefaultMapping(baseCard, 'demo');
    expect(mapping.metadataFields).toContain('__metadata__Level');
    // frontExamplesEnabled defaults to false unless examples are explicitly configured
    expect(mapping.frontExamplesEnabled).toBe(false);
    expect(mapping.backExamplesEnabled).toBe(false);
  });

  it('applies mapping overrides for text, metadata, tags, and examples', () => {
    const mapping = getDefaultMapping(baseCard, 'demo');
    mapping.front.textField = 'customFront';
    mapping.back.textField = 'customBack';
    mapping.tagsEnabled = true;
    mapping.tagFields = ['customTag'];
    mapping.metadataEnabled = true;
    mapping.metadataFields = ['customFront'];
    mapping.frontExamplesEnabled = true;
    mapping.examples = [
      {
        id: 'custom-front-example',
        side: 'front',
        textField: '__front_example__0',
        translationField: '__front_example_translation__0',
      },
    ];

    const result = applyDeckFieldMapping(baseCard, mapping);
    expect(result.front?.text).toBe('Custom Front');
    expect(result.back?.text).toBe('Custom Back');
    expect(result.tags).toEqual(['default', 'tag-one', 'tag-two']);
    expect(result.metadata?.customFront).toBe('Custom Front');
    // The translation comes from the original card's frontExamples[0].translation
    expect(result.frontExamples?.[0].translation).toBe('Hello');
  });

  it('respects toggles to disable metadata, tags, and examples', () => {
    const mapping = getDefaultMapping(baseCard, 'demo');
    mapping.tagsEnabled = false;
    mapping.metadataEnabled = false;
    mapping.frontExamplesEnabled = false;
    mapping.backExamplesEnabled = false;
    mapping.sharedExamplesEnabled = false;

    const result = applyDeckFieldMapping(baseCard, mapping);
    expect(result.tags).toBeUndefined();
    expect(result.metadata).toBeUndefined();
    expect(result.frontExamples).toBeUndefined();
    expect(result.backExamples).toBeUndefined();
    expect(result.examples).toBeUndefined();
  });
});
