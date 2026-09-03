import { readBuildManifest } from '../../lib/build-manifest.js';
import { readBuildSettings } from '../../lib/build-settings.js';

const [manifest, settings] = await Promise.all([
  readBuildManifest(),
  readBuildSettings(new URL('../../.gala/build/build-settings.json', import.meta.url))
]);

export default Object.freeze({
  ...manifest,
  posts: Object.freeze(manifest.posts.map((post) => Object.freeze({
    ...post,
    contributorCredits: settings.contributorCredits[post.slug]
      ?? Object.freeze({ authors: Object.freeze([]), editors: Object.freeze([]) })
  }))),
  configurations: manifest.configurations ?? Object.freeze([])
});
