import assert from 'node:assert/strict';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { stageThemePackage } from '../scripts/stage-theme-package.js';

test('stages a public no-scripts theme artifact with managed site bytes under payload', async () => {
  const output = await mkdtemp(path.join(tmpdir(), 'gala-theme-stage-'));
  const sourceCommit = 'a'.repeat(40);
  const staged = await stageThemePackage(output, { sourceCommit });
  const packageJson = JSON.parse(await readFile(path.join(output, 'package.json'), 'utf8'));
  const manifest = JSON.parse(await readFile(path.join(output, 'payload', '.gala', 'managed-files.json'), 'utf8'));

  assert.equal(staged.name, '@rathnasgala/theme');
  assert.equal(packageJson.name, '@rathnasgala/theme');
  assert.equal(packageJson.version, manifest.themePackage.version);
  assert.equal(packageJson.engines.node, '>=20');
  assert.deepEqual(packageJson.repository, {
    type: 'git', url: 'git+https://github.com/rathnasgala/site-template.git'
  });
  assert.deepEqual(packageJson.gala, { sourceCommit });
  assert.equal(Object.hasOwn(packageJson, 'scripts'), false);
  assert.deepEqual(packageJson.files, ['payload']);
  const readme = await readFile(path.join(output, 'README.md'), 'utf8');
  assert.match(readme, /@rathnasgala\/theme/);
  assert.match(readme, /https:\/\/gala67\.com/);
  assert.match(readme, /npx --yes @rathnasgala\/cli@latest init field-notes/);
  assert.equal(manifest.artifactSources['.gitignore'], '.gala/artifact-files/gitignore');
  assert.equal(await readFile(path.join(output, 'payload', '.gala', 'artifact-files', 'gitignore'), 'utf8'),
    await readFile(path.resolve('.gitignore'), 'utf8'));
  const payloadPackage = JSON.parse(await readFile(path.join(output, 'payload', 'package.json'), 'utf8'));
  assert.equal(payloadPackage.private, true);
  assert.equal(Object.hasOwn(payloadPackage.scripts, 'stage:theme'), false);
  assert.equal(Object.hasOwn(payloadPackage.scripts, 'lint:theme-release'), false);
});

test('rejects release metadata that cannot identify a Git commit', async () => {
  const output = await mkdtemp(path.join(tmpdir(), 'gala-theme-stage-invalid-'));
  await assert.rejects(stageThemePackage(output, { sourceCommit: 'main' }),
    /Theme source commit must be a full lowercase Git SHA/);
});
