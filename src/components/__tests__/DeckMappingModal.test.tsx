import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { DeckMappingModal } from '../DeckMappingModal';
import React from 'react';
import type { DeckFieldMapping } from '../../types/fieldMapping';
import type { Flashcard } from '../../store';

const baseMapping: DeckFieldMapping = {
  deckId: 'demo-deck',
  front: {
    textField: '__front_text__',
    subTextField: '__front_sub__',
    hintField: '__front_hint__',
  },
  back: {
    textField: '__back_text__',
    subTextField: '__back_sub__',
    hintField: '__back_hint__',
  },
  examples: [
    {
      id: 'front-example',
      side: 'front',
      textField: '__front_example__0',
    },
  ],
  frontExamplesEnabled: true,
  backExamplesEnabled: true,
  tagFields: ['tags'],
  tagsEnabled: true,
  metadataFields: ['meta'],
  metadataEnabled: true,
};

const fieldOptions = [
  { value: '__front_text__', label: 'Front text' },
  { value: '__front_sub__', label: 'Front sub' },
  { value: '__front_hint__', label: 'Front hint' },
  { value: '__back_text__', label: 'Back text' },
  { value: '__back_sub__', label: 'Back sub' },
  { value: '__back_hint__', label: 'Back hint' },
  { value: '__front_example__0', label: 'Front example 1' },
  { value: '__front_example__1', label: 'Front example 2' },
  { value: '__back_example__0', label: 'Back example 1' },
  { value: 'tags', label: 'Tags' },
  { value: 'meta', label: 'Metadata' },
];

describe('DeckMappingModal', () => {
  it('renders field selectors and responds to user input', () => {
    const handleSave = vi.fn();

    render(
      <DeckMappingModal
        isOpen
        deckId="demo-deck"
        deckName="Demo Deck"
        fieldOptions={fieldOptions}
        initialMapping={baseMapping}
        onClose={vi.fn()}
        onSave={handleSave}
      />
    );

    const frontColumn = screen
      .getByText(/Question \(face avant\)/i)
      .closest('.mapping-column') as HTMLElement;
    const frontTextSelect =
      within(frontColumn).getByLabelText(/Texte principal/i);
    fireEvent.change(frontTextSelect, {
      target: { value: '__front_example__1' },
    });

    fireEvent.click(
      screen.getByRole('button', { name: /Enregistrer le mapping/i })
    );

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        front: expect.objectContaining({
          textField: '__front_example__1',
        }),
      })
    );
  });

  it('adds and removes example mappings', () => {
    render(
      <DeckMappingModal
        isOpen
        deckId="demo-deck"
        fieldOptions={fieldOptions}
        initialMapping={{
          ...baseMapping,
          examples: [],
        }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    fireEvent.click(
      screen.getAllByRole('button', { name: /Ajouter un exemple/i })[0]
    );

    fireEvent.click(screen.getByLabelText(/Supprimer cet exemple/i));

    expect(screen.queryByLabelText(/Champ texte/i)).not.toBeInTheDocument();
  });

  it('disables tag and metadata sections when toggled off', () => {
    render(
      <DeckMappingModal
        isOpen
        deckId="demo-deck"
        fieldOptions={fieldOptions}
        initialMapping={baseMapping}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText(/Afficher les tags/i));
    fireEvent.click(screen.getByLabelText(/Afficher les métadonnées/i));

    expect(
      screen.getByText(/Les tags ne seront pas affichés/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Les métadonnées ne seront pas affichées/i)
    ).toBeInTheDocument();
  });

  it('displays data preview section with sample card fields and JSON', () => {
    const sampleCard: Flashcard = {
      id: 'test-card-1',
      deckId: 'demo-deck',
      front: {
        title: 'Question',
        text: 'What is the capital of France?',
      },
      back: {
        title: 'Answer',
        text: 'Paris',
      },
      extras: {
        question: 'What is the capital of France?',
        answer: 'Paris',
        category: 'Geography',
        difficulty: 'easy',
        tags: ['france', 'capital'],
        metadata: {
          source: 'test',
          year: 2024,
        },
      },
    };

    render(
      <DeckMappingModal
        isOpen
        deckId="demo-deck"
        deckName="Demo Deck"
        fieldOptions={fieldOptions}
        initialMapping={baseMapping}
        sampleCard={sampleCard}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    // Check that data preview section is rendered
    expect(
      screen.getByText(/Structure des données \(exemple\)/i)
    ).toBeInTheDocument();

    // Check that fields are displayed (should show fields from extras)
    // Use getAllByText since the text appears in both helper and header
    const fieldsHeaders = screen.getAllByText(/Tous les champs disponibles/i);
    expect(fieldsHeaders.length).toBeGreaterThan(0);
    // Check that we have fields (should show count > 0)
    expect(
      screen.getByText(/Tous les champs disponibles \(\d+\)/i)
    ).toBeInTheDocument();

    // Check that JSON preview section exists
    const jsonHeader = screen.getByText(/JSON complet \(première carte\)/i);
    expect(jsonHeader).toBeInTheDocument();

    // Expand the JSON details
    const jsonDetails = screen.getByText(/Voir le JSON complet/i);
    fireEvent.click(jsonDetails);

    // Check that JSON content is displayed (should contain the actual question text)
    // The text appears in both field list and JSON, so use getAllByText
    const questionTexts = screen.getAllByText(
      /What is the capital of France\?/i
    );
    expect(questionTexts.length).toBeGreaterThan(0);

    // Check that JSON code block contains the full JSON structure
    const jsonCode = screen.getByText(
      /"question": "What is the capital of France\?"/i
    );
    expect(jsonCode).toBeInTheDocument();
    expect(screen.getByText(/"answer": "Paris"/i)).toBeInTheDocument();
  });

  it('displays empty state when sample card has no raw data', () => {
    const sampleCard: Flashcard = {
      id: 'test-card-2',
      deckId: 'demo-deck',
      front: {
        title: 'Question',
        text: 'Test question',
      },
      back: {
        title: 'Answer',
        text: 'Test answer',
      },
      // No extras or rawFields
    };

    render(
      <DeckMappingModal
        isOpen
        deckId="demo-deck"
        fieldOptions={fieldOptions}
        initialMapping={baseMapping}
        sampleCard={sampleCard}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    // Data preview section should still be rendered
    expect(
      screen.getByText(/Structure des données \(exemple\)/i)
    ).toBeInTheDocument();

    // Should show 0 fields
    expect(
      screen.getByText(/Tous les champs disponibles \(0\)/i)
    ).toBeInTheDocument();
  });
});
