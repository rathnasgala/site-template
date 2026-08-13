import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';
import { loadSiteConfiguration } from '../lib/site-config.js';

const config = parse(await readFile(new URL('../site.config.yml', import.meta.url), 'utf8'));

test('design contract exposes every scaffold-level design dimension', () => {
  assert.deepEqual(Object.keys(config.design).sort(), [
    'colorMode', 'componentStyle', 'density', 'layout', 'motion',
    'palette', 'radius', 'spacing', 'theme', 'typography'
  ]);
});

test('stores exact managed theme identity separately from the visual theme', () => {
  assert.deepEqual(config.framework.themePackage, {
    name: '@rathnasgala/theme',
    version: '0.0.1'
  });
  assert.equal(config.design.theme, 'editorial');
});

test('hosting provider is fixed to GitHub Pages in v1', () => {
  assert.equal(config.hosting.provider, 'github-pages');
});

test('loads an action-selected checkout-relative config and rejects traversal', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'gala-config-'));
  await mkdir(path.join(root, 'fixtures'));
  await writeFile(path.join(root, 'fixtures', 'site.yml'), 'schemaVersion: 1\nsite:\n  name: Alternate\n');
  assert.equal((await loadSiteConfiguration({ root, configPath: 'fixtures/site.yml' })).site.name, 'Alternate');
  await assert.rejects(
    () => loadSiteConfiguration({ root, configPath: '../site.yml' }),
    /within the checkout/
  );
});
