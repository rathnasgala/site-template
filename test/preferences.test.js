import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../src/assets/preferences.js', import.meta.url), 'utf8');

function harness(stored = null, {
  currentLanguage = null,
  applyOnLoad = false,
  controlCount = 1,
  storageThrows = false
} = {}) {
  const values = new Map(stored == null ? [] : [['gala-language-preference', stored]]);
  const listenerSets = [];
  const controls = Array.from({ length: controlCount }, () => {
    const listeners = {};
    listenerSets.push(listeners);
    return {
      options: [
        { value: 'en', dataset: { url: 'https://example.com/en/post/' } },
        { value: 'fr', dataset: { url: 'https://example.com/fr/post/' } }
      ],
      value: 'en',
      dataset: currentLanguage == null ? {} : { currentLanguage },
      addEventListener(type, listener) { listeners[type] = listener; },
      hasAttribute(name) {
        return name === 'data-navigate-on-selection'
          || (applyOnLoad && name === 'data-apply-on-load');
      }
    };
  });
  const navigations = [];
  let ready;
  const context = {
    document: {
      addEventListener(_type, listener) { ready = listener; },
      querySelectorAll() { return controls; }
    },
    localStorage: {
      getItem(key) {
        if (storageThrows) throw new Error('unavailable');
        return values.get(key) ?? null;
      },
      setItem(key, value) {
        if (storageThrows) throw new Error('unavailable');
        values.set(key, value);
      }
    },
    window: { location: { assign(url) { navigations.push(url); } } }
  };
  vm.runInNewContext(source, context);
  ready();
  return {
    control: controls[0],
    controls,
    listeners: listenerSets[0],
    navigations,
    values
  };
}

test('an explicit language page reflects its language without an automatic redirect', () => {
  const result = harness('fr', { currentLanguage: 'en' });
  assert.equal(result.control.value, 'en');
  assert.deepEqual(result.navigations, []);
});

test('the publication root applies a stored language preference', () => {
  const result = harness('fr', { applyOnLoad: true });
  assert.equal(result.control.value, 'fr');
  assert.deepEqual(result.navigations, ['https://example.com/fr/post/']);
});

test('explicit switcher selection stores preference and performs user-initiated navigation', () => {
  const result = harness('en');
  result.control.value = 'fr';
  result.listeners.change();
  assert.equal(result.values.get('gala-language-preference'), 'fr');
  assert.deepEqual(result.navigations, ['https://example.com/fr/post/']);
});

test('changing either language control keeps the other control synchronized', () => {
  const result = harness('en', { controlCount: 2 });
  result.control.value = 'fr';
  result.listeners.change();
  assert.equal(result.controls[1].value, 'fr');
});

test('settings selection still navigates when preference storage is unavailable', () => {
  const result = harness(null, { storageThrows: true });
  result.control.value = 'fr';
  assert.doesNotThrow(() => result.listeners.change());
  assert.deepEqual(result.navigations, ['https://example.com/fr/post/']);
});
