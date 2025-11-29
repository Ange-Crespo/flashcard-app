import type { GistDeckDescriptor } from './gistDecks';

type GistIdentifier = {
  id: string;
  owner?: string;
};

function normalizeIdentifier(input: string): string {
  return input.trim();
}

function parseGistIdentifier(input: string): GistIdentifier {
  const trimmed = normalizeIdentifier(input);
  if (!trimmed) {
    throw new Error('Veuillez fournir un identifiant ou une URL de Gist.');
  }

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split('/').filter(Boolean);
    if (segments.length >= 2) {
      return { owner: segments[0], id: segments[1] };
    }
    if (segments.length === 1) {
      return { id: segments[0] };
    }
  } catch {
    // not a URL, continue
  }

  const sanitized = trimmed.replace(/^\/+|\/+$/g, '');
  const parts = sanitized.split('/').filter(Boolean);
  if (parts.length >= 2) {
    return { owner: parts[parts.length - 2], id: parts[parts.length - 1] };
  }

  return { id: sanitized };
}

export async function fetchGistDeckCatalog(
  identifier: string,
  preferredFileName: string = 'decks.json'
): Promise<{
  decks: GistDeckDescriptor[];
  owner?: string;
  id: string;
  source: string;
}> {
  const { id, owner } = parseGistIdentifier(identifier);
  if (!id) {
    throw new Error("Impossible d'extraire l'identifiant du Gist.");
  }

  const apiResponse = await fetch(`https://api.github.com/gists/${id}`, {
    mode: 'cors',
    credentials: 'omit',
    headers: {
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!apiResponse.ok) {
    throw new Error(
      `Impossible de charger le Gist (${apiResponse.status} - ${apiResponse.statusText}).`
    );
  }
  const data = (await apiResponse.json()) as {
    owner?: { login?: string };
    files: Record<
      string,
      {
        filename?: string;
        content?: string;
        raw_url?: string;
      }
    >;
    html_url?: string;
  };

  const fileCandidates = Object.values(data.files ?? {});
  if (fileCandidates.length === 0) {
    throw new Error('Ce Gist ne contient aucun fichier exploitable.');
  }

  const matchedFile =
    fileCandidates.find(file => file.filename === preferredFileName) ??
    fileCandidates.find(file => file.filename?.endsWith('.json')) ??
    fileCandidates[0];

  if (!matchedFile) {
    throw new Error('Impossible de trouver un fichier JSON dans ce Gist.');
  }

  let content = matchedFile.content;
  if (!content && matchedFile.raw_url) {
    let rawResponse: Response;
    try {
      rawResponse = await fetch(matchedFile.raw_url, {
        mode: 'cors',
        credentials: 'omit',
      });
    } catch (fetchError) {
      if (
        fetchError instanceof TypeError &&
        fetchError.message.includes('fetch')
      ) {
        throw new Error(
          'Erreur de connexion lors de la récupération du fichier. Vérifiez votre connexion internet ou les paramètres CORS.'
        );
      }
      throw fetchError;
    }
    if (!rawResponse.ok) {
      throw new Error('Impossible de récupérer le contenu brut du Gist.');
    }
    content = await rawResponse.text();
  }

  if (!content) {
    throw new Error('Le fichier du Gist est vide.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('Le fichier JSON du Gist est invalide.');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Le JSON du Gist doit être une liste de decks.');
  }

  const decks: GistDeckDescriptor[] = parsed.map(item => ({
    id: item.id,
    owner: item.owner ?? data.owner?.login ?? owner ?? 'inconnu',
    name: item.name,
    description: item.description,
    language: item.language,
    sizeHint: item.sizeHint,
    gistUrl:
      item.gistUrl ??
      `https://gist.github.com/${item.owner ?? data.owner?.login ?? owner}/${item.id}`,
    rawUrl: item.rawUrl,
  }));

  return {
    decks,
    id,
    owner: data.owner?.login ?? owner,
    source:
      data.html_url ??
      `https://gist.github.com/${data.owner?.login ?? owner ?? 'gist'}/${id}`,
  };
}

const CATALOG_STORAGE_KEY = 'custom_gist_deck_catalog';

export type StoredCatalog = {
  decks: GistDeckDescriptor[];
  sourceLabel?: string;
};

export function readStoredCatalog(): StoredCatalog | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(CATALOG_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as StoredCatalog;
  } catch {
    return null;
  }
}

export function persistCatalog(
  decks: GistDeckDescriptor[],
  sourceLabel?: string
) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CATALOG_STORAGE_KEY,
      JSON.stringify({ decks, sourceLabel })
    );
  } catch {
    // ignore
  }
}
