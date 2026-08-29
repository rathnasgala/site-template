import assert from 'node:assert/strict';
import test from 'node:test';

import LanguageIndexes from '../src/languages.11ty.js';

const scheduled = {
  publicationState: 'not-emitted',
  language: 'en',
  relativeUrl: '/en/scheduled/',
  frontmatter: { title: 'Scheduled post' }
};
const site = {
  site: { name: 'Field notes' },
  hosting: { canonicalBaseUrl: 'https://writer.example', pathPrefix: '/' }
};

test('language index shows scheduled posts only in a preview manifest', () => {
  const page = new LanguageIndexes();

  assert.doesNotMatch(page.render({
    buildManifest: { posts: [scheduled] }, language: 'en', site
  }), /Scheduled post/);
  assert.match(page.render({
    buildManifest: { preview: true, posts: [scheduled] }, language: 'en', site
  }), /Scheduled post/);
});
