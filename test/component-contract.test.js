import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const components = new URL('../src/_includes/components/ui.njk', import.meta.url);
const css = new URL('../src/assets/theme.css', import.meta.url);
const layout = new URL('../src/_includes/layouts/base.njk', import.meta.url);
const interactions = new URL('../src/assets/interactions.js', import.meta.url);

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

test('shared header uses accessible icons and opens search and settings without document navigation', async () => {
  const source = await readFile(layout, 'utf8');
  const behavior = await readFile(interactions, 'utf8');
  assert.match(source, /href="{{ '\/' \| url }}" aria-label="Home"/);
  for (const label of ['Appearance', 'Settings', 'Search', 'Account']) {
    assert.match(source, new RegExp(`(?:aria-label|title)="${label}`));
  }
  assert.match(source, /<dialog id="gala-settings-dialog"/);
  assert.match(source, /<dialog id="gala-search-dialog"/);
  assert.match(source, /<dialog id="gala-account-dialog"/);
  assert.match(source, /data-gala-session-frame/);
  assert.match(behavior, /dialog\.showModal\(\)/);
  assert.match(behavior, /event\.origin !== sessionOrigin/);
  assert.match(behavior, /event\.source !== sessionFrame\.contentWindow/);
  assert.match(source, /href="{{ '\/settings\/' \| url }}">Open settings page/);
  assert.match(source, /href="{{ '\/search\/' \| url }}">Open search page/);
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
  const postLayout = await readFile(new URL('../src/_includes/layouts/post.njk', import.meta.url), 'utf8');
  assert.match(postLayout, /shareControl\(post\.canonicalUrl, shareTargets\)/);
});
