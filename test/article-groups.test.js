import assert from 'node:assert/strict';
import test from 'node:test';

import { groupArticleCards } from '../lib/article-cards.js';
import { groupSearchMatches } from '../src/assets/article-groups.js';

const english = {
  id: '01K00000000000000000000000',
  source: 'content/posts/article/index.en.md',
  language: 'en',
  publicationState: 'published',
  relativeUrl: '/en/article/',
  body: 'An article body.',
  frontmatter: { title: 'Article', publishAfterDate: '2026-06-15' }
};
const tamil = {
  ...english,
  source: 'content/posts/article/index.ta.md',
  language: 'ta',
  relativeUrl: '/ta/article/',
  frontmatter: { ...english.frontmatter, title: 'கட்டுரை' }
};

test('manifest variants become one article with the configured language first', () => {
  const groups = groupArticleCards([tamil, english], 'en', false);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].primary.language, 'en');
  assert.equal(groups[0].publicationDate, '2026-06-15');
  assert.equal(groups[0].readingMinutes, 1);
  assert.deepEqual(groups[0].variants.map(({ language }) => language), ['en', 'ta']);
});

test('articles sort newest first without treating a later translation as a new article', () => {
  const newer = {
    ...english,
    id: '01K00000000000000000000001',
    source: 'content/posts/newer/index.en.md',
    relativeUrl: '/en/newer/',
    frontmatter: { title: 'Newer', publishAfterDate: '2026-07-01' }
  };
  const laterTranslation = {
    ...tamil,
    frontmatter: { ...tamil.frontmatter, publishAfterDate: '2026-08-01' }
  };

  const groups = groupArticleCards([english, laterTranslation, newer], 'en', false);

  assert.deepEqual(groups.map(({ id }) => id), [newer.id, english.id]);
  assert.equal(groups[1].publicationDate, '2026-06-15');
});

test('preview variants without an id group only by their shared post directory', () => {
  const preview = [
    { ...english, id: null, publicationState: 'not-emitted' },
    { ...tamil, id: null, publicationState: 'not-emitted' },
    {
      ...english,
      id: null,
      source: 'content/posts/another/index.en.md',
      publicationState: 'not-emitted'
    }
  ];

  const groups = groupArticleCards(preview, 'en', true);

  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map(({ variants }) => variants.length), [2, 1]);
});

test('a scheduled preferred-language translation never replaces a published primary', () => {
  const publishedTamil = {
    ...tamil,
    frontmatter: { ...tamil.frontmatter, publishAfterDate: '2026-06-15' }
  };
  const scheduledEnglish = {
    ...english,
    publicationState: 'not-emitted',
    frontmatter: { ...english.frontmatter, publishAfterDate: '2026-07-01' }
  };

  const [group] = groupArticleCards([scheduledEnglish, publishedTamil], 'en', true);

  assert.equal(group.primary.language, 'ta');
  assert.equal(group.primary.publicationState, 'published');
  assert.equal(group.publicationDate, '2026-06-15');
});

test('search returns one article while retaining every language link', () => {
  const entries = [
    { ...english, title: 'Article', body: 'Shared phrase', url: 'https://example.com/en/article/' },
    { ...tamil, title: 'கட்டுரை', body: 'பகிரப்பட்ட சொற்றொடர்', url: 'https://example.com/ta/article/' }
  ];

  const groups = groupSearchMatches(entries, [entries[1]], 'ta');

  assert.equal(groups.length, 1);
  assert.equal(groups[0].primary.language, 'ta');
  assert.deepEqual(groups[0].variants.map(({ language }) => language), ['ta', 'en']);
});
