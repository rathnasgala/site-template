import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

const BUDGET_KEYS = Object.freeze([
  'managedJavaScriptBytes',
  'managedCssBytes',
  'ordinaryHtmlBytes'
]);
/*
 * Only what the theme actually implements. A value here is a promise that choosing it changes how
 * a publication looks; anything the CSS does not answer to has no business being offered.
 */
const DESIGN_VALUES = Object.freeze({
  theme: Object.freeze(['editorial', 'modern', 'technical']),
  colorMode: Object.freeze(['system', 'light', 'dark'])
});
// Accepted only so repositories created before v2 keep building. New author surfaces never offer
// these independent knobs; v2's look owns its layout and palette as one reviewed composition.
const LEGACY_DESIGN_VALUES = Object.freeze({
  layout: Object.freeze(['article-first', 'portfolio']),
  palette: Object.freeze(['default', 'ocean', 'forest', 'plum'])
});
const CONTACT_KEYS = Object.freeze([
  'enabled', 'websiteEnabled', 'phoneEnabled'
]);
const PROFILE_KEYS = Object.freeze(['displayName', 'bio', 'avatarUrl', 'profileUrl']);
const PUBLISHER_KEYS = Object.freeze(['name', 'url', 'logoUrl']);

export function validateCanonicalUrlTemplate(value) {
  if (value == null || value === '' || value === 'unavailable') return '';
  if (typeof value !== 'string' || [...value.trim()].length > 2048) {
    throw new TypeError('seo.canonicalUrlTemplate must be a string of at most 2048 characters');
  }
  const template = value.trim();
  const count = (token) => template.split(token).length - 1;
  if (count('{language}') !== 1 || count('{slug}') !== 1
      || /[{}]/.test(template.replace('{language}', '').replace('{slug}', ''))) {
    throw new TypeError('seo.canonicalUrlTemplate must contain {language} and {slug} exactly once');
  }
  let resolved;
  try {
    resolved = new URL(template.replace('{language}', 'en').replace('{slug}', 'example-post'));
  } catch {
    throw new TypeError('seo.canonicalUrlTemplate must resolve to an absolute URL');
  }
  if (resolved.protocol !== 'https:' || resolved.username || resolved.password || resolved.hash) {
    throw new TypeError('seo.canonicalUrlTemplate must use HTTPS without credentials or a fragment');
  }
  return template;
}

/*
 * `layout` and `palette` have always been required. The rest were added later and are optional:
 * a publication written before they existed is still a valid publication, and the theme falls
 * back to its own defaults for anything absent. Present-but-unknown is still an error, because
 * that is a writer expecting something the CSS will not do.
 */
/** A free colour, not a menu - but still a colour. */
const ACCENT = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

function validateImplementedDesign(config) {
  const accent = config?.design?.accent;
  if (accent != null && !(typeof accent === 'string' && ACCENT.test(accent.trim()))) {
    throw new TypeError(`Unsupported design.accent: ${accent}`);
  }
  if (config?.design == null) return;
  for (const [field, allowed] of Object.entries(DESIGN_VALUES)) {
    const value = config.design[field];
    if (value === undefined) continue;
    if (!allowed.includes(value)) {
      throw new TypeError(`Unsupported design.${field}: ${value}`);
    }
  }
  for (const [field, allowed] of Object.entries(LEGACY_DESIGN_VALUES)) {
    const value = config.design[field];
    if (value !== undefined && !allowed.includes(value)) {
      throw new TypeError(`Unsupported legacy design.${field}: ${value}`);
    }
  }
}

export function validatePerformanceBudgets(value) {
  if (value == null || Array.isArray(value) || typeof value !== 'object') {
    throw new TypeError('performance.budgets must be a mapping');
  }
  const keys = Object.keys(value);
  const unknown = keys.filter((key) => !BUDGET_KEYS.includes(key));
  if (unknown.length > 0) {
    throw new TypeError(`Unsupported performance budget: ${unknown.join(', ')}`);
  }
  for (const key of BUDGET_KEYS) {
    if (!Number.isSafeInteger(value[key]) || value[key] <= 0) {
      throw new TypeError(`performance.budgets.${key} must be a positive integer byte count`);
    }
  }
  return Object.freeze(Object.fromEntries(BUDGET_KEYS.map((key) => [key, value[key]])));
}

export function validateStatistics(value) {
  if (value == null) return Object.freeze({ publicViewCounts: false });
  if (Array.isArray(value) || typeof value !== 'object') {
    throw new TypeError('statistics must be a mapping');
  }
  const unknown = Object.keys(value).filter((key) => key !== 'publicViewCounts');
  if (unknown.length > 0) {
    throw new TypeError(`Unsupported statistics option: ${unknown.join(', ')}`);
  }
  if (value.publicViewCounts != null && typeof value.publicViewCounts !== 'boolean') {
    throw new TypeError('statistics.publicViewCounts must be a boolean');
  }
  return Object.freeze({ publicViewCounts: value.publicViewCounts === true });
}

