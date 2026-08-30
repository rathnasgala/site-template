function selectableFallback(control) {
  const region = control.closest('.gala-share');
  const fallback = region?.querySelector('.gala-share__fallback');
  fallback?.classList.add('gala-share__fallback--visible');
  fallback?.focus();
  fallback?.select();
  const status = region?.querySelector('.gala-share__status');
  if (status) status.textContent = 'Select and copy the URL shown.';
}

const readingProgress = document.querySelector('[data-reading-progress]');
const readingContent = document.querySelector('.gala-markdown');
if (readingProgress && readingContent) {
  let progressFrame = null;
  const updateReadingProgress = () => {
    progressFrame = null;
    const start = readingContent.offsetTop;
    const distance = Math.max(1, readingContent.offsetHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, (window.scrollY - start) / distance));
    readingProgress.value = progress;
  };
  const scheduleReadingProgress = () => {
    if (progressFrame == null) progressFrame = requestAnimationFrame(updateReadingProgress);
  };
  addEventListener('scroll', scheduleReadingProgress, { passive: true });
  addEventListener('resize', scheduleReadingProgress, { passive: true });
  scheduleReadingProgress();
}

const articleToc = document.querySelector('.gala-toc');
if (articleToc?.tagName === 'DETAILS') {
  const tocNavigation = articleToc.querySelector('nav');
  const tocLinks = [...articleToc.querySelectorAll('a[href^="#"]')];
  const headings = tocLinks.map((link) => document.getElementById(link.hash.slice(1))).filter(Boolean);
  let tocFrame = null;
  const synchronizeToc = () => {
    tocFrame = null;
    articleToc.classList.toggle('gala-toc--floating', articleToc.getBoundingClientRect().top <= 96);
    if (!headings.length) return;
    const readingLine = window.innerHeight * 0.42;
    let active = headings[0];
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top <= readingLine) active = heading;
      else break;
    }
    const activeLink = tocLinks.find((link) => link.hash === `#${active.id}`);
    for (const link of tocLinks) {
      if (link === activeLink) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    if (tocNavigation && tocLinks.length) {
      const firstRect = tocLinks[0].getBoundingClientRect();
      const lastRect = tocLinks[tocLinks.length - 1].getBoundingClientRect();
      articleToc.classList.toggle('gala-toc--overflowing',
        lastRect.bottom - firstRect.top > tocNavigation.clientHeight);
    }
    if (activeLink && tocNavigation && tocNavigation.scrollHeight > tocNavigation.clientHeight) {
      const navigationRect = tocNavigation.getBoundingClientRect();
      const activeRect = activeLink.getBoundingClientRect();
      const target = tocNavigation.scrollTop + activeRect.top - navigationRect.top
        - (tocNavigation.clientHeight - activeRect.height) / 2;
      tocNavigation.scrollTo({ top: Math.max(0, target), behavior: 'auto' });
    }
  };
  const scheduleToc = () => {
    if (tocFrame == null) tocFrame = requestAnimationFrame(synchronizeToc);
  };
  addEventListener('scroll', scheduleToc, { passive: true });
  addEventListener('resize', scheduleToc, { passive: true });
  scheduleToc();
}

const actionRail = document.querySelector('.gala-action-rail');
const actionDock = document.querySelector('[data-action-dock]');
if (actionRail && actionDock) {
  const synchronizeActionRail = (entries) => {
    actionRail.classList.toggle('gala-action-rail--integrated', entries[0].isIntersecting);
  };
  new IntersectionObserver(synchronizeActionRail, {
    rootMargin: '0px 0px 18% 0px', threshold: 0
  }).observe(actionDock);
}

function presentFollowState(control, following) {
  const label = following ? 'Unfollow article' : 'Follow article';
  control.setAttribute('aria-pressed', String(following));
  control.setAttribute('aria-label', label);
  control.title = label;
  const visibleLabel = control.querySelector('[data-follow-label]');
  if (visibleLabel) visibleLabel.textContent = label;
}

