import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';
import {
  loadSiteConfiguration, validateCanonicalUrlTemplate, validateProfile
} from '../lib/site-config.js';

const config = parse(await readFile(new URL('../site.config.yml', import.meta.url), 'utf8'));
const managed = JSON.parse(await readFile(new URL('../.gala/managed-files.json', import.meta.url), 'utf8'));

test('shipped example post claims no article identity', async () => {
  // Every repository generated from this template is byte-identical, so a hardcoded id meant
  // every site asserted ownership of the same article. The first one to reconcile claimed it
  // and every publication created afterwards failed permanently with "Article identity is
  // already bound to another site". Ship no id: the publish run mints a unique one per site.
  const example = await readFile(
    new URL('../content/posts/example/index.en.md', import.meta.url), 'utf8'
  );
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(example);
  assert.ok(frontmatter, 'example post must carry a frontmatter block');
  assert.equal(parse(frontmatter[1]).id, undefined);
});

test('design contract exposes every scaffold-level design dimension', () => {
  assert.deepEqual(Object.keys(config.design).sort(), [
    'colorMode', 'theme'
  ]);
});

test('stores exact managed theme identity separately from the visual theme', () => {
  assert.deepEqual(config.framework.themePackage, {
    name: managed.themePackage.name,
    version: managed.themePackage.version
  });
  assert.equal(config.framework.themePackage.name, '@rathnasgala/theme');
  assert.match(config.framework.themePackage.version, /^\d+\.\d+\.\d+$/);
  assert.equal(config.design.theme, 'editorial');
});

test('hosting provider is fixed to GitHub Pages in v1', () => {
  assert.equal(config.hosting.provider, 'github-pages');
  assert.equal(config.hosting.canonicalPolicy, 'self');
  assert.equal(config.canonicalPolicy, undefined);
});

test('canonical URL templates preserve a distinct page and language identity', () => {
  assert.equal(validateCanonicalUrlTemplate(config.seo.canonicalUrlTemplate), '');
  assert.equal(
    validateCanonicalUrlTemplate('https://original.example/{language}/{slug}/'),
    'https://original.example/{language}/{slug}/'
  );
  for (const invalid of [
    'http://example.com/{language}/{slug}/',
    'https://example.com/{slug}/',
    'https://example.com/{language}/{slug}/{other}/',
    'https://example.com/{language}/{slug}/#fragment'
  ]) assert.throws(() => validateCanonicalUrlTemplate(invalid), /canonicalUrlTemplate/);
});

test('scaffolds author-owned uncompressed performance budgets', () => {
  assert.deepEqual(config.performance.budgets, {
    // The single dependency-free reader bundle has ample room without letting regressions hide.
    managedJavaScriptBytes: managed.requiredBudgets.managedJavaScriptBytes,
    // Source CSS stays readable; the browser receives the minified artifact.
    managedCssBytes: managed.requiredBudgets.managedCssBytes,
    ordinaryHtmlBytes: 32768
  });
});

test('scaffolds private author-owned public view-count visibility', () => {
  assert.deepEqual(config.statistics, { publicViewCounts: false });
});

test('scaffolds author-owned contact settings disabled by default', () => {
  assert.deepEqual(config.contact, {
    enabled: false,
    websiteEnabled: false,
    phoneEnabled: false
  });
});

test('normalizes the structured public profile and keeps legacy author fallback', () => {
  assert.deepEqual(validateProfile({ author: 'Legacy Writer' }), {
    author: { displayName: 'Legacy Writer', bio: '', avatarUrl: '', profileUrl: '' },
    publisher: { name: '', url: '', logoUrl: '' }
  });
  assert.deepEqual(validateProfile(config.site), {
    author: { displayName: '', bio: '', avatarUrl: '', profileUrl: '' },
    publisher: { name: '', url: '', logoUrl: '' }
  });
});

test('rejects unsafe profile URLs and unnamed publisher links', () => {
  assert.throws(() => validateProfile({
    authorProfile: { avatarUrl: 'javascript:alert(1)' }
  }), /HTTPS URL/);
  assert.throws(() => validateProfile({
    publisher: { url: 'https://publisher.example.com' }
  }), /publisher\.name/);
});

