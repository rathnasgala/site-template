import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const workflow = await readFile(new URL('../.github/workflows/release-theme.yml', import.meta.url), 'utf8');

test('theme release uses trusted publishing from an exact tag-matched staged artifact', () => {
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /environment: npm-theme-release/);
  assert.match(workflow, /npm@12\.0\.2/);
  assert.match(workflow, /node scripts\/stage-theme-package\.js/);
  assert.match(workflow, /test "\$actual" = "\$expected"/);
  assert.match(workflow, /npm publish "\$staging" --access public --provenance/);
  assert.doesNotMatch(workflow, /NODE_AUTH_TOKEN|NPM_TOKEN|secrets\./);
});

test('every third-party action is immutable commit pinned', () => {
  const uses = [...workflow.matchAll(/^\s*uses:\s*(\S+)/gm)].map((match) => match[1]);
  assert.ok(uses.length > 0);
  assert.ok(uses.every((value) => /@[0-9a-f]{40}$/.test(value)));
});
