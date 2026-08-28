import { readBuildManifest } from '../../lib/build-manifest.js';

const manifest = await readBuildManifest();

export default Object.freeze({
  ...manifest,
  configurations: manifest.configurations ?? Object.freeze([])
});
