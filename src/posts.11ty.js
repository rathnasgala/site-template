import { markdownLibrary } from '../lib/render-markdown.js';
import { articleHreflang, postSeo } from '../lib/seo.js';
import { engagementFor } from '../lib/engagement-snapshot.js';

export default class ValidatedPostPages {
  data() {
    return {
      pagination: {
        data: 'buildManifest.posts',
        size: 1,
        alias: 'post'
      },
      layout: 'layouts/post.njk',
      permalink: ({ post }) => `${post.relativeUrl}index.html`,
      eleventyComputed: {
        hreflangLinks: ({ buildManifest, post, site }) => {
          if (buildManifest?.posts == null || post?.source == null
              || site?.site?.defaultLanguage == null) return [];
          return articleHreflang(buildManifest.posts, site).get(post.source) ?? [];
        },
        engagement: ({ engagementSnapshot, post }) => engagementFor(engagementSnapshot, post.id),
        seo: ({ post, site }) => post?.publicationState === 'published'
          ? postSeo({ post, site, renderedHtml: markdownLibrary.render(post.body) })
          : null
      }
    };
  }

  render({ post }) {
    if (post.publicationState === 'tombstoned') {
      return `<p>POST deleted on ${post.frontmatter.deleteDate}</p>`;
    }
    return markdownLibrary.render(post.body);
  }
}
