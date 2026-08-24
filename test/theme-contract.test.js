import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const base = new URL('../src/_includes/layouts/base.njk', import.meta.url);
const css = new URL('../src/styles/theme.css', import.meta.url);

test('resolves stored color mode in the head before stylesheets', async () => {
  const source = await readFile(base, 'utf8');
  const config = await readFile(new URL('../eleventy.config.js', import.meta.url), 'utf8');
  const resolver = source.indexOf('{{ themeBootstrap | safe }}');
  const stylesheet = source.indexOf('rel="stylesheet"');
  assert.ok(resolver > 0);
  assert.ok(resolver < stylesheet);
  assert.match(config, /localStorage\.getItem\('gala-color-mode'\)/);
});

test('supports system mode without JavaScript and explicit light/dark modes', async () => {
  const source = await readFile(css, 'utf8');
  assert.match(source, /color-scheme: light dark/);
  assert.match(source, /data-mode='light'/);
  assert.match(source, /data-mode='dark'/);
});

test('loads the author-owned override after managed theme styles', async () => {
  const source = await readFile(base, 'utf8');
  assert.ok(source.indexOf('assets/theme.css') < source.indexOf('custom.css'));
});

test('free sites retain visible Gala attribution while paid sites suppress only that link', async () => {
  const source = await readFile(base, 'utf8');
  assert.match(source, /&copy; \{\{ site\.site\.name \}\}/);
  assert.match(
    source,
    /\{% if attributionTier != 'PAID' %\}<li>.*Powered by Gala.*<\/li>\{% endif %\}\s*<li>.*Terms<\/a><\/li>\s*<li>.*Privacy<\/a><\/li>/
  );
});
