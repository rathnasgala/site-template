import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import sanitizeHtml from 'sanitize-html';

const ADMONITION_TYPES = new Set(['NOTE', 'TIP', 'IMPORTANT', 'WARNING', 'CAUTION']);

function admonitions(markdown) {
  markdown.core.ruler.after('block', 'gala_admonitions', (state) => {
    for (let index = 0; index < state.tokens.length - 2; index += 1) {
      const open = state.tokens[index];
      const inline = state.tokens[index + 2];
      if (open.type !== 'blockquote_open' || inline?.type !== 'inline') continue;

      const match = inline.content.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)](?:\n|$)/);
      if (!match || !ADMONITION_TYPES.has(match[1])) continue;

      open.tag = 'aside';
      open.attrSet('class', `admonition admonition-${match[1].toLowerCase()}`);
      open.attrSet('role', 'note');
      inline.content = inline.content.slice(match[0].length);
      if (inline.children?.[0]?.type === 'text') {
        inline.children[0].content = inline.children[0].content.replace(
          /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)](?:\n|$)/,
          ''
        );
      }

      let depth = 1;
      for (let cursor = index + 1; cursor < state.tokens.length; cursor += 1) {
        if (state.tokens[cursor].type === 'blockquote_open') depth += 1;
        if (state.tokens[cursor].type === 'blockquote_close') depth -= 1;
        if (depth === 0) {
          state.tokens[cursor].tag = 'aside';
          break;
        }
      }
    }
  });
}

const markdown = new MarkdownIt({ html: true, linkify: true, typographer: false })
  .use(footnote)
  .use(admonitions);

const sanitizeOptions = {
  allowedTags: [
    'a', 'abbr', 'aside', 'blockquote', 'br', 'code', 'del', 'div', 'em',
    'figcaption', 'figure', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'img',
    'li', 'mark', 'ol', 'p', 'pre', 'span', 'strong', 'sub', 'sup', 'table',
    'tbody', 'td', 'th', 'thead', 'tr', 'ul'
  ],
  allowedAttributes: {
    a: ['href', 'title', 'rel'],
    aside: ['class', 'role'],
    code: ['class'],
    div: ['class', 'id'],
    img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'decoding'],
    li: ['id'],
    ol: ['class'],
    span: ['class'],
    sup: ['class'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan', 'scope']
  },
  allowedClasses: {
    aside: [
      'admonition', 'admonition-note', 'admonition-tip', 'admonition-important',
      'admonition-warning', 'admonition-caution'
    ],
    code: [/^language-[a-z0-9_-]+$/],
    ol: ['footnotes-list'],
    span: ['footnote-backref'],
    sup: ['footnote-ref']
  },
  allowedSchemes: ['https', 'mailto'],
  allowedSchemesByTag: {
    a: ['https', 'mailto'],
    img: ['https']
  },
  allowProtocolRelative: false,
  enforceHtmlBoundary: true
};

export function renderMarkdown(source) {
  if (typeof source !== 'string') throw new TypeError('Markdown source must be a string');
  return sanitizeHtml(markdown.render(source), sanitizeOptions);
}

export const markdownLibrary = Object.assign(Object.create(markdown), {
  render(source, environment) {
    return sanitizeHtml(markdown.render(source, environment), sanitizeOptions);
  },
  renderInline(source, environment) {
    return sanitizeHtml(markdown.renderInline(source, environment), sanitizeOptions);
  }
});
