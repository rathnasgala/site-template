/**
 * A writer picks one colour; this makes it work in both modes.
 *
 * Offering a handful of named presets was not picking a colour, and an unconstrained colour picker
 * is worse: most colours a person likes fail contrast against one ground or the other, and a
 * writer cannot see that until the site is deployed. So the seed is treated as a *hue* the writer
 * chose, and the lightness is moved - as little as possible - until the result is readable on the
 * background it will actually sit on.
 *
 * The maths is OKLab, so a hue keeps its identity while its lightness changes. Doing this in sRGB
 * shifts the colour itself, and a writer who picked a warm red gets back a different red.
 */

const LIGHT_GROUND = '#fdfcfb';
const DARK_GROUND = '#131211';
/** WCAG AA for body-sized text, which is what a link is. */
const REQUIRED = 4.5;

export function parseHex(value) {
  if (typeof value !== 'string') return null;
  const hex = value.trim().replace(/^#/, '');
  const full = hex.length === 3 ? [...hex].map((digit) => digit + digit).join('') : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  return [0, 2, 4].map((offset) => Number.parseInt(full.slice(offset, offset + 2), 16));
}

const toLinear = (channel) => {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
};

const toSrgb = (value) => {
  const channel = value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
  return Math.min(255, Math.max(0, Math.round(channel * 255)));
};

export function relativeLuminance([red, green, blue]) {
  return 0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue);
}

export function contrast(a, b) {
  const [high, low] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

function rgbToOklab([red, green, blue]) {
  const [r, g, b] = [red, green, blue].map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

function oklabToRgb([lightness, a, b]) {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ].map(toSrgb);
}

const hex = ([red, green, blue]) =>
  `#${[red, green, blue].map((c) => c.toString(16).padStart(2, '0')).join('')}`;

/**
 * The writer's colour, moved along its own lightness until it is readable on `ground`.
 *
 * Searched from the seed outwards in both directions so the answer is the nearest readable
 * version of what they chose, rather than always darker or always lighter.
 */
function readableOn(seed, ground) {
  const groundRgb = parseHex(ground);
  if (contrast(seed, groundRgb) >= REQUIRED) return hex(seed);

  const [lightness, a, b] = rgbToOklab(seed);
  let nearest = null;
  for (let step = 0.01; step <= 1; step += 0.01) {
    for (const direction of [-1, 1]) {
      const candidate = lightness + direction * step;
      if (candidate < 0 || candidate > 1) continue;
      const rgb = oklabToRgb([candidate, a, b]);
      if (contrast(rgb, groundRgb) >= REQUIRED) { nearest = rgb; break; }
    }
    if (nearest) break;
  }
  // Only reachable for a ground no colour can meet, which neither of ours is.
  return hex(nearest ?? seed);
}

/**
 * The two values the page needs: one readable on the light ground, one on the dark.
 * Returns null for anything that is not a colour, so the caller falls back to the look's own.
 */
export function accentPair(seed) {
  const rgb = parseHex(seed);
  if (!rgb) return null;
  return { light: readableOn(rgb, LIGHT_GROUND), dark: readableOn(rgb, DARK_GROUND) };
}
