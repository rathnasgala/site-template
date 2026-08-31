import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { parse } from 'yaml';
import {
  loadSiteConfiguration, validateCanonicalUrlTemplate, validatePagination, validateProfile
} from '../lib/site-config.js';
import { languageDestination, publicationUrl } from '../eleventy.config.js';
import {
  SUPPORTED_UI_LANGUAGES,
  WEB_CONTENT_TOP_50,
  formatUiMessage,
  languageDirection,
  resolvedUiLanguage,
  uiLabels
} from '../lib/ui-localization.js';

const EXPECTED_WEB_CONTENT_TOP_50 = [
  'en', 'es', 'de', 'ja', 'fr', 'pt', 'ru', 'it', 'nl', 'pl',
  'tr', 'zh', 'id', 'cs', 'fa', 'vi', 'ko', 'uk', 'ar', 'hu',
  'sv', 'ro', 'el', 'da', 'fi', 'he', 'sk', 'th', 'bg', 'hr',
  'sr', 'nb', 'lt', 'sl', 'ca', 'et', 'no', 'lv', 'bn', 'hi',
  'bs', 'az', 'ka', 'is', 'uz', 'ms', 'mk', 'kk', 'sq', 'hy'
];

const EXPECTED_ADDITIONAL_LANGUAGES = ['ta', 'ur', 'ne', 'ml', 'kn', 'te', 'mr'];

const config = parse(await readFile(new URL('../site.config.yml', import.meta.url), 'utf8'));
const managed = JSON.parse(await readFile(new URL('../.gala/managed-files.json', import.meta.url), 'utf8'));

test('publication-local URLs resolve under both a project path and a custom-domain root', () => {
  assert.equal(publicationUrl('/assets/theme.css', '/'), './assets/theme.css');
  const nestedAsset = publicationUrl('/assets/theme.css', '/en/article/');
  assert.equal(nestedAsset, '../../assets/theme.css');
  assert.equal(new URL(nestedAsset, 'https://owner.github.io/repository/en/article/').pathname,
    '/repository/assets/theme.css');
  assert.equal(new URL(nestedAsset, 'https://blog.example.com/en/article/').pathname,
    '/assets/theme.css');
  assert.equal(publicationUrl('/', '/en/article/'), '../../');
  assert.equal(publicationUrl('/search/', '/en/article/'), '../../search/');
  assert.throws(() => publicationUrl('https://example.com/x', '/'), /must start with/);
});

test('language destinations prefer an exact translation and otherwise use the language index', () => {
  const alternates = [
    { hreflang: 'x-default', href: 'https://example.com/en/article/' },
    { hreflang: 'ta', href: 'https://example.com/ta/article/' }
  ];
  assert.equal(
    languageDestination('ta', '/en/article/', alternates),
    'https://example.com/ta/article/'
  );
  assert.equal(languageDestination('fr', '/en/article/', alternates), '../../fr/');
  assert.equal(languageDestination('en', '/ta/article/', alternates), '../../en/');
});

test('ships the pinned top 50 web-content UI languages plus requested Indian languages', () => {
  assert.deepEqual(WEB_CONTENT_TOP_50, EXPECTED_WEB_CONTENT_TOP_50);
  assert.deepEqual(SUPPORTED_UI_LANGUAGES, [
    ...EXPECTED_WEB_CONTENT_TOP_50, ...EXPECTED_ADDITIONAL_LANGUAGES
  ]);
  assert.equal(new Set(SUPPORTED_UI_LANGUAGES).size, 57);

  const requiredKeys = Object.keys(uiLabels('en')).sort();
  for (const language of SUPPORTED_UI_LANGUAGES) {
    const labels = uiLabels(language);
    assert.deepEqual(Object.keys(labels).sort(), requiredKeys, language);
    for (const [key, value] of Object.entries(labels)) {
      assert.equal(typeof value, 'string', `${language}.${key}`);
      assert.notEqual(value.trim(), '', `${language}.${key}`);
    }
    assert.match(labels.readingTime, /\{count\}/, `${language}.readingTime`);
    assert.match(labels.pagePosition, /\{current\}/, `${language}.pagePosition current`);
    assert.match(labels.pagePosition, /\{total\}/, `${language}.pagePosition total`);
  }
});

