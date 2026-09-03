import { renderRobotsText } from '../lib/ai-discovery.js';

export default class RobotsText {
  data() { return { permalink: '/robots.txt', eleventyExcludeFromCollections: true }; }
  render({ site }) { return renderRobotsText({ site }); }
}
