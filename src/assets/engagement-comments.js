import { engagementErrorMessage, requestSignIn, sendEngagementWrite, sessionUser } from './engagement-transport.js';

const MAXIMUM_DEPTH = 5;
const element = (name, className, text) => {
  const node = document.createElement(name);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function threads(items) {
  const children = new Map();
  for (const item of items) {
    const parent = item.parentCommentId ?? '';
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent).push(item);
  }
  const build = (parent, depth) => (children.get(parent) ?? []).map((item) => ({
    ...item, depth, replies: build(item.commentId, depth + 1),
  }));
  return build('', 0);
}

function commentsController(root, endpoint) {
  const state = { items: [], cursor: null, total: 0, busy: false, status: '', phase: 'loading' };
  const articleId = /\/v1\/articles\/([^/]+)\/engagement/.exec(endpoint)?.[1] ?? '';
  const statusNode = root.closest('.gala-conversation')?.querySelector('[data-engagement-status]');

  async function load(nextCursor = '', { append = false, fresh = false } = {}) {
    const url = new URL(endpoint);
    if (nextCursor) url.searchParams.set('commentsCursor', nextCursor);
    const response = await fetch(url, {
      headers: { Accept: 'application/json' }, credentials: 'omit', cache: fresh ? 'no-store' : 'default',
    });
    if (!response.ok) throw new Error(`Comments returned HTTP ${response.status}`);
    const page = (await response.json())?.data?.comments;
    if (!page || !Array.isArray(page.items)) throw new TypeError('Comment page is invalid');
    state.items = append ? [...state.items, ...page.items] : page.items;
    state.cursor = page.nextCursor ?? null;
    if (Number.isSafeInteger(page.totalCount)) state.total = page.totalCount;
  }

  async function write(operation, payload) {
    if (!sessionUser.value) { requestSignIn({ kind: 'comment' }); return false; }
    state.busy = true;
    state.status = operation === 'comment.create' ? 'Posting comment…' : 'Saving comment…';
    render();
    try {
      await sendEngagementWrite(operation, payload);
      await load('', { fresh: true });
      state.status = '';
      return true;
    } catch (error) {
      state.status = engagementErrorMessage(error.message);
      return false;
    } finally { state.busy = false; render(); }
  }

  function form(label, initial, submit) {
    const formNode = element('form', 'gala-comment__form');
    const field = element('textarea');
    field.rows = 3; field.value = initial; field.placeholder = label; field.setAttribute('aria-label', label);
    const send = element('button', state.busy ? 'gala-comment__submit--busy' : '',
      state.busy ? 'Posting…' : 'Post');
    send.type = 'submit'; send.disabled = state.busy;
    formNode.append(field, send);
    formNode.addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = field.value.trim();
      if (body && await submit(body)) field.value = '';
    });
    return formNode;
  }

  function commentNode(comment) {
    const item = element('li', 'gala-comment');
    item.dataset.commentId = comment.commentId; item.dataset.depth = comment.depth;
    const meta = element('p', 'gala-comment__meta');
    meta.append(element('strong', '', comment.author?.displayName ?? '[deleted]'));
    if (comment.createdAt) {
      const time = element('time', '', new Date(comment.createdAt).toLocaleDateString());
      time.dateTime = comment.createdAt; meta.append(time);
    }
    item.append(meta, element('p', 'gala-comment__body', comment.deleted ? '[deleted]' : comment.body));
    if (!comment.deleted) {
      const actions = element('div', 'gala-comment-actions');
      if (comment.depth < MAXIMUM_DEPTH) {
        const reply = element('button', '', 'Reply'); reply.type = 'button'; reply.dataset.replyComment = comment.commentId;
        reply.addEventListener('click', () => {
          const existing = item.querySelector(':scope > .gala-comment__form');
          if (existing) { existing.remove(); return; }
          actions.after(form(`Reply to ${comment.author?.displayName ?? 'this comment'}`, '',
            (body) => write('comment.create', { articleId, parentCommentId: comment.commentId, body })));
        }); actions.append(reply);
      }
      const mine = sessionUser.value && comment.author?.userId === sessionUser.value.id;
      if (mine) {
        const edit = element('button', '', 'Edit'); edit.type = 'button'; edit.dataset.editComment = comment.commentId;
        edit.addEventListener('click', () => actions.after(form('Edit your comment', comment.body ?? '',
          (body) => write('comment.edit', { articleId, commentId: comment.commentId, body }))));
        const remove = element('button', '', 'Delete'); remove.type = 'button'; remove.dataset.deleteComment = comment.commentId;
        remove.addEventListener('click', () => write('comment.delete', { articleId, commentId: comment.commentId }));
        actions.append(edit, remove);
      } else {
        const report = element('button', '', 'Report'); report.type = 'button'; report.dataset.reportComment = comment.commentId;
        report.addEventListener('click', () => write('comment.report', { articleId, commentId: comment.commentId, reason: 'OTHER' }));
        actions.append(report);
      }
      item.append(actions);
    }
    if (comment.replies.length) {
      const replies = element('ol', 'gala-comment-replies');
      replies.append(...comment.replies.map(commentNode)); item.append(replies);
    }
    return item;
  }

  function render() {
    if (statusNode) {
      statusNode.textContent = state.phase === 'loading'
        ? 'Loading comments…'
        : state.phase === 'unavailable' ? 'Comments are temporarily unavailable.' : state.status;
    }
    if (state.phase !== 'ready') {
      root.replaceChildren();
      return;
    }
    const section = element('section', 'gala-comments-island'); section.setAttribute('aria-label', 'Comments');
    section.append(element('p', 'gala-comments__heading', state.total === 1 ? '1 comment' : `${state.total} comments`));
    if (sessionUser.value) section.append(form('Add a comment', '', (body) => write('comment.create', { articleId, body })));
    else {
      const prompt = element('p', 'gala-comments__prompt');
      const signIn = element('button', '', 'Sign in to join the conversation'); signIn.type = 'button';
      signIn.addEventListener('click', () => requestSignIn({ kind: 'comment' })); prompt.append(signIn); section.append(prompt);
    }
    if (!state.items.length) section.append(element('p', 'gala-comments__empty', 'No comments yet.'));
    else { const list = element('ol', 'gala-comments'); list.append(...threads(state.items).map(commentNode)); section.append(list); }
    if (state.cursor) {
      const more = element('button', 'gala-comments__more', 'Show more comments'); more.type = 'button'; more.disabled = state.busy;
      more.addEventListener('click', async () => {
        state.busy = true; state.status = 'Loading more comments…'; render();
        try { await load(state.cursor, { append: true }); state.status = ''; }
        catch { state.status = 'More comments couldn’t be loaded. Try again.'; }
        state.busy = false; render();
      }); section.append(more);
    }
    root.replaceChildren(section);
  }

  window.addEventListener('gala-session-change', render);
  render();
  load().then(() => { state.phase = 'ready'; })
    .catch(() => { state.phase = 'unavailable'; })
    .finally(render);
}

document.querySelectorAll('[data-gala-comments]').forEach((root) => {
  const endpoint = root.closest('[data-engagement-url]')?.dataset.engagementUrl;
  if (endpoint) commentsController(root, endpoint);
});