document.addEventListener('click', async (event) => {
  if (event.target instanceof HTMLDialogElement && event.target.open) {
    const bounds = event.target.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (outside) {
      event.target.close();
      return;
    }
  }

  const embed = event.target.closest('[data-gala-embed-load]');
  if (embed) {
    const container = embed.closest('[data-gala-embed]');
    const source = embed.dataset.galaEmbedSrc;
    const provider = embed.dataset.galaEmbedLoad;
    if (!container || !source || !['youtube', 'codepen'].includes(provider)) return;
    const frame = document.createElement('iframe');
    frame.src = source;
    frame.title = provider === 'youtube' ? 'YouTube video' : 'CodePen example';
    frame.loading = 'eager';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.setAttribute('sandbox', 'allow-forms allow-popups allow-presentation allow-same-origin allow-scripts');
    frame.setAttribute('allow', provider === 'youtube'
      ? 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share'
      : 'fullscreen');
    frame.setAttribute('allowfullscreen', '');
    container.replaceChildren(frame);
    return;
  }

  // FedCM requires the relying party to call navigator.credentials.get synchronously from a
  // top-level user gesture. A click inside the cross-origin session frame followed by postMessage
  // loses that activation before it reaches this page, so the account control owns sign-in.
  const accountControl = event.target.closest('[data-user-control]');
  if (accountControl && !sessionUser && sessionFrameToken) {
    fedCmSession('active');
    return;
  }

  const dialogControl = event.target.closest('[data-open-dialog]');
  if (dialogControl) {
    const dialog = document.getElementById(dialogControl.dataset.openDialog);
    if (dialog instanceof HTMLDialogElement) dialog.showModal();
    return;
  }

  const reaction = event.target.closest('[data-reaction]');
  if (reaction) {
    const region = reaction.closest('[data-engagement-url]');
    if (!region) return;
    if (!sessionUser) {
      return requestSession({ kind: 'reaction', region,
        selector: `[data-reaction="${reaction.dataset.reaction}"]` });
    }
    const active = reaction.getAttribute('aria-pressed') !== 'true';
    const saved = await mutateEngagement(region, active ? 'reaction.add' : 'reaction.remove', {
      articleId: region.dataset.articleId,
      reaction: reaction.dataset.reaction
    });
    if (!saved) return;
    reaction.setAttribute('aria-pressed', String(active));
    return;
  }

  const follow = event.target.closest('[data-follow-article]');
  if (follow) {
    const region = follow.closest('[data-engagement-url]');
    if (!region) return;
    if (!sessionUser) {
      return requestSession({ kind: 'follow', region, selector: '[data-follow-article]' });
    }
    const active = follow.getAttribute('aria-pressed') !== 'true';
    const saved = await mutateEngagement(region, active ? 'follow.add' : 'follow.remove', {
      targetType: 'articles', targetId: region.dataset.articleId
    });
    if (!saved) return;
    presentFollowState(follow, active);
    return;
  }

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

  const nativeShare = event.target.closest('[data-native-share]');
  if (nativeShare) {
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url: nativeShare.dataset.nativeShare });
      } catch (error) {
        if (error.name !== 'AbortError') selectableFallback(nativeShare);
      }
    } else {
      selectableFallback(nativeShare);
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

function engagementCounts(data) {
  const reactionTotal = Object.values(data.reactions ?? {})
    .reduce((total, count) => total + (Number.isSafeInteger(count) ? count : 0), 0);
  return [
    ['Reactions', reactionTotal],
    ['Comments', Number.isSafeInteger(data.comments?.totalCount) ? data.comments.totalCount : 0],
    ['Views', Number.isSafeInteger(data.views?.count) ? data.views.count : 0]
  ];
}

function publicCount(value) {
  if (value < 1000) return '<1K';
  return new Intl.NumberFormat('en', {
    notation: 'compact', maximumFractionDigits: 1
  }).format(value);
}

function renderEngagement(region, payload) {
  const data = payload?.data;
  if (!data || typeof data !== 'object') throw new TypeError('Engagement data is invalid');
  for (const [label, value] of engagementCounts(data)) {
    region.querySelectorAll(`[data-engagement-stat="${label.toLowerCase()}"]`)
      .forEach((count) => {
        count.textContent = publicCount(value);
        count.closest('div')?.setAttribute('title', `${value} ${label.toLowerCase()}`);
      });
  }

  region.querySelector('[data-engagement-snapshot]')?.remove();
  region.querySelector('.gala-engagement__placeholder')?.remove();
}

async function refreshEngagement(region, commentsCursor = '', appendComments = false, fresh = false) {
  const status = region.querySelector('[data-engagement-status]');
  const commentsOwnStatus = Boolean(region.querySelector('[data-gala-comments]'));
  try {
    const requestUrl = new URL(region.dataset.engagementUrl);
    if (commentsCursor) requestUrl.searchParams.set('commentsCursor', commentsCursor);
    const response = await fetch(requestUrl, {
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      cache: fresh ? 'no-store' : 'default'
    });
    if (!response.ok) throw new Error(`Engagement returned HTTP ${response.status}`);
    const payload = await response.json();
    renderEngagement(region, payload);
    if (status && !commentsOwnStatus) status.textContent = payload.errors?.length
      ? 'Some engagement data is temporarily unavailable.' : '';
  } catch {
    if (status && !commentsOwnStatus) status.textContent = 'Engagement is temporarily unavailable.';
  }
}

function viewCampaign() {
  const query = new URL(window.location.href).searchParams;
  const campaign = {};
  for (const name of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const value = query.get(name);
    if (value && [...value].length <= 128) campaign[name] = value;
  }
  return campaign;
}

function recordView(region) {
  const requestUrl = new URL(region.dataset.engagementUrl);
  requestUrl.pathname = requestUrl.pathname.replace(/\/engagement$/, '/views');
  fetch(requestUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: document.documentElement.lang || undefined,
      referrer: document.referrer || undefined,
      campaign: viewCampaign()
    }),
    credentials: 'omit',
    keepalive: true
  }).catch(() => {});
}

