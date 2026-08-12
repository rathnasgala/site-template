import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const components = new URL('../src/_includes/components/ui.njk', import.meta.url);
const css = new URL('../src/assets/theme.css', import.meta.url);

test('provides every required component and supporting control', async () => {
  const source = await readFile(components, 'utf8');
  for (const macro of [
    'button', 'badge', 'tagChip', 'sectionHeading', 'hero', 'pageContent',
    'authorProfile', 'cardIndex', 'statsGraph', 'loading', 'pagination',
    'search', 'tableOfContents', 'shareControl', 'pageFooter'
  ]) {
    assert.match(source, new RegExp(`macro ${macro}\\(`));
  }
});

test('loading and graph surfaces reserve dimensions and transitions are progressive', async () => {
  const source = await readFile(css, 'utf8');
  assert.match(source, /--gala-widget-min-block-size:/);
  assert.match(source, /\.gala-engagement \{ min-block-size: var\(--gala-widget-min-block-size\)/);
  assert.match(source, /\.gala-engagement__placeholder.*min-block-size: var\(--gala-widget-min-block-size\)/);
  assert.match(source, /\.gala-loading[^}]*min-block-size:/s);
  assert.match(source, /\.gala-stats-graph[^}]*min-block-size:/s);
  assert.match(source, /@view-transition\s*{\s*navigation: auto;/);
  assert.match(source, /prefers-reduced-motion: no-preference/);
});

test('share control uses links and a selectable readonly fallback', async () => {
  const source = await readFile(components, 'utf8');
  assert.match(source, /data-copy-url/);
  assert.match(source, /readonly aria-label="Canonical URL"/);
  assert.match(source, /rel="noopener noreferrer"/);
  assert.doesNotMatch(source, /<script|<iframe/);
});
