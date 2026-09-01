const MESSAGE_KEYS = Object.freeze([
  'languageIndexTitle',
  'published',
  'scheduledFor',
  'readingTime',
  'availableLanguages',
  'pagination',
  'previous',
  'pagePosition',
  'next',
  'readerSettings',
  'preferredLanguage',
  'allLanguages',
  'close',
  'closeSettings'
]);

function locale(messages) {
  const keys = Object.keys(messages);
  const missing = MESSAGE_KEYS.filter((key) => !keys.includes(key));
  const unknown = keys.filter((key) => !MESSAGE_KEYS.includes(key));
  if (missing.length > 0 || unknown.length > 0) {
    throw new TypeError(`Invalid UI locale; missing: ${missing.join(', ')}; unknown: ${unknown.join(', ')}`);
  }
  for (const [key, value] of Object.entries(messages)) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new TypeError(`Invalid UI locale message: ${key}`);
    }
  }
  if (!messages.readingTime.includes('{count}')
      || !messages.pagePosition.includes('{current}')
      || !messages.pagePosition.includes('{total}')) {
    throw new TypeError('UI locale messages have invalid placeholders');
  }
  return Object.freeze(messages);
}

// W3Techs content-language ranking captured from
// https://w3techs.com/technologies/overview/content_language on 2026-08-31. Keeping this snapshot
// in source makes releases deterministic; changing the survey cutoff requires a reviewed release.
export const WEB_CONTENT_TOP_50 = Object.freeze([
  'en', 'es', 'de', 'ja', 'fr', 'pt', 'ru', 'it', 'nl', 'pl',
  'tr', 'zh', 'id', 'cs', 'fa', 'vi', 'ko', 'uk', 'ar', 'hu',
  'sv', 'ro', 'el', 'da', 'fi', 'he', 'sk', 'th', 'bg', 'hr',
  'sr', 'nb', 'lt', 'sl', 'ca', 'et', 'no', 'lv', 'bn', 'hi',
  'bs', 'az', 'ka', 'is', 'uz', 'ms', 'mk', 'kk', 'sq', 'hy'
]);

export const SUPPORTED_UI_LANGUAGES = Object.freeze([
  ...WEB_CONTENT_TOP_50,
  'ta', 'ur', 'ne', 'ml', 'kn', 'te', 'mr'
]);

