import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const css = await readFile(new URL('../src/assets/theme.css', import.meta.url), 'utf8');
const layout = await readFile(new URL('../src/_includes/layouts/base.njk', import.meta.url), 'utf8');
const config = await readFile(new URL('../lib/site-config.js', import.meta.url), 'utf8');

/**
 * Every choice offered to a writer has to change something.
 *
 * Twice now a value has been offered and implemented nowhere — `colorMode` was written into
 * `site.config.yml` while the page hardcoded `data-mode="system"`, and `componentStyle` set two
 * custom properties that no rule read. Both looked complete from every side except the reader's.
 */
const KNOBS = {
  palette: ['default', 'ocean'],
  typography: ['system', 'editorial', 'humanist', 'mono'],
  layout: ['article-first', 'portfolio'],
  density: ['compact', 'comfortable', 'spacious'],
  spacing: ['compact', 'comfortable', 'spacious'],
  radius: ['sharp', 'soft', 'round'],
  motion: ['none', 'subtle', 'expressive'],
  componentStyle: ['quiet', 'outlined', 'raised'],
  colorMode: ['system', 'light', 'dark'],
};

/*
 * `componentStyle` is `data-component-style`; `colorMode` is plain `data-mode`, because the
 * reader's own toggle writes that same attribute and the two must be the one switch.
 */
const ATTRIBUTES = { colorMode: 'data-mode' };
const attribute = (key) =>
  ATTRIBUTES[key] ?? `data-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;

test('every design knob reaches the page', () => {
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
      // A default may legitimately carry no rule of its own: it is what the base tokens already
      // describe. Every other value has to be answered somewhere.
      if (['default', 'system', 'article-first', 'comfortable', 'soft', 'subtle', 'quiet'].includes(value)) continue;
      const selector = new RegExp(`\\[${attribute(key)}=['"]${value}['"]\\]`);
      assert.match(css, selector, `${key}: ${value} is offered but no rule answers to it`);
    }
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
