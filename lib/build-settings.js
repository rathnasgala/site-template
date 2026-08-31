import { readFile } from 'node:fs/promises';

export const DEFAULT_BUILD_SETTINGS = Object.freeze({
  schemaVersion: 1,
  generatedAt: null,
  paginationPolicy: Object.freeze({
    minimumPageSize: 12,
    maximumPageSize: 100,
    defaultPageSize: 24
  })
});

export async function readBuildSettings(file) {
  let source;
  try {
    source = await readFile(file, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return DEFAULT_BUILD_SETTINGS;
    throw error;
  }
  let settings;
  try {
    settings = JSON.parse(source);
  } catch (error) {
    throw new TypeError(`Invalid build settings JSON: ${error.message}`);
  }
  const policy = settings?.paginationPolicy;
  if (settings?.schemaVersion !== 1
      || typeof settings.generatedAt !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(settings.generatedAt)
      || policy == null || Array.isArray(policy) || typeof policy !== 'object'
      || !['minimumPageSize', 'maximumPageSize', 'defaultPageSize'].every(
        (field) => Number.isSafeInteger(policy[field])
      )
      || policy.minimumPageSize < 1 || policy.maximumPageSize > 100
      || policy.minimumPageSize > policy.defaultPageSize
      || policy.defaultPageSize > policy.maximumPageSize) {
    throw new TypeError('Unsupported build settings schema');
  }
  return Object.freeze({ ...settings, paginationPolicy: Object.freeze({ ...policy }) });
}