test('regional and script variants resolve without serving the wrong writing system', () => {
  assert.equal(resolvedUiLanguage('fr-CA'), 'fr');
  assert.equal(resolvedUiLanguage('pt-BR'), 'pt');
  assert.equal(resolvedUiLanguage('iw-IL'), 'he');
  assert.equal(resolvedUiLanguage('zh-CN'), 'zh-Hans');
  assert.equal(resolvedUiLanguage('zh-TW'), 'zh-Hant');
  assert.equal(resolvedUiLanguage('zh-HK'), 'zh-Hant');
  assert.equal(resolvedUiLanguage('sr-Cyrl'), 'sr');
  assert.equal(resolvedUiLanguage('sr-Latn'), 'sr-Latn');
  assert.match(uiLabels('zh-TW').published, /[發表]/);
  assert.match(uiLabels('sr-Latn').published, /^[A-Za-zĀ-ſ ]+$/u);
});

test('localized messages preserve grammar placeholders and document direction', () => {
  assert.equal(formatUiMessage(uiLabels('en').readingTime, 4), '4 min read');
  assert.equal(formatUiMessage(uiLabels('en').pagePosition, 2, 7), 'Page 2 of 7');
  assert.equal(formatUiMessage(uiLabels('ja').readingTime, 4), '読了時間 4 分');
  assert.equal(formatUiMessage(uiLabels('zh-TW').pagePosition, 2, 7), '第 2 頁（共 7 頁）');
  for (const language of ['ar', 'fa', 'he', 'ur']) {
    assert.equal(languageDirection(language), 'rtl', language);
  }
  for (const language of ['en', 'ta', 'zh-Hant']) {
    assert.equal(languageDirection(language), 'ltr', language);
  }
});

test('Tamil regional variants use Tamil UI while unknown UI locales fall back entirely to English', () => {
  assert.equal(uiLabels('ta-IN').languageIndexTitle, 'தமிழ் கட்டுரைகள்');
  assert.equal(uiLabels('ta-IN').published, 'வெளியிடப்பட்டது');
  assert.equal(uiLabels('ta-IN').previous, 'புதிய கட்டுரைகள்');
  assert.equal(uiLabels('ta-IN').next, 'பழைய கட்டுரைகள்');
  assert.equal(uiLabels('en').previous, 'Newer articles');
  assert.equal(uiLabels('en').next, 'Older articles');
  assert.equal(uiLabels('fr').published, 'Publié');
  assert.equal(uiLabels('sw').published, 'Published');
  assert.equal(uiLabels('sw').languageIndexTitle, 'Articles in Swahili');
  assert.equal(uiLabels('sw').readerSettings, 'Reader settings');
  assert.equal(uiLabels('bad_language').languageIndexTitle, 'English articles');
});

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

test('scaffolds the platform default and validates only a bounded integer override', () => {
  assert.deepEqual(validatePagination(config.pagination), { pageSize: null });
  assert.deepEqual(validatePagination(undefined), { pageSize: null });
  assert.deepEqual(validatePagination({ pageSize: 36 }), { pageSize: 36 });
  for (const invalid of [
    true, { pageSize: 0 }, { pageSize: 101 }, { pageSize: 12.5 }, { pageSize: 24, cursor: true }
  ]) assert.throws(() => validatePagination(invalid), /pagination/i);
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

test('treats a YAML-null optional accent as absent instead of failing the build', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'gala-config-null-accent-'));
  await writeFile(path.join(root, 'site.config.yml'), `schemaVersion: 1
design:
  theme: modern
  colorMode: system
  accent: #263c35
performance:
  budgets:
    managedJavaScriptBytes: 32768
    managedCssBytes: 16384
    ordinaryHtmlBytes: 32768
`);

  assert.equal((await loadSiteConfiguration({ root })).design.accent, null);
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
