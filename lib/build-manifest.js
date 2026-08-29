import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LANGUAGE = /^[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;
const STATES = new Set(['published', 'tombstoned']);
const ASSIGNED_SOURCE = /^content\/posts\/[a-z0-9]+(?:-[a-z0-9]+)*\/index\.[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*\.md$/;
const PRISM_STATES = new Set(['PUBLISHED', 'STALE', 'DISABLED', 'REVOKED']);
const PRISM_HASH = /^[0-9a-f]{64}$/;

function absoluteHttps(value, field) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError(`${field} must be an absolute URL`);
  }
  if (parsed.protocol !== 'https:' || parsed.username !== '' || parsed.password !== '') {
    throw new TypeError(`${field} must use HTTPS without credentials`);
  }
}

function validatedPost(post, index, seen, preview) {
  if (post == null || Array.isArray(post) || typeof post !== 'object') {
    throw new TypeError(`build manifest posts[${index}] must be a mapping`);
  }
  if (typeof post.source !== 'string' || !post.source.startsWith('content/posts/')
      || post.source.split('/').some((part) => part === '.' || part === '..')) {
    throw new TypeError(`build manifest posts[${index}].source is invalid`);
  }
  const transientPreviewPost = preview
    && post.publicationState === 'not-emitted'
    && post.id === null;
  if (!ULID.test(post.id) && !transientPreviewPost) {
    throw new TypeError(`build manifest posts[${index}].id is invalid`);
  }
  if (!SLUG.test(post.slug) || !LANGUAGE.test(post.language)) {
    throw new TypeError(`build manifest posts[${index}] effective slug or language is invalid`);
  }
  if (typeof post.relativeUrl !== 'string' || !post.relativeUrl.startsWith('/')
      || !post.relativeUrl.endsWith('/') || post.relativeUrl.includes('?')
      || post.relativeUrl.includes('#') || post.relativeUrl.split('/').includes('..')) {
    throw new TypeError(`build manifest posts[${index}].relativeUrl is invalid`);
  }
  absoluteHttps(post.canonicalUrl, `build manifest posts[${index}].canonicalUrl`);
  absoluteHttps(post.pageUrl, `build manifest posts[${index}].pageUrl`);
  if (!STATES.has(post.publicationState)
      && !(preview && post.publicationState === 'not-emitted')) {
    throw new TypeError(`build manifest posts[${index}].publicationState is invalid`);
  }
  if (post.frontmatter == null || Array.isArray(post.frontmatter)
      || typeof post.frontmatter !== 'object') {
    throw new TypeError(`build manifest posts[${index}].frontmatter must be a mapping`);
  }
  if (post.rawFrontmatter == null || Array.isArray(post.rawFrontmatter)
      || typeof post.rawFrontmatter !== 'object') {
    throw new TypeError(`build manifest posts[${index}].rawFrontmatter must be a mapping`);
  }
  if (typeof post.contentBody !== 'string') {
    throw new TypeError(`build manifest posts[${index}].contentBody must be a string`);
  }
  if (post.publicationState === 'published' && typeof post.body !== 'string') {
    throw new TypeError(`build manifest posts[${index}].body is required when published`);
  }
  if (post.publicationState === 'tombstoned' && post.body !== null) {
    throw new TypeError(`build manifest posts[${index}].body must be null when tombstoned`);
  }
  let media;
  if (post.media != null) {
    if (!Array.isArray(post.media)) {
      throw new TypeError(`build manifest posts[${index}].media must be a list`);
    }
    const sourcePrefix = `${path.posix.dirname(post.source)}/`;
    const outputPrefix = post.relativeUrl.slice(1);
    const outputs = new Set();
    media = post.media.map((copy, mediaIndex) => {
      const source = copy?.source;
      const output = copy?.output;
      if (typeof source !== 'string' || typeof output !== 'string'
          || !source.startsWith(sourcePrefix) || !output.startsWith(outputPrefix)
          || source.includes('\\') || output.includes('\\')
          || source.split('/').some((part) => part === '.' || part === '..')
          || output.split('/').some((part) => part === '.' || part === '..')
          || outputs.has(output)) {
        throw new TypeError(`build manifest posts[${index}].media[${mediaIndex}] is invalid`);
      }
      outputs.add(output);
      return Object.freeze({ source, output });
    });
  }
  const identityVariant = post.id === null
    ? null
    : `${post.id}\u0000${post.language.toLowerCase()}`;
  for (const [type, value] of [
    ['source', post.source],
    ['relativeUrl', post.relativeUrl],
    ['pageUrl', post.pageUrl],
    ...(identityVariant == null ? [] : [['identity-language', identityVariant]])
  ]) {
    const values = seen[type];
    if (values.has(value)) throw new TypeError(`build manifest duplicate ${type}: ${value}`);
    values.add(value);
  }
  return Object.freeze({
    ...post,
    ...(media == null ? {} : { media: Object.freeze(media) }),
    rawFrontmatter: Object.freeze({ ...post.rawFrontmatter }),
    frontmatter: Object.freeze({ ...post.frontmatter })
  });
}

