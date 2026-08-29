import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const expectedRuntimeFiles = [
  '.gala/publish.yml.template',
  '.gitignore',
  'eleventy.config.js',
  'lib/accent.js',
  'lib/build-manifest.js',
  'lib/site-config.js',
  'lib/performance-budget.js',
  'lib/prism-compiled-output.js',
  'lib/prism-session.js',
  'lib/engagement-snapshot.js',
  'lib/provider-fixtures/embeds.v1.json',
  'lib/provider-fixtures/share-intents.v1.json',
  'lib/publication-state.js',
  'lib/render-markdown.js',
  'lib/seo.js',
  'lib/share-targets.js',
  'package-lock.json',
  'package.json',
  'scripts/build-reader.js',
  'scripts/lint.js',
  'src/404.njk',
  'src/accent.11ty.js',
  'src/cname.11ty.js',
  'src/_data/buildManifest.js',
  'src/_data/engagementSnapshot.js',
  'src/_data/feedLinks.js',
  'src/_data/languages.js',
  'src/_data/site.js',
  'src/_includes/components/ui.njk',
  'src/_includes/layouts/base.njk',
  'src/_includes/layouts/post.njk',
  'src/_includes/layouts/prism-configuration.njk',
  'src/client/reader.js',
  'src/assets/reader.js',
  'src/assets/interactions.js',
  'src/assets/engagement-comments.js',
  'src/assets/engagement-transport.js',
  'src/assets/favicon.svg',
  'src/assets/embed-codepen.svg',
  'src/assets/embed-gist.svg',
  'src/assets/embed-x.svg',
  'src/assets/embed-youtube.svg',
  'src/assets/preferences.js',
  'src/assets/prism-session.js',
  'src/assets/search.js',
  'src/assets/theme-mode.js',
  'src/assets/theme.css',
  'src/assets/version.js',
  'src/styles/theme.css',
  'src/version.njk',
  'src/contact.njk',
  'src/index.njk',
  'src/feed.11ty.js',
  'src/languages.11ty.js',
  'src/posts.11ty.js',
  'src/prism-configurations.11ty.js',
  'src/redirects.11ty.js',
  'src/search-index.11ty.js',
  'src/search.njk',
  'src/sitemap.11ty.js',
  'static/favicon.ico',
  'static/robots.txt'
].sort();

test('managed manifest covers exactly immutable framework runtime files', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../.gala/managed-files.json', import.meta.url), 'utf8')
  );
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.themePackage.name, '@rathnasgala/theme');
  assert.match(manifest.themePackage.version, /^\d+\.\d+\.\d+$/);
  assert.deepEqual(manifest.themePackage.availableDesignThemes, ['editorial', 'modern', 'technical']);
  assert.deepEqual(manifest.themePackage.securityAdvisories, []);
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

test('author workflow passes both bounded rotation secret slots to the reusable publisher', async () => {
  const workflow = await readFile(
    new URL('../.gala/publish.yml.template', import.meta.url), 'utf8'
  );
  assert.match(workflow, /site-secret: \$\{\{ secrets\.GALA_SITE_SECRET \}\}/);
  assert.match(workflow,
    /previous-site-secret: \$\{\{ secrets\.GALA_PREVIOUS_SITE_SECRET \}\}/);
});

/*
 * What the runtime needs in order to build at all.
 *
 * A publication carries its own budgets in its own `site.config.yml`, and the self-updater cannot
 * silently rewrite the writer's file - so an update that ships more bytes than the site allows
 * fails its next build with "Managed JavaScript performance budget exceeded". That is exactly what
 * happened when the reader runtime landed. Declaring the minimum here lets the updater raise the
 * ceiling alongside the files, and asserting it against the real bytes stops the two drifting.
 */
test('the declared budget minimums cover what the theme actually ships', async () => {
  const manifest = JSON.parse(await readFile(new URL('../.gala/managed-files.json', import.meta.url), 'utf8'));
  const required = manifest.requiredBudgets;
  assert.ok(required, 'the manifest must declare the budgets its files need');

  const root = new URL('../src/assets/', import.meta.url);
  const total = async (extension) => {
    const { readdir, stat } = await import('node:fs/promises');
    const walk = async (dir) => {
      const entries = await readdir(dir, { withFileTypes: true });
      const sizes = await Promise.all(entries.map(async (entry) => {
        const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, dir);
        if (entry.isDirectory()) return walk(child);
        return entry.name.endsWith(extension) ? (await stat(child)).size : 0;
      }));
      return sizes.reduce((sum, size) => sum + size, 0);
    };
    return walk(root);
  };

  assert.ok(await total('.js') <= required.managedJavaScriptBytes,
    'the theme ships more JavaScript than it declares a publication must allow');
  assert.ok(await total('.css') <= required.managedCssBytes,
    'the theme ships more CSS than it declares a publication must allow');
});
