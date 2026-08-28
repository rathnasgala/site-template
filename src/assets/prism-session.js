const KEY = 'gala.prism.session.v1';

document.addEventListener('click', (event) => {
  const restore = event.target.closest('[data-prism-restore]');
  if (restore) {
    try { sessionStorage.removeItem(KEY); } catch {}
    return;
  }
  const selection = event.target.closest('[data-prism-select]');
  if (!selection) return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({
      articleId: selection.dataset.prismArticleId,
      language: selection.dataset.prismLanguage,
      configurationId: selection.dataset.prismConfigurationId,
      sourceRevisionHash: selection.dataset.prismSourceHash,
      selectedAt: new Date().toISOString(),
    }));
  } catch {}
});
