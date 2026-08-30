import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const behavior = await readFile(new URL('../src/assets/interactions.js', import.meta.url), 'utf8');
const components = await readFile(new URL('../src/_includes/components/ui.njk', import.meta.url), 'utf8');
const postLayout = await readFile(new URL('../src/_includes/layouts/post.njk', import.meta.url), 'utf8');
// The conversation is dependency-free DOM code in an island of its own.
const island = await readFile(new URL('../src/assets/engagement-comments.js', import.meta.url), 'utf8');
const transport = await readFile(new URL('../src/assets/engagement-transport.js', import.meta.url), 'utf8');

test('sign-in relays only the opaque one-time transfer code to the account frame', () => {
  assert.match(behavior, /typeof credential\?\.token !== 'string'/);
  assert.match(behavior, /type: 'gala-session-transfer', transferCode: pendingSessionTransferCode/);
  // FedCM may return before the cross-origin frame has announced readiness. The opaque code must
  // wait for that announcement instead of being posted into an unloaded frame.
  assert.match(behavior, /pendingSessionTransferCode = credential\.token/);
  assert.match(behavior, /if \(pendingSessionTransferCode\) deliverSessionTransfer\(\)/);
  assert.match(behavior, /sessionFrame\.addEventListener\('load', requestSessionState\)/);
  assert.match(behavior, /type: 'gala-session-request'/);
  assert.doesNotMatch(behavior, /gala-session-recheck/);
});

test('a blocked or cancelled sign-in never manufactures an authenticated reader', () => {
  assert.match(behavior, /catch \(error\)[\s\S]*Sign-in did not finish\. Try again\./);
  assert.match(behavior, /sessionUser = event\.data\.user && typeof event\.data\.user\.id === 'string'/);
  assert.doesNotMatch(behavior, /sessionUser\s*=\s*credential/);
});

