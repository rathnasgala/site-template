/**
 * The conversation under an article.
 *
 * Built as an island rather than by hand-writing DOM, because the state here is real: a thread
 * five deep, a page of roots with more behind a cursor, a reply form belonging to one comment, an
 * edit in progress, and a reader who may sign in halfway through. The imperative version rebuilt
 * the whole region from a fresh fetch after every write, which is how a posted comment could take
 * a browser cache's word for it and not appear at all — and a comment that is not rendered has no
 * Reply button, so the thread died with it.
 *
 * The article itself is never touched. Eleventy renders the post and everything search engines
 * read; this mounts only into the comments container, which was always filled from the API and so
 * has nothing to lose by being rendered here.
 */
import { h, render } from './vendor/preact.js';
import { useCallback, useEffect, useMemo, useState } from './vendor/hooks.js';
import htm from './vendor/htm.js';
// Importing the signals integration is what lets a component re-render when it reads `.value`.
import './vendor/signals.js';
import {
  engagementErrorMessage, requestSignIn, sendEngagementWrite, sessionUser,
} from './engagement-transport.js';

const html = htm.bind(h);

/** The server's own limit. A reply deeper than this is refused, so it is not offered. */
const MAXIMUM_DEPTH = 5;

const isoTime = (value) => {
  const at = Date.parse(value);
  return Number.isFinite(at) ? new Date(at).toLocaleDateString() : '';
};

/** Roots in order, each followed by its own descendants, from one flat API page. */
function toThreads(items) {
  const byParent = new Map();
  for (const item of items) {
    const key = item.parentCommentId ?? '';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(item);
  }
  const build = (parentId, depth) => (byParent.get(parentId) ?? []).map((comment) => ({
    ...comment,
    depth,
    replies: build(comment.commentId, depth + 1),
  }));
  return build('', 0);
}

function Comment({ comment, reader, onReply, onEdit, onDelete, busy }) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const mine = !comment.deleted && reader && comment.author?.userId === reader.id;
  const canReply = !comment.deleted && comment.depth < MAXIMUM_DEPTH;

  const submitReply = async (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    const posted = await onReply(comment.commentId, draft.trim());
    if (posted) { setDraft(''); setReplying(false); }
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    const saved = await onEdit(comment.commentId, draft.trim());
    if (saved) setEditing(false);
  };

  return html`
    <li class="gala-comment" data-comment-id=${comment.commentId} data-depth=${comment.depth}>
      <p class="gala-comment__meta">
        <strong>${comment.author?.displayName ?? '[deleted]'}</strong>
        ${comment.createdAt && html`<time datetime=${comment.createdAt}>${isoTime(comment.createdAt)}</time>`}
        ${comment.editedAt && html`<span class="gala-comment__edited">edited</span>`}
        ${comment.pending && html`<span class="gala-comment__pending">sending…</span>`}
      </p>

      ${editing
        ? html`<form class="gala-comment__form" onSubmit=${submitEdit}>
            <label class="gala-visually-hidden" for=${`edit-${comment.commentId}`}>Edit your comment</label>
            <textarea id=${`edit-${comment.commentId}`} rows="3" value=${draft}
              onInput=${(e) => setDraft(e.target.value)}></textarea>
            <div class="gala-comment__controls">
              <button type="submit" disabled=${busy}>Save</button>
              <button type="button" onClick=${() => setEditing(false)}>Cancel</button>
            </div>
          </form>`
        : html`<p class="gala-comment__body">${comment.deleted ? '[deleted]' : comment.body}</p>`}

      ${!comment.deleted && html`
        <div class="gala-comment-actions">
          ${canReply && html`<button type="button" data-reply-comment=${comment.commentId}
            onClick=${() => { setReplying((open) => !open); setDraft(''); }}>Reply</button>`}
          ${mine && html`<button type="button" data-edit-comment=${comment.commentId}
            onClick=${() => { setEditing(true); setDraft(comment.body ?? ''); }}>Edit</button>`}
          ${mine && html`<button type="button" data-delete-comment=${comment.commentId}
            onClick=${() => onDelete(comment.commentId)} disabled=${busy}>Delete</button>`}
        </div>`}

      ${replying && html`
        <form class="gala-comment__form" onSubmit=${submitReply}>
          <label class="gala-visually-hidden" for=${`reply-${comment.commentId}`}>
            Reply to ${comment.author?.displayName ?? 'this comment'}
          </label>
          <textarea id=${`reply-${comment.commentId}`} rows="3" value=${draft} autofocus
            placeholder="Write a reply" onInput=${(e) => setDraft(e.target.value)}></textarea>
          <div class="gala-comment__controls">
            <button type="submit" disabled=${busy || !draft.trim()}>Post reply</button>
            <button type="button" onClick=${() => setReplying(false)}>Cancel</button>
          </div>
        </form>`}

      ${comment.replies.length > 0 && html`
        <ol class="gala-comment-replies">
          ${comment.replies.map((reply) => html`
            <${Comment} key=${reply.commentId} comment=${reply} reader=${reader} busy=${busy}
              onReply=${onReply} onEdit=${onEdit} onDelete=${onDelete} />`)}
        </ol>`}
    </li>`;
}

