import { uiLabels } from '../lib/ui-localization.js';

export default class LanguageIndexes {
  data() {
    return {
      pagination: { data: 'languages', size: 1, alias: 'language' },
      layout: 'layouts/language-index.njk',
      permalink: ({ language }) => `/${language}/index.html`,
      eleventyComputed: {
        title: ({ language }) => uiLabels(language).languageIndexTitle,
        articleIndex: ({ language, articleIndexesByLanguage }) => articleIndexesByLanguage[language]
      }
    };
  }

  render() {
    return '';
  }
}
