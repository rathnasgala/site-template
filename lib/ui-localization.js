import {
  SUPPORTED_UI_LANGUAGES,
  UI_LOCALES,
  WEB_CONTENT_TOP_50
} from './ui-locales.js';

export { SUPPORTED_UI_LANGUAGES, WEB_CONTENT_TOP_50 };

function canonicalLocale(value) {
  try {
    return Object.freeze({
      language: Intl.getCanonicalLocales(String(value))[0],
      valid: true
    });
  } catch {
    return Object.freeze({ language: 'en', valid: false });
  }
}

export function canonicalLanguage(value) {
  return canonicalLocale(value).language;
}

export function languageName(value) {
  const language = canonicalLanguage(value);
  try {
    return new Intl.DisplayNames([language], { type: 'language' }).of(language) ?? language;
  } catch {
    return language;
  }
}

export function resolvedUiLanguage(value) {
  const language = canonicalLanguage(value);
  const locale = new Intl.Locale(language);
  if (locale.language === 'zh') {
    const script = locale.script ?? locale.maximize().script;
    return script === 'Hant' ? 'zh-Hant' : 'zh-Hans';
  }
  if (locale.language === 'sr') {
    const script = locale.script ?? locale.maximize().script;
    return script === 'Latn' ? 'sr-Latn' : 'sr';
  }
  return Object.hasOwn(UI_LOCALES, locale.language) ? locale.language : 'en';
}

export function uiLabels(value) {
  const canonical = canonicalLocale(value);
  const resolved = resolvedUiLanguage(canonical.language);
  const base = new Intl.Locale(canonical.language).language;
  if (resolved !== 'en' || base === 'en' || !canonical.valid) return UI_LOCALES[resolved];
  const name = new Intl.DisplayNames(['en'], { type: 'language' }).of(canonical.language)
    ?? canonical.language;
  return Object.freeze({
    ...UI_LOCALES.en,
    languageIndexTitle: `Articles in ${name}`
  });
}

export function languageDirection(value) {
  const direction = new Intl.Locale(canonicalLanguage(value)).textInfo?.direction;
  return direction === 'rtl' ? 'rtl' : 'ltr';
}

export function formatUiMessage(template, first, second) {
  if (typeof template !== 'string') throw new TypeError('UI message must be a string');
  const values = Object.freeze({ count: first, current: first, total: second });
  return template.replace(/\{(count|current|total)\}/g, (placeholder, key) => {
    const value = values[key];
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new TypeError(`Invalid UI message value for ${key}`);
    }
    return String(value);
  });
}
