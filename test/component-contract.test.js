import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const components = new URL('../src/_includes/components/ui.njk', import.meta.url);
const css = new URL('../src/styles/theme.css', import.meta.url);
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
  assert.doesNotMatch(source, />Open search page</);
  assert.match(source, /gala-dialog__header[^\n]+gala-settings-title[^\n]+gala-dialog__close/);
  assert.match(source, /gala-dialog__header[^\n]+gala-search-title[^\n]+gala-dialog__close/);
  assert.doesNotMatch(source, />Language preference</);
  assert.match(source, />Preferred language/);
  assert.match(behavior, /event\.target instanceof HTMLDialogElement/);
  assert.match(behavior, /event\.target\.close\(\)/);
});

test('platform account frame delegates only the FedCM identity capability', async () => {
  const source = await readFile(new URL('../src/_includes/layouts/base.njk', import.meta.url), 'utf8');
  assert.match(source, /data-gala-session-frame[^>]+allow="identity-credentials-get"/);
  // The frame is the only holder of the reader session and the only receiver for the one-time
  // sign-in transfer. Keeping it lazy inside a closed dialog leaves the normal reaction/comment
  // sign-in path with no loaded receiver.
  assert.match(source, /data-gala-session-frame[^>]+loading="eager"/);
  assert.doesNotMatch(source, /data-gala-session-frame[^>]+loading="lazy"/);
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
  assert.match(markup, /data-layout="{{ site\.design\.layout \| default\('article-first'\) }}"/);
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

test('loading, conversation status, and graph surfaces reserve dimensions and transitions are progressive', async () => {
  const source = await readFile(css, 'utf8');
  assert.match(source, /--gala-widget-min-block-size:/);
  assert.match(source, /\.gala-conversation__status[^}]*min-block-size:\s*1\.5em/s);
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

test('the single action rail exposes only the supported share controls and a fallback', async () => {
  const source = await readFile(components, 'utf8');
  assert.match(source, /data-copy-url/);
  assert.match(source, /readonly aria-label="Canonical URL"/);
  assert.match(source, /rel="noopener noreferrer"/);
  assert.match(source, /data-native-share/);
  for (const control of ['data-copy-url', 'data-native-share']) {
    assert.match(source, new RegExp(`${control}[^>]*>[\\s\\S]*?<svg`));
  }
  assert.doesNotMatch(source, /facebook|instagram|linkedin|x\.com|wa\.me/i);
  assert.doesNotMatch(source, /<script|<iframe/);
  assert.match(source, /gala-action-stats/);
  assert.match(source, /gala-action-group--reactions/);
  assert.match(source, /gala-action-group--utilities/);
  const postLayout = await readFile(new URL('../src/_includes/layouts/post.njk', import.meta.url), 'utf8');
  assert.match(postLayout, /actionRail\(post\.canonicalUrl, engagement\)/);
  assert.match(postLayout, /conversation\(engagement\)/);
  assert.match(postLayout, /gala-reading-layout/);
  assert.doesNotMatch(postLayout, /shareControl/);
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
  const css = await readFile(new URL('../src/styles/theme.css', import.meta.url), 'utf8');
  const header = css.match(/\.gala-site-header \{[^}]+\}/)?.[0] ?? '';
  assert.match(header, /position: sticky/);
  assert.match(header, /inset-block-start: 0/);
  assert.match(header, /box-sizing:\s*border-box/);
  assert.match(header, /inline-size:\s*100%/);
  // A transparent sticky bar lets the article scroll through it.
  assert.match(header, /background:/);
});

test('short pages keep the publication footer at the viewport bottom', async () => {
  const styles = await readFile(new URL('../src/styles/theme.css', import.meta.url), 'utf8');
  const body = styles.match(/body \{[^}]+\}/)?.[0] ?? '';
  assert.match(body, /box-sizing:\s*border-box/);
  assert.match(body, /display:\s*flex/);
  assert.match(body, /flex-direction:\s*column/);
  assert.match(body, /min-block-size:\s*100vh/);
  assert.match(styles, /main\s*\{[^}]*flex:\s*1\s+0\s+auto/s);
  assert.match(styles, /(?:^|\n)\.gala-page-footer\s*\{[^}]*box-sizing:\s*border-box[^}]*inline-size:\s*100%/s);
});

