import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { readBuildManifest, validateBuildManifest } from '../lib/build-manifest.js';

const valid = {
  schemaVersion: 1,
  evaluationDate: '2026-06-15',
  redirects: [],
  posts: [{
    source: 'content/posts/example/index.en.md',
    id: '01K00000000000000000000000',
    rawFrontmatter: { title: 'Example', deleteDate: null },
    frontmatter: { title: 'Example', deleteDate: null },
    contentBody: 'Body',
    body: 'Body',
    slug: 'example',
    language: 'en',
    relativeUrl: '/en/example/',
    pageUrl: 'https://example.com/en/example/',
    canonicalUrl: 'https://example.com/en/example/',
    publicationState: 'published'
  }]
};

test('accepts effective emitted posts and no interpretation flags', () => {
  assert.deepEqual(validateBuildManifest(valid), valid);
  assert.throws(() => validateBuildManifest({
    ...valid,
    posts: [{ ...valid.posts[0], publicationState: 'not-emitted' }]
  }), /publicationState/);
});

test('accepts scheduled posts only in an explicitly marked preview manifest', () => {
  const scheduled = { ...valid.posts[0], id: null, publicationState: 'not-emitted' };
  assert.equal(validateBuildManifest({
    ...valid,
    preview: true,
    posts: [scheduled]
  }).posts[0].publicationState, 'not-emitted');
  assert.throws(() => validateBuildManifest({
    ...valid,
    preview: false,
    posts: [{ ...scheduled, id: valid.posts[0].id }]
  }), /publicationState/);
  assert.throws(() => validateBuildManifest({
    ...valid,
    preview: true,
    posts: [{ ...valid.posts[0], id: null, publicationState: 'published' }]
  }), /id is invalid/);
  const second = {
    ...scheduled,
    source: 'content/posts/second/index.en.md',
    slug: 'second',
    relativeUrl: '/en/second/',
    pageUrl: 'https://example.com/en/second/',
    canonicalUrl: 'https://example.com/en/second/'
  };
  assert.equal(validateBuildManifest({
    ...valid,
    preview: true,
    posts: [scheduled, second]
  }).posts.length, 2);
});

test('accepts an intentional published-slug redirect and rejects output collisions', () => {
  const redirect = {
    id: valid.posts[0].id,
    language: 'en',
    relativeUrl: '/en/old-example/',
    pageUrl: 'https://example.com/en/old-example/',
    targetUrl: 'https://example.com/en/example/'
  };
  assert.deepEqual(validateBuildManifest({ ...valid, redirects: [redirect] }).redirects, [redirect]);
  assert.throws(() => validateBuildManifest({
    ...valid,
    redirects: [{ ...redirect, relativeUrl: valid.posts[0].relativeUrl }]
  }), /duplicate relativeUrl/);
  assert.throws(() => validateBuildManifest({
    ...valid,
    redirects: [{ ...redirect, targetUrl: redirect.pageUrl }]
  }), /must change URL/);
});

test('fails hard when the current-run manifest is missing', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'gala-manifest-missing-'));
  await assert.rejects(() => readBuildManifest(root), /run Gala validation before Eleventy/);
});

test('reads only the fixed build-workspace manifest path', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'gala-manifest-'));
  await mkdir(path.join(root, '.gala', 'build'), { recursive: true });
  await writeFile(
    path.join(root, '.gala', 'build', 'validated-posts.json'),
    JSON.stringify(valid)
  );
  assert.deepEqual(await readBuildManifest(root), valid);
});

test('rejects missing identities and duplicate source or output authority', () => {
  assert.throws(() => validateBuildManifest({
    ...valid,
    posts: [{ ...valid.posts[0], id: null }]
  }), /id is invalid/);
  for (const duplicateField of ['source', 'relativeUrl', 'pageUrl']) {
    const second = {
      ...valid.posts[0],
      source: 'content/posts/other/index.fr.md',
      id: '01K00000000000000000000001',
      slug: 'other',
      language: 'fr',
      relativeUrl: '/fr/other/',
      pageUrl: 'https://example.com/fr/other/'
    };
    assert.throws(() => validateBuildManifest({
      ...valid,
      posts: [
        valid.posts[0],
        { ...second, [duplicateField]: valid.posts[0][duplicateField] }
      ]
    }), new RegExp(`duplicate ${duplicateField}`));
  }
  assert.throws(() => validateBuildManifest({
    ...valid,
    posts: [
      valid.posts[0],
      {
        ...valid.posts[0],
        source: 'content/posts/other/index.en.md',
        slug: 'other',
        relativeUrl: '/en/other/',
        pageUrl: 'https://example.com/en/other/'
      }
    ]
  }), /duplicate identity-language/);
});

