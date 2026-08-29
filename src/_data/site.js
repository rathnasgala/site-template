import { accentPair } from '../../lib/accent.js';
import { loadSiteConfiguration } from '../../lib/site-config.js';

export default async function siteConfiguration() {
  const configuration = await loadSiteConfiguration();
  const repositoryOwner = configuration?.site?.repository?.split('/')[0];
  const author = configuration?.site?.authorProfile?.displayName || configuration?.site?.author;
  const name = configuration?.site?.name;
  const fallback = author && author !== 'unavailable'
    ? author
    : repositoryOwner && repositoryOwner !== 'unavailable' ? repositoryOwner : 'Publication';
  configuration.site = {
    ...configuration.site,
    name: name && name !== 'unavailable' && name !== 'New Gala Site' ? name : fallback,
    author: author && author !== 'unavailable' && author !== 'New Gala Site' ? author : undefined,
    authorProfile: {
      ...configuration.site.authorProfile,
      displayName: author && author !== 'unavailable' && author !== 'New Gala Site'
        ? author : fallback
    }
  };
  /*
   * The writer picks one colour; the page needs two, because the same colour cannot be readable on
   * both a light and a dark ground. Derived here rather than in CSS so the contrast is exact - a
   * `color-mix()` approximation can land under 4.5:1 and nobody would know until a reader could
   * not read a link.
   *
   * An absent or unparseable value leaves this undefined, and the look's own accent stands.
   */
  const accent = accentPair(configuration?.design?.accent);
  return accent ? { ...configuration, accent } : configuration;
}
