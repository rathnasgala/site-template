const LANGUAGE_STORAGE_KEY = 'gala-language-preference';

function storedLanguage() {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function optionFor(control, language) {
  return [...control.options].find((option) => option.value === language);
}

document.addEventListener('DOMContentLoaded', () => {
  const stored = storedLanguage();
  const controls = [...document.querySelectorAll('[data-language-preference]')];
  controls.forEach((control) => {
    const current = control.dataset.currentLanguage;
    if (current != null && optionFor(control, current) != null) control.value = current;
    else if (stored != null && optionFor(control, stored) != null) control.value = stored;
    control.addEventListener('change', () => {
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, control.value);
      } catch {
        // Selection and explicit navigation still work when storage is unavailable.
      }
      controls.forEach((peer) => {
        if (peer !== control && optionFor(peer, control.value) != null) peer.value = control.value;
      });
      if (!control.hasAttribute('data-navigate-on-selection')) return;
      const selected = optionFor(control, control.value);
      if (selected?.dataset.url) window.location.assign(selected.dataset.url);
    });
    if (stored == null || !control.hasAttribute('data-apply-on-load')) return;
    const selected = optionFor(control, stored);
    if (selected?.dataset.url) window.location.assign(selected.dataset.url);
  });
});
