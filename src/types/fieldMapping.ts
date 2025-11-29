export type FaceFieldMapping = {
  textField: string;
  subTextField?: string;
  hintField?: string;
};

export type DeckExampleFieldMapping = {
  id: string;
  side: 'front' | 'back';
  textField: string;
  translationField?: string;
};

export type DeckFieldMapping = {
  deckId: string;
  front: FaceFieldMapping;
  back: FaceFieldMapping;
  examples: DeckExampleFieldMapping[];
  frontExamplesEnabled?: boolean;
  backExamplesEnabled?: boolean;
  sharedExamplesEnabled?: boolean;
  tagFields?: string[];
  tagsEnabled?: boolean;
  metadataFields?: string[];
  metadataEnabled?: boolean;
};