test('published article islands request the neutral public bundle without credentials', () => {
  assert.match(postLayout, /data-engagement-url=/);
  assert.match(postLayout, /\/v1\/articles\/.*\/engagement/);
  assert.match(behavior, /querySelectorAll\('\[data-engagement-url\]'\)/);
  assert.match(behavior, /new URL\(region\.dataset\.engagementUrl\)/);
  assert.match(behavior, /fetch\(requestUrl/);
  assert.match(behavior, /credentials: 'omit'/);
  assert.match(behavior, /headers: \{ Accept: 'application\/json' \}/);
});

test('comment cursors append nested thread pages without navigating', () => {
  assert.match(island, /searchParams\.set\('commentsCursor', nextCursor\)/);
  assert.match(island, /Show more comments/);
  assert.match(island, /append \? \[\.\.\.state\.items, \.\.\.page\.items\]/);
  assert.match(island, /item\.parentCommentId/);
  assert.match(island, /gala-comment-replies/);
  // The server refuses a reply below its own limit, so one is never offered.
  assert.match(island, /const MAXIMUM_DEPTH = 5/);
  assert.match(island, /comment\.depth < MAXIMUM_DEPTH/);
});

test('untrusted API fields are never written as markup', () => {
  assert.match(behavior, /count\.textContent = publicCount\(value\)/);
  assert.doesNotMatch(behavior, /innerHTML|insertAdjacentHTML|document\.write/);
  // The island assigns author names and bodies through textContent only.
  assert.match(island, /comment\.author\?\.displayName/);
  assert.doesNotMatch(island, /innerHTML|insertAdjacentHTML|document\.write|dangerouslySetInnerHTML/);
});

test('the comments island is the single owner of conversation loading and failure states', () => {
  assert.match(components, />Conversation<\/h2>/);
  assert.equal((components.match(/data-engagement-status/g) ?? []).length, 1);
  assert.doesNotMatch(components, /Discussion|Continue the conversation|Loading engagement data|data-engagement-live/);
  assert.match(island, /phase: 'loading'/);
  assert.match(island, /phase === 'unavailable' \? 'Comments are temporarily unavailable\.'/);
  assert.match(island, /state\.phase !== 'ready'/);
  assert.match(island, /More comments couldn’t be loaded\. Try again\./);
  assert.doesNotMatch(island, /Could not load more comments\.|gala-comments__status/);
  assert.doesNotMatch(behavior, /Live engagement data is temporarily unavailable\./);
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

test('authenticated writes use only the typed platform-frame protocol', () => {
  for (const operation of ['reaction.add', 'reaction.remove', 'follow.add', 'follow.remove']) {
    assert.match(behavior, new RegExp(operation.replace('.', '\\.')));
  }
  // Exactly the names the account frame switches on; `comment.update` is not one of them.
  for (const operation of ['comment.create', 'comment.edit', 'comment.delete']) {
    assert.match(island, new RegExp(operation.replace('.', '\\.')));
  }
  assert.doesNotMatch(island, /comment\.update/);
  assert.match(transport, /type: 'gala-engagement-write', requestId, operation, payload/);
  assert.match(transport, /event\.origin !== frameOrigin/);
  assert.match(transport, /event\.source !== sessionFrame\.contentWindow/);
  assert.match(transport, /event\.data\?\.type === 'gala-engagement-result'/);
  assert.match(transport, /crypto\.randomUUID\(\)/);
  // The reader's bearer belongs to the API origin. The publication may persist only the opaque,
  // publication-bound resume capability covered by fedcm-session.test.js.
  for (const source of [behavior, island, transport]) {
    assert.doesNotMatch(source, /Authorization|Bearer|gala-reader-session/);
  }
  assert.doesNotMatch(island, /localStorage/);
  assert.doesNotMatch(transport, /localStorage/);
});

test('reader controls are accessible and include all low-risk write classes', () => {
  assert.match(components, /data-gala-comments/);
  assert.match(components, /data-follow-article[^>]+aria-pressed="false"/);
  // Exactly the six the platform stores (io.gala.api.engagement.ReactionType). The template
  // used to offer love/curious/support, which the API has never accepted: three of the six
  // buttons returned INVALID_ENGAGEMENT_WRITE on every click.
  for (const reaction of ['like', 'insightful', 'celebrate', 'funny', 'mind-blown', 'thank-you']) {
    assert.match(components, new RegExp(`value: '${reaction}'`));
  }
  for (const unsupported of ['love', 'curious', 'support']) {
    assert.doesNotMatch(components, new RegExp(`value: '${unsupported}'`));
  }
  assert.match(components, /data-reaction="{{ reaction.value }}"/);
  assert.match(island, /dataset\.replyComment/);
  assert.match(island, /dataset\.editComment/);
  assert.match(island, /dataset\.deleteComment/);
  assert.match(island, /dataset\.reportComment/);
  // Every control the island renders is a real button with a label, and every field has one.
  assert.match(island, /setAttribute\('aria-label', label\)/);
  assert.match(island, /\.type = 'button'/);
});

/*
 * The engagement endpoint is `max-age=60, public`. That is right for view counts and wrong the
 * instant a reader writes something: the refresh after a write re-requested the same URL and the
 * browser answered from its own cache, so the reader's comment did not appear until they reloaded
 * - and since a comment absent from the list carries no Reply button, nobody could reply to it.
 */
test('a write is followed by a refresh that bypasses the browser cache', () => {
  assert.match(island, /cache: fresh \? 'no-store' : 'default'/);
  assert.match(island, /load\('', \{ fresh: true \}\)/);
});

test('ordinary loads and cursor pages still use the cache', () => {
  // `fresh` is the fourth argument. The cursor page passes `true` as the third - that is
  // `appendComments` - so the two are distinguished by shape, not by counting `true`s.
  // Paging appends and stays cacheable; only a write asks for `fresh`.
  assert.match(island, /load\(state\.cursor, \{ append: true \}\)/);
  assert.doesNotMatch(island, /load\(state\.cursor, \{ append: true, fresh: true \}\)/);
});
