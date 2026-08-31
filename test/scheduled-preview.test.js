import assert from 'node:assert/strict';
import test from 'node:test';

import LanguageIndexes from '../src/languages.11ty.js';
import { groupArticleCards } from '../lib/article-cards.js';

const scheduled = {
  publicationState: 'not-emitted',
  language: 'en',
  relativeUrl: '/en/scheduled/',
  body: 'Scheduled body.',
  frontmatter: { title: 'Scheduled post', publishAfterDate: '2026-06-20' }
};

test('language index shows scheduled posts only in a preview manifest', () => {
  const page = new LanguageIndexes();

  assert.equal(page.data().layout, 'layouts/language-index.njk');
  assert.equal(groupArticleCards([scheduled], 'en', false).length, 0);
  const preview = groupArticleCards([scheduled], 'en', true);
  assert.equal(preview.length, 1);
  assert.equal(preview[0].primary.frontmatter.title, 'Scheduled post');
  assert.equal(preview[0].publicationDate, '2026-06-20');
});
