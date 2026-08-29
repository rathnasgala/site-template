import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesBelow(file) : entry.isFile() ? [file] : [];
  }));
  return nested.flat();
}

async function totalBytes(files) {
  return (await Promise.all(files.map(async (file) => (await stat(file)).size)))
    .reduce((total, size) => total + size, 0);
}

function assertWithin(actual, maximum, label) {
  if (actual > maximum) {
    throw new Error(`${label} performance budget exceeded: ${actual} bytes > ${maximum} bytes`);
  }
}

export async function enforcePerformanceBudgets({ outputDirectory, budgets }) {
  const output = path.resolve(outputDirectory);
  const files = await filesBelow(output);
  /*
   * Everything under `assets`, nested included. This used to compare `path.dirname` against the
   * assets directory exactly, so anything in a subdirectory was invisible to the budget - the
   * moment the reader runtime moved into `assets/vendor` it would have stopped being counted, and
   * a budget that quietly ignores two thirds of the JavaScript it is meant to guard is worse than
   * having none.
   */
  const assets = path.join(output, 'assets');
  const managedAssets = files.filter(
    (file) => file === assets || file.startsWith(assets + path.sep));
  const javascriptBytes = await totalBytes(managedAssets.filter((file) => file.endsWith('.js')));
  const cssBytes = await totalBytes(managedAssets.filter((file) => file.endsWith('.css')));
  assertWithin(javascriptBytes, budgets.managedJavaScriptBytes, 'Managed JavaScript');
  assertWithin(cssBytes, budgets.managedCssBytes, 'Managed CSS');

  for (const file of files.filter((candidate) => candidate.endsWith('.html'))) {
    const bytes = (await stat(file)).size;
    assertWithin(bytes, budgets.ordinaryHtmlBytes, path.relative(output, file));
  }

  return Object.freeze({ javascriptBytes, cssBytes });
}
