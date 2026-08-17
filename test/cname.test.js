import assert from 'node:assert/strict';
import test from 'node:test';
import CustomDomain, { customDomainHost } from '../src/cname.11ty.js';

test('a provider-default site claims no custom domain', () => {
  assert.equal(customDomainHost('https://writer.github.io'), null);
  assert.equal(customDomainHost('https://Writer.GitHub.io'.toLowerCase()), null);
  assert.equal(customDomainHost(undefined), null);
  assert.equal(customDomainHost('not a url'), null);
});

test('a custom domain is emitted exactly as GitHub Pages expects', () => {
  assert.equal(customDomainHost('https://blog.example.com'), 'blog.example.com');
  assert.equal(customDomainHost('https://example.com'), 'example.com');
});

test('a site served under a path claims nothing, because the domain is not its own', () => {
  // GitHub serves example.com/blog by lending this repository the domain held by the owner's
  // main site. Writing the file here would override that, move the site to the domain root and
  // take the address away from the site that owns it.
  assert.equal(customDomainHost('https://example.com', '/blog'), null);
  assert.equal(customDomainHost('https://writer.github.io', '/blog'), null);
});

test('the file is written only for a custom domain, and never for the provider origin', () => {
  const page = new CustomDomain();
  const { permalink } = page.data();
  const hosting = (canonicalBaseUrl, pathPrefix = '/') => ({ site: { hosting: { canonicalBaseUrl, pathPrefix } } });
  assert.equal(permalink(hosting('https://writer.github.io', '/my-site')), false);
  assert.equal(permalink(hosting('https://example.com', '/blog')), false);
  assert.equal(permalink(hosting('https://blog.example.com')), '/CNAME');
  // The published branch is force-pushed every run, so the build has to restate it each time.
  assert.equal(page.render(hosting('https://blog.example.com')), 'blog.example.com\n');
});
