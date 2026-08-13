import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const behavior = await readFile(new URL('../src/assets/interactions.js', import.meta.url), 'utf8');
const components = await readFile(new URL('../src/_includes/components/ui.njk', import.meta.url), 'utf8');

test('published article islands request the neutral public bundle without credentials', () => {
  assert.match(components, /data-engagement-url=/);
  assert.match(components, /\/v1\/articles\/.*\/engagement/);
  assert.match(behavior, /querySelectorAll\('\[data-engagement-url\]'\)/);
  assert.match(behavior, /new URL\(region\.dataset\.engagementUrl\)/);
  assert.match(behavior, /fetch\(requestUrl/);
  assert.match(behavior, /credentials: 'omit'/);
  assert.match(behavior, /headers: \{ Accept: 'application\/json' \}/);
});

test('comment cursors append nested thread pages without navigating', () => {
  assert.match(behavior, /requestUrl\.searchParams\.set\('commentsCursor', commentsCursor\)/);
  assert.match(behavior, /data-comments-cursor/);
  assert.match(behavior, /refreshEngagement\(region, moreComments\.dataset\.commentsCursor, true\)/);
  assert.match(behavior, /comment\.parentCommentId/);
  assert.match(behavior, /gala-comment-replies/);
});

test('live engagement renders untrusted API fields only through textContent', () => {
  assert.match(behavior, /textContent = text/);
  assert.match(behavior, /data\.profile\.displayName/);
  assert.match(behavior, /comment\.author\?\.displayName/);
  assert.doesNotMatch(behavior, /innerHTML|insertAdjacentHTML|document\.write/);
});

test('published articles send one best-effort privacy-reduced view beacon', () => {
  assert.match(behavior, /replace\(\/\\\/engagement\$\/, '\/views'\)/);
  assert.match(behavior, /method: 'POST'/);
  assert.match(behavior, /keepalive: true/);
  assert.match(behavior, /document\.documentElement\.lang/);
  assert.match(behavior, /document\.referrer/);
  assert.match(behavior, /\['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'\]/);
  assert.match(behavior, /\.catch\(\(\) => \{\}\)/);
});

test('live totals use the aggregate comment count rather than first-page length', () => {
  const context = {
    URL,
    window: { addEventListener() {}, isSecureContext: true, location: { href: 'https://example.com/' } },
    navigator: {},
    document: {
      addEventListener() {},
      querySelectorAll() { return []; },
      querySelector() { return null; }
    },
    Set
  };
  vm.runInNewContext(behavior, context);
  const counts = context.engagementCounts({
    reactions: { LIKE: 3 },
    comments: { items: Array.from({ length: 20 }), totalCount: 41 },
    views: { count: 7 }
  });

  assert.deepEqual(Array.from(counts, (entry) => Array.from(entry)), [
    ['Reactions', 3], ['Comments', 41], ['Views', 7]
  ]);
});