/*
 * The comments island asks for a sign-in when the reader reaches for something that needs one.
 * Opening the window and replaying the interrupted intent stays here, because that is a property
 * of the page, not of any one island.
 */
document.addEventListener('gala-request-sign-in', (event) => {
  if (sessionUser || pendingIntent) return;
  requestSession({ kind: event.detail?.kind ?? 'comment' });
});

let sessionUser = null;
// The reader the current engagement render was built for: null until the frame reports, and
// null again for a signed-out reader, so an anonymous load never re-requests.
let renderedSessionUser = null;
let readerStateRequestId = null;
const pendingEngagementWrites = new Map();

/**
 * What the reader was doing when we had to ask who they are. Signing in is an interruption, so
 * the interruption has to end exactly where it started: the reaction they pressed gets applied,
 * and the comment they were typing keeps its text and its caret.
 */
let pendingIntent = null;
const sessionFrame = document.querySelector('[data-gala-session-frame]');
const sessionOrigin = sessionFrame ? new URL(sessionFrame.src).origin : null;
const sessionSiteId = sessionFrame ? new URL(sessionFrame.src).searchParams.get('siteId') ?? '' : '';
const resumeStorageKey = `gala.reader.resume.${sessionSiteId}`;
let sessionFrameReady = false;
let pendingSessionTransferCode = null;
let sessionFrameToken = null;
let fedCmController = null;
const FEDCM_GRANT_COOKIE = 'gala-fedcm-grant=1';

function hasFedCmGrant() {
  try {
    return document.cookie.split(';').some((value) => value.trim() === FEDCM_GRANT_COOKIE);
  } catch (error) {
    console.warn('Gala could not read this publication\'s FedCM grant marker.', error);
    return false;
  }
}

