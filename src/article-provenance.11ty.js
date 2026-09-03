import { articleProvenance, articleProvenancePath } from '../lib/ai-discovery.js';

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

export default class ArticleProvenancePages {
  data() {
    return {
      pagination: {
        data: 'buildManifest.posts', size: 1, alias: 'post',
        before: (posts) => posts.filter(({ publicationState }) => publicationState === 'published')
      },
      permalink: ({ post }) => `${articleProvenancePath(post)}index.html`,
      eleventyExcludeFromCollections: true
    };
  }
  render({ post, site, buildIdentity }) {
    const record = articleProvenance({ post, site, buildIdentity });
    const source = record.sourceUrl == null
      ? 'Unavailable in this preview build'
      : `<a href="${escapeHtml(record.sourceUrl)}">View the exact source commit</a>`;
    return `<!doctype html><html lang="${escapeHtml(post.language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Provenance · ${escapeHtml(post.frontmatter.title)}</title><link rel="canonical" href="${escapeHtml(record.canonicalUrl)}"></head><body><main><h1>Article provenance</h1><dl><dt>Article</dt><dd><a href="${escapeHtml(record.canonicalUrl)}">${escapeHtml(post.frontmatter.title)}</a></dd><dt>Article ID</dt><dd><code>${escapeHtml(post.id)}</code></dd><dt>Language</dt><dd>${escapeHtml(record.language)}</dd><dt>Generated Markdown SHA-256</dt><dd><code>${record.sourceSha256}</code></dd><dt>Repository source</dt><dd>${source}</dd></dl><script type="application/json" id="gala-provenance">${JSON.stringify(record).replaceAll('<', '\\u003c')}</script></main></body></html>`;
  }
}
