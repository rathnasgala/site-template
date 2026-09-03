import { renderRsl } from '../lib/ai-discovery.js';

export default class RslLicense {
  data() {
    return {
      permalink: ({ site }) => site.aiPublishing.rslEnabled ? '/license.xml' : false,
      eleventyExcludeFromCollections: true
    };
  }
  render({ site }) { return renderRsl({ site }) ?? ''; }
}
