import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { verifyPrismCompiledOutput } from '../lib/prism-compiled-output.js';

const execute = promisify(execFile);
const templateRoot = fileURLToPath(new URL('..', import.meta.url));
const eleventy = path.join(templateRoot, 'node_modules', '@11ty', 'eleventy', 'cmd.cjs');
const ARTICLE = '01K00000000000000000000000';
const CONFIGURATION = '01K00000000000000000000001';
const managed = JSON.parse(await readFile(
  new URL('../.gala/managed-files.json', import.meta.url), 'utf8'));

async function build(state = 'PUBLISHED', {
  publicationPolicy = 'NOFOLLOW', articlePolicy,
} = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'gala-prism-compiled-'));
  for (const item of ['src', 'lib', 'static']) await cp(path.join(templateRoot, item), path.join(root, item), { recursive: true });
  for (const item of ['eleventy.config.js', 'site.config.yml', 'custom.css']) await cp(path.join(templateRoot, item), path.join(root, item));
  await writeFile(path.join(root, 'site.config.yml'), `schemaVersion: 1
site:
  id: 01K00000000000000000000010
  name: Prism Fixture
  defaultLanguage: en
  timezone: UTC
hosting:
  provider: github-pages
  topology: domain-root
  canonicalBaseUrl: https://example.com
  pathPrefix: /
design:
  theme: editorial
  layout: article-first
  palette: default
sharing:
  targets: []
  socialProfiles: {}
performance:
  budgets:
    managedJavaScriptBytes: ${managed.requiredBudgets.managedJavaScriptBytes}
    managedCssBytes: ${managed.requiredBudgets.managedCssBytes}
    ordinaryHtmlBytes: 32768
`);
  await writeFile(path.join(root, 'package.json'), '{"type":"module"}\n');
  await symlink(path.join(templateRoot, 'node_modules'), path.join(root, 'node_modules'), 'dir');
  await mkdir(path.join(root, '.gala', 'build'), { recursive: true });
  const post = {
    source: 'content/posts/example/index.en.md', id: ARTICLE,
    rawFrontmatter: { title: 'Canonical work', publishAfterDate: '2026-08-26', language: 'en' },
    frontmatter: { title: 'Canonical work', publishAfterDate: '2026-08-26', language: 'en' },
    contentBody: '# Canonical body', body: '# Canonical body', slug: 'example', language: 'en',
    relativeUrl: '/en/example/', pageUrl: 'https://example.com/en/example/',
    canonicalUrl: 'https://example.com/en/example/', publicationState: 'published',
    prismMode: 'MANUAL', prismConfigurationLinkPolicy: articlePolicy ?? publicationPolicy,
    prismSourceHash: 'a'.repeat(64)
  };
  const configuration = {
    source: `content/posts/example/prism/${CONFIGURATION}/index.en.md`,
    parentSource: post.source, configurationId: CONFIGURATION,
    revisionId: '01K00000000000000000000002', approvalId: '01K00000000000000000000003',
    articleId: ARTICLE, language: 'en', sourceRevisionHash: 'a'.repeat(64),
    configurationContentHash: 'b'.repeat(64), hashContract: 'GALA_PRISM_HASH_V1',
    depth: 'BRIEF', intent: 'ORIENTATION', modality: 'TEXT',
    approvedAt: '2026-08-26T16:00:00.000Z', approvalTokenVersion: 1,
    approvalToken: 'opaque', approvalTokenVerifiedWith: 'CURRENT', state,
    ...(state === 'PUBLISHED' ? { body: '# Approved brief\n\nOnly approved prose.' } : {}),
    relativeUrl: `/en/example/prism/${CONFIGURATION}/`,
    pageUrl: `https://example.com/en/example/prism/${CONFIGURATION}/`,
    canonicalUrl: post.canonicalUrl, configurationLinkPolicy: articlePolicy ?? publicationPolicy
  };
  await writeFile(path.join(root, '.gala', 'build', 'validated-posts.json'), JSON.stringify({
    schemaVersion: 2, evaluationDate: '2026-08-26', posts: [post], redirects: [],
    prism: { schemaVersion: 1, mode: 'MANUAL', configurationLinkPolicy: publicationPolicy,
      articleModes: {}, articleConfigurationLinkPolicies: articlePolicy == null
        ? {} : { [ARTICLE]: articlePolicy } },
    configurations: [configuration]
  }));
  await execute(process.execPath, [eleventy], { cwd: root, env: {
    ...process.env, GALA_BUILD_INSTANT: '2026-08-26T16:00:00.000Z'
  }});
  return root;
}

