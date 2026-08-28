import { readFile } from 'node:fs/promises';
import path from 'node:path';

export class PrismCompiledOutputError extends Error {
  constructor(code, message) {
    super(`${code}: ${message}`);
    this.name = 'PrismCompiledOutputError';
    this.code = code;
  }
}

/** Verifies the emitted files, not template source, so CI catches generator and layout regressions. */
export async function verifyPrismCompiledOutput({ outputDirectory, manifest }) {
  const configurations = manifest?.configurations ?? [];
  if (configurations.length === 0) return;
  const discovery = await Promise.all([
    optionalText(path.join(outputDirectory, 'sitemap.xml')),
    ...[...new Set((manifest.posts ?? []).map((post) => post.language))]
      .map((language) => optionalText(path.join(outputDirectory, 'feed', `${language}.xml`))),
  ]);
  for (const configuration of configurations) {
    if (discovery.some((document) => document.includes(configuration.pageUrl))) {
      throw new PrismCompiledOutputError('PRISM_CONFIGURATION_DISCOVERY_LEAK',
        `${configuration.pageUrl} appears in sitemap or feed output`);
    }
    const parent = (manifest.posts ?? []).find((post) => post.id === configuration.articleId
      && post.language === configuration.language);
    if (!parent) throw new PrismCompiledOutputError('PRISM_CONFIGURATION_PARENT_MISSING',
      configuration.configurationId);
    const file = path.join(outputDirectory, ...configuration.relativeUrl.split('/').filter(Boolean),
      'index.html');
    const html = await optionalText(file);
    const canonical = [...html.matchAll(/<link\s+[^>]*rel=["']canonical["'][^>]*>/gi)];
    if (canonical.length !== 1 || !canonical[0][0].includes(`href="${parent.canonicalUrl}"`)) {
      throw new PrismCompiledOutputError('PRISM_CANONICAL_INVALID', configuration.configurationId);
    }
    const restore = anchorFor(html, parent.pageUrl);
    if (!restore || !restore.includes('data-prism-restore') || /rel=["'][^"']*nofollow/i.test(restore)) {
      throw new PrismCompiledOutputError('PRISM_CANONICAL_RESTORE_INVALID',
        configuration.configurationId);
    }
    if (configuration.state !== 'PUBLISHED' && configuration.body
      && html.includes(configuration.body.replace(/^#+\s*/m, '').trim())) {
      throw new PrismCompiledOutputError('PRISM_STALE_BODY_LEAK', configuration.configurationId);
    }
  }
  for (const post of manifest.posts ?? []) {
    const html = await optionalText(path.join(outputDirectory,
      ...post.relativeUrl.split('/').filter(Boolean), 'index.html'));
    for (const configuration of configurations.filter((item) => item.articleId === post.id
      && item.language === post.language && item.state === 'PUBLISHED')) {
      assertLinkPolicy(html, configuration.pageUrl,
        post.prismConfigurationLinkPolicy ?? configuration.configurationLinkPolicy);
    }
  }
}

function assertLinkPolicy(html, url, policy) {
  const anchor = anchorFor(html, url);
  if (!anchor) throw new PrismCompiledOutputError('PRISM_CONFIGURATION_LINK_MISSING', url);
  const rel = /rel=["']([^"']*)["']/i.exec(anchor)?.[1]?.split(/\s+/) ?? [];
  if ((policy === 'NOFOLLOW') !== rel.includes('nofollow')) {
    throw new PrismCompiledOutputError('PRISM_CONFIGURATION_LINK_POLICY_MISMATCH', url);
  }
}

function anchorFor(html, href) {
  return [...html.matchAll(/<a\s+[^>]*>/gi)].map((match) => match[0])
    .find((anchor) => anchor.includes(`href="${href}"`));
}

async function optionalText(file) {
  try { return await readFile(file, 'utf8'); } catch (error) {
    if (error.code === 'ENOENT') return '';
    throw error;
  }
}