export const UI_LOCALES = Object.freeze({
  en: locale({
    languageIndexTitle: 'English articles', published: 'Published', scheduledFor: 'Scheduled for',
    readingTime: '{count} min read', availableLanguages: 'Available languages',
    pagination: 'Pagination', previous: 'Newer articles', pagePosition: 'Page {current} of {total}',
    next: 'Older articles', readerSettings: 'Reader settings', preferredLanguage: 'Preferred language',
    allLanguages: 'All languages',
    close: 'Close', closeSettings: 'Close reader settings'
  }),
  es: locale({
    languageIndexTitle: 'Artículos en español', published: 'Publicado', scheduledFor: 'Programado para',
    readingTime: '{count} minutos de lectura', availableLanguages: 'Idiomas disponibles',
    pagination: 'Paginación', previous: 'Artículos más recientes',
    pagePosition: 'Página {current} de {total}', next: 'Artículos más antiguos',
    readerSettings: 'Configuración del lector', preferredLanguage: 'Idioma preferido',
    allLanguages: 'Todos los idiomas',
    close: 'Cerrar', closeSettings: 'Cerrar la configuración del lector'
  }),
  de: locale({
    languageIndexTitle: 'Deutsche Artikel', published: 'Veröffentlicht', scheduledFor: 'Geplant für',
    readingTime: '{count} Min. Lesezeit', availableLanguages: 'Verfügbare Sprachen',
    pagination: 'Seitennavigation', previous: 'Neuere Artikel',
    pagePosition: 'Seite {current} von {total}', next: 'Ältere Artikel',
    readerSettings: 'Leseeinstellungen', preferredLanguage: 'Bevorzugte Sprache',
    allLanguages: 'Alle Sprachen',
    close: 'Schließen', closeSettings: 'Leseeinstellungen schließen'
  }),
  ja: locale({
    languageIndexTitle: '日本語の記事', published: '公開済み', scheduledFor: '公開予定',
    readingTime: '読了時間 {count} 分', availableLanguages: '利用可能な言語',
    pagination: 'ページナビゲーション', previous: '新しい記事',
    pagePosition: 'ページ {current} / {total}', next: '古い記事',
    readerSettings: 'リーダー設定', preferredLanguage: '優先言語',
    allLanguages: 'すべての言語',
    close: '閉じる', closeSettings: 'リーダー設定を閉じる'
  }),
  fr: locale({
    languageIndexTitle: 'Articles en français', published: 'Publié', scheduledFor: 'Prévu pour',
    readingTime: '{count} minutes de lecture', availableLanguages: 'Langues disponibles',
    pagination: 'Pagination', previous: 'Articles plus récents',
    pagePosition: 'Page {current} sur {total}', next: 'Articles plus anciens',
    readerSettings: 'Paramètres du lecteur', preferredLanguage: 'Langue préférée',
    allLanguages: 'Toutes les langues',
    close: 'Fermer', closeSettings: 'Fermer les paramètres du lecteur'
  }),
  pt: locale({
    languageIndexTitle: 'Artigos em português', published: 'Publicado', scheduledFor: 'Agendado para',
    readingTime: '{count} min de leitura', availableLanguages: 'Idiomas disponíveis',
    pagination: 'Paginação', previous: 'Artigos mais recentes',
    pagePosition: 'Página {current} de {total}', next: 'Artigos mais antigos',
    readerSettings: 'Configurações do leitor', preferredLanguage: 'Idioma preferido',
    allLanguages: 'Todos os idiomas',
    close: 'Fechar', closeSettings: 'Fechar configurações do leitor'
  }),
  ru: locale({
    languageIndexTitle: 'Статьи на русском языке', published: 'Опубликовано', scheduledFor: 'Запланировано на',
    readingTime: '{count} мин. чтения', availableLanguages: 'Доступные языки',
    pagination: 'Навигация по страницам', previous: 'Более новые статьи',
    pagePosition: 'Страница {current} из {total}', next: 'Более старые статьи',
    readerSettings: 'Настройки чтения', preferredLanguage: 'Предпочитаемый язык',
    allLanguages: 'Все языки',
    close: 'Закрыть', closeSettings: 'Закрыть настройки чтения'
  }),
  it: locale({
    languageIndexTitle: 'Articoli in italiano', published: 'Pubblicato', scheduledFor: 'Programmato per',
    readingTime: '{count} min di lettura', availableLanguages: 'Lingue disponibili',
    pagination: 'Paginazione', previous: 'Articoli più recenti',
    pagePosition: 'Pagina {current} di {total}', next: 'Articoli meno recenti',
    readerSettings: 'Impostazioni del lettore', preferredLanguage: 'Lingua preferita',
    allLanguages: 'Tutte le lingue',
    close: 'Chiudi', closeSettings: 'Chiudi le impostazioni del lettore'
  }),
  nl: locale({
    languageIndexTitle: 'Nederlandstalige artikelen', published: 'Gepubliceerd', scheduledFor: 'Gepland voor',
    readingTime: '{count} min leestijd', availableLanguages: 'Beschikbare talen',
    pagination: 'Paginering', previous: 'Nieuwere artikelen',
    pagePosition: 'Pagina {current} van {total}', next: 'Oudere artikelen',
    readerSettings: 'Lezersinstellingen', preferredLanguage: 'Voorkeurstaal',
    allLanguages: 'Alle talen',
    close: 'Sluiten', closeSettings: 'Lezersinstellingen sluiten'
  }),
  pl: locale({
    languageIndexTitle: 'Artykuły w języku polskim', published: 'Opublikowano', scheduledFor: 'Zaplanowano na',
    readingTime: '{count} min czytania', availableLanguages: 'Dostępne języki',
    pagination: 'Nawigacja po stronach', previous: 'Nowsze artykuły',
    pagePosition: 'Strona {current} z {total}', next: 'Starsze artykuły',
    readerSettings: 'Ustawienia czytnika', preferredLanguage: 'Preferowany język',
    allLanguages: 'Wszystkie języki',
    close: 'Zamknij', closeSettings: 'Zamknij ustawienia czytnika'
  }),
  tr: locale({
    languageIndexTitle: 'Türkçe makaleler', published: 'Yayımlandı', scheduledFor: 'Planlandı',
    readingTime: '{count} dakikalık okuma', availableLanguages: 'Mevcut diller',
    pagination: 'Sayfa gezintisi', previous: 'Daha yeni makaleler',
    pagePosition: 'Sayfa {current} / {total}', next: 'Daha eski makaleler',
    readerSettings: 'Okuyucu ayarları', preferredLanguage: 'Tercih edilen dil',
    allLanguages: 'Tüm diller',
    close: 'Kapat', closeSettings: 'Okuyucu ayarlarını kapat'
  }),
  'zh-Hans': locale({
    languageIndexTitle: '中文文章', published: '已发布', scheduledFor: '计划发布于',
    readingTime: '阅读时间 {count} 分钟', availableLanguages: '可用语言',
    pagination: '分页导航', previous: '较新的文章',
    pagePosition: '第 {current} 页（共 {total} 页）', next: '较早的文章',
    readerSettings: '阅读器设置', preferredLanguage: '首选语言',
    allLanguages: '所有语言',
    close: '关闭', closeSettings: '关闭阅读器设置'
  }),
  'zh-Hant': locale({
    languageIndexTitle: '中文文章', published: '已發布', scheduledFor: '預定發布於',
    readingTime: '閱讀時間 {count} 分鐘', availableLanguages: '可用語言',
    pagination: '分頁導覽', previous: '較新的文章',
    pagePosition: '第 {current} 頁（共 {total} 頁）', next: '較早的文章',
    readerSettings: '閱讀器設定', preferredLanguage: '首選語言',
    allLanguages: '所有語言',
    close: '關閉', closeSettings: '關閉閱讀器設定'
  }),
  id: locale({
    languageIndexTitle: 'Artikel berbahasa Indonesia', published: 'Diterbitkan', scheduledFor: 'Dijadwalkan untuk',
    readingTime: '{count} menit membaca', availableLanguages: 'Bahasa yang tersedia',
    pagination: 'Navigasi halaman', previous: 'Artikel terbaru',
    pagePosition: 'Halaman {current} dari {total}', next: 'Artikel terdahulu',
    readerSettings: 'Pengaturan pembaca', preferredLanguage: 'Bahasa pilihan',
    allLanguages: 'Semua bahasa',
    close: 'Tutup', closeSettings: 'Tutup pengaturan pembaca'
  }),
  cs: locale({
    languageIndexTitle: 'Články v češtině', published: 'Publikováno', scheduledFor: 'Naplánováno na',
    readingTime: '{count} min čtení', availableLanguages: 'Dostupné jazyky',
    pagination: 'Stránkování', previous: 'Novější články',
    pagePosition: 'Strana {current} z {total}', next: 'Starší články',
    readerSettings: 'Nastavení čtečky', preferredLanguage: 'Preferovaný jazyk',
    allLanguages: 'Všechny jazyky',
    close: 'Zavřít', closeSettings: 'Zavřít nastavení čtečky'
  }),
  fa: locale({
    languageIndexTitle: 'مقالات فارسی', published: 'منتشر شده', scheduledFor: 'زمان‌بندی‌شده برای',
    readingTime: '{count} دقیقه مطالعه', availableLanguages: 'زبان‌های موجود',
    pagination: 'صفحه‌بندی', previous: 'مقالات جدیدتر',
    pagePosition: 'صفحه {current} از {total}', next: 'مقالات قدیمی‌تر',
    readerSettings: 'تنظیمات خواننده', preferredLanguage: 'زبان ترجیحی',
    allLanguages: 'همه زبان‌ها',
    close: 'بستن', closeSettings: 'بستن تنظیمات خواننده'
  }),
  vi: locale({
    languageIndexTitle: 'Bài viết tiếng Việt', published: 'Đã xuất bản', scheduledFor: 'Đã lên lịch',
    readingTime: '{count} phút đọc', availableLanguages: 'Ngôn ngữ có sẵn',
    pagination: 'Phân trang', previous: 'Bài viết mới hơn',
    pagePosition: 'Trang {current} trên {total}', next: 'Bài viết cũ hơn',
    readerSettings: 'Cài đặt trình đọc', preferredLanguage: 'Ngôn ngữ ưa thích',
    allLanguages: 'Tất cả ngôn ngữ',
    close: 'Đóng', closeSettings: 'Đóng cài đặt trình đọc'
  }),
  ko: locale({
    languageIndexTitle: '한국어 기사', published: '게시됨', scheduledFor: '게시 예정',
    readingTime: '읽는 시간 {count}분', availableLanguages: '사용 가능한 언어',
    pagination: '페이지 탐색', previous: '최신 기사',
    pagePosition: '전체 {total}페이지 중 {current}페이지', next: '이전 기사',
    readerSettings: '리더 설정', preferredLanguage: '선호 언어',
    allLanguages: '모든 언어',
    close: '닫기', closeSettings: '리더 설정 닫기'
  }),
  uk: locale({
    languageIndexTitle: 'Статті українською', published: 'Опубліковано', scheduledFor: 'Заплановано на',
    readingTime: '{count} хв читання', availableLanguages: 'Доступні мови',
    pagination: 'Навігація сторінками', previous: 'Новіші статті',
    pagePosition: 'Сторінка {current} з {total}', next: 'Старіші статті',
    readerSettings: 'Налаштування читача', preferredLanguage: 'Бажана мова',
    allLanguages: 'Усі мови',
    close: 'Закрити', closeSettings: 'Закрити налаштування читача'
  }),
  ar: locale({
    languageIndexTitle: 'مقالات باللغة العربية', published: 'نُشر', scheduledFor: 'مجدول لـ',
    readingTime: '{count} دقائق قراءة', availableLanguages: 'اللغات المتاحة',
    pagination: 'ترقيم الصفحات', previous: 'مقالات أحدث',
    pagePosition: 'صفحة {current} من {total}', next: 'مقالات أقدم',
    readerSettings: 'إعدادات القارئ', preferredLanguage: 'اللغة المفضلة',
    allLanguages: 'جميع اللغات',
    close: 'إغلاق', closeSettings: 'إغلاق إعدادات القارئ'
  }),
  hu: locale({
    languageIndexTitle: 'Magyar cikkek', published: 'Közzétéve', scheduledFor: 'Ütemezve',
    readingTime: '{count} perc olvasás', availableLanguages: 'Elérhető nyelvek',
    pagination: 'Oldalnavigáció', previous: 'Újabb cikkek',
    pagePosition: '{current}/{total}. oldal', next: 'Régebbi cikkek',
    readerSettings: 'Olvasói beállítások', preferredLanguage: 'Előnyben részesített nyelv',
    allLanguages: 'Minden nyelv',
    close: 'Bezárás', closeSettings: 'Olvasói beállítások bezárása'
  }),
  sv: locale({
    languageIndexTitle: 'Svenska artiklar', published: 'Publicerad', scheduledFor: 'Schemalagd till',
    readingTime: '{count} min läsning', availableLanguages: 'Tillgängliga språk',
    pagination: 'Sidnavigering', previous: 'Nyare artiklar',
    pagePosition: 'Sida {current} av {total}', next: 'Äldre artiklar',
    readerSettings: 'Läsarinställningar', preferredLanguage: 'Föredraget språk',
    allLanguages: 'Alla språk',
    close: 'Stäng', closeSettings: 'Stäng läsarinställningar'
  }),
  ro: locale({
    languageIndexTitle: 'Articole în limba română', published: 'Publicat', scheduledFor: 'Programat pentru',
    readingTime: '{count} min de citire', availableLanguages: 'Limbi disponibile',
    pagination: 'Paginare', previous: 'Articole mai noi',
    pagePosition: 'Pagina {current} din {total}', next: 'Articole mai vechi',
    readerSettings: 'Setări pentru cititor', preferredLanguage: 'Limba preferată',
    allLanguages: 'Toate limbile',
    close: 'Închide', closeSettings: 'Închide setările pentru cititor'
  }),
  el: locale({
    languageIndexTitle: 'Ελληνικά άρθρα', published: 'Δημοσιεύτηκε', scheduledFor: 'Προγραμματίστηκε για',
    readingTime: '{count} λεπτά ανάγνωσης', availableLanguages: 'Διαθέσιμες γλώσσες',
    pagination: 'Πλοήγηση σελίδων', previous: 'Νεότερα άρθρα',
    pagePosition: 'Σελίδα {current} από {total}', next: 'Παλαιότερα άρθρα',
    readerSettings: 'Ρυθμίσεις αναγνώστη', preferredLanguage: 'Προτιμώμενη γλώσσα',
    allLanguages: 'Όλες οι γλώσσες',
    close: 'Κλείσιμο', closeSettings: 'Κλείσιμο ρυθμίσεων αναγνώστη'
  }),
  da: locale({
    languageIndexTitle: 'Danske artikler', published: 'Udgivet', scheduledFor: 'Planlagt til',
    readingTime: '{count} min. læsning', availableLanguages: 'Tilgængelige sprog',
    pagination: 'Sidenavigation', previous: 'Nyere artikler',
    pagePosition: 'Side {current} af {total}', next: 'Ældre artikler',
    readerSettings: 'Læserindstillinger', preferredLanguage: 'Foretrukket sprog',
    allLanguages: 'Alle sprog',
    close: 'Luk', closeSettings: 'Luk læserindstillinger'
  }),
  fi: locale({
    languageIndexTitle: 'Suomenkieliset artikkelit', published: 'Julkaistu', scheduledFor: 'Ajastettu',
    readingTime: '{count} min lukuaika', availableLanguages: 'Saatavilla olevat kielet',
    pagination: 'Sivunavigointi', previous: 'Uudemmat artikkelit',
    pagePosition: 'Sivu {current}/{total}', next: 'Vanhemmat artikkelit',
    readerSettings: 'Lukijan asetukset', preferredLanguage: 'Ensisijainen kieli',
    allLanguages: 'Kaikki kielet',
    close: 'Sulje', closeSettings: 'Sulje lukijan asetukset'
  }),
  he: locale({
    languageIndexTitle: 'מאמרים בעברית', published: 'פורסם', scheduledFor: 'מתוכנן ל־',
    readingTime: '{count} דקות קריאה', availableLanguages: 'שפות זמינות',
    pagination: 'עימוד', previous: 'מאמרים חדשים יותר',
    pagePosition: 'עמוד {current} מתוך {total}', next: 'מאמרים ישנים יותר',
    readerSettings: 'הגדרות קורא', preferredLanguage: 'שפה מועדפת',
    allLanguages: 'כל השפות',
    close: 'סגור', closeSettings: 'סגור את הגדרות הקורא'
  }),
  sk: locale({
    languageIndexTitle: 'Články v slovenčine', published: 'Zverejnené', scheduledFor: 'Naplánované na',
    readingTime: '{count} min čítania', availableLanguages: 'Dostupné jazyky',
    pagination: 'Stránkovanie', previous: 'Novšie články',
    pagePosition: 'Strana {current} z {total}', next: 'Staršie články',
    readerSettings: 'Nastavenia čítačky', preferredLanguage: 'Preferovaný jazyk',
    allLanguages: 'Všetky jazyky',
    close: 'Zavrieť', closeSettings: 'Zavrieť nastavenia čítačky'
  }),
  th: locale({
    languageIndexTitle: 'บทความภาษาไทย', published: 'เผยแพร่แล้ว', scheduledFor: 'กำหนดเวลาไว้',
    readingTime: 'อ่าน {count} นาที', availableLanguages: 'ภาษาที่มี',
    pagination: 'การแบ่งหน้า', previous: 'บทความใหม่กว่า',
    pagePosition: 'หน้า {current} จาก {total}', next: 'บทความเก่ากว่า',
    readerSettings: 'การตั้งค่าตัวอ่าน', preferredLanguage: 'ภาษาที่ต้องการ',
    allLanguages: 'ทุกภาษา',
    close: 'ปิด', closeSettings: 'ปิดการตั้งค่าตัวอ่าน'
  }),
  bg: locale({
    languageIndexTitle: 'Статии на български', published: 'Публикувано', scheduledFor: 'Планирано за',
    readingTime: '{count} мин. четене', availableLanguages: 'Налични езици',
    pagination: 'Навигация по страници', previous: 'По-нови статии',
    pagePosition: 'Страница {current} от {total}', next: 'По-стари статии',
    readerSettings: 'Настройки на четеца', preferredLanguage: 'Предпочитан език',
    allLanguages: 'Всички езици',
    close: 'Затвори', closeSettings: 'Затвори настройките на четеца'
  }),
  hr: locale({
    languageIndexTitle: 'Članci na hrvatskom', published: 'Objavljeno', scheduledFor: 'Zakazano za',
    readingTime: '{count} min čitanja', availableLanguages: 'Dostupni jezici',
    pagination: 'Straničenje', previous: 'Noviji članci',
    pagePosition: 'Stranica {current} od {total}', next: 'Stariji članci',
    readerSettings: 'Postavke čitača', preferredLanguage: 'Željeni jezik',
    allLanguages: 'Svi jezici',
    close: 'Zatvori', closeSettings: 'Zatvori postavke čitača'
  }),
  sr: locale({
    languageIndexTitle: 'Чланци на српском', published: 'Објављено', scheduledFor: 'Заказано за',
    readingTime: '{count} мин читања', availableLanguages: 'Доступни језици',
    pagination: 'Пагинација', previous: 'Новији чланци',
    pagePosition: 'Страница {current} од {total}', next: 'Старији чланци',
    readerSettings: 'Подешавања читача', preferredLanguage: 'Жељени језик',
    allLanguages: 'Сви језици',
    close: 'Затвори', closeSettings: 'Затвори подешавања читача'
  }),
  'sr-Latn': locale({
    languageIndexTitle: 'Članci na srpskom', published: 'Objavljeno', scheduledFor: 'Zakazano za',
    readingTime: '{count} min čitanja', availableLanguages: 'Dostupni jezici',
    pagination: 'Paginacija', previous: 'Noviji članci',
    pagePosition: 'Stranica {current} od {total}', next: 'Stariji članci',
    readerSettings: 'Podešavanja čitača', preferredLanguage: 'Željeni jezik',
    allLanguages: 'Svi jezici',
    close: 'Zatvori', closeSettings: 'Zatvori podešavanja čitača'
  }),
  nb: locale({
    languageIndexTitle: 'Artikler på norsk bokmål', published: 'Publisert', scheduledFor: 'Planlagt for',
    readingTime: '{count} min lesing', availableLanguages: 'Tilgjengelige språk',
    pagination: 'Sidenavigasjon', previous: 'Nyere artikler',
    pagePosition: 'Side {current} av {total}', next: 'Eldre artikler',
    readerSettings: 'Leserinnstillinger', preferredLanguage: 'Foretrukket språk',
    allLanguages: 'Alle språk',
    close: 'Lukk', closeSettings: 'Lukk leserinnstillinger'
  }),
  lt: locale({
    languageIndexTitle: 'Straipsniai lietuvių kalba', published: 'Paskelbta', scheduledFor: 'Suplanuota',
    readingTime: '{count} min. skaitymo', availableLanguages: 'Galimos kalbos',
    pagination: 'Puslapių navigacija', previous: 'Naujesni straipsniai',
    pagePosition: '{current} psl. iš {total}', next: 'Senesni straipsniai',
    readerSettings: 'Skaitytojo nustatymai', preferredLanguage: 'Pageidaujama kalba',
    allLanguages: 'Visos kalbos',
    close: 'Uždaryti', closeSettings: 'Uždaryti skaitytojo nustatymus'
  }),
  sl: locale({
    languageIndexTitle: 'Članki v slovenščini', published: 'Objavljeno', scheduledFor: 'Predvideno za',
    readingTime: '{count} min branja', availableLanguages: 'Razpoložljivi jeziki',
    pagination: 'Oštevilčevanje strani', previous: 'Novejši članki',
    pagePosition: 'Stran {current} od {total}', next: 'Starejši članki',
    readerSettings: 'Nastavitve bralnika', preferredLanguage: 'Želeni jezik',
    allLanguages: 'Vsi jeziki',
    close: 'Zapri', closeSettings: 'Zapri nastavitve bralnika'
  }),
  ca: locale({
    languageIndexTitle: 'Articles en català', published: 'Publicat', scheduledFor: 'Programat per a',
    readingTime: '{count} minuts de lectura', availableLanguages: 'Idiomes disponibles',
    pagination: 'Paginació', previous: 'Articles més nous',
    pagePosition: 'Pàgina {current} de {total}', next: 'Articles més antics',
    readerSettings: 'Configuració del lector', preferredLanguage: 'Idioma preferit',
    allLanguages: 'Tots els idiomes',
    close: 'Tanca', closeSettings: 'Tanca la configuració del lector'
  }),
  et: locale({
    languageIndexTitle: 'Eestikeelsed artiklid', published: 'Avaldatud', scheduledFor: 'Kavandatud',
    readingTime: '{count} min lugemist', availableLanguages: 'Saadaolevad keeled',
    pagination: 'Lehekülgede navigeerimine', previous: 'Uuemad artiklid',
    pagePosition: 'Lehekülg {current}/{total}', next: 'Vanemad artiklid',
    readerSettings: 'Lugeja seaded', preferredLanguage: 'Eelistatud keel',
    allLanguages: 'Kõik keeled',
    close: 'Sulge', closeSettings: 'Sulge lugeja seaded'
  }),
  no: locale({
    languageIndexTitle: 'Artikler på norsk', published: 'Publisert', scheduledFor: 'Planlagt for',
    readingTime: '{count} min lesing', availableLanguages: 'Tilgjengelige språk',
    pagination: 'Sidenavigasjon', previous: 'Nyere artikler',
    pagePosition: 'Side {current} av {total}', next: 'Eldre artikler',
    readerSettings: 'Leserinnstillinger', preferredLanguage: 'Foretrukket språk',
    allLanguages: 'Alle språk',
    close: 'Lukk', closeSettings: 'Lukk leserinnstillinger'
  }),
  lv: locale({
    languageIndexTitle: 'Raksti latviešu valodā', published: 'Publicēts', scheduledFor: 'Ieplānots',
    readingTime: '{count} min lasīšanas', availableLanguages: 'Pieejamās valodas',
    pagination: 'Lapu navigācija', previous: 'Jaunāki raksti',
    pagePosition: '{current}. lpp. no {total}', next: 'Vecāki raksti',
    readerSettings: 'Lasītāja iestatījumi', preferredLanguage: 'Vēlamā valoda',
    allLanguages: 'Visas valodas',
    close: 'Aizvērt', closeSettings: 'Aizvērt lasītāja iestatījumus'
  }),
  bn: locale({
    languageIndexTitle: 'বাংলা নিবন্ধ', published: 'প্রকাশিত', scheduledFor: 'প্রকাশের জন্য নির্ধারিত',
    readingTime: '{count} মিনিটের পাঠ', availableLanguages: 'উপলব্ধ ভাষা',
    pagination: 'পৃষ্ঠা নেভিগেশন', previous: 'নতুন নিবন্ধ',
    pagePosition: 'পৃষ্ঠা {current} / {total}', next: 'পুরানো নিবন্ধ',
    readerSettings: 'পাঠক সেটিংস', preferredLanguage: 'পছন্দের ভাষা',
    allLanguages: 'সব ভাষা',
    close: 'বন্ধ করুন', closeSettings: 'পাঠক সেটিংস বন্ধ করুন'
  }),
  hi: locale({
    languageIndexTitle: 'हिंदी लेख', published: 'प्रकाशित', scheduledFor: 'प्रकाशन के लिए निर्धारित',
    readingTime: '{count} मिनट का पठन', availableLanguages: 'उपलब्ध भाषाएँ',
    pagination: 'पृष्ठ नेविगेशन', previous: 'नए लेख',
    pagePosition: 'पृष्ठ {current} / {total}', next: 'पुराने लेख',
    readerSettings: 'पाठक सेटिंग्स', preferredLanguage: 'पसंदीदा भाषा',
    allLanguages: 'सभी भाषाएँ',
    close: 'बंद करें', closeSettings: 'पाठक सेटिंग्स बंद करें'
  }),
  bs: locale({
    languageIndexTitle: 'Članci na bosanskom', published: 'Objavljeno', scheduledFor: 'Zakazano za',
    readingTime: '{count} min čitanja', availableLanguages: 'Dostupni jezici',
    pagination: 'Paginacija', previous: 'Noviji članci',
    pagePosition: 'Stranica {current} od {total}', next: 'Stariji članci',
    readerSettings: 'Postavke čitača', preferredLanguage: 'Željeni jezik',
    allLanguages: 'Svi jezici',
    close: 'Zatvori', closeSettings: 'Zatvori postavke čitača'
  }),
  az: locale({
    languageIndexTitle: 'Azərbaycan dilində məqalələr', published: 'Dərc edilib', scheduledFor: 'Planlaşdırılıb',
    readingTime: '{count} dəqiqəlik oxu', availableLanguages: 'Mövcud dillər',
    pagination: 'Səhifə naviqasiyası', previous: 'Daha yeni məqalələr',
    pagePosition: 'Səhifə {current}/{total}', next: 'Daha köhnə məqalələr',
    readerSettings: 'Oxucu parametrləri', preferredLanguage: 'Üstün tutulan dil',
    allLanguages: 'Bütün dillər',
    close: 'Bağla', closeSettings: 'Oxucu parametrlərini bağla'
  }),
  ka: locale({
    languageIndexTitle: 'სტატიები ქართულად', published: 'გამოქვეყნებული', scheduledFor: 'დაგეგმილია',
    readingTime: '{count} წთ წაკითხვა', availableLanguages: 'ხელმისაწვდომი ენები',
    pagination: 'გვერდების ნავიგაცია', previous: 'ახალი სტატიები',
    pagePosition: 'გვერდი {current} / {total}', next: 'ძველი სტატიები',
    readerSettings: 'მკითხველის პარამეტრები', preferredLanguage: 'სასურველი ენა',
    allLanguages: 'ყველა ენა',
    close: 'დახურვა', closeSettings: 'მკითხველის პარამეტრების დახურვა'
  }),
  is: locale({
    languageIndexTitle: 'Greinar á íslensku', published: 'Birt', scheduledFor: 'Tímasett fyrir',
    readingTime: '{count} mín lestur', availableLanguages: 'Tiltæk tungumál',
    pagination: 'Síðuleiösögn', previous: 'Nýrri greinar',
    pagePosition: 'Síða {current} af {total}', next: 'Eldri greinar',
    readerSettings: 'Lesarastillingar', preferredLanguage: 'Æskilegt tungumál',
    allLanguages: 'Öll tungumál',
    close: 'Loka', closeSettings: 'Loka lesarastillingum'
  }),
  uz: locale({
    languageIndexTitle: 'O‘zbekcha maqolalar', published: 'Nashr etilgan', scheduledFor: 'Rejalashtirilgan',
    readingTime: '{count} daqiqa o‘qish', availableLanguages: 'Mavjud tillar',
    pagination: 'Sahifalar bo‘ylab navigatsiya', previous: 'Yangi maqolalar',
    pagePosition: '{current}-sahifa, jami {total}', next: 'Eski maqolalar',
    readerSettings: 'O‘quvchi sozlamalari', preferredLanguage: 'Afzal til',
    allLanguages: 'Barcha tillar',
    close: 'Yopish', closeSettings: 'O‘quvchi sozlamalarini yopish'
  }),
  ms: locale({
    languageIndexTitle: 'Artikel Bahasa Melayu', published: 'Diterbitkan', scheduledFor: 'Dijadualkan untuk',
    readingTime: '{count} min bacaan', availableLanguages: 'Bahasa yang tersedia',
    pagination: 'Navigasi halaman', previous: 'Artikel lebih baharu',
    pagePosition: 'Halaman {current} daripada {total}', next: 'Artikel lebih lama',
    readerSettings: 'Tetapan pembaca', preferredLanguage: 'Bahasa pilihan',
    allLanguages: 'Semua bahasa',
    close: 'Tutup', closeSettings: 'Tutup tetapan pembaca'
  }),
  mk: locale({
    languageIndexTitle: 'Статии на македонски', published: 'Објавено', scheduledFor: 'Закажано за',
    readingTime: '{count} мин читање', availableLanguages: 'Достапни јазици',
    pagination: 'Пагинација', previous: 'Понови статии',
    pagePosition: 'Страница {current} од {total}', next: 'Постари статии',
    readerSettings: 'Поставки за читач', preferredLanguage: 'Претпочитан јазик',
    allLanguages: 'Сите јазици',
    close: 'Затвори', closeSettings: 'Затвори ги поставките за читач'
  }),
  kk: locale({
    languageIndexTitle: 'Қазақ тіліндегі мақалалар', published: 'Жарияланды', scheduledFor: 'Жоспарланған',
    readingTime: '{count} мин оқу', availableLanguages: 'Қолжетімді тілдер',
    pagination: 'Беттер бойынша навигация', previous: 'Жаңа мақалалар',
    pagePosition: '{total} беттің {current}-беті', next: 'Ескі мақалалар',
    readerSettings: 'Оқырман параметрлері', preferredLanguage: 'Қалаулы тіл',
    allLanguages: 'Барлық тілдер',
    close: 'Жабу', closeSettings: 'Оқырман параметрлерін жабу'
  }),
  sq: locale({
    languageIndexTitle: 'Artikuj në shqip', published: 'Publikuar', scheduledFor: 'Planifikuar për',
    readingTime: '{count} minuta lexim', availableLanguages: 'Gjuhët e disponueshme',
    pagination: 'Faqosje', previous: 'Artikujt më të rinj',
    pagePosition: 'Faqja {current} nga {total}', next: 'Artikujt më të vjetër',
    readerSettings: 'Cilësimet e lexuesit', preferredLanguage: 'Gjuha e preferuar',
    allLanguages: 'Të gjitha gjuhët',
    close: 'Mbyll', closeSettings: 'Mbyll cilësimet e lexuesit'
  }),
  hy: locale({
    languageIndexTitle: 'Հայերեն հոդվածներ', published: 'Հրապարակված', scheduledFor: 'Նախատեսված է',
    readingTime: '{count} րոպե ընթերցանություն', availableLanguages: 'Հասանելի լեզուներ',
    pagination: 'Էջերի նավարկում', previous: 'Նոր հոդվածներ',
    pagePosition: 'Էջ {current}՝ {total}-ից', next: 'Հին հոդվածներ',
    readerSettings: 'Ընթերցողի կարգավորումներ', preferredLanguage: 'Նախընտրելի լեզու',
    allLanguages: 'Բոլոր լեզուները',
    close: 'Փակել', closeSettings: 'Փակել ընթերցողի կարգավորումները'
  }),
  ta: locale({
    languageIndexTitle: 'தமிழ் கட்டுரைகள்', published: 'வெளியிடப்பட்டது', scheduledFor: 'வெளியிடத் திட்டமிடப்பட்டது',
    readingTime: '{count} நிமிட வாசிப்பு', availableLanguages: 'கிடைக்கும் மொழிகள்',
    pagination: 'பக்க வழிசெலுத்தல்', previous: 'புதிய கட்டுரைகள்',
    pagePosition: 'பக்கம் {current} / {total}', next: 'பழைய கட்டுரைகள்',
    readerSettings: 'வாசகர் அமைப்புகள்', preferredLanguage: 'விருப்ப மொழி',
    allLanguages: 'அனைத்து மொழிகளும்',
    close: 'மூடு', closeSettings: 'வாசகர் அமைப்புகளை மூடு'
  }),
  ur: locale({
    languageIndexTitle: 'اردو مضامین', published: 'شائع شدہ', scheduledFor: 'اشاعت کے لیے طے شدہ',
    readingTime: '{count} منٹ کا مطالعہ', availableLanguages: 'دستیاب زبانیں',
    pagination: 'صفحات کی رہنمائی', previous: 'نئے مضامین',
    pagePosition: 'صفحہ {current} از {total}', next: 'پرانے مضامین',
    readerSettings: 'قارئین کی ترتیبات', preferredLanguage: 'ترجیحی زبان',
    allLanguages: 'تمام زبانیں',
    close: 'بند کریں', closeSettings: 'قارئین کی ترتیبات بند کریں'
  }),
  ne: locale({
    languageIndexTitle: 'नेपाली लेखहरू', published: 'प्रकाशित', scheduledFor: 'प्रकाशनका लागि निर्धारित',
    readingTime: '{count} मिनेट पढ्ने समय', availableLanguages: 'उपलब्ध भाषाहरू',
    pagination: 'पृष्ठ नेभिगेसन', previous: 'नयाँ लेखहरू',
    pagePosition: 'पृष्ठ {current} / {total}', next: 'पुराना लेखहरू',
    readerSettings: 'पाठक सेटिङहरू', preferredLanguage: 'रुचाइएको भाषा',
    allLanguages: 'सबै भाषाहरू',
    close: 'बन्द गर्नुहोस्', closeSettings: 'पाठक सेटिङहरू बन्द गर्नुहोस्'
  }),
  ml: locale({
    languageIndexTitle: 'മലയാളം ലേഖനങ്ങൾ', published: 'പ്രസിദ്ധീകരിച്ചു', scheduledFor: 'പ്രസിദ്ധീകരണത്തിനായി ക്രമീകരിച്ചു',
    readingTime: '{count} മിനിറ്റ് വായന', availableLanguages: 'ലഭ്യമായ ഭാഷകൾ',
    pagination: 'പേജ് നാവിഗേഷൻ', previous: 'പുതിയ ലേഖനങ്ങൾ',
    pagePosition: 'പേജ് {current} / {total}', next: 'പഴയ ലേഖനങ്ങൾ',
    readerSettings: 'വായനക്കാരൻ ക്രമീകരണങ്ങൾ', preferredLanguage: 'തിരഞ്ഞെടുത്ത ഭാഷ',
    allLanguages: 'എല്ലാ ഭാഷകളും',
    close: 'അടയ്ക്കുക', closeSettings: 'വായനക്കാരൻ ക്രമീകരണങ്ങൾ അടയ്ക്കുക'
  }),
  kn: locale({
    languageIndexTitle: 'ಕನ್ನಡ ಲೇಖನಗಳು', published: 'ಪ್ರಕಟಿಸಲಾಗಿದೆ', scheduledFor: 'ಪ್ರಕಟಣೆಗೆ ನಿಗದಿಪಡಿಸಲಾಗಿದೆ',
    readingTime: '{count} ನಿಮಿಷ ಓದುವಿಕೆ', availableLanguages: 'ಲಭ್ಯವಿರುವ ಭಾಷೆಗಳು',
    pagination: 'ಪುಟ ನ್ಯಾವಿಗೇಷನ್', previous: 'ಹೊಸ ಲೇಖನಗಳು',
    pagePosition: 'ಪುಟ {current} / {total}', next: 'ಹಳೆಯ ಲೇಖನಗಳು',
    readerSettings: 'ಓದುಗನ ಸೆಟ್ಟಿಂಗ್‌ಗಳು', preferredLanguage: 'ಆದ್ಯತೆಯ ಭಾಷೆ',
    allLanguages: 'ಎಲ್ಲಾ ಭಾಷೆಗಳು',
    close: 'ಮುಚ್ಚಿ', closeSettings: 'ಓದುಗನ ಸೆಟ್ಟಿಂಗ್‌ಗಳನ್ನು ಮುಚ್ಚಿ'
  }),
  te: locale({
    languageIndexTitle: 'తెలుగు వ్యాసాలు', published: 'ప్రచురించబడింది', scheduledFor: 'ప్రచురణకు షెడ్యూల్ చేయబడింది',
    readingTime: '{count} నిమిషాల పఠనం', availableLanguages: 'అందుబాటులో ఉన్న భాషలు',
    pagination: 'పేజీ నావిగేషన్', previous: 'కొత్త వ్యాసాలు',
    pagePosition: 'పేజీ {current} / {total}', next: 'పాత వ్యాసాలు',
    readerSettings: 'రీడర్ సెట్టింగ్‌లు', preferredLanguage: 'ప్రాధాన్య భాష',
    allLanguages: 'అన్ని భాషలు',
    close: 'మూసివేయి', closeSettings: 'రీడర్ సెట్టింగ్‌లను మూసివేయి'
  }),
  mr: locale({
    languageIndexTitle: 'मराठी लेख', published: 'प्रकाशित', scheduledFor: 'प्रकाशनासाठी नियोजित',
    readingTime: '{count} मिनिटांचे वाचन', availableLanguages: 'उपलब्ध भाषा',
    pagination: 'पृष्ठ नेव्हिगेशन', previous: 'नवीन लेख',
    pagePosition: 'पृष्ठ {current} / {total}', next: 'जुने लेख',
    readerSettings: 'वाचक सेटिंग्ज', preferredLanguage: 'पसंतीची भाषा',
    allLanguages: 'सर्व भाषा',
    close: 'बंद करा', closeSettings: 'वाचक सेटिंग्ज बंद करा'
  })
});
