const MODES = ['system', 'light', 'dark'];
const STORAGE_KEY = 'gala-color-mode';

/*
 * The reader's own choice always wins. Absent one, the publication's `design.colorMode` decides
 * what they see first - it is already on the element, server-rendered. This used to fall back to
 * `system` unconditionally, which meant a writer could set a colour mode and no reader ever saw
 * it: the setting existed everywhere except in the page.
 */
function publicationDefault() {
  const declared = document.documentElement.dataset.mode;
  return MODES.includes(declared) ? declared : 'system';
}

function storedMode() {
  try {
    const mode = localStorage.getItem(STORAGE_KEY);
    if (MODES.includes(mode)) return mode;
  } catch {
    return publicationDefault();
  }
  return publicationDefault();
}

function applyMode(mode) {
  document.documentElement.dataset.mode = mode;
  const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
  document.querySelectorAll('[data-theme-mode-toggle]').forEach((control) => {
    const label = control.querySelector?.('[data-theme-mode-label]');
    if (label) label.textContent = `Theme: ${mode}`;
    else control.textContent = `Theme: ${mode}`;
    control.setAttribute('aria-label', `Color mode: ${mode}. Activate for ${next}.`);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  applyMode(storedMode());
  document.querySelectorAll('[data-theme-mode-toggle]').forEach((control) => {
    control.addEventListener('click', () => {
      const next = MODES[(MODES.indexOf(document.documentElement.dataset.mode) + 1) % MODES.length];
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // The selected mode still applies for this page when storage is unavailable.
      }
      applyMode(next);
    });
  });
});
