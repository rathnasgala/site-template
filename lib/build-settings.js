import { readFile } from 'node:fs/promises';

export const DEFAULT_BUILD_SETTINGS = Object.freeze({
  schemaVersion: 1,
  generatedAt: null,
  paginationPolicy: Object.freeze({
    minimumPageSize: 12,
    maximumPageSize: 100,
    defaultPageSize: 24
  }),
  contributorCredits: Object.freeze({})
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
  // Rolling deploys can leave a build-scoped artifact written by the previous API version.
  // Absence means no verified credits; malformed supplied credits still fail closed.
  const contributorCredits = settings?.contributorCredits ?? {};
  if (settings?.schemaVersion !== 1
      || typeof settings.generatedAt !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/.test(settings.generatedAt)
      || policy == null || Array.isArray(policy) || typeof policy !== 'object'
      || !['minimumPageSize', 'maximumPageSize', 'defaultPageSize'].every(
        (field) => Number.isSafeInteger(policy[field])
      )
      || policy.minimumPageSize < 1 || policy.maximumPageSize > 100
      || policy.minimumPageSize > policy.defaultPageSize
      || policy.defaultPageSize > policy.maximumPageSize
      || !validContributorCredits(contributorCredits)) {
    throw new TypeError('Unsupported build settings schema');
  }
  return Object.freeze({
    ...settings,
    paginationPolicy: Object.freeze({ ...policy }),
    contributorCredits: Object.freeze(Object.fromEntries(Object.entries(contributorCredits)
      .map(([slug, credits]) => [slug, Object.freeze({
        authors: Object.freeze([...credits.authors]),
        editors: Object.freeze([...credits.editors])
      })])))
  });
}

function validContributorCredits(value) {
  if (value == null || Array.isArray(value) || typeof value !== 'object') return false;
  return Object.entries(value).every(([slug, credits]) =>
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
      && credits != null && !Array.isArray(credits) && typeof credits === 'object'
      && Object.keys(credits).sort().join(',') === 'authors,editors'
      && ['authors', 'editors'].every((field) => Array.isArray(credits[field])
        && credits[field].length <= 50
        && credits[field].every((name) => typeof name === 'string'
          && name.trim() !== '' && [...name].length <= 120)));
}
