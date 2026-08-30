import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const interactions = await readFile(new URL('../src/assets/interactions.js', import.meta.url), 'utf8');
const layout = await readFile(new URL('../src/_includes/layouts/base.njk', import.meta.url), 'utf8');

test('reader identity uses FedCM without popup or publication-visible bearer storage', () => {
  assert.match(layout, /allow="identity-credentials-get"/);
  assert.match(interactions, /navigator\.credentials\.get/);
  assert.match(interactions, /configURL:\s*['"]https:\/\/api\.gala67\.com\/v1\/fedcm\/config\.json/);
  assert.match(interactions, /clientId:\s*sessionSiteId/);
  assert.match(interactions, /fields:\s*\['name',\s*'email'\]/);
  assert.match(interactions, /params:\s*\{\s*nonce:\s*sessionFrameToken\s*\}/);
  assert.match(interactions, /if\s*\(mode\s*===\s*['"]active['"]\)\s*identity\.mode\s*=\s*['"]active['"]/);
  assert.doesNotMatch(interactions, /provider\.mode\s*=/);
  assert.match(interactions, /type:\s*['"]gala-session-transfer['"]/);
  assert.doesNotMatch(interactions, /window\.open|\/v1\/widget\/session\/sign-in/);
  assert.doesNotMatch(interactions, /gala-reader-session|Authorization|Bearer/);
  assert.match(interactions, /gala\.reader\.resume\.\$\{sessionSiteId\}/);
  assert.match(interactions, /type:\s*['"]gala-session-resume['"]/);
  assert.doesNotMatch(interactions, /localStorage\.setItem\([^,]+,\s*session/);
  assert.doesNotMatch(layout, /data-user-control[^>]+disabled/);
  assert.match(interactions, /if \(accountControl && !sessionUser && sessionFrameToken\) \{\s*fedCmSession\(['"]active['"]\);\s*return;/);
  assert.match(interactions, /setAttribute\(['"]data-fedcm-ready['"], ['"]true['"]\)/);
  assert.match(interactions, /document\.cookie = ['"]gala-fedcm-grant=1; Max-Age=31536000; Path=\/; SameSite=Strict; Secure['"]/);
  assert.match(interactions, /if \(!sessionUser && sessionFrameToken && hasFedCmGrant\(\)\) fedCmSession\(['"]passive['"]\)/);
  assert.match(interactions, /navigator\.credentials\?\.preventSilentAccess/);
});

test('the reader waits for the API frame load before posting and restores an opaque session handle', () => {
  assert.match(interactions, /sessionFrame\.addEventListener\(['"]load['"], requestSessionState\)/);
  assert.doesNotMatch(interactions, /sessionFrame\.addEventListener\(['"]load['"], requestSessionState\);\s*requestSessionState\(\)/);
  assert.match(interactions, /localStorage\.getItem\(resumeStorageKey\)/);
  assert.match(interactions, /localStorage\.setItem\(resumeStorageKey, code\)/);
  assert.match(interactions, /event\.data\.resumeRejected === true/);
});

test('an explicit sign-in cancels passive discovery and sends Chrome the active-mode request shape', async () => {
  const functionStart = interactions.indexOf('async function fedCmSession(mode)');
  const functionEnd = interactions.indexOf('\nfunction requestSession(intent)', functionStart);
  assert.notEqual(functionStart, -1);
  assert.notEqual(functionEnd, -1);

  const calls = [];
  const context = {
    AbortController,
    URL,
    console,
    document: { querySelector() { return null; } },
    globalThis: { IdentityCredential: class IdentityCredential {} },
    navigator: {
      credentials: {
        get(options) {
          calls.push(options);
          if (calls.length === 1) {
            return new Promise((resolve, reject) => options.signal.addEventListener(
              'abort', () => reject(new DOMException('cancelled', 'AbortError')), { once: true }
            ));
          }
          assert.equal(calls[0].signal.aborted, true);
          return Promise.resolve({ token: 'opaque-transfer' });
        }
      }
    },
    sessionFrame: { src: 'https://api.gala67.com/v1/widget/session?siteId=01K00000000000000000000010' },
    sessionSiteId: '01K00000000000000000000010',
    sessionFrameToken: 'a'.repeat(43),
    pendingSessionTransferCode: null,
    deliverSessionTransfer() {},
    rememberFedCmGrant() {},
    fedCmController: null
  };
  vm.createContext(context);
  vm.runInContext(`${interactions.slice(functionStart, functionEnd)}; this.fedCmSession = fedCmSession;`, context);

  const passive = context.fedCmSession('passive');
  const duplicatePassive = context.fedCmSession('passive');
  assert.equal(await duplicatePassive, false);
  assert.equal(calls.length, 1);
  const active = context.fedCmSession('active');
  assert.equal(await passive, false);
  assert.equal(await active, true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].identity.mode, undefined);
  assert.equal(calls[0].mediation, 'silent');
  assert.equal(calls[1].identity.mode, 'active');
  assert.equal(calls[1].identity.providers[0].mode, undefined);
  assert.deepEqual(
    Array.from(calls[1].identity.providers[0].fields),
    ['name', 'email'],
  );
  assert.equal(calls[1].mediation, 'required');
});

test('only a previously granted publication requests passive identity and an explicit click requests active identity', () => {
  assert.match(interactions, /mediation:\s*mode\s*===\s*['"]active['"]\s*\?\s*['"]required['"]\s*:\s*['"]silent['"]/);
  assert.match(interactions, /fedCmSession\(['"]active['"]\)/);
  assert.match(interactions, /fedCmSession\(['"]passive['"]\)/);
  assert.match(interactions, /FedCM is not available in this browser/);
});

test('a first-visit silent miss is expected, while an active FedCM failure is observable', async () => {
  const functionStart = interactions.indexOf('async function fedCmSession(mode)');
  const functionEnd = interactions.indexOf('\nfunction requestSession(intent)', functionStart);
  const errors = [];
  const context = {
    AbortController,
    URL,
    console: { error(...values) { errors.push(values); } },
    document: { querySelector() { return null; } },
    globalThis: { IdentityCredential: class IdentityCredential {} },
    navigator: { credentials: { get() { return Promise.reject(new Error('no grant')); } } },
    sessionFrame: { src: 'https://api.gala67.com/v1/widget/session?siteId=01K00000000000000000000010' },
    sessionFrameToken: 'a'.repeat(43),
    pendingSessionTransferCode: null,
    deliverSessionTransfer() {},
    rememberFedCmGrant() {},
    fedCmController: null
  };
  vm.createContext(context);
  vm.runInContext(`${interactions.slice(functionStart, functionEnd)}; this.fedCmSession = fedCmSession;`, context);

  assert.equal(await context.fedCmSession('passive'), false);
  assert.equal(errors.length, 0);
  assert.equal(await context.fedCmSession('active'), false);
  assert.equal(errors.length, 1);
  assert.equal(errors[0][0], 'Gala FedCM sign-in failed.');
});

test('an unavailable, cancelled, or failed active sign-in does not strand the interrupted action', () => {
  assert.match(interactions, /return false;/);
  assert.match(interactions, /return true;/);
  assert.match(interactions, /fedCmSession\(['"]active['"]\)\.then\(\(started\) => \{/);
  assert.match(interactions, /if \(!started\) pendingIntent = null;/);
});
