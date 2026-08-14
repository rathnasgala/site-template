import { lstat, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';

const BUDGET_KEYS = Object.freeze([
  'managedJavaScriptBytes',
  'managedCssBytes',
  'ordinaryHtmlBytes'
]);

export function validatePerformanceBudgets(value) {
  if (value == null || Array.isArray(value) || typeof value !== 'object') {
    throw new TypeError('performance.budgets must be a mapping');
  }
  const keys = Object.keys(value);
  const unknown = keys.filter((key) => !BUDGET_KEYS.includes(key));
  if (unknown.length > 0) {
    throw new TypeError(`Unsupported performance budget: ${unknown.join(', ')}`);
  }
  for (const key of BUDGET_KEYS) {
    if (!Number.isSafeInteger(value[key]) || value[key] <= 0) {
      throw new TypeError(`performance.budgets.${key} must be a positive integer byte count`);
    }
  }
  return Object.freeze(Object.fromEntries(BUDGET_KEYS.map((key) => [key, value[key]])));
}

export function validateStatistics(value) {
  if (value == null) return Object.freeze({ publicViewCounts: false });
  if (Array.isArray(value) || typeof value !== 'object') {
    throw new TypeError('statistics must be a mapping');
  }
  const unknown = Object.keys(value).filter((key) => key !== 'publicViewCounts');
  if (unknown.length > 0) {
    throw new TypeError(`Unsupported statistics option: ${unknown.join(', ')}`);
  }
  if (value.publicViewCounts != null && typeof value.publicViewCounts !== 'boolean') {
    throw new TypeError('statistics.publicViewCounts must be a boolean');
  }
  return Object.freeze({ publicViewCounts: value.publicViewCounts === true });
}

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
  const config = parse(await readFile(file, 'utf8'));
  validatePerformanceBudgets(config?.performance?.budgets);
  config.statistics = validateStatistics(config.statistics);
  return config;
}
