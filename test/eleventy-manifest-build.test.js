import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, stat, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execute = promisify(execFile);
const templateRoot = fileURLToPath(new URL('..', import.meta.url));
const eleventy = path.join(templateRoot, 'node_modules', '@11ty', 'eleventy', 'cmd.cjs');
const PERFORMANCE_BUDGETS = {
  managedJavaScriptBytes: 67_584,
  managedCssBytes: 34_816,
  ordinaryHtmlBytes: 32_768
};

async function bytes(file) {
  return (await stat(file)).size;
}

async function fixture({ manifest = true } = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'gala-eleventy-manifest-'));
  for (const item of ['src', 'lib', 'static']) {
    await cp(path.join(templateRoot, item), path.join(root, item), { recursive: true });
  }
  for (const item of ['eleventy.config.js', 'site.config.yml', 'custom.css']) {
    await cp(path.join(templateRoot, item), path.join(root, item));
  }
  await writeFile(path.join(root, 'site.config.yml'), `schemaVersion: 1
site:
  id: 01K00000000000000000000010
  name: Fixture Site
  repository: fixture-owner/fixture-site
  defaultLanguage: en
  timezone: UTC
hosting:
  provider: github-pages
  topology: domain-subpath
  canonicalBaseUrl: https://example.com
  pathPrefix: /blog
design:
  theme: editorial
  layout: article-first
  palette: default
sharing:
  targets: []
  socialProfiles: {}
performance:
  budgets:
    managedJavaScriptBytes: ${PERFORMANCE_BUDGETS.managedJavaScriptBytes}
    managedCssBytes: ${PERFORMANCE_BUDGETS.managedCssBytes}
    ordinaryHtmlBytes: ${PERFORMANCE_BUDGETS.ordinaryHtmlBytes}
`);
  await writeFile(path.join(root, 'package.json'), '{"type":"module"}\n');
  await symlink(path.join(templateRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  await mkdir(path.join(root, 'content', 'posts', 'not-validated'), { recursive: true });
  await writeFile(
    path.join(root, 'content', 'posts', 'not-validated', 'index.en.md'),
    '---\ntitle: Must not emit\n---\nBody\n'
  );
  await mkdir(path.join(root, 'content', 'posts', 'validated', 'media'), { recursive: true });
  await writeFile(
    path.join(root, 'content', 'posts', 'validated', 'media', 'cover image.png'),
    'validated-image'
  );
  if (manifest) {
    await mkdir(path.join(root, '.gala', 'build'), { recursive: true });
    await writeFile(path.join(root, '.gala', 'build', 'validated-posts.json'), JSON.stringify({
      schemaVersion: 1,
      evaluationDate: '2026-06-15',
      redirects: [
        {
          id: '01K00000000000000000000000',
          language: 'en',
          relativeUrl: '/en/old-validated/',
          pageUrl: 'https://example.com/blog/en/old-validated/',
          targetUrl: 'https://example.com/blog/en/validated/'
        }
      ],
      posts: [
        {
          source: 'content/posts/validated/index.en.md',
          id: '01K00000000000000000000000',
          rawFrontmatter: {
            title: 'Validated', publishAfterDate: '2026-06-15', language: 'en',
            coverImage: 'media/cover image.png'
          },
          frontmatter: {
            title: 'Validated', publishAfterDate: '2026-06-15', language: 'en',
            coverImage: 'media/cover image.png'
          },
          contentBody: 'Validated **body**.',
          body: 'Validated **body**.',
          slug: 'validated',
          language: 'en',
          relativeUrl: '/en/validated/',
          pageUrl: 'https://example.com/blog/en/validated/',
          canonicalUrl: 'https://canonical.example/validated?source=gala&language=en',
          media: [{
            source: 'content/posts/validated/media/cover image.png',
            output: 'en/validated/media/cover image.png'
          }],
          publicationState: 'published'
        },
        {
          source: 'content/posts/validated/index.fr.md',
          id: '01K00000000000000000000000',
          rawFrontmatter: { title: 'Validé', publishAfterDate: '2026-06-15', language: 'fr' },
          frontmatter: { title: 'Validé', publishAfterDate: '2026-06-15', language: 'fr' },
          contentBody: 'Corps **validé**.',
          body: 'Corps **validé**.',
          slug: 'validated',
          language: 'fr',
          relativeUrl: '/fr/validated/',
          pageUrl: 'https://example.com/blog/fr/validated/',
          canonicalUrl: 'https://example.com/blog/fr/validated/',
          publicationState: 'published'
        },
        {
          source: 'content/posts/without-snapshot/index.de.md',
          id: '01K00000000000000000000002',
          rawFrontmatter: {
            title: 'Without snapshot', publishAfterDate: '2026-06-15', language: 'de'
          },
          frontmatter: {
            title: 'Without snapshot', publishAfterDate: '2026-06-15', language: 'de'
          },
          contentBody: 'No snapshot entry.',
          body: 'No snapshot entry.',
          slug: 'without-snapshot',
          language: 'de',
          relativeUrl: '/de/without-snapshot/',
          pageUrl: 'https://example.com/blog/de/without-snapshot/',
          canonicalUrl: 'https://example.com/blog/de/without-snapshot/',
          publicationState: 'published'
        },
        {
          source: 'content/posts/deleted/index.fr.md',
          id: '01K00000000000000000000001',
          rawFrontmatter: {
            title: 'Deleted', publishAfterDate: '2026-06-01',
            deleteDate: '2026-06-14', language: 'fr'
          },
          frontmatter: {
            title: 'Deleted', publishAfterDate: '2026-06-01',
            deleteDate: '2026-06-14', language: 'fr'
          },
          contentBody: 'Deleted body.',
          body: null,
          slug: 'deleted-post',
          language: 'fr',
          relativeUrl: '/fr/deleted-post/',
          pageUrl: 'https://example.com/blog/fr/deleted-post/',
          canonicalUrl: 'https://example.com/blog/fr/deleted-post/',
          publicationState: 'tombstoned'
        }
      ]
    }));
    await writeFile(path.join(root, '.engagement-snapshot.json'), JSON.stringify({
      schemaVersion: 1,
      refreshedAt: '2026-06-15T00:00:00Z',
      articles: {
        '01K00000000000000000000000': { reactions: 2, comments: 3, views: 5 }
      }
    }));
  }
  return root;
}

async function previewFixture() {
  const root = await fixture();
  const manifestPath = path.join(root, '.gala', 'build', 'validated-posts.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.preview = true;
  manifest.posts.push({
    source: 'content/posts/scheduled/index.en.md',
    id: null,
    rawFrontmatter: { title: 'Scheduled post', publishAfterDate: '2026-06-20', language: 'en' },
    frontmatter: { title: 'Scheduled post', publishAfterDate: '2026-06-20', language: 'en' },
    contentBody: 'Scheduled **preview** body.',
    body: 'Scheduled **preview** body.',
    slug: 'scheduled',
    language: 'en',
    relativeUrl: '/en/scheduled/',
    pageUrl: 'https://example.com/blog/en/scheduled/',
    canonicalUrl: 'https://example.com/blog/en/scheduled/',
    publicationState: 'not-emitted'
  });
  await writeFile(manifestPath, JSON.stringify(manifest));
  return root;
}

test('Eleventy emits only current manifest pages and renders tombstones in place', async () => {
  const root = await fixture();
  await execute(process.execPath, [eleventy], {
    cwd: root,
    env: {
      ...process.env,
      GALA_PATH_PREFIX: '/wrong-environment-prefix/',
      GALA_BUILD_INSTANT: '2026-06-15T12:30:00Z',
      GALA_BUILD_COMMIT: 'a'.repeat(40)
    }
  });

  const published = await readFile(path.join(root, '_site', 'en', 'validated', 'index.html'), 'utf8');
  assert.match(published, /<strong>body<\/strong>/);
  assert.match(published, /1 min read/);
  assert.ok(await bytes(path.join(root, '_site', 'favicon.ico')) > 0);
  assert.match(published, /href="\/blog\/assets\/theme\.css"/);
  assert.doesNotMatch(published, /wrong-environment-prefix/);
  assert.match(
    published,
    /<link rel="canonical" href="https:\/\/canonical.example\/validated\?source=gala&amp;language=en">/
  );
  assert.match(
    published,
    /data-copy-url="https:\/\/canonical.example\/validated\?source=gala&amp;language=en"/
  );
  assert.match(published, /<meta name="description" content="Validated body\.">/);
  assert.match(published, /<meta property="og:type" content="article">/);
  assert.match(published, /<meta property="og:url" content="https:\/\/canonical\.example\/validated\?source=gala&amp;language=en">/);
  assert.match(published, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(
    published,
    /<meta property="og:image" content="https:\/\/example\.com\/blog\/en\/validated\/media\/cover%20image\.png">/
  );
  assert.match(published, /"@type":"BlogPosting"/);
  assert.match(published, /"@type":"BreadcrumbList"/);
  assert.match(published, /href="https:\/\/example\.com\/blog\/feed\/en\.xml"/);
  assert.match(
    published,
    /class="gala-share__fallback" value="https:\/\/canonical.example\/validated\?source=gala&amp;language=en"/
  );
  assert.match(
    published,
    /rel="alternate" hreflang="en" href="https:\/\/example.com\/blog\/en\/validated\/"/
  );
  assert.match(
    published,
    /rel="alternate" hreflang="x-default" href="https:\/\/example.com\/blog\/en\/validated\/"/
  );
  assert.match(published, /data-language-preference/);
  assert.match(
    published,
    /href="\/blog\/s\/version\/"[^>]*>a{8}<\/a>/
  );
  const versionPage = await readFile(path.join(root, '_site', 's', 'version', 'index.html'), 'utf8');
  assert.match(versionPage, /data-site-id="01K00000000000000000000010"/);
  assert.match(versionPage, /data-repository="fixture-owner\/fixture-site"/);
  assert.match(versionPage, /data-publication-commit="a{40}"/);
  assert.match(versionPage, /src="\/blog\/assets\/version\.js"/);
  assert.doesNotMatch(published, /data-engagement-snapshot|data-engagement-live/);
  assert.match(published, /title="2 reactions"/);
  assert.match(published, /title="3 comments"/);
  assert.match(published, /title="5 views"/);
  const withoutSnapshot = await readFile(
    path.join(root, '_site', 'de', 'without-snapshot', 'index.html'),
    'utf8'
  );
  assert.doesNotMatch(withoutSnapshot, /gala-engagement__placeholder|data-engagement-live/);
  assert.match(withoutSnapshot, /data-engagement-status[^>]*>Loading comments…<\/output>/);
  assert.doesNotMatch(withoutSnapshot, /<dd>0<\/dd>/);
  assert.match(
    withoutSnapshot,
    /rel="alternate" hreflang="x-default" href="https:\/\/example.com\/blog\/"/
  );
  assert.match(published, /value="en"[^>]* selected/);
  assert.match(published, /data-url="https:\/\/example.com\/blog\/fr\/validated\/"/);
  const tombstone = await readFile(path.join(root, '_site', 'fr', 'deleted-post', 'index.html'), 'utf8');
  assert.match(tombstone, /POST deleted on 2026-06-14/);
  assert.match(tombstone, /<meta name="robots" content="noindex">/);
  assert.doesNotMatch(tombstone, /data-copy-url=/);
  const sitemap = await readFile(path.join(root, '_site', 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /<loc>https:\/\/example.com\/blog\/en\/validated\/<\/loc>/);
  assert.match(sitemap, /hreflang="x-default"/);
  assert.doesNotMatch(sitemap, /deleted-post/);
  const index = await readFile(path.join(root, '_site', 'index.html'), 'utf8');
  assert.match(index, /class="gala-card-index"/);
  assert.match(index, /href="\/blog\/en\/validated\/"/);
  assert.match(index, />Validated<\/a>/);
  assert.match(index, />Validé<\/a>/);
  assert.doesNotMatch(index, /Deleted/);
  const searchIndex = JSON.parse(await readFile(
    path.join(root, '_site', 'search-index.json'),
    'utf8'
  ));
  assert.deepEqual(
    searchIndex.entries.map(({ title }) => title),
    ['Validated', 'Validé', 'Without snapshot']
  );
  assert.equal(searchIndex.entries.find(({ title }) => title === 'Validated').body, 'Validated **body**.');
  assert.equal(searchIndex.entries.some(({ title }) => title === 'Deleted'), false);
  const search = await readFile(path.join(root, '_site', 'search', 'index.html'), 'utf8');
  assert.match(search, /data-gala-search/);
  assert.match(search, /data-index-url="\/blog\/search-index\.json"/);
  assert.match(search, /src="\/blog\/assets\/reader\.js"/);
  assert.doesNotMatch(search, /assets\/(?:search|interactions|preferences|theme-mode|engagement-comments|engagement-transport)\.js/);
  /*
   * There is no settings page. The two reader settings live in the header's own dialog, and a
   * page carrying a second copy of them was a second thing to keep correct.
   */
  const home = await readFile(path.join(root, '_site', 'index.html'), 'utf8');
  assert.match(home, /id="gala-settings-dialog"/);
  // Shipped, and linked, so no reader's browser asks for /favicon.ico and gets a 404.
  assert.match(home, /rel="icon"[^>]*assets\/favicon\.svg/);
  assert.ok(await bytes(path.join(root, '_site', 'assets', 'favicon.svg')) > 0);
  assert.match(home, /option value="en"/);
  assert.match(home, /option value="fr"/);
  assert.doesNotMatch(home, /Open settings page/);
  for (const relative of [
    'index.html',
    path.join('en', 'validated', 'index.html'),
    path.join('search', 'index.html')
  ]) {
    assert.ok(
      await bytes(path.join(root, '_site', relative)) <= PERFORMANCE_BUDGETS.ordinaryHtmlBytes,
      `${relative} exceeds the ordinary HTML performance budget`
    );
  }
  // Readers receive one dependency-free browser bundle.
  const managedJavaScriptBytes = await Promise.all([
    'reader.js'
  ].map((asset) => bytes(path.join(root, '_site', 'assets', asset))));
  assert.ok(
    managedJavaScriptBytes.reduce((total, size) => total + size, 0)
      <= PERFORMANCE_BUDGETS.managedJavaScriptBytes,
    'managed JavaScript exceeds its performance budget'
  );
  assert.ok(
    await bytes(path.join(root, '_site', 'assets', 'theme.css'))
      <= PERFORMANCE_BUDGETS.managedCssBytes,
    'managed CSS exceeds its performance budget'
  );
  const englishFeed = await readFile(path.join(root, '_site', 'feed', 'en.xml'), 'utf8');
  assert.match(englishFeed, /<updated>2026-06-15T12:30:00\.000Z<\/updated>/);
  assert.match(englishFeed, /<id>urn:gala:article:01K00000000000000000000000:en<\/id>/);
  assert.match(englishFeed, /&lt;p&gt;Validated &lt;strong&gt;body&lt;\/strong&gt;\.&lt;\/p&gt;/);
  assert.doesNotMatch(englishFeed, /Deleted/);
  const frenchFeed = await readFile(path.join(root, '_site', 'feed', 'fr.xml'), 'utf8');
  assert.match(frenchFeed, /Validé/);
  assert.doesNotMatch(frenchFeed, /Deleted/);
  const englishIndex = await readFile(path.join(root, '_site', 'en', 'index.html'), 'utf8');
  assert.match(englishIndex, /Fixture Site - en/);
  assert.match(englishIndex, /href="https:\/\/example\.com\/blog\/en\/validated\/"/);
  assert.equal(
    await readFile(path.join(root, '_site', 'en', 'validated', 'media', 'cover image.png'), 'utf8'),
    'validated-image'
  );
  const redirect = await readFile(
    path.join(root, '_site', 'en', 'old-validated', 'index.html'),
    'utf8'
  );
  assert.match(redirect, /http-equiv="refresh" content="0; url=https:\/\/example.com\/blog\/en\/validated\/"/);
  assert.match(redirect, /rel="canonical" href="https:\/\/example.com\/blog\/en\/validated\/"/);
  await assert.rejects(
    () => readFile(path.join(root, '_site', 'not-validated', 'index.html')),
    { code: 'ENOENT' }
  );
});

test('Eleventy fails hard instead of globbing content when the manifest is missing', async () => {
  const root = await fixture({ manifest: false });
  await assert.rejects(
    () => execute(process.execPath, [eleventy], { cwd: root }),
    /Validated build manifest is missing/
  );
});

test('local preview renders a scheduled post with an explicit schedule label', async () => {
  const root = await previewFixture();
  await execute(process.execPath, [eleventy], { cwd: root });

  const home = await readFile(path.join(root, '_site', 'index.html'), 'utf8');
  assert.match(home, />Scheduled post<\/a>/);
  assert.match(home, /Scheduled for 2026-06-20/);
  const post = await readFile(path.join(root, '_site', 'en', 'scheduled', 'index.html'), 'utf8');
  assert.match(post, /<h1>Scheduled post<\/h1>/);
  assert.match(post, /Scheduled for 2026-06-20/);
  assert.match(post, /Scheduled <strong>preview<\/strong> body\./);
  assert.doesNotMatch(post, /data-engagement-url|Article conversation/);
});

test('Eleventy refuses a validated media path replaced by a symbolic link', async () => {
  const root = await fixture();
  const media = path.join(root, 'content', 'posts', 'validated', 'media', 'cover image.png');
  const outside = path.join(root, 'outside.png');
  await writeFile(outside, 'outside-image');
  await unlink(media);
  await symlink(outside, media);

  await assert.rejects(
    () => execute(process.execPath, [eleventy], { cwd: root }),
    /Validated media source is no longer a regular file/
  );
});

test('a published site carries a custom domain only when the domain is its own', async () => {
  const root = await fixture();
  const build = () => execute(process.execPath, [eleventy], {
    cwd: root, env: { ...process.env, GALA_BUILD_INSTANT: '2026-06-15T12:30:00Z' }
  });
  await build();

  // Served at example.com/blog, so GitHub is lending it the domain held by the owner's main
  // site. Writing CNAME here would override that and move this site to the domain root.
  await assert.rejects(() => readFile(path.join(root, '_site', 'CNAME')), { code: 'ENOENT' });

  const configuration = path.join(root, 'site.config.yml');
  await writeFile(configuration,
    (await readFile(configuration, 'utf8')).replace('pathPrefix: /blog', 'pathPrefix: /'));
  await build();

  // At the root of its own domain the site must restate it on every publish: the published
  // branch is force-pushed, so an unwritten CNAME is a custom domain silently dropped.
  assert.equal(await readFile(path.join(root, '_site', 'CNAME'), 'utf8'), 'example.com\n');
});