test('accepts only the implemented layout and palette identities', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'gala-config-design-'));
  const writeDesign = (layout, palette) => writeFile(path.join(root, 'site.config.yml'), `schemaVersion: 1
design:
  layout: ${layout}
  palette: ${palette}
performance:
  budgets:
    managedJavaScriptBytes: 32768
    managedCssBytes: 16384
    ordinaryHtmlBytes: 32768
`);
  await writeDesign('portfolio', 'ocean');
  assert.deepEqual((await loadSiteConfiguration({ root })).design, {
    layout: 'portfolio', palette: 'ocean'
  });
  await writeDesign('magazine', 'ocean');
  await assert.rejects(() => loadSiteConfiguration({ root }), /Unsupported legacy design\.layout/);
  await writeDesign('article-first', 'sunset');
  await assert.rejects(() => loadSiteConfiguration({ root }), /Unsupported legacy design\.palette/);
});

test('loads an action-selected checkout-relative config and rejects traversal', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'gala-config-'));
  await mkdir(path.join(root, 'fixtures'));
  await writeFile(path.join(root, 'fixtures', 'site.yml'), `schemaVersion: 1
site:
  name: Alternate
performance:
  budgets:
    managedJavaScriptBytes: 32768
    managedCssBytes: 16384
    ordinaryHtmlBytes: 32768
`);
  assert.equal((await loadSiteConfiguration({ root, configPath: 'fixtures/site.yml' })).site.name, 'Alternate');
  await assert.rejects(
    () => loadSiteConfiguration({ root, configPath: '../site.yml' }),
    /within the checkout/
  );
});

test('rejects missing, unknown, non-integer, and non-positive performance budgets', async () => {
  const invalid = [
    'performance: {}\n',
    'performance:\n  budgets:\n    managedJavaScriptBytes: 32768\n    managedCssBytes: 16384\n    ordinaryHtmlBytes: 32768\n    transferBytes: 1\n',
    'performance:\n  budgets:\n    managedJavaScriptBytes: 1.5\n    managedCssBytes: 16384\n    ordinaryHtmlBytes: 32768\n',
    'performance:\n  budgets:\n    managedJavaScriptBytes: 32768\n    managedCssBytes: 0\n    ordinaryHtmlBytes: 32768\n'
  ];
  for (const performance of invalid) {
    const root = await mkdtemp(path.join(tmpdir(), 'gala-config-invalid-'));
    await writeFile(path.join(root, 'site.config.yml'), `schemaVersion: 1\n${performance}`);
    await assert.rejects(() => loadSiteConfiguration({ root }), /performance\.budgets|Unsupported performance/);
  }
});

test('defaults absent statistics to private and rejects unknown or non-boolean settings', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'gala-config-statistics-'));
  await writeFile(path.join(root, 'site.config.yml'), `schemaVersion: 1
performance:
  budgets:
    managedJavaScriptBytes: 32768
    managedCssBytes: 16384
    ordinaryHtmlBytes: 32768
`);
  assert.deepEqual((await loadSiteConfiguration({ root })).statistics, {
    publicViewCounts: false
  });
  for (const statistics of [
    'statistics: true\n',
    'statistics:\n  publicViewCounts: yes\n',
    'statistics:\n  publicViewCounts: false\n  audienceProfiles: true\n'
  ]) {
    await writeFile(path.join(root, 'site.config.yml'), `schemaVersion: 1
performance:
  budgets:
    managedJavaScriptBytes: 32768
    managedCssBytes: 16384
    ordinaryHtmlBytes: 32768
${statistics}`);
    await assert.rejects(
      () => loadSiteConfiguration({ root }),
      /statistics|Unsupported statistics/
    );
  }
});

test('defaults absent contact settings to disabled and rejects unsupported settings', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'gala-config-contact-'));
  const base = `schemaVersion: 1
performance:
  budgets:
    managedJavaScriptBytes: 32768
    managedCssBytes: 16384
    ordinaryHtmlBytes: 32768
`;
  await writeFile(path.join(root, 'site.config.yml'), base);
  assert.deepEqual((await loadSiteConfiguration({ root })).contact, {
    enabled: false,
    websiteEnabled: false,
    phoneEnabled: false
  });
  for (const contact of [
    'contact: true\n',
    'contact:\n  enabled: true\n  destinationEmail: author@example.com\n',
    'contact:\n  enabled: false\n  unknown: true\n'
  ]) {
    await writeFile(path.join(root, 'site.config.yml'), `${base}${contact}`);
    await assert.rejects(() => loadSiteConfiguration({ root }), /contact/);
  }
});
