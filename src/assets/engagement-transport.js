/**
 * The reader's identity, and the only way to write on their behalf.
 *
 * Both belong to the account frame, which is served by the API and runs on its origin. The
 * reader's token lives there and nowhere else - this page never sees it, and never should: the
 * page is the writer's own site, and a reader's credentials are not the writer's to hold. So a
 * write is a request posted into the frame, and the frame answers with a result.
 *
 * `sessionUser` is a signal rather than a variable because more than one island depends on it and
 * they must not each keep their own copy going stale in its own way.
 */
export const sessionUser = { value: null };

const sessionFrame = document.querySelector('[data-gala-session-frame]');
const frameOrigin = sessionFrame ? new URL(sessionFrame.src).origin : null;
const pending = new Map();

/** Readable text for the codes the API actually returns. */
export function engagementErrorMessage(code) {
  if (code === 'AUTHENTICATION_REQUIRED' || code === 'INVALID_BEARER_TOKEN'
      || code === 'REAUTHENTICATION_REQUIRED') return 'Sign in again to continue.';
  if (code === 'ENGAGEMENT_RATE_LIMITED') return 'You are posting too quickly; try again shortly.';
  if (code === 'CONTACT_RATE_LIMITED') return 'You are sending too quickly; try again later.';
  if (code === 'RESOURCE_NOT_FOUND') return 'That item is no longer available.';
  if (code === 'INVALID_ENGAGEMENT_WRITE' || code === 'INVALID_CONTACT_SUBMISSION'
      || code === 'INVALID_REQUEST') return 'Check your entry and try again.';
  if (code === 'ACCESS_DENIED') return 'That action is not available for this account.';
  if (code === 'IDEMPOTENCY_CONFLICT' || code === 'ENGAGEMENT_STATE_CONFLICT') {
    return 'The item changed; reload and try again.';
  }
  return 'The action could not be completed. Try again.';
}

export function sendEngagementWrite(operation, payload) {
  if (!sessionFrame || !sessionUser.value) {
    return Promise.reject(new Error('AUTHENTICATION_REQUIRED'));
  }
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(requestId);
      reject(new Error('REQUEST_TIMEOUT'));
    }, 10_000);
    pending.set(requestId, {
      resolve: (value) => { clearTimeout(timeout); resolve(value); },
      reject: (error) => { clearTimeout(timeout); reject(error); }
    });
    sessionFrame.contentWindow.postMessage(
      { type: 'gala-engagement-write', requestId, operation, payload }, frameOrigin);
  });
}

/**
 * Asks the page to start a sign-in and to put the reader back where they were afterwards.
 *
 * Dispatched as an event rather than called directly: opening the window and replaying the
 * interrupted intent belongs to the page, and an island should not have to know how that works.
 */
export function requestSignIn(intent) {
  document.dispatchEvent(new CustomEvent('gala-request-sign-in', { detail: intent }));
}

if (sessionFrame) {
  window.addEventListener('message', (event) => {
    if (event.origin !== frameOrigin || event.source !== sessionFrame.contentWindow) return;
    if (event.data?.type === 'gala-engagement-result') {
      const waiting = pending.get(event.data.requestId);
      if (!waiting) return;
      pending.delete(event.data.requestId);
      if (event.data.ok === true) waiting.resolve(event.data.result);
      else waiting.reject(new Error(event.data.error?.code || 'ENGAGEMENT_WRITE_FAILED'));
      return;
    }
    if (event.data?.type !== 'gala-session') return;
    const user = event.data.user;
    sessionUser.value = user && typeof user.id === 'string' ? user : null;
    window.dispatchEvent(new CustomEvent('gala-session-change'));
  });
}
