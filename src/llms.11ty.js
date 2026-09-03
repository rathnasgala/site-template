import { renderLlmsText } from '../lib/ai-discovery.js';

export default class LlmsText {
  data() { return { permalink: '/llms.txt', eleventyExcludeFromCollections: true }; }
  render({ buildManifest, site }) { return renderLlmsText({ manifest: buildManifest, site }); }
}
