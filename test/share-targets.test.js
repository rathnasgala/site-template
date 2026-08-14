import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { resolveShareTargets } from '../lib/share-targets.js';

test('renders every verified provider with encoded canonical inputs', () => {
  const targets = resolveShareTargets({
    configured: ['x', 'bluesky', 'hacker-news', 'email', 'mastodon'],
    title: 'Gala & safety',
    canonicalUrl: 'https://author.example/en/post/?a=1&b=2',
    socialProfiles: { mastodon: 'https://social.example/@author' }
  });
  assert.deepEqual(targets.map(({ provider }) => provider),
    ['x', 'bluesky', 'hacker-news', 'email', 'mastodon']);
  for (const target of targets) {
    assert.ok(target.label);
    assert.match(target.url, /^(?:https:|mailto:)/);
    assert.doesNotMatch(target.url, /\{[^}]+\}/);
  }
  assert.match(targets[0].url, /text=Gala(?:%20|\+)%26(?:%20|\+)safety/);
  assert.match(targets[0].url, /url=https%3A%2F%2Fauthor\.example%2Fen%2Fpost%2F%3Fa%3D1%26b%3D2/);
  assert.match(targets[4].url, /^https:\/\/social\.example\/share\?/);
});

test('rejects unverified providers and missing Mastodon instance', () => {
  const base = { title: 'Post', canonicalUrl: 'https://author.example/en/post/' };
  assert.throws(() => resolveShareTargets({ ...base, configured: ['linkedin'] }), /no verified/);
  assert.throws(() => resolveShareTargets({ ...base, configured: ['mastodon'] }), /socialProfiles\.mastodon/);
});

test('runtime fixture is byte-identical to the documented provider contract', async () => {
  const [runtime, documented] = await Promise.all([
    readFile(new URL('../lib/provider-fixtures/share-intents.v1.json', import.meta.url), 'utf8'),
    readFile(new URL('../../v1/docs/v1-provider-fixtures/share-intents.v1.json', import.meta.url), 'utf8')
  ]);
  assert.equal(runtime, documented);
});
