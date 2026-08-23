#!/usr/bin/env node

import { build } from 'esbuild';

await build({
  entryPoints: ['src/client/reader.js'],
  outfile: 'src/assets/reader.js',
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: ['es2022'],
  legalComments: 'none',
  sourcemap: false,
});

await build({
  entryPoints: ['src/styles/theme.css'],
  outfile: 'src/assets/theme.css',
  bundle: true,
  minify: true,
  legalComments: 'none',
  external: ['../assets/*.svg'],
});