function rememberFedCmGrant() {
  try {
    document.cookie = 'gala-fedcm-grant=1; Max-Age=31536000; Path=/; SameSite=Strict; Secure';
  } catch (error) {
    console.warn('Gala could not remember this publication\'s FedCM grant.', error);
  }
}

function forgetFedCmGrant() {
  try {
    document.cookie = 'gala-fedcm-grant=; Max-Age=0; Path=/; SameSite=Strict; Secure';
  } catch (error) {
    console.warn('Gala could not clear this publication\'s FedCM grant.', error);
  }
}

function deliverSessionTransfer() {
  if (!sessionFrameReady || !sessionFrame || !pendingSessionTransferCode) return;
  sessionFrame.contentWindow?.postMessage({
    type: 'gala-session-transfer', transferCode: pendingSessionTransferCode,
  }, sessionOrigin);
  pendingSessionTransferCode = null;
}

function requestSessionState() {
  sessionFrame?.contentWindow?.postMessage({ type: 'gala-session-request' }, sessionOrigin);
}

if (sessionFrame) {
  // Wait for navigation away from the inherited about:blank origin before targeting the API.
  sessionFrame.addEventListener('load', requestSessionState);
}

function storedResumeCode() {
  try { return localStorage.getItem(resumeStorageKey); } catch { return null; }
}

function rememberResumeCode(code) {
  try { code ? localStorage.setItem(resumeStorageKey, code) : localStorage.removeItem(resumeStorageKey); } catch {}
}

async function fedCmSession(mode) {
  const status = document.querySelector('[data-engagement-status]');
  if (!sessionFrameToken) return false;
  if (!globalThis.IdentityCredential || typeof navigator.credentials?.get !== 'function') {
    if (status) status.textContent = 'FedCM is not available in this browser. Use a current browser to sign in.';
    return false;
  }
  if (fedCmController) {
    if (mode === 'passive') return false;
    fedCmController.abort();
  }
  const controller = new AbortController();
  fedCmController = controller;
  try {
    const provider = {
      configURL: 'https://api.gala67.com/v1/fedcm/config.json',
      clientId: sessionSiteId,
      fields: ['name', 'email'],
      params: { nonce: sessionFrameToken }
    };
    const identity = { providers: [provider] };
    if (mode === 'active') identity.mode = 'active';
    const credential = await navigator.credentials.get({
      identity,
      mediation: mode === 'active' ? 'required' : 'silent',
      signal: controller.signal
    });
    if (typeof credential?.token !== 'string') return false;
    if (mode === 'active') rememberFedCmGrant();
    pendingSessionTransferCode = credential.token;
    deliverSessionTransfer();
    return true;
  } catch (error) {
    if (mode === 'active' && error?.name !== 'NotAllowedError' && error?.name !== 'AbortError') {
      console.error('Gala FedCM sign-in failed.', error);
    }
    if (mode === 'active' && status) status.textContent = 'Sign-in did not finish. Try again.';
    return false;
  } finally {
    if (fedCmController === controller) fedCmController = null;
  }
}

function requestSession(intent) {
  const field = intent.field;
  pendingIntent = {
    kind: intent.kind,
    region: intent.region,
    selector: intent.selector,
    // Held here rather than left in the DOM, because signing in re-renders the region.
    draft: field ? field.value : null,
    caret: field ? field.selectionStart : null
  };
  if (field) field.blur();
  fedCmSession('active').then((started) => {
    if (!started) pendingIntent = null;
  });
}

