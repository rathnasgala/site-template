import { readFile } from 'node:fs/promises';

export const EMPTY_ENGAGEMENT = Object.freeze({
  available: false,
  reactions: null,
  comments: null,
  views: null,
  activeReadingSeconds: null
});

export async function readEngagementSnapshot(file) {
  let source;
  try {
    source = await readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { schemaVersion: 1, refreshedAt: null, articles: {} };
    }
    throw error;
  }

  let snapshot;
  try {
    snapshot = JSON.parse(source);
  } catch (error) {
    throw new TypeError(`Invalid engagement snapshot JSON: ${error.message}`);
  }

  if (snapshot?.schemaVersion !== 1 || snapshot.articles == null || Array.isArray(snapshot.articles)) {
    throw new TypeError('Unsupported engagement snapshot schema');
  }
  return snapshot;
}

export function engagementFor(snapshot, articleId) {
  const entry = snapshot.articles[articleId];
  if (entry == null) return EMPTY_ENGAGEMENT;
  const activeReadingSeconds = entry.activeReadingSeconds ?? 0;

  for (const [field, value] of Object.entries({
    reactions: entry.reactions,
    comments: entry.comments,
    views: entry.views,
    activeReadingSeconds
  })) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new TypeError(`Invalid ${field} count for article ${articleId}`);
    }
  }

  return Object.freeze({ available: true, ...entry, activeReadingSeconds });
}
