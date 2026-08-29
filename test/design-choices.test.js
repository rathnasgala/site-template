import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const css = await readFile(new URL('../src/styles/theme.css', import.meta.url), 'utf8');
const compiledCss = await readFile(new URL('../src/assets/theme.css', import.meta.url), 'utf8');
const layout = await readFile(new URL('../src/_includes/layouts/base.njk', import.meta.url), 'utf8');
const config = await readFile(new URL('../lib/site-config.js', import.meta.url), 'utf8');

/**
 * Every choice offered to a writer has to change something.
 *
 * Twice now a value has been offered and implemented nowhere - `colorMode` was written into
 * `site.config.yml` while the page hardcoded `data-mode="system"`, and `componentStyle` set two
 * custom properties that no rule read. Both looked complete from every side except the reader's.
 */
/*
 * Three decisions, not nine.
 *
 * A writer chooses a look, a palette and a colour mode. Everything else - typeface, spacing,
 * radius, surfaces, motion - belongs to the look and is designed with it. Nine independent knobs
 * was several hundred combinations, none of them reviewed: `mono` + `round` + `spacious` +
 * `raised` set a page in monospace inside page-wide pills, and it was four clicks away.
 */
const KNOBS = {
  theme: ['editorial', 'modern', 'technical'],
  palette: ['default', 'ocean', 'forest', 'plum'],
  colorMode: ['system', 'light', 'dark'],
};

const ATTRIBUTES = { colorMode: 'data-mode' };
const attribute = (key) => ATTRIBUTES[key] ?? `data-${key}`;

test('every choice reaches the page', () => {
  for (const key of Object.keys(KNOBS)) {
    assert.ok(
      layout.includes(`${attribute(key)}="{{ site.design.${key}`),
      `${key} is never rendered onto the document, so no CSS can respond to it`,
    );
  }
});

test('every value a writer may choose changes something', () => {
  for (const [key, values] of Object.entries(KNOBS)) {
    for (const value of values) {
      // `default` and `system` are what the base tokens already describe.
      if (['default', 'system'].includes(value)) continue;
      assert.match(css, new RegExp(`\\[${attribute(key)}=['"]${value}['"]\\]`),
        `${key}: ${value} is offered but no rule answers to it`);
    }
  }
});

test('no orthogonal knob survives', () => {
  // Each of these was a slider a writer set blind. They are properties of a look now.
  for (const gone of ['typography', 'density', 'spacing', 'radius', 'motion', 'component-style']) {
    assert.doesNotMatch(css, new RegExp(`\\[data-${gone}=`),
      `data-${gone} is still a rule, so it is still a choice nobody designed the combinations for`);
  }
});

test('a custom property the theme defines is a custom property something reads', () => {
  const defined = new Set([...css.matchAll(/(--gala-[a-z0-9-]+):/g)].map((m) => m[1]));
  const used = new Set([...css.matchAll(/var\((--gala-[a-z0-9-]+)/g)].map((m) => m[1]));
  const orphans = [...defined].filter((token) => !used.has(token));
  assert.deepEqual(orphans, [], `defined but never read: ${orphans.join(', ')}`);
});

test('the allowlist a writer is offered is the one the theme implements', () => {
  for (const [key, values] of Object.entries(KNOBS)) {
    if (!config.includes(`${key}:`)) continue;
    for (const value of values) {
      assert.ok(config.includes(`'${value}'`), `${key}: ${value} is not in site-config.js`);
    }
  }
});

test('the header divider spans the same available content width as the footer', () => {
  const sourceHeader = css.match(/\.gala-site-header\s*\{([^}]*)\}/)?.[1] ?? '';
  const compiledHeader = compiledCss.match(/\.gala-site-header\{([^}]*)\}/)?.[1] ?? '';
  assert.match(sourceHeader, /inline-size:\s*100%/);
  assert.match(sourceHeader, /box-sizing:\s*border-box/);
  assert.match(compiledHeader, /inline-size:100%/);
  assert.match(compiledHeader, /box-sizing:border-box/);
});
