import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('newsletter signup is origin-bound progressive enhancement with double-opt-in wording', async () => {
  const [layout, behavior, styles, entry] = await Promise.all([
    readFile(new URL('src/_includes/layouts/base.njk', root), 'utf8'),
    readFile(new URL('src/assets/newsletter.js', root), 'utf8'),
    readFile(new URL('src/styles/theme.css', root), 'utf8'),
    readFile(new URL('src/client/reader.js', root), 'utf8')
  ]);

  assert.match(layout, /data-gala-newsletter[^>]+data-site-id=/s);
  assert.match(layout, /data-api-base-url=/);
  assert.match(layout, /data-language=/);
  assert.match(layout, /data-gala-newsletter[\s\S]+hidden>/);
  assert.match(layout, /type="email"[^>]+autocomplete="email"[^>]+required[^>]+maxlength="320"/);
  assert.match(layout, /One confirmation email/);
  assert.match(behavior, /result\?\.enabled !== true/);
  assert.match(behavior, /newsletter\.hidden = false/);
  assert.match(behavior, /email\.reportValidity\(\)/);
  assert.match(behavior, /credentials: 'omit'/);
  assert.match(behavior, /Content-Type': 'application\/json'/);
  assert.match(behavior, /JSON\.stringify\(\{ email: email\.value, language \}\)/);
  assert.doesNotMatch(behavior, /innerHTML|insertAdjacentHTML/);
  assert.match(entry, /assets\/newsletter\.js/);
  assert.match(styles, /\.gala-newsletter\[hidden\] \{ display: none; \}/);
});
