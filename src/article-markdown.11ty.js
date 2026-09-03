import { articleMarkdown, articleMarkdownPath } from '../lib/ai-discovery.js';

export default class ArticleMarkdownPages {
  data() {
    return {
      pagination: {
        data: 'buildManifest.posts', size: 1, alias: 'post',
        before: (posts) => posts.filter(({ publicationState }) => publicationState === 'published')
      },
      permalink: ({ post }) => articleMarkdownPath(post),
      eleventyExcludeFromCollections: true
    };
  }
  render({ post }) { return articleMarkdown(post); }
}