/** Puts the reader back exactly where the sign-in interrupted them. */
function resumeIntent() {
  const intent = pendingIntent;
  if (!intent) return;
  // The sign-in window is still closing at the moment the session arrives, so focus set now
  // would be handed straight back to it. Wait until this page actually holds focus.
  if (!document.hasFocus()) return;
  // Re-found rather than remembered: signing in re-renders the engagement region, so a node
  // captured before the interruption may no longer be the one on the page.
  const element = intent.region?.querySelector(intent.selector);
  if (!element) return;
  pendingIntent = null;
  if (intent.kind === 'comment') {
    if (intent.draft != null && element.value === '') element.value = intent.draft;
    element.focus();
    if (intent.caret != null && typeof element.setSelectionRange === 'function') {
      element.setSelectionRange(intent.caret, intent.caret);
    }
    return;
  }
  // A reaction or follow was a completed decision, so carry it out rather than make them press
  // the same thing twice.
  element.click();
}

document.querySelectorAll('[data-engagement-url]').forEach((region) => {
  refreshEngagement(region);
  recordView(region);
});

function engagementErrorMessage(code) {
  if (code === 'AUTHENTICATION_REQUIRED' || code === 'INVALID_BEARER_TOKEN'
      || code === 'REAUTHENTICATION_REQUIRED') return 'Sign in again to continue.';
  if (code === 'ENGAGEMENT_RATE_LIMITED') return 'You are posting too quickly; try again shortly.';
  if (code === 'CONTACT_RATE_LIMITED') return 'You are sending too quickly; try again later.';
  if (code === 'RESOURCE_NOT_FOUND') return 'That item is no longer available.';
  if (code === 'INVALID_ENGAGEMENT_WRITE' || code === 'INVALID_CONTACT_SUBMISSION' || code === 'INVALID_REQUEST') return 'Check your entry and try again.';
  if (code === 'ACCESS_DENIED') return 'That action is not available for this account.';
  if (code === 'IDEMPOTENCY_CONFLICT' || code === 'ENGAGEMENT_STATE_CONFLICT') return 'The item changed; reload and try again.';
  return 'The action could not be completed. Try again.';
}

function sendEngagementWrite(operation, payload) {
  if (!sessionFrame || !sessionUser) return Promise.reject(new Error('AUTHENTICATION_REQUIRED'));
  const requestId = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingEngagementWrites.delete(requestId);
      reject(new Error('REQUEST_TIMEOUT'));
    }, 10_000);
    pendingEngagementWrites.set(requestId, {
      resolve: (value) => { clearTimeout(timeout); resolve(value); },
      reject: (error) => { clearTimeout(timeout); reject(error); }
    });
    sessionFrame.contentWindow.postMessage({
      type: 'gala-engagement-write', requestId, operation, payload
    }, new URL(sessionFrame.src).origin);
  });
}

document.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-contact-form] form');
  if (!form) return;
  event.preventDefault();
  const region = form.closest('[data-contact-form]');
  const status = region.querySelector('[data-contact-status]');
  if (!sessionUser) {
    status.textContent = 'Sign in with the account button before sending.';
    return;
  }
  const data = new FormData(form);
  try {
    status.textContent = 'Sending…';
    await sendEngagementWrite('contact.submit', {
      siteId: region.dataset.siteId,
      subject: data.get('subject'),
      message: data.get('message'),
      website: data.get('website') || null,
      phone: data.get('phone') || null
    });
    form.reset();
    status.textContent = 'Message sent.';
  } catch (error) {
    status.textContent = engagementErrorMessage(error.message);
  }
});

async function mutateEngagement(region, operation, payload) {
  const status = region.querySelector('[data-engagement-status]');
  try {
    if (status) status.textContent = 'Saving…';
    await sendEngagementWrite(operation, payload);
    if (status) status.textContent = 'Saved.';
    // The reader's own write must be visible to them at once, so this one bypasses the cache.
    await refreshEngagement(region, '', false, true);
    return true;
  } catch (error) {
    if (status) status.textContent = engagementErrorMessage(error.message);
    return false;
  }
}

