import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

export async function loadSiteConfiguration({
  root = process.cwd(),
  configPath = process.env.GALA_CONFIG_PATH ?? 'site.config.yml'
} = {}) {
  if (path.isAbsolute(configPath) || configPath.split(/[\\/]/).includes('..')) {
    throw new TypeError('GALA_CONFIG_PATH must stay within the checkout');
  }
  const checkout = path.resolve(root);
  const file = path.resolve(checkout, configPath);
  const relative = path.relative(checkout, file);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new TypeError('GALA_CONFIG_PATH must stay within the checkout');
  }
  const metadata = await lstat(file);
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new TypeError('site configuration must be a regular file');
  }
  return parse(await readFile(file, 'utf8'));
}