test('compiled Prism page is semantic, self-identifying, parent-canonical, and excluded from discovery feeds', async () => {
  const root = await build();
  const [canonical, configuration, sitemap, feed] = await Promise.all([
    readFile(path.join(root, '_site', 'en', 'example', 'index.html'), 'utf8'),
    readFile(path.join(root, '_site', 'en', 'example', 'prism', CONFIGURATION, 'index.html'), 'utf8'),
    readFile(path.join(root, '_site', 'sitemap.xml'), 'utf8'),
    readFile(path.join(root, '_site', 'feed', 'en.xml'), 'utf8')
  ]);
  assert.match(canonical, new RegExp(
    `href="https://example.com/en/example/prism/${CONFIGURATION}/"[^>]* rel="nofollow"`));
  assert.match(canonical, /gala\.prism\.session\.v1/);
  assert.match(configuration, /BRIEF · ORIENTATION · TEXT/);
  assert.match(configuration, /Only approved prose/);
  assert.doesNotMatch(configuration, /gala\.prism\.session\.v1/);
  assert.match(configuration, /rel="canonical" href="https:\/\/example.com\/en\/example\/"/);
  assert.match(configuration, /href="https:\/\/example.com\/en\/example\/" data-prism-canonical/);
  assert.doesNotMatch(configuration, /data-prism-canonical[^>]*nofollow/);
  assert.doesNotMatch(sitemap, /\/prism\//);
  assert.doesNotMatch(feed, /\/prism\//);
});

for (const fixture of [
  { state: 'STALE', message: /no longer current/ },
  { state: 'DISABLED', message: /no longer current/ },
  { state: 'REVOKED', message: /no longer current/ },
]) {
  test(`${fixture.state.toLowerCase()} configuration compiles only a canonical fallback with no transformed prose`, async () => {
    const root = await build(fixture.state);
    const html = await readFile(
      path.join(root, '_site', 'en', 'example', 'prism', CONFIGURATION, 'index.html'), 'utf8');
    assert.match(html, fixture.message);
    assert.doesNotMatch(html, /Only approved prose/);
    const restoreLinks = [...html.matchAll(/<a\b[^>]*data-prism-restore[^>]*>/g)];
    assert.ok(restoreLinks.length >= 2);
    for (const [anchor] of restoreLinks) assert.doesNotMatch(anchor, /nofollow/);
  });
}

test('published edition prose and canonical recovery are present in static HTML without JavaScript', async () => {
  const root = await build('PUBLISHED');
  const html = await readFile(
    path.join(root, '_site', 'en', 'example', 'prism', CONFIGURATION, 'index.html'), 'utf8');
  assert.match(html, /Only approved prose/);
  assert.match(html, /href="https:\/\/example.com\/en\/example\/" data-prism-canonical/);
  assert.doesNotMatch(html, /data-prism-content-pending|Loading edition|fetch\(/);
});

for (const fixture of [
  { name: 'publication FOLLOW', publicationPolicy: 'FOLLOW', expected: 'FOLLOW' },
  { name: 'work FOLLOW overrides publication NOFOLLOW', publicationPolicy: 'NOFOLLOW',
    articlePolicy: 'FOLLOW', expected: 'FOLLOW' },
  { name: 'work NOFOLLOW overrides publication FOLLOW', publicationPolicy: 'FOLLOW',
    articlePolicy: 'NOFOLLOW', expected: 'NOFOLLOW' },
]) {
  test(`${fixture.name} changes only links targeting a configuration`, async () => {
    const root = await build('PUBLISHED', fixture);
    const [canonical, configuration] = await Promise.all([
      readFile(path.join(root, '_site', 'en', 'example', 'index.html'), 'utf8'),
      readFile(path.join(root, '_site', 'en', 'example', 'prism', CONFIGURATION, 'index.html'), 'utf8'),
    ]);
    const configurationAnchor = new RegExp(
      `href="https://example.com/en/example/prism/${CONFIGURATION}/"[^>]*`);
    const anchor = canonical.match(configurationAnchor)?.[0] ?? '';
    assert.equal(anchor.includes('rel="nofollow"'), fixture.expected === 'NOFOLLOW');
    assert.match(configuration, /href="https:\/\/example.com\/en\/example\/" data-prism-canonical/);
    assert.doesNotMatch(configuration, /data-prism-canonical[^>]*nofollow/);
  });
}

for (const target of ['sitemap.xml', path.join('feed', 'en.xml')]) {
  test(`production verifier rejects a configuration URL injected into ${target}`, async () => {
    const root = await build();
    const file = path.join(root, '_site', target);
    const leaked = `https://example.com/en/example/prism/${CONFIGURATION}/`;
    await writeFile(file, `${await readFile(file, 'utf8')}\n${leaked}\n`);
    const manifest = JSON.parse(await readFile(
      path.join(root, '.gala', 'build', 'validated-posts.json'), 'utf8'));
    await assert.rejects(
      verifyPrismCompiledOutput({ outputDirectory: path.join(root, '_site'), manifest }),
      (error) => error.code === 'PRISM_CONFIGURATION_DISCOVERY_LEAK',
    );
  });
}