if (sessionFrame) {
  window.addEventListener('message', (event) => {
    if (event.origin !== sessionOrigin || event.source !== sessionFrame.contentWindow) return;
    if (event.data?.type === 'gala-fedcm-sign-out') {
      rememberResumeCode(null);
      forgetFedCmGrant();
      navigator.credentials?.preventSilentAccess?.().catch((error) => {
        console.error('Gala could not disable silent FedCM access after sign-out.', error);
      });
      return;
    }
    if (event.data?.type === 'gala-engagement-result') {
      const pending = pendingEngagementWrites.get(event.data.requestId);
      if (!pending) return;
      pendingEngagementWrites.delete(event.data.requestId);
      if (event.data.ok === true) pending.resolve(event.data.result);
      else pending.reject(new Error(event.data.error?.code || 'ENGAGEMENT_WRITE_FAILED'));
      return;
    }
    if (event.data?.type === 'gala-reader-state-result') {
      if (event.data.requestId !== readerStateRequestId || event.data.ok !== true) return;
      readerStateRequestId = null;
      const active = new Set(Array.isArray(event.data.state?.reactions) ? event.data.state.reactions : []);
      document.querySelectorAll('[data-reaction]').forEach((control) => {
        control.setAttribute('aria-pressed', String(active.has(control.dataset.reaction)));
      });
      document.querySelectorAll('[data-follow-article]').forEach((control) => {
        const following = event.data.state?.following === true;
        presentFollowState(control, following);
      });
      return;
    }
    /* The frame is cross-origin, so its content height is not readable from here - it reports
       its own, and the box is sized to it. Without this the account panel scrolled inside a fixed
       box, clipping the first line of its own text. */
    if (event.data?.type === 'gala-session-height') {
      const height = Number(event.data.height);
      if (Number.isFinite(height) && height > 0 && height < 2000) {
        sessionFrame.height = String(Math.ceil(height));
      }
      return;
    }
    if (event.data?.type !== 'gala-session') return;
    sessionFrameReady = true;
    const resumeCode = storedResumeCode();
    if (!event.data.user && resumeCode) {
      sessionFrame.contentWindow?.postMessage({
        type: 'gala-session-resume', resumeCode,
      }, sessionOrigin);
    }
    if (typeof event.data.frameToken === 'string') {
      sessionFrameToken = event.data.frameToken;
      document.querySelector('[data-user-control]')?.setAttribute('data-fedcm-ready', 'true');
    }
    if (pendingSessionTransferCode) deliverSessionTransfer();
    sessionUser = event.data.user && typeof event.data.user.id === 'string' ? event.data.user : null;
    if (typeof event.data.resumeCode === 'string') rememberResumeCode(event.data.resumeCode);
    else if (event.data.resumeRejected === true) rememberResumeCode(null);
    const control = document.querySelector('[data-user-control]');
    const displayName = sessionUser?.displayName;
    if (control) {
      control.setAttribute('aria-label', displayName
        ? `Account: ${displayName}` : 'Sign in or view account');
      control.title = displayName ? `Account: ${displayName}` : 'Account';
      const label = control.querySelector('[data-user-label]');
      if (label) label.textContent = displayName || 'Sign in';
    }
    // The session frame reports on every page load, signed in or not. Re-reading engagement
    // then duplicated the request made on load and returned an identical payload for anyone
    // who was not signed in. Only a change of reader can change what the API answers.
    const changed = renderedSessionUser !== (sessionUser?.id ?? null);
    renderedSessionUser = sessionUser?.id ?? null;
    if (sessionUser) {
      const region = document.querySelector('[data-article-id]');
      if (region) {
        readerStateRequestId = crypto.randomUUID();
        sessionFrame.contentWindow.postMessage({
          type: 'gala-reader-state-request', requestId: readerStateRequestId,
          articleId: region.dataset.articleId
        }, sessionOrigin);
      }
    }
    document.querySelectorAll('[data-engagement-url]').forEach((region) => {
      if (changed) refreshEngagement(region);
    });
    // Signed in on the back of an interrupted action: finish what they were doing.
    if (sessionUser && pendingIntent) resumeIntent();
    if (!sessionUser && sessionFrameToken && hasFedCmGrant()) fedCmSession('passive');
  });
}
