import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const page = new URL('../src/version.njk', import.meta.url);
const client = new URL('../src/assets/version.js', import.meta.url);
const layout = new URL('../src/_includes/layouts/base.njk', import.meta.url);

test('publication owns its version page and binds API access to its site identity', async () => {
  const [markup, behavior, base] = await Promise.all([
    readFile(page, 'utf8'),
    readFile(client, 'utf8'),
    readFile(layout, 'utf8')
  ]);

  assert.match(markup, /permalink: \/s\/version\/index\.html/);
  assert.match(markup, /data-site-id="{{ site\.site\.id/);
  assert.match(markup, /data-repository="{{ site\.site\.repository/);
  assert.match(markup, /data-publication-commit="{{ buildIdentity\.commit/);
  assert.match(behavior, /\/v1\/version\?siteId=/);
  assert.match(behavior, /registry\.npmjs\.org/);
  assert.match(behavior, /app\.gala67\.com\/version\.json/);
  assert.doesNotMatch(behavior, /github\.com\/rathnasgala\/(?:app|api)/);
  for (const repository of ['cli', 'site-template', 'publish']) {
    assert.match(behavior, new RegExp(`github\\.com/rathnasgala/${repository}`));
  }
  assert.match(behavior, /Promise\.allSettled/);
  assert.match(behavior, /data-version-retry/);
  assert.match(base, /assets\/version\.js/);
  assert.match(await readFile(new URL('../eleventy.config.js', import.meta.url), 'utf8'),
    /versionUrl: `\$\{publicationPathPrefix\}\/s\/version\/`/);
});

test('version page exposes repository and exact publication commit without an App redirect', async () => {
  const markup = await readFile(page, 'utf8');
  assert.match(markup, /https:\/\/github\.com\/{{ site\.site\.repository/);
  assert.match(markup, /https:\/\/github\.com\/{{ site\.site\.repository[^\n]+\/commit\/{{ buildIdentity\.commit/);
  assert.doesNotMatch(markup, /app\.gala67\.com\/s\/version/);
});

test('runtime isolates source failures and refresh retries every live source', async () => {
  const builtAt = '2026-08-29T00:00:00Z';
  const expectedBuiltAt = `Built ${new Date(builtAt).toLocaleString()}`;
  class Element {
    constructor() {
      this.dataset = {};
      this.children = [];
      this.attributes = new Map();
      this.listeners = new Map();
      this.textContent = '';
    }
    append(child) { this.children.push(child); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes.set(name, value); }
    removeAttribute(name) { this.attributes.delete(name); }
    addEventListener(name, listener) { this.listeners.set(name, listener); }
  }
  const pageElement = new Element();
  pageElement.dataset.apiBaseUrl = 'https://api.gala67.com';
  pageElement.dataset.siteId = '01K00000000000000000000010';
  const cards = new Map([
    'app', 'api', 'cli', 'theme', 'content-validation'
  ].map((id) => [id, new Element()]));
  const retry = new Element();
  pageElement.querySelector = (selector) => selector === '[data-version-retry]'
    ? retry
    : cards.get(selector.match(/"([^"]+)"/)?.[1]);
  pageElement.querySelectorAll = () => [...cards.values()];
  let failApi = true;
  const calls = [];
  const fetch = async (url) => {
    calls.push(url);
    if (url.includes('/v1/version') && failApi) return { ok: false, status: 503 };
    return {
      ok: true,
      json: async () => url.includes('registry.npmjs.org')
        ? { version: '1.2.3', gitHead: 'b'.repeat(40) }
        : { commit: 'a'.repeat(40), builtAt }
    };
  };
  const document = {
    querySelector: () => pageElement,
    createElement: () => new Element()
  };

  vm.runInNewContext(await readFile(client, 'utf8'), {
    document, fetch, HTMLElement: Element, encodeURIComponent, Promise, Object, Error, Date
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(cards.get('api').children[1].textContent, /unavailable/);
  assert.equal(cards.get('app').children.length, 2);
  assert.equal(cards.get('app').children[1].textContent, expectedBuiltAt);
  assert.equal(calls.length, 5);

  for (const [id, repository] of [
    ['cli', 'https://github.com/rathnasgala/cli'],
    ['theme', 'https://github.com/rathnasgala/site-template'],
    ['content-validation', 'https://github.com/rathnasgala/publish'],
  ]) {
    const card = cards.get(id);
    assert.equal(card.children[2].href, repository);
    assert.equal(card.children[3].href, `${repository}/commit/${'b'.repeat(40)}`);
  }

  failApi = false;
  retry.listeners.get('click')();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(cards.get('api').children.length, 2);
  assert.equal(cards.get('api').children[1].textContent, expectedBuiltAt);
  assert.equal(calls.length, 10);
});
