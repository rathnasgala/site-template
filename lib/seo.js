import sanitizeHtml from 'sanitize-html';

import { markdownLibrary } from './render-markdown.js';

function xml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} is required`);
  }
  return value.trim();
}

function jsonForHtml(value) {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) =>
    `\\u${character.codePointAt(0).toString(16).padStart(4, '0')}`
  );
}

function fallbackDescription(renderedHtml, maximum = 160) {
  if (typeof renderedHtml !== 'string') throw new TypeError('renderedHtml must be a string');
  const text = markdownLibrary.utils.unescapeAll(sanitizeHtml(renderedHtml, {
    allowedTags: [],
    allowedAttributes: {}
  })).replace(/\s+/g, ' ').trim();
  if (text.length <= maximum) return text;
  const boundary = text.lastIndexOf(' ', maximum);
  return text.slice(0, boundary > 0 ? boundary : maximum).trimEnd();
}

function postLocalUrl(pageUrl, reference) {
  if (typeof reference !== 'string' || reference.trim() === ''
      || reference.startsWith('/') || reference.includes('\\')) {
    throw new TypeError('coverImage must be a post-relative URL');
  }
  let parsed;
  try {
    parsed = new URL(reference, pageUrl);
  } catch {
    throw new TypeError('coverImage must be a post-relative URL');
  }
  const page = absoluteHttpsUrl(pageUrl, 'page URL');
  if (parsed.origin !== page.origin || !parsed.pathname.startsWith(page.pathname)
      || parsed.username !== '' || parsed.password !== '') {
    throw new TypeError('coverImage must stay within the post URL');
  }
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString();
}

function absoluteHttpsUrl(value, field) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new TypeError(`${field} must be an absolute URL`);
  }
  if (parsed.protocol !== 'https:') throw new TypeError(`${field} must use HTTPS`);
  if (parsed.username !== '' || parsed.password !== '') {
    throw new TypeError(`${field} must not contain credentials`);
  }
  parsed.hash = '';
  return parsed;
}

function urlPath(value, field) {
  if (typeof value !== 'string') throw new TypeError(`${field} must be a string`);
  if (value.includes('?') || value.includes('#')) {
    throw new TypeError(`${field} must not contain a query or fragment`);
  }
  const segments = value.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '.' || segment === '..')) {
    throw new TypeError(`${field} must not contain dot segments`);
  }
  return segments;
}

export function siteUrl({ canonicalBaseUrl, pathPrefix = '/', relativePath = '/' }) {
  let suppliedBase;
  try {
    suppliedBase = new URL(canonicalBaseUrl);
  } catch {
    throw new TypeError('canonicalBaseUrl must be an absolute URL');
  }
  const base = absoluteHttpsUrl(canonicalBaseUrl, 'canonicalBaseUrl');
  if (base.pathname !== '/' || suppliedBase.search !== '' || suppliedBase.hash !== '') {
    throw new TypeError('canonicalBaseUrl must be an origin only; put the URL path in pathPrefix');
  }
  const normalizedPrefix = pathPrefix === '' ? '/' : pathPrefix;
  const parts = [
    ...urlPath(normalizedPrefix, 'pathPrefix'),
    ...urlPath(relativePath, 'relativePath')
  ].map(encodeURIComponent);
  base.pathname = parts.length === 0
    ? '/'
    : `/${parts.join('/')}${relativePath.endsWith('/') ? '/' : ''}`;
  base.search = '';
  return base.toString();
}

export function canonicalUrl({ pageUrl, canonicalOverride }) {
  const selected = canonicalOverride == null ? pageUrl : canonicalOverride;
  return absoluteHttpsUrl(selected, 'canonical URL').toString();
}

export function sortFeedPosts(posts) {
  if (!Array.isArray(posts)) throw new TypeError('posts must be an array');
  return [...posts].sort((left, right) => {
    const dateOrder = requiredText(
      right?.frontmatter?.publishAfterDate,
      'publishAfterDate'
    ).localeCompare(requiredText(left?.frontmatter?.publishAfterDate, 'publishAfterDate'));
    if (dateOrder !== 0) return dateOrder;
    return requiredText(right?.id, 'article id').localeCompare(requiredText(left?.id, 'article id'));
  });
}

export function postSeo({ post, site, renderedHtml, provenanceUrl, markdownUrl }) {
  if (post == null || site == null) throw new TypeError('post and site are required');
  const title = requiredText(post.frontmatter?.title, 'post title');
  const authoredDescription = typeof post.frontmatter?.description === 'string'
    ? post.frontmatter.description.trim()
    : '';
  const descriptionFallback = authoredDescription === '';
  const description = descriptionFallback
    ? fallbackDescription(renderedHtml)
    : authoredDescription;
  const siteName = requiredText(site.site?.name, 'site name');
  const configuredAuthor = site.site?.authorProfile?.displayName || site.site?.author;
  const creditedAuthors = Array.isArray(post.contributorCredits?.authors)
    ? post.contributorCredits.authors : [];
  const fallbackAuthor = [post.frontmatter?.author, configuredAuthor, siteName]
    .find((value) => typeof value === 'string' && value.trim() !== '')
    .trim();
  const authors = creditedAuthors.length ? creditedAuthors : [fallbackAuthor];
  const author = authors.join(', ');
  const authorProfile = creditedAuthors.length === 0 && fallbackAuthor === configuredAuthor
    ? site.site?.authorProfile : null;
  const publisherProfile = site.site?.publisher;
  const pageUrl = absoluteHttpsUrl(post.pageUrl, 'page URL').toString();
  const selectedCanonical = canonicalUrl({ pageUrl, canonicalOverride: post.canonicalUrl });
  const language = Intl.getCanonicalLocales(requiredText(post.language, 'post language'))[0];
  const datePublished = requiredText(post.frontmatter?.publishAfterDate, 'publishAfterDate');
  const historyDates = (post.frontmatter?.editHistory ?? [])
    .map((entry) => typeof entry === 'string' ? entry.slice(0, 10) : '')
    .filter(Boolean);
  const dateModified = historyDates.sort().at(-1) ?? datePublished;
  const imageUrl = post.frontmatter?.coverImage == null
    ? null
    : postLocalUrl(pageUrl, post.frontmatter.coverImage);
  const rootUrl = siteUrl({
    canonicalBaseUrl: site.hosting?.canonicalBaseUrl,
    pathPrefix: site.hosting?.pathPrefix ?? '/',
    relativePath: '/'
  });
  const languageUrl = siteUrl({
    canonicalBaseUrl: site.hosting?.canonicalBaseUrl,
    pathPrefix: site.hosting?.pathPrefix ?? '/',
    relativePath: `/${language}/`
  });
  const contentType = post.frontmatter?.contentType ?? 'article';
  if (!['article', 'technical'].includes(contentType)) {
    throw new TypeError(`Unsupported contentType: ${contentType}`);
  }
  const blogPosting = {
    '@context': 'https://schema.org',
    '@type': contentType === 'technical' ? 'TechArticle' : 'BlogPosting',
    headline: title,
    description,
    url: selectedCanonical,
    mainEntityOfPage: { '@type': 'WebPage', '@id': selectedCanonical },
    datePublished,
    dateModified,
    inLanguage: language,
    author: authors.map((name) => ({
      '@type': 'Person',
      name,
      ...(authors.length === 1 && authorProfile?.profileUrl ? { url: authorProfile.profileUrl } : {}),
      ...(authors.length === 1 && authorProfile?.avatarUrl ? { image: authorProfile.avatarUrl } : {})
    })),
    publisher: {
      '@type': 'Organization',
      name: publisherProfile?.name || siteName,
      ...(publisherProfile?.url ? { url: publisherProfile.url } : {}),
      ...(publisherProfile?.logoUrl
        ? { logo: { '@type': 'ImageObject', url: publisherProfile.logoUrl } } : {})
    },
    ...(imageUrl == null ? {} : { image: imageUrl }),
    ...(Array.isArray(post.frontmatter?.sources) && post.frontmatter.sources.length
      ? { citation: post.frontmatter.sources } : {}),
    ...(markdownUrl ? { encoding: {
      '@type': 'MediaObject', contentUrl: markdownUrl, encodingFormat: 'text/markdown'
    } } : {}),
    ...(provenanceUrl ? { subjectOf: {
      '@type': 'WebPage', url: provenanceUrl, name: 'Article provenance'
    } } : {})
  };
  const breadcrumbList = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: siteName, item: rootUrl },
      { '@type': 'ListItem', position: 2, name: language, item: languageUrl },
      { '@type': 'ListItem', position: 3, name: title, item: pageUrl }
    ]
  };
  const faqPage = Array.isArray(post.frontmatter?.faq) && post.frontmatter.faq.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.frontmatter.faq.map(({ question, answer }) => ({
          '@type': 'Question',
          name: question.trim(),
          acceptedAnswer: { '@type': 'Answer', text: answer.trim() }
        }))
      }
    : null;
  return Object.freeze({
    title,
    description,
    descriptionFallback,
    author,
    pageUrl,
    canonicalUrl: selectedCanonical,
    imageUrl,
    twitterCard: imageUrl == null ? 'summary' : 'summary_large_image',
    datePublished,
    dateModified,
    blogPosting: Object.freeze(blogPosting),
    breadcrumbList: Object.freeze(breadcrumbList),
    faqPage: faqPage == null ? null : Object.freeze(faqPage),
    structuredDataJson: jsonForHtml([blogPosting, breadcrumbList, ...(faqPage ? [faqPage] : [])])
  });
}

export function hreflangCluster(variants, xDefaultUrl) {
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new TypeError('At least one language variant is required');
  }
  const seen = new Set();
  const links = variants.map(({ language, url }) => {
    let canonicalLanguage;
    try {
      canonicalLanguage = Intl.getCanonicalLocales(language)[0];
    } catch {
      throw new TypeError(`Duplicate or invalid hreflang: ${language}`);
    }
    if (canonicalLanguage == null || seen.has(canonicalLanguage)) {
      throw new TypeError(`Duplicate or invalid hreflang: ${language}`);
    }
    seen.add(canonicalLanguage);
    return Object.freeze({
      hreflang: canonicalLanguage,
      href: absoluteHttpsUrl(url, 'variant URL').toString()
    });
  });
  const fallback = absoluteHttpsUrl(xDefaultUrl, 'x-default URL').toString();
  return Object.freeze([...links, Object.freeze({ hreflang: 'x-default', href: fallback })]);
}

export function articleHreflang(posts, site) {
  if (!Array.isArray(posts)) throw new TypeError('posts must be an array');
  let defaultLanguage;
  try {
    defaultLanguage = Intl.getCanonicalLocales(site?.site?.defaultLanguage)[0];
  } catch {
    throw new TypeError('site.defaultLanguage must be a valid BCP-47 language tag');
  }
  if (defaultLanguage == null) throw new TypeError('site.defaultLanguage is required');
  let siteRoot;
  const fallbackSiteRoot = () => {
    siteRoot ??= siteUrl({
      canonicalBaseUrl: site?.hosting?.canonicalBaseUrl,
      pathPrefix: site?.hosting?.pathPrefix ?? '/',
      relativePath: '/'
    });
    return siteRoot;
  };
  const groups = new Map();
  for (const post of posts.filter(({ publicationState }) => publicationState === 'published')) {
    // A read-only preview does not mint durable article IDs. Those null identities must not merge
    // unrelated posts into one translation cluster; the validated source is unique for this build.
    const articleKey = post.id ?? `preview:${post.source}`;
    const variants = groups.get(articleKey) ?? [];
    variants.push({ language: post.language, url: post.pageUrl, source: post.source });
    groups.set(articleKey, variants);
  }
  const bySource = new Map();
  for (const variants of groups.values()) {
    const defaultVariant = variants.find(({ language }) => {
      try {
        return Intl.getCanonicalLocales(language)[0] === defaultLanguage;
      } catch {
        return false;
      }
    });
    const links = hreflangCluster(variants, defaultVariant?.url ?? fallbackSiteRoot());
    variants.forEach(({ source }) => bySource.set(source, links));
  }
  return bySource;
}

export function renderSitemap(entries) {
  const urls = entries.map((entry) => {
    const alternates = hreflangCluster(entry.variants, entry.xDefaultUrl)
      .map(({ hreflang, href }) =>
        `    <xhtml:link rel="alternate" hreflang="${xml(hreflang)}" href="${xml(href)}"/>`
      )
      .join('\n');
    const location = canonicalUrl({ pageUrl: entry.url });
    const lastModified = entry.lastModified == null ? '' : `\n    <lastmod>${xml(entry.lastModified)}</lastmod>`;
    return `  <url>\n    <loc>${xml(location)}</loc>${lastModified}\n${alternates}\n  </url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

export function renderAtomFeed({ id, title, author, updated, selfUrl, entries }) {
  const feedEntries = entries.map((entry) => `  <entry>
    <id>${xml(entry.id)}</id>
    <title>${xml(entry.title)}</title>
    <updated>${xml(entry.updated)}</updated>
    <link href="${xml(canonicalUrl({ pageUrl: entry.url }))}"/>
    <content type="html">${xml(entry.html)}</content>
  </entry>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <id>${xml(id)}</id>
  <title>${xml(title)}</title>
  <author><name>${xml(requiredText(author, 'feed author'))}</name></author>
  <updated>${xml(updated)}</updated>
  <link rel="self" href="${xml(canonicalUrl({ pageUrl: selfUrl }))}"/>
${feedEntries}
</feed>
`;
}
