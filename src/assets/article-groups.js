function canonicalLanguage(value) {
  try {
    return Intl.getCanonicalLocales(String(value))[0];
  } catch {
    return String(value ?? '');
  }
}

function languageLabel(language) {
  try {
    return new Intl.DisplayNames([language], { type: 'language' }).of(language) ?? language;
  } catch {
    return language;
  }
}

function postDirectory(source) {
  const normalized = String(source ?? '').replaceAll('\\', '/');
  return normalized.slice(0, Math.max(0, normalized.lastIndexOf('/')));
}

function articleKey(entry, index) {
  if (entry?.id != null && String(entry.id) !== '') return `id:${entry.id}`;
  const directory = postDirectory(entry?.source);
  return directory === '' ? `entry:${index}` : `source:${directory}`;
}

function orderedVariants(variants, preferredLanguage) {
  const preferred = canonicalLanguage(preferredLanguage);
  return [...variants].sort((left, right) => {
    const leftPublished = left.publicationState === 'published';
    const rightPublished = right.publicationState === 'published';
    if (leftPublished !== rightPublished) return leftPublished ? -1 : 1;
    const leftPreferred = canonicalLanguage(left.language) === preferred;
    const rightPreferred = canonicalLanguage(right.language) === preferred;
    if (leftPreferred !== rightPreferred) return leftPreferred ? -1 : 1;
    return canonicalLanguage(left.language).localeCompare(canonicalLanguage(right.language));
  });
}

function describeGroups(groups, preferredLanguage) {
  return groups.map((variants) => {
    const ordered = orderedVariants(variants, preferredLanguage);
    const primary = ordered[0];
    return {
      id: primary?.id ?? null,
      primary,
      variants: ordered.map((variant) => ({
        ...variant,
        languageLabel: languageLabel(variant.language)
      }))
    };
  });
}

export function groupManifestPosts(posts, defaultLanguage, preview = false) {
  const groups = new Map();
  posts.forEach((post, index) => {
    if (post.publicationState !== 'published'
        && !(preview && post.publicationState === 'not-emitted')) return;
    const key = articleKey(post, index);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(post);
  });
  return describeGroups([...groups.values()], defaultLanguage);
}

export function groupSearchMatches(entries, matches, preferredLanguage) {
  const matchedKeys = new Set(matches.map((entry) => articleKey(entry, entries.indexOf(entry))));
  const groups = new Map();
  entries.forEach((entry, index) => {
    const key = articleKey(entry, index);
    if (!matchedKeys.has(key)) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });
  return describeGroups([...groups.values()], preferredLanguage);
}
