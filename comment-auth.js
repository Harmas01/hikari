(() => {
  let currentUser = null;
  let authReady = false;

  const getClient = () => window.authClient || (typeof authClient !== 'undefined' ? authClient : null);

  function updateCommentAccess() {
    const form = document.querySelector('#commentForm');
    const input = document.querySelector('#commentInput');
    if (!form || !input) return;

    const submit = form.querySelector('button[type="submit"]');
    let note = form.parentElement?.querySelector('.comment-auth-note');
    if (!note) {
      note = document.createElement('p');
      note.className = 'comment-auth-note';
      form.insertAdjacentElement('afterend', note);
    }

    const allowed = authReady && Boolean(currentUser);
    input.disabled = !allowed;
    if (submit) submit.disabled = !allowed;
    input.placeholder = allowed ? 'Напишите комментарий…' : 'Войдите, чтобы написать комментарий';

    if (allowed) {
      note.hidden = true;
      note.innerHTML = '';
    } else {
      note.hidden = false;
      note.innerHTML = '<button type="button" class="comment-login-button">Войти</button><span>Чтобы писать комментарии, нужен аккаунт.</span>';
    }
  }

  function showLogin() {
    const modal = document.querySelector('#authModal');
    if (modal) modal.classList.add('open');
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('.comment-login-button')) showLogin();
  });

  document.addEventListener('submit', (event) => {
    if (!event.target.matches('#commentForm')) return;
    if (authReady && currentUser) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    showLogin();
  }, true);

  async function start() {
    const client = getClient();
    if (!client) {
      setTimeout(start, 250);
      return;
    }

    const { data } = await client.auth.getSession();
    currentUser = data?.session?.user || null;
    authReady = true;
    updateCommentAccess();

    client.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      authReady = true;
      updateCommentAccess();
    });

    new MutationObserver(updateCommentAccess).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  const style = document.createElement('style');
  style.textContent = `.comment-form input:disabled{opacity:.65;cursor:not-allowed}.comment-form button:disabled{opacity:.45;cursor:not-allowed}.comment-auth-note{display:flex;align-items:center;gap:10px;margin:10px 0 0;color:#999;font-size:13px}.comment-auth-note[hidden]{display:none}.comment-login-button{border:1px solid rgba(139,92,246,.38);background:rgba(139,92,246,.12);color:#cbb8ff;border-radius:9px;padding:7px 12px;font:inherit;font-weight:600;cursor:pointer;transition:background .2s ease,border-color .2s ease}.comment-login-button:hover{background:rgba(139,92,246,.2);border-color:rgba(139,92,246,.62)}`;
  document.head.append(style);
})();