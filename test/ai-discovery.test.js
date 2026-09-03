import assert from 'node:assert/strict';
import test from 'node:test';

import {
  articleMarkdown,
  articleProvenance,
  renderLlmsText,
  renderRobotsText,
  renderRsl
} from '../lib/ai-discovery.js';

const post = Object.freeze({
  id: '01K00000000000000000000000',
  source: 'content/posts/answer/index.en.md',
  relativeUrl: '/en/answer/',
  canonicalUrl: 'https://example.com/notes/en/answer/',
  language: 'en',
  publicationState: 'published',
  contentBody: '> [!ANSWER]\n> Forty-two.\n',
  frontmatter: {
    title: 'The answer', description: 'A useful answer.', publishAfterDate: '2026-09-01'
  }
});

function configuredSite(aiPublishing) {
  return {
    site: {
      name: 'Example Notes', repository: 'owner/notes',
      authorProfile: { displayName: 'Writer', bio: 'Useful notes.' }
    },
    hosting: { canonicalBaseUrl: 'https://example.com', pathPrefix: '/notes' },
    aiPublishing
  };
}

test('publishes path-aware llms discovery and clean article Markdown', () => {
  const text = renderLlmsText({ manifest: { posts: [post] }, site: configuredSite({}) });
  assert.match(text, /https:\/\/example\.com\/notes\/en\/answer\/index\.md/);
  assert.match(text, /https:\/\/example\.com\/notes\/en\/answer\/provenance\//);
  assert.match(text, /not an access grant or a license/);
  assert.match(articleMarkdown(post), /^# The answer/m);
  assert.match(articleMarkdown(post), /Canonical URL: https:\/\/example\.com\/notes\/en\/answer\//);
  assert.match(articleMarkdown(post), /\[!ANSWER]/);
});

test('emits no crawler or license declaration before confirmation', () => {
  const site = configuredSite({
    indexing: 'not-declared', aiSearch: 'not-declared', modelTraining: 'not-declared',
    rslEnabled: false
  });
  const robots = renderRobotsText({ site });
  assert.doesNotMatch(robots, /User-agent:/);
  assert.match(robots, /^Sitemap: https:\/\/example\.com\/notes\/sitemap\.xml$/m);
  assert.doesNotMatch(robots, /License:/);
  assert.equal(renderRsl({ site }), null);
});

test('escapes author text before placing it in llms Markdown', () => {
  const unsafe = {
    ...post,
    frontmatter: {
      ...post.frontmatter,
      title: 'A ](https://attacker.example) [title',
      description: 'First line\n<https://attacker.example>'
    }
  };
  const site = configuredSite({});
  site.site.name = 'Notes [untrusted]';
  const text = renderLlmsText({ manifest: { posts: [unsafe] }, site });
  assert.ok(text.includes('# Notes \\[untrusted\\]\n'));
  assert.ok(text.includes('A \\](https://attacker.example) \\[title'));
  assert.ok(text.includes('First line \\<https://attacker.example\\>'));
  assert.doesNotMatch(text, /\[title\]\(https:\/\/attacker\.example/);
});

test('renders confirmed crawler restrictions and an RSL 1.0 license', () => {
  const site = configuredSite({
    indexing: 'allow', aiSearch: 'allow', modelTraining: 'block',
    reuse: 'attribution-required', commercialUse: 'license-required',
    licenseUrl: 'https://example.com/licensing?kind=commercial', rslEnabled: true
  });
  const robots = renderRobotsText({ site });
  assert.match(robots, /User-agent: GPTBot\nDisallow: \//);
  assert.match(robots, /User-agent: Google-Extended\nDisallow: \//);
  assert.match(robots, /License: https:\/\/example\.com\/notes\/license\.xml/);
  const rsl = renderRsl({ site });
  assert.match(rsl, /xmlns="https:\/\/rslstandard\.org\/rsl"/);
  assert.match(rsl, /<content url="\/notes\/">/);
  assert.match(rsl, /<permits type="usage">search ai-input ai-index<\/permits>/);
  assert.match(rsl, /<prohibits type="usage">ai-train<\/prohibits>/);
  assert.match(rsl, /<payment type="attribution"\/>/);
  assert.match(rsl, /https:\/\/example\.com\/licensing\?kind=commercial/);
  assert.equal((rsl.match(/<license>/g) ?? []).length, 2);
  assert.match(rsl, /<permits type="user">non-commercial education government personal<\/permits>/);
  assert.match(rsl, /<permits type="user">commercial<\/permits>/);
  assert.doesNotMatch(rsl, /<prohibits type="usage">all<\/prohibits>/);
});

test('represents a complete reuse block without contradictory usage permissions', () => {
  const rsl = renderRsl({ site: configuredSite({
    indexing: 'block', aiSearch: 'block', modelTraining: 'block',
    reuse: 'block', commercialUse: 'block', rslEnabled: true
  }) });
  assert.match(rsl, /<prohibits type="usage">all<\/prohibits>/);
  assert.doesNotMatch(rsl, /<permits type="usage">/);
  assert.match(rsl, /<prohibits type="user">commercial<\/prohibits>/);
});

test('binds visible provenance to generated Markdown and the exact source commit', () => {
  const record = articleProvenance({
    post,
    site: configuredSite({}),
    buildIdentity: { commit: 'a'.repeat(40) }
  });
  assert.match(record.sourceSha256, /^[a-f0-9]{64}$/);
  assert.equal(record.sourceUrl,
    `https://github.com/owner/notes/blob/${'a'.repeat(40)}/content/posts/answer/index.en.md`);
  assert.equal(record.sourceDigestScope, 'generated-markdown-alternative');
});
