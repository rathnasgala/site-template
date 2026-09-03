const newsletter = document.querySelector('[data-gala-newsletter]');

if (newsletter instanceof HTMLElement) {
  const siteId = newsletter.dataset.siteId;
  const apiBaseUrl = newsletter.dataset.apiBaseUrl;
  const language = newsletter.dataset.language || null;
  const form = newsletter.querySelector('form');
  const email = newsletter.querySelector('input[type="email"]');
  const submit = newsletter.querySelector('button[type="submit"]');
  const status = newsletter.querySelector('[data-newsletter-status]');
  const siteIdPattern = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

  const endpoint = (suffix) => {
    if (!siteIdPattern.test(siteId ?? '')) throw new TypeError('Invalid publication identity');
    const base = new URL(apiBaseUrl ?? '');
    const loopback = base.protocol === 'http:'
      && (base.hostname === 'localhost' || base.hostname === '127.0.0.1');
    if (!(base.protocol === 'https:' || loopback) || base.username || base.password) {
      throw new TypeError('Invalid newsletter API origin');
    }
    return new URL(`/v1/sites/${siteId}/newsletter/${suffix}`, base).href;
  };

  const presentStatus = (message, error = false) => {
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('gala-newsletter__status--error', error);
  };

  const discover = async () => {
    try {
      const response = await fetch(endpoint('public-status'), {
        headers: { Accept: 'application/json' },
        credentials: 'omit'
      });
      if (!response.ok) return;
      const result = await response.json();
      if (result?.enabled !== true) return;
      newsletter.hidden = false;
    } catch {
      // Subscription discovery is optional enhancement; a failure must not disturb the page.
    }
  };

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!(email instanceof HTMLInputElement) || !email.reportValidity() || !submit) return;
    submit.disabled = true;
    email.disabled = true;
    presentStatus('Requesting confirmation…');
    try {
      const response = await fetch(endpoint('subscriptions'), {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({ email: email.value, language })
      });
      if (!response.ok) throw new Error(`Newsletter returned HTTP ${response.status}`);
      email.value = '';
      presentStatus('Check your email to confirm. If you are already subscribed, nothing else is needed.');
    } catch {
      presentStatus('Subscription could not be requested. Please try again.', true);
    } finally {
      submit.disabled = false;
      email.disabled = false;
    }
  });

  void discover();
}
