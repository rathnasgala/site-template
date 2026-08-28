import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';

import { prismSessionBootstrap, PRISM_SESSION_KEY } from '../lib/prism-session.js';

const post = {
  id: '01M0T5Z4FBK60HTS7FH8JK06QL',
  language: 'en',
  prismSourceHash: 'a'.repeat(64),
};
const configuration = {
  configurationId: '01M0T5Z4FBK60HTS7FH8JK06QM',
  sourceRevisionHash: 'a'.repeat(64),
  pageUrl: 'https://writer.example/en/proof/prism/01M0T5Z4FBK60HTS7FH8JK06QM/',
};

test('cold start leaves the canonical work in place', () => {
  const result = execute(null);
  assert.equal(result.replaced, null);
  assert.equal(result.removed, false);
});

test('an explicit current session choice redirects before canonical content is displayed', () => {
  const result = execute({
    articleId: post.id,
    language: post.language,
    configurationId: configuration.configurationId,
    sourceRevisionHash: configuration.sourceRevisionHash,
    selectedAt: '2026-08-26T20:00:00Z',
  });
  assert.equal(result.replaced, configuration.pageUrl);
  assert.equal(result.removed, false);
});

test('stale, malformed, and unavailable choices are cleared without redirecting', () => {
  for (const stored of [
    '{',
    JSON.stringify({ articleId: post.id, language: 'fr',
      configurationId: configuration.configurationId,
      sourceRevisionHash: configuration.sourceRevisionHash }),
    JSON.stringify({ articleId: post.id, language: post.language,
      configurationId: configuration.configurationId, sourceRevisionHash: 'b'.repeat(64) }),
  ]) {
    const result = execute(stored, true);
    assert.equal(result.replaced, null);
    assert.equal(result.removed, true);
  }
});

test('bootstrap contains no passive reader inputs and escapes script-breaking markup', () => {
  const source = prismSessionBootstrap(post, [{
    ...configuration,
    pageUrl: `${configuration.pageUrl}?value=</script>`,
  }]);
  assert.doesNotMatch(source, /referrer|device|scroll|localStorage|fingerprint/i);
  assert.doesNotMatch(source, /<\/script>/i);
  assert.match(source, /sessionStorage/);
});

test('unavailable session storage cannot block or redirect the canonical work', () => {
  let replaced = null;
  assert.doesNotThrow(() => vm.runInNewContext(prismSessionBootstrap(post, [configuration]), {
    URL,
    location: {
      href: 'https://writer.example/en/proof/',
      origin: 'https://writer.example',
      replace: (url) => { replaced = url; },
    },
    sessionStorage: {
      getItem: () => { throw new Error('storage denied'); },
      removeItem: () => { throw new Error('storage denied'); },
    },
  }));
  assert.equal(replaced, null);
});

function execute(value, alreadySerialized = false) {
  let replaced = null;
  let removed = false;
  const source = prismSessionBootstrap(post, [configuration]);
  const stored = alreadySerialized ? value : value == null ? null : JSON.stringify(value);
  vm.runInNewContext(source, {
    URL,
    location: {
      href: 'https://writer.example/en/proof/',
      origin: 'https://writer.example',
      replace: (url) => { replaced = url; },
    },
    sessionStorage: {
      getItem: (key) => key === PRISM_SESSION_KEY ? stored : null,
      removeItem: (key) => { if (key === PRISM_SESSION_KEY) removed = true; },
    },
  });
  return { replaced, removed };
}
