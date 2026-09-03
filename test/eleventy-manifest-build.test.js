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
  managedCssBytes: 36_864,
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
            description: 'A directly useful answer.', contentType: 'technical',
            coverImage: 'media/cover image.png',
            sources: ['https://source.example/reference?a=1&b=2'],
            faq: [{ question: 'What is <validated>?', answer: 'A safe & visible answer.' }]
          },
          frontmatter: {
            title: 'Validated', publishAfterDate: '2026-06-15', language: 'en',
            description: 'A directly useful answer.', contentType: 'technical',
            coverImage: 'media/cover image.png',
            sources: ['https://source.example/reference?a=1&b=2'],
            faq: [{ question: 'What is <validated>?', answer: 'A safe & visible answer.' }]
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
            title: 'Without snapshot', publishAfterDate: '2026-06-16', language: 'de'
          },
          frontmatter: {
            title: 'Without snapshot', publishAfterDate: '2026-06-16', language: 'de'
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
    await writeFile(path.join(root, '.gala', 'build', 'build-settings.json'), JSON.stringify({
      schemaVersion: 1,
      generatedAt: '2026-06-15T12:30:00Z',
      paginationPolicy: { minimumPageSize: 12, maximumPageSize: 100, defaultPageSize: 24 },
      contributorCredits: {
        validated: {
          authors: ['Author One', 'Author Two'],
          editors: ['Editor One']
        }
      }
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
  assert.match(published, /By Author One, Author Two · Edited by Editor One/);
  assert.match(published, /"author":\[\{"@type":"Person","name":"Author One"\},\{"@type":"Person","name":"Author Two"\}\]/);
  assert.ok(await bytes(path.join(root, '_site', 'favicon.ico')) > 0);
  assert.match(published, /href="\.\.\/\.\.\/assets\/theme\.css"/);
  assert.doesNotMatch(published, /wrong-environment-prefix/);
  assert.match(
    published,
    /<link rel="canonical" href="https:\/\/canonical.example\/validated\?source=gala&amp;language=en">/
  );
  assert.match(
    published,
    /data-copy-url="https:\/\/canonical.example\/validated\?source=gala&amp;language=en"/
  );
  assert.match(published, /<meta name="description" content="A directly useful answer\.">/);
  assert.match(published, /<meta property="og:type" content="article">/);
  assert.match(published, /<meta property="og:url" content="https:\/\/canonical\.example\/validated\?source=gala&amp;language=en">/);
  assert.match(published, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(
    published,
    /<meta property="og:image" content="https:\/\/example\.com\/blog\/en\/validated\/media\/cover%20image\.png">/
  );
  assert.match(published, /"@type":"TechArticle"/);
  assert.match(published, /"@type":"FAQPage"/);
  assert.match(published, /class="gala-article-sources"/);
  assert.match(published, /href="https:\/\/source\.example\/reference\?a=1&amp;b=2"/);
  assert.match(published, /What is &lt;validated&gt;\?/);
  assert.match(published, /A safe &amp; visible answer\./);
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
  assert.match(published, /<link rel="alternate" type="text\/markdown" href="https:\/\/example\.com\/blog\/en\/validated\/index\.md">/);
  assert.match(published, /<link rel="describedby" href="https:\/\/example\.com\/blog\/en\/validated\/provenance\/">/);
  assert.doesNotMatch(published, /<link rel="license"/);
  assert.match(
    published,
    /href="\.\.\/\.\.\/s\/version\/"[^>]*>a{8}<\/a>/
  );
  const versionPage = await readFile(path.join(root, '_site', 's', 'version', 'index.html'), 'utf8');
  assert.match(versionPage, /data-site-id="01K00000000000000000000010"/);
  assert.match(versionPage, /data-repository="fixture-owner\/fixture-site"/);
  assert.match(versionPage, /data-publication-commit="a{40}"/);
  assert.match(versionPage, /src="\.\.\/\.\.\/assets\/version\.js"/);
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
  assert.match(tombstone, /<meta name="robots" content="noindex,nofollow">/);
  assert.doesNotMatch(tombstone, /data-copy-url=/);
  const sitemap = await readFile(path.join(root, '_site', 'sitemap.xml'), 'utf8');
  assert.match(sitemap, /<loc>https:\/\/example.com\/blog\/en\/validated\/<\/loc>/);
  assert.match(sitemap, /hreflang="x-default"/);
  assert.doesNotMatch(sitemap, /deleted-post/);
  const llms = await readFile(path.join(root, '_site', 'llms.txt'), 'utf8');
  assert.match(llms, /https:\/\/example\.com\/blog\/en\/validated\/index\.md/);
  const markdown = await readFile(path.join(root, '_site', 'en', 'validated', 'index.md'), 'utf8');
  assert.match(markdown, /^# Validated/m);
  const provenancePage = await readFile(
    path.join(root, '_site', 'en', 'validated', 'provenance', 'index.html'), 'utf8'
  );
  assert.match(provenancePage, /<h1>Article provenance<\/h1>/);
  const provenanceJson = /<script type="application\/json" id="gala-provenance">([^<]+)<\/script>/
    .exec(provenancePage)?.[1];
  assert.ok(provenanceJson, 'the provenance page must carry its machine-readable record');
  const provenance = JSON.parse(provenanceJson);
  assert.equal(provenance.commit, 'a'.repeat(40));
  assert.match(provenance.sourceSha256, /^[a-f0-9]{64}$/);
  const robots = await readFile(path.join(root, '_site', 'robots.txt'), 'utf8');
  assert.equal(robots, 'Sitemap: https://example.com/blog/sitemap.xml\n');
  await assert.rejects(readFile(path.join(root, '_site', 'license.xml')), /ENOENT/);
  const index = await readFile(path.join(root, '_site', 'index.html'), 'utf8');
  assert.match(index, /class="gala-card-index"/);
  assert.match(index, /href="\.\/en\/validated\/"/);
  assert.match(index, />Validated<\/a>/);
  assert.equal((index.match(/class="gala-card"/g) ?? []).length, 2);
  assert.equal((index.match(/>Validated<\/a>/g) ?? []).length, 1);
  assert.match(index, /aria-label="Available languages"/);
  assert.match(index, /hreflang="en"[^>]*>English<\/a>/);
  assert.match(index, /hreflang="fr"[^>]*>fran[cç]ais<\/a>/i);
  assert.doesNotMatch(index, />Validé<\/a>/);
  assert.doesNotMatch(index, /Deleted/);
  assert.ok(index.indexOf('Without snapshot') < index.indexOf('Validated'));
  assert.match(index, /Published <time datetime="2026-06-15">2026-06-15<\/time>/);
  assert.match(index, /1 min read/);
  const englishIndex = await readFile(path.join(root, '_site', 'en', 'index.html'), 'utf8');
  assert.match(englishIndex, /<html lang="en"/);
  assert.match(englishIndex, /class="gala-card-index"/);
  assert.equal((englishIndex.match(/class="gala-card"/g) ?? []).length, 1);
  assert.match(englishIndex, /href="\.\/validated\/"/);
  assert.match(englishIndex, /Published <time datetime="2026-06-15">2026-06-15<\/time>/);
  assert.doesNotMatch(englishIndex, /Validé|Available languages/);
  const frenchIndex = await readFile(path.join(root, '_site', 'fr', 'index.html'), 'utf8');
  assert.match(frenchIndex, /<html lang="fr"/);
  assert.match(frenchIndex, />Validé<\/a>/);
  assert.doesNotMatch(frenchIndex, />Validated<\/a>|Available languages/);
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
  assert.match(search, /data-index-url="\.\.\/search-index\.json"/);
  assert.match(search, /src="\.\.\/assets\/reader\.js"/);
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
    path.join('en', 'index.html'),
    path.join('fr', 'index.html'),
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
  assert.match(englishIndex, /Fixture Site - en/);
  assert.match(englishIndex, /href="\.\/validated\/"/);
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

test('Eleventy verifies and renders a selected immutable appearance theme after managed CSS', async () => {
  const root = await fixture();
  const css = Buffer.from(':root{--gala-radius:1rem}\n');
  const cssSha256 = (await import('node:crypto')).createHash('sha256').update(css).digest('hex');
  await mkdir(path.join(root, 'static', 'assets'), { recursive: true });
  await writeFile(path.join(root, 'static', 'assets', 'appearance-theme.css'), css);
  await writeFile(path.join(root, 'site.config.yml'), `${await readFile(path.join(root, 'site.config.yml'), 'utf8')}
appearanceTheme:
  id: quiet-paper
  version: 1.2.0
  repository: "rathnasgala/theme-quiet-paper"
  commitSha: ${'a'.repeat(40)}
  cssSha256: ${cssSha256}
  cssBytes: ${css.length}
  baseManagedCssBytes: 36864
`);
  await execute(process.execPath, [eleventy], {
    cwd: root,
    env: { ...process.env, GALA_BUILD_INSTANT: '2026-06-15T12:30:00Z' }
  });
  const page = await readFile(path.join(root, '_site', 'en', 'validated', 'index.html'), 'utf8');
  assert.match(page, /href="\.\.\/\.\.\/assets\/appearance-theme\.css" data-gala-appearance-theme="quiet-paper@1\.2\.0"/);
  assert.equal(await readFile(path.join(root, '_site', 'assets', 'appearance-theme.css'), 'utf8'), css.toString());
});

test('Eleventy localizes the Tamil index and gives language preferences real destinations', async () => {
  const root = await fixture();
  const manifestPath = path.join(root, '.gala', 'build', 'validated-posts.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  manifest.posts.push({
    source: 'content/posts/validated/index.ta.md',
    id: '01K00000000000000000000000',
    rawFrontmatter: {
      title: 'சரிபார்க்கப்பட்டது', publishAfterDate: '2026-06-15', language: 'ta'
    },
    frontmatter: {
      title: 'சரிபார்க்கப்பட்டது', publishAfterDate: '2026-06-15', language: 'ta'
    },
    contentBody: 'சரிபார்க்கப்பட்ட உள்ளடக்கம்.',
    body: 'சரிபார்க்கப்பட்ட உள்ளடக்கம்.',
    slug: 'validated',
    language: 'ta',
    relativeUrl: '/ta/validated/',
    pageUrl: 'https://example.com/blog/ta/validated/',
    canonicalUrl: 'https://example.com/blog/ta/validated/',
    publicationState: 'published'
  });
  await writeFile(manifestPath, JSON.stringify(manifest));

  await execute(process.execPath, [eleventy], { cwd: root });

  const tamilIndex = await readFile(path.join(root, '_site', 'ta', 'index.html'), 'utf8');
  assert.match(tamilIndex, /<html lang="ta"/);
  assert.match(tamilIndex, /<h1>தமிழ் கட்டுரைகள்<\/h1>/);
  assert.match(tamilIndex, /வெளியிடப்பட்டது <time datetime="2026-06-15">2026-06-15<\/time>/);
  assert.match(tamilIndex, /1 நிமிட வாசிப்பு/);
  assert.match(tamilIndex, /id="gala-settings-title">வாசகர் அமைப்புகள்<\/h2>/);
  assert.match(tamilIndex, />விருப்ப மொழி\s*<select/);
  assert.match(tamilIndex, /value="" data-url="\.\.\/">அனைத்து மொழிகளும்<\/option>/);
  assert.match(tamilIndex, /value="en" data-url="\.\.\/en\/"/);
  assert.doesNotMatch(
    tamilIndex,
    /<h1>Fixture Site - ta<\/h1>|class="gala-card__meta">Published | min read<\/p>/
  );

  const rootIndex = await readFile(path.join(root, '_site', 'index.html'), 'utf8');
  assert.match(rootIndex, /data-language-preference data-navigate-on-selection data-current-language=""/);
  assert.match(rootIndex, /value="" data-url="\.\/" selected>All languages<\/option>/);
  assert.doesNotMatch(rootIndex, /data-apply-on-load/);
  assert.match(rootIndex, /value="ta" data-url="\.\/ta\/"[^>]*>தமிழ்<\/option>/);

  const englishPost = await readFile(
    path.join(root, '_site', 'en', 'validated', 'index.html'), 'utf8'
  );
  assert.match(
    englishPost,
    /value="ta" data-url="https:\/\/example\.com\/blog\/ta\/validated\/"[^>]*>தமிழ்<\/option>/
  );

  const germanPost = await readFile(
    path.join(root, '_site', 'de', 'without-snapshot', 'index.html'), 'utf8'
  );
  assert.match(germanPost, /value="ta" data-url="\.\.\/\.\.\/ta\/"/);
});

test('Eleventy renders localized RTL indexes with RTL document direction', async () => {
  const root = await fixture();
  const manifestPath = path.join(root, '.gala', 'build', 'validated-posts.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const rtlPosts = [
    ['ar', '01K00000000000000000000011', 'مقال عربي'],
    ['fa', '01K00000000000000000000012', 'مقاله فارسی'],
    ['he', '01K00000000000000000000013', 'מאמר בעברית'],
    ['ur', '01K00000000000000000000014', 'اردو مضمون']
  ];
  for (const [language, id, title] of rtlPosts) {
    manifest.posts.push({
      source: `content/posts/rtl/index.${language}.md`,
      id,
      rawFrontmatter: { title, publishAfterDate: '2026-06-17', language },
      frontmatter: { title, publishAfterDate: '2026-06-17', language },
      contentBody: title,
      body: title,
      slug: `rtl-${language}`,
      language,
      relativeUrl: `/${language}/rtl-${language}/`,
      pageUrl: `https://example.com/blog/${language}/rtl-${language}/`,
      canonicalUrl: `https://example.com/blog/${language}/rtl-${language}/`,
      publicationState: 'published'
    });
  }
  await writeFile(manifestPath, JSON.stringify(manifest));

  await execute(process.execPath, [eleventy], { cwd: root });

  const expectedSettings = new Map([
    ['ar', 'إعدادات القارئ'],
    ['fa', 'تنظیمات خواننده'],
    ['he', 'הגדרות קורא'],
    ['ur', 'قارئین کی ترتیبات']
  ]);
  for (const [language, settings] of expectedSettings) {
    const index = await readFile(path.join(root, '_site', language, 'index.html'), 'utf8');
    assert.match(index, new RegExp(`<html lang="${language}" dir="rtl"`), language);
    assert.match(index, new RegExp(`id="gala-settings-title">${settings}</h2>`), language);
    assert.doesNotMatch(index, /id="gala-settings-title">Reader settings<\/h2>/, language);
  }
});

test('Eleventy fails hard instead of globbing content when the manifest is missing', async () => {
  const root = await fixture({ manifest: false });
  await assert.rejects(
    () => execute(process.execPath, [eleventy], { cwd: root }),
    /Validated build manifest is missing/
  );
});

test('Eleventy generates static root and language pagination with canonical navigation', async () => {
  const root = await fixture();
  const manifestPath = path.join(root, '.gala', 'build', 'validated-posts.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  for (let index = 10; index < 22; index += 1) {
    const suffix = String(index).padStart(2, '0');
    manifest.posts.push({
      source: `content/posts/extra-${suffix}/index.en.md`,
      id: `01K000000000000000000000${suffix}`,
      rawFrontmatter: { title: `Extra ${suffix}`, publishAfterDate: '2026-06-10', language: 'en' },
      frontmatter: { title: `Extra ${suffix}`, publishAfterDate: '2026-06-10', language: 'en' },
      contentBody: `Extra ${suffix}.`, body: `Extra ${suffix}.`, slug: `extra-${suffix}`, language: 'en',
      relativeUrl: `/en/extra-${suffix}/`, pageUrl: `https://example.com/blog/en/extra-${suffix}/`,
      canonicalUrl: `https://example.com/blog/en/extra-${suffix}/`, publicationState: 'published'
    });
  }
  await writeFile(manifestPath, JSON.stringify(manifest));
  await writeFile(path.join(root, 'site.config.yml'),
    `${await readFile(path.join(root, 'site.config.yml'), 'utf8')}pagination:\n  pageSize: 12\n`);
  await writeFile(path.join(root, '.gala', 'build', 'build-settings.json'), JSON.stringify({
    schemaVersion: 1,
    generatedAt: '2026-06-15T12:30:00.123456789Z',
    paginationPolicy: { minimumPageSize: 12, maximumPageSize: 100, defaultPageSize: 24 }
  }));

  await execute(process.execPath, [eleventy], { cwd: root });

  const rootFirst = await readFile(path.join(root, '_site', 'index.html'), 'utf8');
  const rootSecond = await readFile(path.join(root, '_site', '2', 'index.html'), 'utf8');
  const englishSecond = await readFile(path.join(root, '_site', 'en', '2', 'index.html'), 'utf8');
  assert.equal((rootFirst.match(/class="gala-card"/g) ?? []).length, 12);
  assert.equal((rootSecond.match(/class="gala-card"/g) ?? []).length, 2);
  assert.equal((englishSecond.match(/class="gala-card"/g) ?? []).length, 1);
  assert.match(rootFirst, /Page 1 of 2/);
  assert.match(rootFirst, /href="\.\/2\/" rel="next">Older articles<\/a>/);
  assert.match(rootSecond, /href="\.\.\/" rel="prev">Newer articles<\/a>/);
  assert.match(rootSecond, /<link rel="canonical" href="https:\/\/example\.com\/blog\/2\/">/);
  assert.match(englishSecond, /<link rel="canonical" href="https:\/\/example\.com\/blog\/en\/2\/">/);
});

test('Eleventy rejects an author page size outside the current platform policy', async () => {
  const root = await fixture();
  await writeFile(path.join(root, 'site.config.yml'),
    `${await readFile(path.join(root, 'site.config.yml'), 'utf8')}pagination:\n  pageSize: 11\n`);
  await writeFile(path.join(root, '.gala', 'build', 'build-settings.json'), JSON.stringify({
    schemaVersion: 1,
    generatedAt: '2026-06-15T12:30:00Z',
    paginationPolicy: { minimumPageSize: 12, maximumPageSize: 100, defaultPageSize: 24 }
  }));

  await assert.rejects(
    () => execute(process.execPath, [eleventy], { cwd: root }),
    /pagination\.pageSize 11 is outside the platform range 12-100/
  );
});

test('local preview renders a scheduled post with an explicit schedule label', async () => {
  const root = await previewFixture();
  await execute(process.execPath, [eleventy], { cwd: root });

  const home = await readFile(path.join(root, '_site', 'index.html'), 'utf8');
  assert.match(home, />Scheduled post<\/a>/);
  assert.match(home, /Scheduled for <time datetime="2026-06-20">2026-06-20<\/time>/);
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
