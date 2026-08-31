import assert from 'node:assert/strict';
import test from 'node:test';

import { createArticleIndexes, resolvePageSize } from '../lib/article-pagination.js';

const hosting = {
  canonicalBaseUrl: 'https://example.com',
  pathPrefix: '/blog'
};
const policy = { minimumPageSize: 2, maximumPageSize: 4, defaultPageSize: 3 };

test('resolves the platform default and accepts only in-range author overrides', () => {
  assert.equal(resolvePageSize(null, policy), 3);
  assert.equal(resolvePageSize(2, policy), 2);
  assert.equal(resolvePageSize(4, policy), 4);
  assert.throws(() => resolvePageSize(1, policy), /outside the platform range 2-4/);
  assert.throws(() => resolvePageSize(5, policy), /outside the platform range 2-4/);
});

test('creates stable root and language pages with canonical previous and next routes', () => {
  const cards = Array.from({ length: 7 }, (_, index) => ({ id: `card-${index}` }));
  const indexes = createArticleIndexes({
    rootCards: cards,
    cardsByLanguage: { en: cards.slice(0, 5), ta: cards.slice(5) },
    pageSize: 3,
    hosting
  });

  assert.deepEqual(indexes.root.map((page) => page.url), ['/', '/2/', '/3/']);
  assert.deepEqual(indexes.root.map((page) => page.cards.map(({ id }) => id)), [
    ['card-0', 'card-1', 'card-2'], ['card-3', 'card-4', 'card-5'], ['card-6']
  ]);
  assert.equal(indexes.root[1].previousUrl, '/');
  assert.equal(indexes.root[1].nextUrl, '/3/');
  assert.equal(indexes.root[1].canonicalUrl, 'https://example.com/blog/2/');
  assert.deepEqual(indexes.byLanguage.en.map((page) => page.url), ['/en/', '/en/2/']);
  assert.equal(indexes.byLanguage.en[1].canonicalUrl, 'https://example.com/blog/en/2/');
  assert.deepEqual(indexes.byLanguage.ta.map((page) => page.url), ['/ta/']);
  assert.equal(indexes.additional.length, 3);
});