function validatedRedirect(redirect, index, seen) {
  if (redirect == null || Array.isArray(redirect) || typeof redirect !== 'object') {
    throw new TypeError(`build manifest redirects[${index}] must be a mapping`);
  }
  if (!ULID.test(redirect.id) || !LANGUAGE.test(redirect.language)) {
    throw new TypeError(`build manifest redirects[${index}] identity is invalid`);
  }
  if (typeof redirect.relativeUrl !== 'string' || !redirect.relativeUrl.startsWith('/')
      || !redirect.relativeUrl.endsWith('/') || redirect.relativeUrl.includes('?')
      || redirect.relativeUrl.includes('#') || redirect.relativeUrl.split('/').includes('..')) {
    throw new TypeError(`build manifest redirects[${index}].relativeUrl is invalid`);
  }
  absoluteHttps(redirect.pageUrl, `build manifest redirects[${index}].pageUrl`);
  absoluteHttps(redirect.targetUrl, `build manifest redirects[${index}].targetUrl`);
  if (redirect.pageUrl === redirect.targetUrl) {
    throw new TypeError(`build manifest redirects[${index}] must change URL`);
  }
  for (const [type, value] of [['relativeUrl', redirect.relativeUrl], ['pageUrl', redirect.pageUrl]]) {
    if (seen[type].has(value)) throw new TypeError(`build manifest duplicate ${type}: ${value}`);
    seen[type].add(value);
  }
  return Object.freeze({ ...redirect });
}

export function validateBuildManifest(value) {
  if (value == null || Array.isArray(value) || typeof value !== 'object'
      || ![1, 2].includes(value.schemaVersion) || !DATE.test(value.evaluationDate)
      || !Array.isArray(value.posts) || !Array.isArray(value.redirects)
      || (value.preview != null && typeof value.preview !== 'boolean')) {
    throw new TypeError('Unsupported build manifest schema');
  }
  const seen = {
    source: new Set(),
    relativeUrl: new Set(),
    pageUrl: new Set(),
    'identity-language': new Set()
  };
  const preview = value.preview === true;
  const posts = value.posts.map((post, index) => validatedPost(post, index, seen, preview));
  const redirects = value.redirects.map((redirect, index) =>
    validatedRedirect(redirect, index, seen)
  );
  let assignedContentIds;
  if (value.assignedContentIds != null) {
    if (!Array.isArray(value.assignedContentIds)) {
      throw new TypeError('build manifest assignedContentIds must be a list');
    }
    const sources = new Set();
    assignedContentIds = value.assignedContentIds.map((assigned, index) => {
      if (!ASSIGNED_SOURCE.test(assigned?.source) || !ULID.test(assigned?.id)
          || typeof assigned?.fileHash !== 'string' || !/^[a-f0-9]{64}$/.test(assigned.fileHash)
          || sources.has(assigned.source)) {
        throw new TypeError(`build manifest assignedContentIds[${index}] is invalid`);
      }
      sources.add(assigned.source);
      return Object.freeze({ ...assigned });
    });
  }
  let configurations;
  if (value.schemaVersion === 2) {
    if (!Array.isArray(value.configurations) || value.prism?.schemaVersion !== 1) {
      throw new TypeError('build manifest V2 requires Prism settings and configurations');
    }
    const configurationIds = new Set();
    configurations = value.configurations.map((configuration, index) => {
      if (configuration == null || typeof configuration !== 'object' || Array.isArray(configuration)
          || !ULID.test(configuration.configurationId) || !ULID.test(configuration.revisionId)
          || !ULID.test(configuration.approvalId) || !ULID.test(configuration.articleId)
          || !LANGUAGE.test(configuration.language) || !PRISM_STATES.has(configuration.state)
          || !PRISM_HASH.test(configuration.sourceRevisionHash)
          || !PRISM_HASH.test(configuration.configurationContentHash)
          || configuration.hashContract !== 'GALA_PRISM_HASH_V1'
          || !['NOFOLLOW', 'FOLLOW'].includes(configuration.configurationLinkPolicy)
          || configurationIds.has(configuration.configurationId)) {
        throw new TypeError(`build manifest configurations[${index}] is invalid`);
      }
      if (typeof configuration.relativeUrl !== 'string' || !configuration.relativeUrl.startsWith('/')
          || !configuration.relativeUrl.endsWith('/') || configuration.relativeUrl.split('/').includes('..')) {
        throw new TypeError(`build manifest configurations[${index}].relativeUrl is invalid`);
      }
      absoluteHttps(configuration.pageUrl, `build manifest configurations[${index}].pageUrl`);
      absoluteHttps(configuration.canonicalUrl, `build manifest configurations[${index}].canonicalUrl`);
      if (configuration.state === 'PUBLISHED' && typeof configuration.body !== 'string') {
        throw new TypeError(`build manifest configurations[${index}].body is required when published`);
      }
      if (configuration.state !== 'PUBLISHED' && Object.hasOwn(configuration, 'body')) {
        throw new TypeError(`build manifest configurations[${index}] fallback must not contain prose`);
      }
      configurationIds.add(configuration.configurationId);
      return Object.freeze({ ...configuration });
    });
  } else if (value.configurations != null || value.prism != null) {
    throw new TypeError('build manifest V1 cannot contain Prism delivery fields');
  }
  return Object.freeze({
    schemaVersion: value.schemaVersion,
    evaluationDate: value.evaluationDate,
    ...(preview ? { preview: true } : {}),
    ...(assignedContentIds == null
      ? {}
      : { assignedContentIds: Object.freeze(assignedContentIds) }),
    posts: Object.freeze(posts),
    redirects: Object.freeze(redirects),
    ...(configurations == null ? {} : {
      prism: Object.freeze({ ...value.prism }),
      configurations: Object.freeze(configurations)
    })
  });
}

export async function readBuildManifest(root = process.cwd()) {
  const manifestPath = path.resolve(root, '.gala', 'build', 'validated-posts.json');
  let source;
  try {
    source = await readFile(manifestPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Validated build manifest is missing; run Gala validation before Eleventy');
    }
    throw error;
  }
  try {
    return validateBuildManifest(JSON.parse(source));
  } catch (error) {
    throw new TypeError(`Invalid validated build manifest: ${error.message}`);
  }
}
