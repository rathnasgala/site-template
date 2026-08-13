import assert from 'node:assert/strict';
import test from 'node:test';

import { renderMarkdown, renderMarkdownDocument } from '../lib/render-markdown.js';
import { xssPayloads } from './fixtures/xss-payloads.js';

test('sanitizes after Markdown conversion', () => {
  const rendered = renderMarkdown(`
# Safe heading

[safe](https://example.com) [mail](mailto:user@example.com)

<img src="media/photo.png" alt="Photo" onerror="alert(1)">
<script>alert(1)</script>
<style>body { display: none }</style>
<iframe src="https://example.com"></iframe>
<form><input name="secret"></form>
`);

  assert.match(rendered, /<h1 id="safe-heading">Safe heading<\/h1>/);
  assert.match(rendered, /href="https:\/\/example\.com"/);
  assert.match(rendered, /src="media\/photo\.png"/);
  assert.doesNotMatch(rendered, /onerror|script|style|iframe|form|input/);
});

test('removes unsafe and protocol-relative URLs while retaining relative URLs', () => {
  const rendered = renderMarkdown(`
[javascript](javascript:alert(1))
[http](http://example.com)
[protocol-relative](//example.com)
[relative](../article/)
`);
  assert.doesNotMatch(rendered, /href="(?:javascript:|http:\/\/|\/\/)/);
  assert.match(rendered, /href="\.\.\/article\/"/);
});

test('renders footnotes and GitHub admonitions', () => {
  const rendered = renderMarkdown(`
> [!NOTE]
> Important context.

Claim.[^1]

[^1]: Supporting detail.
`);
  assert.match(rendered, /<aside class="admonition admonition-note" role="note">/);
  assert.match(rendered, /Important context/);
  assert.match(rendered, /class="footnote-ref"/);
  assert.match(rendered, /Supporting detail/);
});

test('rejects the maintained OWASP-derived XSS regression corpus', () => {
  for (const payload of xssPayloads) {
    const rendered = renderMarkdown(payload);
    assert.doesNotMatch(rendered, /<(?:script|style|iframe|svg|object|form|input)\b/i, payload);
    assert.doesNotMatch(rendered, /\son[a-z]+\s*=/i, payload);
    assert.doesNotMatch(rendered, /\sstyle\s*=/i, payload);
    assert.doesNotMatch(rendered, /(?:href|src)="(?:javascript|data|vbscript):/i, payload);
  }
});

test('retains the documented safe HTML and URL boundary', () => {
  const rendered = renderMarkdown(`
<strong>strong</strong>
<a href="https://example.com">https</a>
<a href="mailto:person@example.com">mail</a>
<a href="../relative/">relative</a>
`);

  assert.match(rendered, /<strong>strong<\/strong>/);
  assert.match(rendered, /href="https:\/\/example\.com"/);
  assert.match(rendered, /href="mailto:person@example\.com"/);
  assert.match(rendered, /href="\.\.\/relative\/"/);
});

test('highlights known fenced languages at build time with exact light and dark themes', () => {
  const rendered = renderMarkdown('```javascript\nconst answer = 42;\n```');

  assert.match(rendered, /class="shiki shiki-themes github-light github-dark"/);
  assert.match(rendered, /--shiki-light:/);
  assert.match(rendered, /--shiki-dark:/);
  assert.match(rendered, />const</);
  assert.match(rendered, /> answer</);
  assert.doesNotMatch(rendered, /gala-highlight-placeholder/);
});

test('authored placeholder-shaped HTML cannot consume a highlighted fence', () => {
  const rendered = renderMarkdown(`
<div class="gala-highlight-placeholder" data-highlight-token="authored"></div>

\`\`\`javascript
const protectedLocation = true;
\`\`\`
`);

  assert.match(rendered, /data-highlight-token="authored"/);
  assert.match(rendered, /protectedLocation/);
  assert.doesNotMatch(rendered, /data-highlight-token="[a-f0-9]{36}"/);
});

test('unknown fenced languages remain escaped plain code', () => {
  const rendered = renderMarkdown('```not-a-real-language\n<script>alert(1)</script>\n```');

  assert.match(rendered, /class="language-not-a-real-language"/);
  assert.doesNotMatch(rendered, /<script>/);
});

test('uses GitHub-compatible duplicate heading anchors and shows a ToC from three headings', () => {
  const rendered = renderMarkdownDocument('## Café!\n\n### Café!\n\n## Third heading');

  assert.match(rendered.html, /<h2 id="café">/);
  assert.match(rendered.html, /<h3 id="café-1">/);
  assert.deepEqual(rendered.tableOfContents, [
    { id: 'café', text: 'Café!' },
    { id: 'café-1', text: 'Café!' },
    { id: 'third-heading', text: 'Third heading' }
  ]);
});

test('omits the ToC below the three-heading contract threshold', () => {
  assert.deepEqual(renderMarkdownDocument('## One\n\n### Two').tableOfContents, []);
});
