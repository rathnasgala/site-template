#!/usr/bin/env node
/**
 * Copies the reader-side runtime into `src/assets/vendor`, as files the publication owns.
 *
 * Nothing is fetched at page load: a Gala site is self-contained and outlives Gala, so a CDN
 * `<script src>` on a writer's domain is not an option - it would take their site down with
 * somebody else's bad hour, and an auto-updating third-party script can never carry a subresource
 * hash. These copies are committed, listed in `.gala/managed-files.json`, and verified against
 * that manifest before the self-updater will replace them.
 *
 * The published builds import bare specifiers (`preact`, `preact/hooks`), which a browser cannot
 * resolve without an import map. Rewriting them to relative paths here keeps the loading story to
 * plain ES modules with no extra machinery on the page.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(new URL('.', import.meta.url)));
const out = path.join(root, 'src', 'assets', 'vendor');

const SOURCES = [
  ['preact/dist/preact.module.js', 'preact.js'],
  ['preact/hooks/dist/hooks.module.js', 'hooks.js'],
  ['@preact/signals-core/dist/signals-core.mjs', 'signals-core.js'],
  ['@preact/signals/dist/signals.mjs', 'signals.js'],
  ['htm/dist/htm.module.js', 'htm.js'],
];

const REWRITES = [
  [/from\s*"@preact\/signals-core"/g, 'from"./signals-core.js"'],
  [/from\s*"preact\/hooks"/g, 'from"./hooks.js"'],
  [/from\s*"preact"/g, 'from"./preact.js"'],
];

await mkdir(out, { recursive: true });
let total = 0;
for (const [from, to] of SOURCES) {
  let code = await readFile(path.join(root, 'node_modules', from), 'utf8');
  for (const [pattern, replacement] of REWRITES) code = code.replace(pattern, replacement);
  if (/from\s*"[^.]/.test(code)) throw new Error(`${to} still imports a bare specifier`);
  // Source maps are not shipped: they point at files no publication has.
  code = code.replace(/\n?\/\/# sourceMappingURL=.*$/m, '') + '\n';
  await writeFile(path.join(out, to), code);
  total += Buffer.byteLength(code);
  process.stdout.write(`${to.padEnd(20)} ${Buffer.byteLength(code)} bytes\n`);
}
process.stdout.write(`total ${total} bytes\n`);
