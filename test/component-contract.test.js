import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const components = new URL('../src/_includes/components/ui.njk', import.meta.url);
const css = new URL('../src/assets/theme.css', import.meta.url);
const layout = new URL('../src/_includes/layouts/base.njk', import.meta.url);
const interactions = new URL('../src/assets/interactions.js', import.meta.url);

test('provides every required component and supporting control', async () => {
  const source = await readFile(components, 'utf8');
  for (const macro of [
    'button', 'badge', 'tagChip', 'sectionHeading', 'hero', 'pageContent',
    'authorProfile', 'cardIndex', 'statsGraph', 'loading', 'pagination',
    'search', 'tableOfContents', 'shareControl', 'pageFooter'
  ]) {
    assert.match(source, new RegExp(`macro ${macro}\\(`));
  }
});

test('shared header uses accessible icons and opens search and settings without document navigation', async () => {
  const source = await readFile(layout, 'utf8');
  const behavior = await readFile(interactions, 'utf8');
  assert.match(source, /href="{{ '\/' \| url }}" aria-label="Home"/);
  for (const label of ['Appearance', 'Settings', 'Search', 'Account']) {
    assert.match(source, new RegExp(`(?:aria-label|title)="${label}`));
  }
  assert.match(source, /<dialog id="gala-settings-dialog"/);
  assert.match(source, /<dialog id="gala-search-dialog"/);
  assert.match(source, /<dialog id="gala-account-dialog"/);
  assert.match(source, /data-gala-session-frame/);
  assert.match(behavior, /dialog\.showModal\(\)/);
  assert.match(behavior, /event\.origin !== sessionOrigin/);
  assert.match(behavior, /event\.source !== sessionFrame\.contentWindow/);
  // One settings surface. A modal *and* a page for the same two controls was two things to keep
  // correct and two places for them to disagree.
  assert.doesNotMatch(source, /Open settings page/);
  // And one control per setting: the nav's own toggle, not a second copy inside the modal.
  assert.equal((source.match(/data-theme-mode-toggle/g) ?? []).length, 1);
  assert.match(source, /href="{{ '\/search\/' \| url }}">Open search page/);
});

test('platform account frame delegates only the FedCM identity capability', async () => {
  const source = await readFile(new URL('../src/_includes/layouts/base.njk', import.meta.url), 'utf8');
  assert.match(source, /data-gala-session-frame[^>]+allow="identity-credentials-get"/);
});

test('contact form delegates authenticated writes without collecting identity fields', async () => {
  const [page, client] = await Promise.all([
    readFile(new URL('../src/contact.njk', import.meta.url), 'utf8'),
    readFile(new URL('../src/assets/interactions.js', import.meta.url), 'utf8')
  ]);
  assert.match(page, /data-contact-form/);
  assert.doesNotMatch(page, /name="(?:name|email)"/);
  assert.match(page, /name="subject"/);
  assert.match(page, /name="message"/);
  assert.match(client, /sendEngagementWrite\('contact\.submit'/);
  assert.match(client, /Sign in with the account button before sending/);
});

test('layout and palette configuration select real managed-theme variants', async () => {
  const markup = await readFile(layout, 'utf8');
  const styles = await readFile(css, 'utf8');
  assert.match(markup, /data-layout="{{ site\.design\.layout }}"/);
  // Defaulted, so a publication written before a key existed still renders a real look rather
  // than an empty attribute no rule answers to.
  assert.match(markup, /data-palette="{{ site\.design\.palette \| default\('default'\) }}"/);
  assert.match(markup, /data-theme="{{ site\.design\.theme \| default\('modern'\) }}"/);
  assert.match(styles, /:root\[data-theme='editorial'\]/);
  assert.match(styles, /:root\[data-theme='technical'\]/);
  assert.match(styles, /:root\[data-layout='portfolio'\]/);
  assert.match(styles, /:root\[data-palette='ocean'\]/);
  assert.match(styles, /\[data-layout='portfolio'\] \.gala-card-index/);
});

test('loading and graph surfaces reserve dimensions and transitions are progressive', async () => {
  const source = await readFile(css, 'utf8');
  assert.match(source, /--gala-widget-min-block-size:/);
  // Asserted against the rule, not against where the line breaks fall in it.
  assert.match(
    source.match(/\.gala-engagement \{[^}]+\}/)?.[0] ?? '',
    /min-block-size: var\(--gala-widget-min-block-size\)/,
  );
  assert.match(source, /\.gala-engagement__placeholder.*min-block-size: var\(--gala-widget-min-block-size\)/);
  assert.match(source, /\.gala-loading[^}]*min-block-size:/s);
  assert.match(source, /\.gala-stats-graph[^}]*min-block-size:/s);
  assert.match(source, /@view-transition\s*{\s*navigation: auto;/);
  assert.match(source, /prefers-reduced-motion: no-preference/);
});

test('embed facades reserve final dimensions and activate only from an explicit click', async () => {
  const styles = await readFile(css, 'utf8');
  const behavior = await readFile(interactions, 'utf8');
  const pages = await readFile(new URL('../src/posts.11ty.js', import.meta.url), 'utf8');
  assert.match(styles, /\.gala-embed--youtube[^}]*aspect-ratio:\s*16\s*\/\s*9/s);
  assert.match(styles, /\.gala-embed--codepen[^}]*min-block-size:\s*25rem/s);
  assert.match(styles, /\.gala-embed iframe[^}]*inline-size:\s*100%[^}]*block-size:\s*100%/s);
  assert.match(behavior, /closest\('\[data-gala-embed-load\]'\)/);
  assert.match(behavior, /document\.createElement\('iframe'\)/);
  assert.doesNotMatch(behavior, /querySelectorAll\('\[data-gala-embed-load\]'\).*createElement\('iframe'\)/s);
  assert.match(pages, /console\.warn\(`\$\{post\.source}: warning: \$\{warning}`\)/);
});

test('share control uses links and a selectable readonly fallback', async () => {
  const source = await readFile(components, 'utf8');
  assert.match(source, /data-copy-url/);
  assert.match(source, /readonly aria-label="Canonical URL"/);
  assert.match(source, /rel="noopener noreferrer"/);
  assert.doesNotMatch(source, /<script|<iframe/);
  const postLayout = await readFile(new URL('../src/_includes/layouts/post.njk', import.meta.url), 'utf8');
  assert.match(postLayout, /shareControl\(post\.canonicalUrl, shareTargets\)/);
});

/*
 * The chrome a reader actually notices. Each of these was reported from a live site, which is a
 * worse way to find them than a test.
 */
test('every page declares an icon, so no reader gets a 404 for one', async () => {
  const layout = await readFile(new URL('../src/_includes/layouts/base.njk', import.meta.url), 'utf8');
  assert.match(layout, /rel="icon"/);
  assert.match(layout, /assets\/favicon\.svg/);
});

test('the header stays with the reader on a long post', async () => {
  const css = await readFile(new URL('../src/assets/theme.css', import.meta.url), 'utf8');
  const header = css.match(/\.gala-site-header \{[^}]+\}/)?.[0] ?? '';
  assert.match(header, /position: sticky/);
  assert.match(header, /inset-block-start: 0/);
  // A transparent sticky bar lets the article scroll through it.
  assert.match(header, /background:/);
});

test('the article visibly ends before the conversation begins', async () => {
  const css = await readFile(new URL('../src/assets/theme.css', import.meta.url), 'utf8');
  const engagement = css.match(/\.gala-engagement \{[^}]+\}/)?.[0] ?? '';
  assert.match(engagement, /border-block-start/);
  assert.match(engagement, /margin-block-start/);
});
