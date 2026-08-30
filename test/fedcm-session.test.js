import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const interactions = await readFile(new URL('../src/assets/interactions.js', import.meta.url), 'utf8');
const layout = await readFile(new URL('../src/_includes/layouts/base.njk', import.meta.url), 'utf8');

test('reader identity uses FedCM without popup or publication-visible bearer storage', () => {
  assert.match(layout, /allow="identity-credentials-get"/);
  assert.match(interactions, /navigator\.credentials\.get/);
  assert.match(interactions, /configURL:\s*['"]https:\/\/api\.gala67\.com\/v1\/fedcm\/config\.json/);
  assert.match(interactions, /clientId:\s*siteId/);
  assert.match(interactions, /params:\s*\{\s*nonce:\s*sessionFrameToken\s*\}/);
  assert.match(interactions, /if\s*\(mode\s*===\s*['"]active['"]\)\s*provider\.mode\s*=\s*['"]active['"]/);
  assert.doesNotMatch(interactions, /identity:\s*\{[^}]*\bmode\b/);
  assert.match(interactions, /type:\s*['"]gala-session-transfer['"]/);
  assert.doesNotMatch(interactions, /window\.open|\/v1\/widget\/session\/sign-in/);
  assert.doesNotMatch(interactions, /gala-reader-session|Authorization|Bearer/);
});

test('a fresh publication requests passive cross-site identity and an explicit click requests active identity', () => {
  assert.match(interactions, /mediation:\s*mode\s*===\s*['"]active['"]\s*\?\s*['"]required['"]\s*:\s*['"]silent['"]/);
  assert.match(interactions, /fedCmSession\(['"]active['"]\)/);
  assert.match(interactions, /fedCmSession\(['"]passive['"]\)/);
  assert.match(interactions, /FedCM is not available in this browser/);
});

test('an unavailable, cancelled, or failed active sign-in does not strand the interrupted action', () => {
  assert.match(interactions, /return false;/);
  assert.match(interactions, /return true;/);
  assert.match(interactions, /fedCmSession\(['"]active['"]\)\.then\(\(started\) => \{/);
  assert.match(interactions, /if \(!started\) pendingIntent = null;/);
});
