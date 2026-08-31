const ENGLISH = Object.freeze({
  languageName: 'English',
  languageIndexTitle: 'English articles',
  published: 'Published',
  scheduledFor: 'Scheduled for',
  minuteRead: 'min read',
  availableLanguages: 'Available languages',
  pagination: 'Pagination',
  previous: 'Previous',
  page: 'Page',
  pageOf: 'of',
  next: 'Next',
  readerSettings: 'Reader settings',
  preferredLanguage: 'Preferred language',
  close: 'Close',
  closeSettings: 'Close settings'
});

const TAMIL = Object.freeze({
  languageName: 'தமிழ்',
  languageIndexTitle: 'தமிழ் கட்டுரைகள்',
  published: 'வெளியிடப்பட்டது',
  scheduledFor: 'வெளியிடத் திட்டமிடப்பட்டது',
  minuteRead: 'நிமிட வாசிப்பு',
  availableLanguages: 'கிடைக்கும் மொழிகள்',
  pagination: 'பக்க வழிசெலுத்தல்',
  previous: 'முந்தைய',
  page: 'பக்கம்',
  pageOf: '/',
  next: 'அடுத்த',
  readerSettings: 'வாசகர் அமைப்புகள்',
  preferredLanguage: 'விருப்ப மொழி',
  close: 'மூடு',
  closeSettings: 'வாசகர் அமைப்புகளை மூடு'
});

export function canonicalLanguage(value) {
  try {
    return Intl.getCanonicalLocales(String(value))[0];
  } catch {
    return 'en';
  }
}

export function languageName(value) {
  const language = canonicalLanguage(value);
  const labels = language.toLowerCase().split('-')[0] === 'ta' ? TAMIL : null;
  if (labels != null) return labels.languageName;
  if (language.toLowerCase().split('-')[0] === 'en') return ENGLISH.languageName;
  try {
    return new Intl.DisplayNames([language], { type: 'language' }).of(language) ?? language;
  } catch {
    return language;
  }
}

export function uiLabels(value) {
  const language = canonicalLanguage(value);
  const base = language.toLowerCase().split('-')[0];
  if (base === 'ta') return TAMIL;
  if (base === 'en') return ENGLISH;
  const name = languageName(language);
  return Object.freeze({
    ...ENGLISH,
    languageName: name,
    languageIndexTitle: `Articles in ${name}`
  });
}
