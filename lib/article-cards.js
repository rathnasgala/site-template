import { readingMinutes } from './reading-time.js';
import { groupManifestPosts } from '../src/assets/article-groups.js';

function publication(variants) {
  const published = variants.filter(({ publicationState }) => publicationState === 'published');
  const candidates = (published.length === 0 ? variants : published)
    .map((variant) => ({
      date: variant.frontmatter?.publishAfterDate ?? '',
      timestamp: Date.parse(variant.frontmatter?.publishAfterDate ?? '')
    }))
    .filter(({ timestamp }) => Number.isFinite(timestamp))
    .sort((left, right) => left.timestamp - right.timestamp);
  return candidates[0] ?? { date: '', timestamp: Number.NEGATIVE_INFINITY };
}

export function groupArticleCards(posts, defaultLanguage, preview = false) {
  return groupManifestPosts(posts, defaultLanguage, preview).map((group, sourceOrder) => {
    const published = publication(group.variants);
    return {
      ...group,
      publicationDate: published.date,
      readingMinutes: readingMinutes(group.primary?.body),
      publicationTimestamp: published.timestamp,
      sourceOrder
    };
  }).sort((left, right) => right.publicationTimestamp - left.publicationTimestamp
      || left.sourceOrder - right.sourceOrder)
    .map(({ publicationTimestamp, sourceOrder, ...group }) => group);
}
