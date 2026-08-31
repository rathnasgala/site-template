import { siteUrl } from './seo.js';

function route(language, pageNumber) {
  const prefix = language == null ? '' : `/${language}`;
  return pageNumber === 1 ? `${prefix}/` || '/' : `${prefix}/${pageNumber}/`;
}

function pages(cards, language, pageSize, hosting) {
  const totalPages = Math.max(1, Math.ceil(cards.length / pageSize));
  return Array.from({ length: totalPages }, (_, index) => {
    const pageNumber = index + 1;
    const url = route(language, pageNumber);
    return Object.freeze({
      language,
      pageNumber,
      totalPages,
      cards: Object.freeze(cards.slice(index * pageSize, pageNumber * pageSize)),
      url,
      permalink: `${url}index.html`,
      canonicalUrl: siteUrl({
        canonicalBaseUrl: hosting.canonicalBaseUrl,
        pathPrefix: hosting.pathPrefix,
        relativePath: url
      }),
      previousUrl: pageNumber > 1 ? route(language, pageNumber - 1) : '',
      nextUrl: pageNumber < totalPages ? route(language, pageNumber + 1) : ''
    });
  });
}

export function resolvePageSize(override, policy) {
  if (policy == null || typeof policy !== 'object') {
    throw new TypeError('Publication pagination policy is unavailable');
  }
  const { minimumPageSize: minimum, maximumPageSize: maximum, defaultPageSize } = policy;
  if (![minimum, maximum, defaultPageSize].every(Number.isSafeInteger)
      || minimum < 1 || maximum > 100 || minimum > defaultPageSize || defaultPageSize > maximum) {
    throw new TypeError('Publication pagination policy is invalid');
  }
  if (override == null) return defaultPageSize;
  if (!Number.isSafeInteger(override) || override < minimum || override > maximum) {
    throw new TypeError(
      `pagination.pageSize ${override} is outside the platform range ${minimum}-${maximum}; `
      + 'update it in Gala publication settings or clear the override');
  }
  return override;
}

export function createArticleIndexes({ rootCards, cardsByLanguage, pageSize, hosting }) {
  if (!Array.isArray(rootCards) || cardsByLanguage == null || typeof cardsByLanguage !== 'object') {
    throw new TypeError('Article cards are unavailable');
  }
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) {
    throw new TypeError('pageSize must be a positive integer');
  }
  const root = pages(rootCards, null, pageSize, hosting);
  const byLanguage = Object.freeze(Object.fromEntries(Object.entries(cardsByLanguage)
    .map(([language, cards]) => [language, pages(cards, language, pageSize, hosting)])));
  return Object.freeze({
    root: Object.freeze(root),
    byLanguage,
    additional: Object.freeze([
      ...root.slice(1),
      ...Object.values(byLanguage).flatMap((languagePages) => languagePages.slice(1))
    ])
  });
}
