import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { DEFAULT_BUILD_SETTINGS, readBuildSettings } from '../lib/build-settings.js';

test('local builds without a platform snapshot use the documented bootstrap policy', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'gala-build-settings-'));
  assert.strictEqual(await readBuildSettings(path.join(root, 'missing.json')), DEFAULT_BUILD_SETTINGS);
});

test('reads signed-build artifacts at Java Instant precision and rejects invalid policy order', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'gala-build-settings-'));
  const file = path.join(root, 'settings.json');
  for (const generatedAt of [
    '2026-08-30T20:00:00.1Z',
    '2026-08-30T20:00:00.123Z',
    '2026-08-30T20:00:00.123456Z',
    '2026-08-30T20:00:00.123456789Z'
  ]) {
    await writeFile(file, JSON.stringify({
      schemaVersion: 1,
      generatedAt,
      paginationPolicy: { minimumPageSize: 12, maximumPageSize: 100, defaultPageSize: 24 },
      contributorCredits: {
        'one-post': { authors: ['Author One', 'Author Two'], editors: ['Editor One'] }
      }
    }));
    assert.equal((await readBuildSettings(file)).generatedAt, generatedAt);
  }

  await writeFile(file, JSON.stringify({
    schemaVersion: 1,
    generatedAt: '2026-08-30T20:00:00Z',
    paginationPolicy: { minimumPageSize: 30, maximumPageSize: 20, defaultPageSize: 24 },
    contributorCredits: {}
  }));
  await assert.rejects(() => readBuildSettings(file), /Unsupported build settings schema/);

  await writeFile(file, JSON.stringify({
    schemaVersion: 1,
    generatedAt: 'not-a-time',
    paginationPolicy: { minimumPageSize: 12, maximumPageSize: 100, defaultPageSize: 24 },
    contributorCredits: {}
  }));
  await assert.rejects(() => readBuildSettings(file), /Unsupported build settings schema/);

  await writeFile(file, JSON.stringify({
    schemaVersion: 1,
    generatedAt: '2026-08-30T20:00:00.1234567890Z',
    paginationPolicy: { minimumPageSize: 12, maximumPageSize: 100, defaultPageSize: 24 },
    contributorCredits: {}
  }));
  await assert.rejects(() => readBuildSettings(file), /Unsupported build settings schema/);
});
