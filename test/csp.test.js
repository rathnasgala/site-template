import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const layout = await readFile(new URL('../src/_includes/layouts/base.njk', import.meta.url), 'utf8');

test('every executable inline block is covered by a generated CSP hash', () => {
  assert.match(layout, /http-equiv="Content-Security-Policy"/);
  assert.match(layout, /'sha256-{{ themeBootstrap \| sha256Csp }}'/);
  assert.match(layout, /'sha256-{{ seo\.structuredDataJson \| sha256Csp }}'/);
  assert.doesNotMatch(layout, /unsafe-inline|unsafe-eval/);
});

test('appearance customization uses a generated stylesheet, not inline style attributes', () => {
  assert.match(layout, /assets\/accent\.css/);
  assert.doesNotMatch(layout, /<html[^>]+style=/);
});

test('the browser receives the shared reader entry point and a version-page-only entry point', () => {
  const executable = [...layout.matchAll(/<script(?:\s+[^>]*)?src="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(executable, [
    "{{ '/assets/reader.js' | url }}",
    "{{ '/assets/version.js' | url }}"
  ]);
  assert.match(layout, /\{% if versionPage %\}<script src="{{ '\/assets\/version\.js' \| url }}"/);
});
