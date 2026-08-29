/**
 * Emits the CNAME file GitHub Pages needs to serve a custom domain.
 *
 * The published branch is force-pushed on every run, so anything not produced by the build is
 * gone the next time someone writes a post. Deriving it from the site configuration means the
 * custom domain is restated on every publish and cannot be lost, and there is exactly one place
 * that decides what the domain is.
 */
const PROVIDER_HOST = /\.github\.io$/;

/**
 * The host this repository may claim as its own, or null.
 *
 * A site served under a path is served that way because GitHub gives it the domain held by the
 * owner's main site - https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/about-custom-domains-and-github-pages
 * puts a project site at `www.octocat.com/octo-project`. GitHub reads this file from the
 * published branch and treats it as *this* repository's own domain, which overrides that
 * inheritance: the blog would move to the domain root and take the address away from the site
 * that owns it. So a path-prefixed site deliberately claims nothing.
 */
export function customDomainHost(canonicalBaseUrl, pathPrefix = '/') {
  if (pathPrefix !== '/') return null;
  if (typeof canonicalBaseUrl !== 'string' || canonicalBaseUrl === '') return null;
  let host;
  try {
    host = new URL(canonicalBaseUrl).host;
  } catch {
    return null;
  }
  // A provider-default site is served from the owner's github.io origin and must not claim a
  // custom domain, or GitHub would reject a domain it cannot verify.
  return PROVIDER_HOST.test(host) ? null : host;
}

function claimed(site) {
  return customDomainHost(site?.hosting?.canonicalBaseUrl, site?.hosting?.pathPrefix ?? '/');
}

export default class CustomDomain {
  data() {
    return {
      permalink: ({ site }) => claimed(site) ? '/CNAME' : false,
      // GitHub Pages requires this exact extensionless name, so Eleventy's guard against
      // extensionless output does not apply here.
      eleventyAllowMissingExtension: true,
      eleventyExcludeFromCollections: true
    };
  }

  render({ site }) {
    return `${claimed(site)}\n`;
  }
}
