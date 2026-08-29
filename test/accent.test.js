import assert from 'node:assert/strict';
import test from 'node:test';

import { accentPair, contrast, parseHex } from '../lib/accent.js';

const LIGHT = parseHex('#fdfcfb');
const DARK = parseHex('#131211');

/*
 * A writer picks a colour they like. Most colours a person likes fail contrast against one ground
 * or the other, and they cannot see that until the site is deployed - so the colour is moved along
 * its own lightness until it is readable, rather than accepted and left unreadable, or refused.
 */
test('any colour a writer picks is readable in both modes', () => {
  const chosen = [
    '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff69b4', '#00bcd4',
    '#111111', '#eeeeee', '#8a4b2a', '#7f7f7f', '#fff', '#000',
  ];
  for (const seed of chosen) {
    const pair = accentPair(seed);
    assert.ok(pair, `${seed} should parse`);
    assert.ok(contrast(parseHex(pair.light), LIGHT) >= 4.5, `${seed} unreadable on the light ground`);
    assert.ok(contrast(parseHex(pair.dark), DARK) >= 4.5, `${seed} unreadable on the dark ground`);
  }
});

test('a colour that already works is left exactly as it was', () => {
  // #0000ff is 8.4:1 on the light ground; moving it would change a colour that was already fine.
  assert.equal(accentPair('#0000ff').light, '#0000ff');
  assert.equal(accentPair('#00bcd4').dark, '#00bcd4');
});

test('the hue survives the adjustment', () => {
  // A writer who picked a warm red must not get back a blue.
  const [red, green, blue] = parseHex(accentPair('#ff0000').light);
  assert.ok(red > green && red > blue, 'a red stayed red');
  const [r2, g2, b2] = parseHex(accentPair('#00bcd4').light);
  assert.ok(b2 > r2 && g2 > r2, 'a cyan stayed cyan');
});

test('anything that is not a colour leaves the look’s own accent in place', () => {
  for (const rubbish of [undefined, null, '', 'blue', '#12345', 'rgb(0,0,0)', 42, '#zzzzzz']) {
    assert.equal(accentPair(rubbish), null);
  }
});

test('three-digit hex is a colour too', () => {
  assert.deepEqual(accentPair('#f00'), accentPair('#ff0000'));
});
