import { renderMarkdownDocument } from '../lib/render-markdown.js';
import { postSeo } from '../lib/seo.js';

export default class PrismConfigurationPages {
  data() {
    return {
      pagination: { data: 'buildManifest.configurations', size: 1, alias: 'prismConfiguration' },
      layout: 'layouts/prism-configuration.njk',
      permalink: ({ prismConfiguration }) => `${prismConfiguration.relativeUrl}index.html`,
      eleventyComputed: {
        post: ({ buildManifest, prismConfiguration }) => buildManifest.posts.find((candidate) =>
          candidate.id === prismConfiguration.articleId && candidate.language === prismConfiguration.language),
        prismAlternates: ({ buildManifest, prismConfiguration }) => buildManifest.configurations.filter(
          (candidate) => candidate.articleId === prismConfiguration.articleId
            && candidate.language === prismConfiguration.language && candidate.state === 'PUBLISHED'),
        seo: ({ post, prismConfiguration, site }) =>
          prismConfiguration?.state === 'PUBLISHED' && post?.publicationState === 'published'
            ? postSeo({
            post: { ...post, canonicalUrl: prismConfiguration.canonicalUrl },
            site,
            renderedHtml: renderMarkdownDocument(prismConfiguration.body).html
          }) : null
      }
    };
  }

  render({ prismConfiguration }) {
    if (prismConfiguration.state !== 'PUBLISHED') return '';
    return renderMarkdownDocument(prismConfiguration.body).html;
  }
}