function Comments({ endpoint }) {
  // Reading `.value` during render subscribes this component to the signal, so a sign-in
  // anywhere on the page re-renders the conversation without anything having to tell it.
  const reader = sessionUser.value;
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);

  /* `fresh` skips the browser cache. The endpoint is `max-age=60, public`, which is right for a
     cold visit and wrong straight after a write: the browser would answer from its own cache with
     the state from before the reader wrote anything. */
  const load = useCallback(async (nextCursor = '', { append = false, fresh = false } = {}) => {
    const url = new URL(endpoint);
    if (nextCursor) url.searchParams.set('commentsCursor', nextCursor);
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
      credentials: 'omit',
      cache: fresh ? 'no-store' : 'default',
    });
    if (!response.ok) throw new Error(`Comments returned HTTP ${response.status}`);
    const payload = await response.json();
    const page = payload?.data?.comments;
    if (!page) throw new TypeError('Comment page is invalid');
    setItems((current) => (append ? [...current, ...page.items] : page.items));
    setCursor(page.nextCursor ?? null);
    if (Number.isSafeInteger(page.totalCount)) setTotal(page.totalCount);
    return page;
  }, [endpoint]);

  useEffect(() => {
    let live = true;
    load().catch(() => { if (live) setStatus('Comments are temporarily unavailable.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [load]);

  // Signing in changes what the reader may do, not what the article says, so only re-read when
  // the reader actually changes.
  useEffect(() => {
    if (!reader) return undefined;
    load('', { fresh: true }).catch(() => {});
    return undefined;
  }, [reader?.id]);

  const write = useCallback(async (operation, payload, optimistic) => {
    if (!reader) { requestSignIn({ kind: 'comment' }); return false; }
    setBusy(true);
    setStatus('');
    if (optimistic) setItems((current) => [optimistic, ...current]);
    try {
      await sendEngagementWrite(operation, payload);
      /* Re-read past the cache so what is on screen is what the server actually holds — the
         optimistic row above is a promise to the reader, not a source of truth. */
      await load('', { fresh: true });
      return true;
    } catch (error) {
      if (optimistic) {
        setItems((current) => current.filter((item) => item.commentId !== optimistic.commentId));
      }
      setStatus(engagementErrorMessage(error.message));
      return false;
    } finally {
      setBusy(false);
    }
  }, [reader?.id, load]);

  const articleId = useMemo(() => {
    const match = /\/v1\/articles\/([^/]+)\/engagement/.exec(endpoint);
    return match ? match[1] : '';
  }, [endpoint]);

  const post = async (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    const posted = await write('comment.create', { articleId, body }, {
      commentId: `pending-${crypto.randomUUID()}`,
      parentCommentId: null,
      body,
      depth: 0,
      createdAt: new Date().toISOString(),
      author: { userId: reader?.id, displayName: reader?.displayName },
      pending: true,
    });
    if (posted) setDraft('');
  };

  const reply = (parentCommentId, body) =>
    write('comment.create', { articleId, parentCommentId, body });
  const edit = (commentId, body) => write('comment.edit', { articleId, commentId, body });
  const remove = (commentId) => write('comment.delete', { articleId, commentId });

  const threads = useMemo(() => toThreads(items), [items]);

  return html`
    <section class="gala-comments-island" aria-label="Comments">
      <h2 class="gala-comments__heading">${total === 1 ? '1 comment' : `${total} comments`}</h2>

      ${reader
        ? html`<form class="gala-comment__form" onSubmit=${post}>
            <label class="gala-visually-hidden" for="gala-new-comment">Add a comment</label>
            <textarea id="gala-new-comment" rows="3" value=${draft} placeholder="Add a comment"
              onInput=${(e) => setDraft(e.target.value)}></textarea>
            <button type="submit" disabled=${busy || !draft.trim()}>Post comment</button>
          </form>`
        : html`<p class="gala-comments__prompt">
            <button type="button" onClick=${() => requestSignIn({ kind: 'comment' })}>
              Sign in to join the conversation
            </button>
          </p>`}

      ${status && html`<p class="gala-comments__status" role="status">${status}</p>`}

      ${loading
        ? html`<p class="gala-comments__status" role="status">Loading comments…</p>`
        : threads.length === 0
          ? html`<p class="gala-comments__empty">No comments yet.</p>`
          : html`<ol class="gala-comments">
              ${threads.map((comment) => html`
                <${Comment} key=${comment.commentId} comment=${comment} reader=${reader}
                  busy=${busy} onReply=${reply} onEdit=${edit} onDelete=${remove} />`)}
            </ol>`}

      ${cursor && html`
        <button type="button" class="gala-comments__more" disabled=${busy}
          onClick=${() => { setBusy(true); load(cursor, { append: true })
            .catch(() => setStatus('Could not load more comments.'))
            .finally(() => setBusy(false)); }}>
          Show more comments
        </button>`}
    </section>`;
}

for (const mount of document.querySelectorAll('[data-gala-comments]')) {
  const endpoint = mount.closest('[data-engagement-url]')?.dataset.engagementUrl;
  if (endpoint) render(html`<${Comments} endpoint=${endpoint} />`, mount);
}
