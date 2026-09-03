import { createHash } from 'node:crypto';

import { siteUrl } from './seo.js';

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function markdownText(value) {
  return String(value).replace(/\s+/g, ' ').trim()
    .replaceAll('\\', '\\\\')
    .replace(/([`*_[\]<>])/g, '\\$1');
}

function absolute(site, relativePath) {
  return siteUrl({
    canonicalBaseUrl: site.hosting.canonicalBaseUrl,
    pathPrefix: site.hosting.pathPrefix ?? '/',
    relativePath
  });
}

function publishedPosts(manifest) {
  return manifest.posts.filter(({ publicationState }) => publicationState === 'published');
}

export function articleMarkdown(post) {
  return [
    `# ${post.frontmatter.title}`,
    '',
    `Canonical URL: ${post.canonicalUrl}`,
    `Language: ${post.language}`,
    `Published: ${post.frontmatter.publishAfterDate}`,
    ...(post.frontmatter.description ? [`Summary: ${post.frontmatter.description}`] : []),
    '',
    post.contentBody.trim(),
    ''
  ].join('\n');
}

export function articleSourceDigest(post) {
  return createHash('sha256').update(articleMarkdown(post)).digest('hex');
}

export function articleMarkdownPath(post) {
  return `${post.relativeUrl}index.md`;
}

export function articleProvenancePath(post) {
  return `${post.relativeUrl}provenance/`;
}

export function renderLlmsText({ manifest, site }) {
  const lines = [
    `# ${markdownText(site.site.name)}`,
    '',
    `> ${markdownText(site.site.authorProfile?.bio || `Articles published by ${site.site.authorProfile?.displayName || site.site.name}.`)}`,
    '',
    'This experimental discovery file lists clean Markdown alternatives and canonical HTML pages.',
    'It is not an access grant or a license. See robots.txt and the linked RSL file when present.',
    '',
    '## Articles',
    ''
  ];
  for (const post of publishedPosts(manifest)) {
    lines.push(
      `- [${markdownText(post.frontmatter.title)}](${absolute(site, articleMarkdownPath(post))}): `
        + `${markdownText(post.frontmatter.description || `Published ${post.frontmatter.publishAfterDate} in ${post.language}.`)} `
        + `[HTML](${post.canonicalUrl}) [Provenance](${absolute(site, articleProvenancePath(post))})`
    );
  }
  lines.push('', `Sitemap: ${absolute(site, '/sitemap.xml')}`, '');
  return lines.join('\n');
}

function appendCrawlerRule(lines, userAgent, value) {
  if (value === 'not-declared') return;
  if (lines.length > 0) lines.push('');
  lines.push(`User-agent: ${userAgent}`, value === 'block' ? 'Disallow: /' : 'Allow: /');
}

export function renderRobotsText({ site }) {
  const policy = site.aiPublishing;
  const lines = [];
  appendCrawlerRule(lines, '*', policy.indexing);
  appendCrawlerRule(lines, 'OAI-SearchBot', policy.aiSearch);
  appendCrawlerRule(lines, 'PerplexityBot', policy.aiSearch);
  appendCrawlerRule(lines, 'GPTBot', policy.modelTraining);
  // Google-Extended covers both Gemini training and grounding. A block in either author
  // choice must win. An allow is emitted only when both choices are explicit, because one
  // allow plus one undeclared choice cannot be represented without changing its meaning.
  const googleExtended = policy.aiSearch === 'block' || policy.modelTraining === 'block'
    ? 'block'
    : policy.aiSearch === 'allow' && policy.modelTraining === 'allow' ? 'allow' : 'not-declared';
  appendCrawlerRule(lines, 'Google-Extended', googleExtended);
  if (lines.length > 0) lines.push('');
  lines.push(`Sitemap: ${absolute(site, '/sitemap.xml')}`);
  if (policy.rslEnabled) lines.push(`License: ${absolute(site, '/license.xml')}`);
  lines.push('');
  return lines.join('\n');
}

export function renderRsl({ site }) {
  const policy = site.aiPublishing;
  if (!policy.rslEnabled) return null;
  const configuredPrefix = site.hosting.pathPrefix ?? '/';
  const contentScope = configuredPrefix === '/'
    ? '/'
    : `/${configuredPrefix.replace(/^\/+|\/+$/g, '')}/`;
  const permitsUsage = [];
  const prohibitsUsage = [];
  if (policy.indexing === 'allow') permitsUsage.push('search');
  if (policy.indexing === 'block') prohibitsUsage.push('search');
  if (policy.aiSearch === 'allow') permitsUsage.push('ai-input', 'ai-index');
  if (policy.aiSearch === 'block') prohibitsUsage.push('ai-input', 'ai-index');
  if (policy.modelTraining === 'allow') permitsUsage.push('ai-train');
  if (policy.modelTraining === 'block') prohibitsUsage.push('ai-train');
  const usageTerms = policy.reuse === 'block'
    ? ['      <prohibits type="usage">all</prohibits>']
    : [
        ...(permitsUsage.length
          ? [`      <permits type="usage">${permitsUsage.join(' ')}</permits>`] : []),
        ...(prohibitsUsage.length
          ? [`      <prohibits type="usage">${prohibitsUsage.join(' ')}</prohibits>`] : [])
      ];
  const license = (extraTerms) => [
    '    <license>',
    ...usageTerms,
    ...extraTerms,
    '    </license>'
  ].join('\n');
  let licenses;
  if (policy.commercialUse === 'license-required') {
    licenses = [
      license([
        '      <permits type="user">non-commercial education government personal</permits>',
        '      <payment type="attribution"/>'
      ]),
      license([
        '      <permits type="user">commercial</permits>',
        '      <payment type="purchase">',
        `        <custom>${escapeXml(policy.licenseUrl)}</custom>`,
        '      </payment>'
      ])
    ];
  } else {
    licenses = [license([
      ...(policy.commercialUse === 'block'
        ? ['      <prohibits type="user">commercial</prohibits>'] : []),
      ...(policy.reuse === 'attribution-required'
        ? ['      <payment type="attribution"/>'] : [])
    ])];
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<rsl xmlns="https://rslstandard.org/rsl" max-age="7">
  <content url="${escapeXml(contentScope)}">
${licenses.join('\n')}
  </content>
</rsl>
`;
}

export function articleProvenance({ post, site, buildIdentity }) {
  const repository = site.site.repository;
  const commit = buildIdentity?.commit ?? null;
  const sourceUrl = commit == null || !repository || repository === 'unavailable'
    ? null : `https://github.com/${repository}/blob/${commit}/${post.source}`;
  return Object.freeze({
    schemaVersion: 1,
    articleId: post.id,
    language: post.language,
    canonicalUrl: post.canonicalUrl,
    markdownUrl: absolute(site, articleMarkdownPath(post)),
    sourceSha256: articleSourceDigest(post),
    sourceDigestScope: 'generated-markdown-alternative',
    repository: repository && repository !== 'unavailable' ? repository : null,
    commit,
    sourceUrl,
    published: post.frontmatter.publishAfterDate,
    modified: post.frontmatter.editHistory?.at(-1)?.slice(0, 10)
      ?? post.frontmatter.publishAfterDate
  });
}
