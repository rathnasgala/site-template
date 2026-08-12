function selectableFallback(control) {
  const region = control.closest('.gala-share');
  const fallback = region?.querySelector('.gala-share__fallback');
  fallback?.focus();
  fallback?.select();
  const status = region?.querySelector('.gala-share__status');
  if (status) status.textContent = 'Select and copy the URL shown.';
}

document.addEventListener('click', async (event) => {
  const share = event.target.closest('[data-copy-url]');
  if (share) {
    const value = share.dataset.copyUrl;
    if (!window.isSecureContext || !navigator.clipboard?.writeText) {
      selectableFallback(share);
      return;
    }
    try {
      await navigator.clipboard.writeText(value);
      const status = share.closest('.gala-share')?.querySelector('.gala-share__status');
      if (status) status.textContent = 'Link copied.';
    } catch {
      selectableFallback(share);
    }
    return;
  }

  const copy = event.target.closest('[data-copy-code]');
  if (!copy) return;
  const code = copy.closest('.gala-code-block')?.querySelector('code');
  if (!code || !navigator.clipboard?.writeText || !window.isSecureContext) return;
  try {
    await navigator.clipboard.writeText(code.textContent);
    copy.textContent = 'Copied';
  } catch {
    copy.textContent = 'Select code to copy';
  }
});

const codeBlocks = new Set(
  [...document.querySelectorAll('pre code')].map((code) => code.closest('pre')).filter(Boolean)
);
codeBlocks.forEach((pre) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'gala-code-block';
  pre.before(wrapper);
  wrapper.append(pre);
  const control = document.createElement('button');
  control.type = 'button';
  control.dataset.copyCode = '';
  control.textContent = 'Copy code';
  control.setAttribute('aria-label', 'Copy code block');
  wrapper.prepend(control);
});
