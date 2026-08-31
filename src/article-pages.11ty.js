import { uiLabels } from '../lib/ui-localization.js';

export default class ArticleIndexPages {
  data() {
    return {
      pagination: { data: 'additionalArticleIndexes', size: 1, alias: 'articleIndex' },
      layout: 'layouts/language-index.njk',
      permalink: ({ articleIndex }) => articleIndex.permalink,
      eleventyComputed: {
        language: ({ articleIndex }) => articleIndex.language,
        title: ({ articleIndex }) => articleIndex.language == null
          ? 'Home'
          : uiLabels(articleIndex.language).languageIndexTitle
      }
    };
  }

  render() {
    return '';
  }
}