test('footer identifies the exact publication build through the publication version page', async () => {
  const source = await readFile(layout, 'utf8');
  assert.match(source, /buildIdentity\.versionUrl/);
  assert.match(source, /buildIdentity\.shortCommit/);
  assert.match(source, /aria-label="Publication build/);
  assert.doesNotMatch(source, /app\.gala67\.com\/s\/version/);
});

test('closed dialogs occupy no page layout and the responsive article uses one copy of each rail', async () => {
  const styles = await readFile(new URL('../src/styles/theme.css', import.meta.url), 'utf8');
  const componentsSource = await readFile(components, 'utf8');
  const postLayout = await readFile(new URL('../src/_includes/layouts/post.njk', import.meta.url), 'utf8');
  assert.match(styles, /\.gala-dialog:not\(\[open\]\)\s*\{\s*display:\s*none/);
  assert.match(styles, /grid-template-columns:\s*minmax\(10rem, 15rem\) minmax\(0, 1fr\) 8\.5rem/);
  assert.equal((postLayout.match(/tableOfContents\(/g) ?? []).length, 1);
  assert.equal((postLayout.match(/actionRail\(/g) ?? []).length, 1);
  assert.match(componentsSource, /href="#comments"/);
  assert.doesNotMatch(componentsSource, /[♥✦★☺◉✓]/);
});

test('long-form reading controls are compact, progressive, and measured from article content', async () => {
  const styles = await readFile(new URL('../src/styles/theme.css', import.meta.url), 'utf8');
  const componentsSource = await readFile(components, 'utf8');
  const postLayout = await readFile(new URL('../src/_includes/layouts/post.njk', import.meta.url), 'utf8');
  const behavior = await readFile(new URL('../src/assets/interactions.js', import.meta.url), 'utf8');

  assert.match(componentsSource, /<details class="gala-toc" open>/);
  assert.match(componentsSource, /<summary>On this page<\/summary>/);
  assert.match(postLayout, /class="gala-reading-progress"/);
  assert.match(postLayout, /data-reading-progress/);
  assert.match(postLayout, /{{ readingMinutes }} min read/);
  assert.match(behavior, /data-reading-progress/);
  assert.match(behavior, /readingProgress\.value = progress/);
  assert.doesNotMatch(behavior, /\.style\./);
  assert.match(behavior, /requestAnimationFrame/);
  assert.match(behavior, /new IntersectionObserver\(synchronizeActionRail/);
  assert.doesNotMatch(behavior, /follow\.textContent/);
  assert.match(styles, /\.gala-reading-progress/);
  assert.match(styles, /\.gala-markdown :where\(pre\)[^}]*overflow-x:\s*auto/s);
  assert.match(styles, /scroll-behavior:\s*smooth/);
  assert.match(styles, /scroll-margin-block-start:\s*7rem/);
  assert.match(componentsSource, /&lt;1K/);
  assert.match(behavior, /function publicCount\(value\)/);
  assert.match(styles, /\.gala-action-stats dd[^}]*font:\s*400 1\.2rem/s);
});

test('the article visibly ends before API-backed interactions and the author footer', async () => {
  const css = await readFile(new URL('../src/styles/theme.css', import.meta.url), 'utf8');
  const post = await readFile(new URL('../src/_includes/layouts/post.njk', import.meta.url), 'utf8');
  const base = await readFile(new URL('../src/_includes/layouts/base.njk', import.meta.url), 'utf8');
  assert.match(css, /\.gala-article-boundary[^}]*border-block-start:\s*\.25rem solid/s);
  assert.match(css, /\.gala-article-boundary\s*\{[^}]*width:\s*100%/s);
  assert.match(css, /@media \(min-width: 75rem\)[\s\S]*\.gala-article-boundary\s*\{[^}]*grid-column:\s*1 \/ -1/s);
  assert.match(post, /gala-article-boundary[^<]*<strong>Conversation<\/strong>/);
  assert.doesNotMatch(post, /gala-article-boundary[^<]*<strong>Conversation<\/strong><a/s);
  assert.match(base, /gala-page-footer__identity/);
  assert.match(base, /gala-page-footer__line/);
  assert.match(base, /gala-page-footer__bio/);
  assert.match(css, /\.gala-page-footer__line\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(4, max-content\)/s);
  assert.match(css, /@media \(max-width: 47\.99rem\)[\s\S]*\.gala-page-footer__line\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/s);
  assert.match(css, /@media \(max-width: 47\.99rem\)[\s\S]*\.gala-page-footer__line > \* \+ \*::before\s*\{[^}]*content:\s*none/s);
  assert.match(css, /\.gala-page-footer__identity p\s*\{[^}]*font-size:\s*var\(--gala-text-sm\)/s);
  for (const link of ['Powered by Gala', 'Terms', 'Privacy']) assert.match(base, new RegExp(`>${link}<`));
});

test('the docked action rail respects the intrinsic width of every control group', async () => {
  const css = await readFile(new URL('../src/styles/theme.css', import.meta.url), 'utf8');
  assert.match(css, /\.gala-action-rail--integrated\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 1px minmax\(0, 1fr\)/s);
  assert.match(css, /"reactions utility-separator utilities"[^}]*"stats stats stats"/s);
  assert.match(css, /\.gala-action-rail--integrated \.gala-action-stats\s*\{[^}]*grid-area:\s*stats/s);
  assert.match(css, /\.gala-action-rail--integrated \.gala-utility-actions\s*\{[^}]*repeat\(4, 2\.5rem\)/s);
  assert.match(css, /\.gala-action-rail--integrated \.gala-action-stats > div\s*\{[^}]*flex-direction:\s*row/s);
  assert.match(css, /\.gala-action-stats > div \+ div\s*\{[^}]*border-inline-start:\s*1px solid var\(--gala-color-hairline\)/s);
  assert.match(css, /\.gala-action-rail:not\(\.gala-action-rail--integrated\) \.gala-action-stats > div \+ div\s*\{[^}]*border-block-start:\s*1px solid var\(--gala-color-hairline\)/s);
  assert.doesNotMatch(css, /\.gala-engagement dl > div/);
});
