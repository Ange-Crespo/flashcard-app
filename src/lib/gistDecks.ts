export type GistDeckDescriptor = {
  id: string;
  owner: string;
  name: string;
  description?: string;
  language?: string;
  sizeHint?: string;
  gistUrl: string;
  rawUrl?: string;
};

export const GIST_DECKS: GistDeckDescriptor[] = [
  {
    id: '2198c40a1181db1edc86727df7f86260',
    owner: 'Ange-Crespo',
    name: 'Mandarin Starter Deck',
    description: '500 cartes mandarin utilisées par défaut.',
    language: 'Mandarin Chinese',
    sizeHint: '≈500 cartes',
    gistUrl:
      'https://gist.github.com/Ange-Crespo/2198c40a1181db1edc86727df7f86260',
    rawUrl:
      'https://gist.githubusercontent.com/Ange-Crespo/2198c40a1181db1edc86727df7f86260/raw/flashcards.json',
  },
  {
    id: '764525884bff631696fc0a5025ce93d6',
    owner: 'Ange-Crespo',
    name: 'Mandarin Full Deck',
    description:
      'Jeu complet extrait de Language-Learning-decks. Inclut plus de 2 400 entrées.',
    language: 'Mandarin Chinese',
    sizeHint: '≈2 400 cartes',
    gistUrl:
      'https://gist.github.com/Ange-Crespo/764525884bff631696fc0a5025ce93d6',
    rawUrl:
      'https://gist.githubusercontent.com/Ange-Crespo/764525884bff631696fc0a5025ce93d6/raw/mandarin.json',
  },
];
