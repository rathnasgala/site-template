import { markdownLibrary } from './lib/render-markdown.js';
import { readBuildManifest } from './lib/build-manifest.js';
import { loadSiteConfiguration } from './lib/site-config.js';
import { enforcePerformanceBudgets } from './lib/performance-budget.js';
import { verifyPrismCompiledOutput } from './lib/prism-compiled-output.js';
import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const themeBootstrap = "(function(){try{var m=localStorage.getItem('gala-color-mode');if(m==='light'||m==='dark'||m==='system')document.documentElement.dataset.mode=m}catch(e){}})();";

async function verifiedMediaSource(postSource, mediaSource) {
  const metadata = await lstat(mediaSource);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error(`Validated media source is no longer a regular file: ${mediaSource}`);
  }
  const [postDirectory, source] = await Promise.all([
    realpath(path.dirname(postSource)),
    realpath(mediaSource)
  ]);
  const relative = path.relative(postDirectory, source);
  if (relative === '' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`Validated media source escaped its post folder: ${mediaSource}`);
  }
  return source;
}

export default async function (eleventyConfig) {
  const [manifest, site] = await Promise.all([readBuildManifest(), loadSiteConfiguration()]);
  const attributionTier = process.env.GALA_ATTRIBUTION_TIER === 'PAID' ? 'PAID' : 'FREE';
  const buildCommit = process.env.GALA_BUILD_COMMIT;
  if (buildCommit != null && !/^[0-9a-f]{40}$/.test(buildCommit)) {
    throw new TypeError('GALA_BUILD_COMMIT must be a lowercase commit SHA');
  }
  const repository = site.site.repository;
  const publicationPathPrefix = site.hosting.pathPrefix === ''
    ? ''
    : site.hosting.pathPrefix.replace(/\/$/, '');
  const buildIdentity = buildCommit != null
    && /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\/[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(repository ?? '')
    ? Object.freeze({
        commit: buildCommit,
        shortCommit: buildCommit.slice(0, 8),
        versionUrl: `${publicationPathPrefix}/s/version/`
      })
    : null;
  eleventyConfig.addGlobalData('attributionTier', attributionTier);
  eleventyConfig.addGlobalData('buildIdentity', buildIdentity);
  eleventyConfig.addGlobalData('themeBootstrap', themeBootstrap);
  eleventyConfig.addFilter('sha256Csp', (value) =>
    createHash('sha256').update(String(value)).digest('base64'));
  eleventyConfig.setLibrary('md', markdownLibrary);
  eleventyConfig.addPassthroughCopy({ static: '/' });
  eleventyConfig.addPassthroughCopy({
    'src/assets/theme.css': 'assets/theme.css',
    'src/assets/reader.js': 'assets/reader.js',
    'src/assets/version.js': 'assets/version.js',
    'src/assets/favicon.svg': 'assets/favicon.svg',
    'src/assets/embed-codepen.svg': 'assets/embed-codepen.svg',
    'src/assets/embed-gist.svg': 'assets/embed-gist.svg',
    'src/assets/embed-x.svg': 'assets/embed-x.svg',
    'src/assets/embed-youtube.svg': 'assets/embed-youtube.svg'
  });
  eleventyConfig.addPassthroughCopy('custom.css');
  for (const post of manifest.posts) {
    for (const copy of post.media ?? []) {
      const source = await verifiedMediaSource(post.source, copy.source);
      eleventyConfig.addPassthroughCopy({ [source]: copy.output });
    }
  }
  eleventyConfig.addCollection('posts', (collectionApi) =>
    collectionApi.getAll().filter((item) => item.data.post?.publicationState === 'published')
  );
  eleventyConfig.on('eleventy.after', async () => {
    await enforcePerformanceBudgets({
      outputDirectory: path.resolve('_site'),
      budgets: site.performance.budgets
    });
    await verifyPrismCompiledOutput({ outputDirectory: path.resolve('_site'), manifest });
  });

  return {
    dir: {
      input: 'src',
      output: '_site',
      includes: '_includes',
      data: '_data'
    },
    pathPrefix: site.hosting.pathPrefix === '' ? '/' : site.hosting.pathPrefix
  };
}