test('accepts only post-scoped validated media copy mappings', () => {
  const media = [{
    source: 'content/posts/example/media/cover.png',
    output: 'en/example/media/cover.png'
  }];
  assert.deepEqual(validateBuildManifest({
    ...valid,
    posts: [{ ...valid.posts[0], media }]
  }).posts[0].media, media);
  for (const invalid of [
    [{ source: '../secret', output: 'en/example/media/cover.png' }],
    [{ source: 'content/posts/example/media/cover.png', output: '../cover.png' }],
    [{ source: 'content/posts/other/media/cover.png', output: 'en/example/media/cover.png' }],
    [{ source: 'content/posts/example/media/cover.png', output: 'fr/example/media/cover.png' }]
  ]) {
    assert.throws(() => validateBuildManifest({
      ...valid,
      posts: [{ ...valid.posts[0], media: invalid }]
    }), /media/);
  }
});

test('validates ephemeral assigned-ID commit bindings', () => {
  const assignedContentIds = [{
    source: 'content/posts/example/index.en.md',
    id: valid.posts[0].id,
    fileHash: 'a'.repeat(64)
  }];
  assert.deepEqual(validateBuildManifest({ ...valid, assignedContentIds }).assignedContentIds,
    assignedContentIds);
  for (const invalid of [
    [{ ...assignedContentIds[0], source: '../index.en.md' }],
    [{ ...assignedContentIds[0], id: 'not-an-id' }],
    [{ ...assignedContentIds[0], fileHash: 'A'.repeat(64) }],
    [assignedContentIds[0], assignedContentIds[0]]
  ]) {
    assert.throws(() => validateBuildManifest({ ...valid, assignedContentIds: invalid }),
      /assignedContentIds/);
  }
});

test('accepts V2 Prism configurations and rejects prose in fallback descriptors', () => {
  const configuration = {
    source: 'content/posts/example/prism/01K00000000000000000000001/index.en.md',
    parentSource: valid.posts[0].source,
    configurationId: '01K00000000000000000000001',
    revisionId: '01K00000000000000000000002',
    approvalId: '01K00000000000000000000003',
    articleId: valid.posts[0].id,
    language: 'en',
    sourceRevisionHash: 'a'.repeat(64),
    configurationContentHash: 'b'.repeat(64),
    hashContract: 'GALA_PRISM_HASH_V1',
    depth: 'BRIEF', intent: 'ORIENTATION', modality: 'TEXT',
    approvedAt: '2026-08-26T16:00:00.000Z', approvalTokenVersion: 1,
    approvalToken: 'token', approvalTokenVerifiedWith: 'CURRENT',
    state: 'PUBLISHED', body: 'Approved body',
    relativeUrl: '/en/example/prism/01K00000000000000000000001/',
    pageUrl: 'https://example.com/en/example/prism/01K00000000000000000000001/',
    canonicalUrl: valid.posts[0].canonicalUrl,
    configurationLinkPolicy: 'NOFOLLOW'
  };
  const v2 = {
    ...valid,
    schemaVersion: 2,
    prism: {
      schemaVersion: 1,
      mode: 'MANUAL',
      configurationLinkPolicy: 'NOFOLLOW',
      articleModes: {},
      articleConfigurationLinkPolicies: {}
    },
    configurations: [configuration]
  };

  assert.equal(validateBuildManifest(v2).configurations[0].body, 'Approved body');
  assert.throws(() => validateBuildManifest({
    ...v2,
    configurations: [{ ...configuration, state: 'STALE' }]
  }), /fallback must not contain prose/);
  assert.throws(() => validateBuildManifest({ ...valid, configurations: [] }),
    /V1 cannot contain Prism/);
});
