export default class AccentStylesheet {
  data() {
    return { permalink: '/assets/accent.css', eleventyExcludeFromCollections: true };
  }

  render({ site }) {
    if (!site.accent) return '';
    return `:root{--gala-accent-light:${site.accent.light};--gala-accent-dark:${site.accent.dark}}\n`;
  }
}