export function validatePagination(value) {
  if (value == null) return Object.freeze({ pageSize: null });
  if (Array.isArray(value) || typeof value !== 'object') {
    throw new TypeError('pagination must be a mapping');
  }
  const unknown = Object.keys(value).filter((key) => key !== 'pageSize');
  if (unknown.length > 0) {
    throw new TypeError(`Unsupported pagination option: ${unknown.join(', ')}`);
  }
  if (value.pageSize == null || value.pageSize === 'unavailable') {
    return Object.freeze({ pageSize: null });
  }
  if (!Number.isSafeInteger(value.pageSize) || value.pageSize < 1 || value.pageSize > 100) {
    throw new TypeError('pagination.pageSize must be an integer between 1 and 100');
  }
  return Object.freeze({ pageSize: value.pageSize });
}

export function validateContact(value) {
  if (value == null) return Object.freeze({ enabled: false, websiteEnabled: false, phoneEnabled: false });
  if (Array.isArray(value) || typeof value !== 'object') throw new TypeError('contact must be a mapping');
  const unknown = Object.keys(value).filter((key) => !CONTACT_KEYS.includes(key));
  if (unknown.length > 0) throw new TypeError(`Unsupported contact option: ${unknown.join(', ')}`);
  for (const field of ['enabled', 'websiteEnabled', 'phoneEnabled']) {
    if (value[field] != null && typeof value[field] !== 'boolean') {
      throw new TypeError(`contact.${field} must be a boolean`);
    }
  }
  return Object.freeze({
    enabled: value.enabled === true,
    websiteEnabled: value.websiteEnabled === true,
    phoneEnabled: value.phoneEnabled === true
  });
}

function profileText(value, field, maximum) {
  if (value == null || value === 'unavailable') return '';
  if (typeof value !== 'string') throw new TypeError(`${field} must be a string`);
  const normalized = value.trim();
  if ([...normalized].length > maximum) {
    throw new TypeError(`${field} must contain at most ${maximum} characters`);
  }
  return normalized;
}

function profileUrl(value, field) {
  const normalized = profileText(value, field, 2048);
  if (normalized === '') return '';
  let parsed;
  try { parsed = new URL(normalized); } catch { throw new TypeError(`${field} must be an HTTPS URL`); }
  if (parsed.protocol !== 'https:' || parsed.username !== '' || parsed.password !== '') {
    throw new TypeError(`${field} must be a credential-free HTTPS URL`);
  }
  return normalized;
}

export function validateProfile(site) {
  const legacyAuthor = profileText(site?.author, 'site.author', 120);
  const author = site?.authorProfile;
  const publisher = site?.publisher;
  if (author != null && (Array.isArray(author) || typeof author !== 'object')) {
    throw new TypeError('site.authorProfile must be a mapping');
  }
  if (publisher != null && (Array.isArray(publisher) || typeof publisher !== 'object')) {
    throw new TypeError('site.publisher must be a mapping');
  }
  const unknownAuthor = Object.keys(author ?? {}).filter((key) => !PROFILE_KEYS.includes(key));
  const unknownPublisher = Object.keys(publisher ?? {}).filter((key) => !PUBLISHER_KEYS.includes(key));
  if (unknownAuthor.length) throw new TypeError(`Unsupported author profile field: ${unknownAuthor.join(', ')}`);
  if (unknownPublisher.length) throw new TypeError(`Unsupported publisher field: ${unknownPublisher.join(', ')}`);
  const normalized = Object.freeze({
    author: Object.freeze({
      displayName: profileText(author?.displayName, 'site.authorProfile.displayName', 120) || legacyAuthor,
      bio: profileText(author?.bio, 'site.authorProfile.bio', 500),
      avatarUrl: profileUrl(author?.avatarUrl, 'site.authorProfile.avatarUrl'),
      profileUrl: profileUrl(author?.profileUrl, 'site.authorProfile.profileUrl')
    }),
    publisher: Object.freeze({
      name: profileText(publisher?.name, 'site.publisher.name', 120),
      url: profileUrl(publisher?.url, 'site.publisher.url'),
      logoUrl: profileUrl(publisher?.logoUrl, 'site.publisher.logoUrl')
    })
  });
  if (!normalized.publisher.name && (normalized.publisher.url || normalized.publisher.logoUrl)) {
    throw new TypeError('site.publisher.name is required when publisher URLs are set');
  }
  return normalized;
}

export async function loadSiteConfiguration({
  root = process.cwd(),
  configPath = process.env.GALA_CONFIG_PATH ?? 'site.config.yml'
} = {}) {
  if (path.isAbsolute(configPath) || configPath.split(/[\\/]/).includes('..')) {
    throw new TypeError('GALA_CONFIG_PATH must stay within the checkout');
  }
  const checkout = path.resolve(root);
  const file = path.resolve(checkout, configPath);
  const relative = path.relative(checkout, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new TypeError('GALA_CONFIG_PATH must stay within the checkout');
  }
  const metadata = await lstat(file);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new TypeError('site configuration must be a regular file');
  }
  const config = parse(await readFile(file, 'utf8'));
  validateImplementedDesign(config);
  validatePerformanceBudgets(config?.performance?.budgets);
  config.statistics = validateStatistics(config.statistics);
  config.pagination = validatePagination(config.pagination);
  config.contact = validateContact(config.contact);
  config.seo = { canonicalUrlTemplate: validateCanonicalUrlTemplate(config.seo?.canonicalUrlTemplate) };
  const profile = validateProfile(config.site);
  config.site = {
    ...(config.site ?? {}),
    authorProfile: profile.author,
    publisher: profile.publisher
  };
  return config;
}
