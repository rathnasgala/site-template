import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const expectedRuntimeFiles = [
  '.gala/publish.yml.template',
  '.gitignore',
  'eleventy.config.js',
  'lib/build-manifest.js',
  'lib/site-config.js',
  'lib/engagement-snapshot.js',
  'lib/publication-state.js',
  'lib/render-markdown.js',
  'lib/seo.js',
  'package-lock.json',
  'package.json',
  'src/404.njk',
  'src/_data/buildManifest.js',
  'src/_data/engagementSnapshot.js',
  'src/_data/feedLinks.js',
  'src/_data/languages.js',
  'src/_data/site.js',
  'src/_includes/components/ui.njk',
  'src/_includes/layouts/base.njk',
  'src/_includes/layouts/post.njk',
  'src/assets/interactions.js',
  'src/assets/preferences.js',
  'src/assets/search.js',
  'src/assets/theme-mode.js',
  'src/assets/theme.css',
  'src/index.njk',
  'src/feed.11ty.js',
  'src/languages.11ty.js',
  'src/posts.11ty.js',
  'src/redirects.11ty.js',
  'src/search-index.11ty.js',
  'src/search.njk',
  'src/settings.njk',
  'src/sitemap.11ty.js',
  'static/robots.txt'
].sort();

test('managed manifest covers exactly immutable framework runtime files', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../.gala/managed-files.json', import.meta.url), 'utf8')
  );
  assert.equal(manifest.schemaVersion, 1);
  assert.deepEqual(manifest.themePackage, {
    name: '@rathnasgala/theme',
    version: '0.0.2',
    availableDesignThemes: ['editorial'],
    securityAdvisories: []
  });
  assert.deepEqual(Object.keys(manifest.files).sort(), expectedRuntimeFiles);

  for (const [relativePath, expectedHash] of Object.entries(manifest.files)) {
    const contents = await readFile(new URL(`../${relativePath}`, import.meta.url));
    const actualHash = createHash('sha256').update(contents).digest('hex');
    assert.equal(actualHash, expectedHash, relativePath);
  }
});

test('doctor never owns mutable author or platform data', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../.gala/managed-files.json', import.meta.url), 'utf8')
  );
  for (const mutable of [
    '.engagement-snapshot.json',
    '.gala/publication-state.yml',
    'site.config.yml',
    'custom.css',
    'content/posts/example/index.en.md'
  ]) {
    assert.equal(manifest.files[mutable], undefined, mutable);
  }
});
