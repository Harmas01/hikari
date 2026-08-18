(() => {
  let marking = false;

  const notify = (message) => {
    if (typeof window.toastMessage === 'function') window.toastMessage(message);
  };

  const getClient = () => window.authClient || (typeof authClient !== 'undefined' ? authClient : null);

  async function addDeleteButtons() {
    const list = document.querySelector('#commentList');
    const client = getClient();
    if (!list || !client || marking) return;

    marking = true;
    try {
      const { data: { user } } = await client.auth.getUser();
      if (!user) return;

      let query = client.from('comments').select('id').eq('author_id', user.id);
      if (typeof window.selectedAnime !== 'undefined') query = query.eq('anime_id', window.selectedAnime);
      const { data, error } = await query;
      if (error) return;

      const ownIds = new Set((data || []).map((item) => String(item.id)));
      list.querySelectorAll('.comment[data-comment-id]').forEach((comment) => {
        const id = String(comment.dataset.commentId || '');
        if (!ownIds.has(id)) return;

        let actions = Array.from(comment.children).find((child) => child.classList?.contains('comment-actions'));
        if (!actions) {
          actions = document.createElement('div');
          actions.className = 'comment-actions';
          comment.append(actions);
        }

        if (!actions.querySelector('.comment-delete[data-delete-id]')) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'comment-delete';
          button.dataset.deleteId = id;
          button.textContent = 'Удалить';
          actions.append(button);
        }
      });
    } finally {
      marking = false;
    }
  }

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('.comment-delete[data-delete-id]');
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const client = getClient();
    if (!client) return;
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      notify('Сначала войдите в аккаунт');
      return;
    }

    button.disabled = true;
    button.textContent = 'Удаляем…';
    const { error } = await client
      .from('comments')
      .delete()
      .eq('id', button.dataset.deleteId)
      .eq('author_id', user.id);

    if (error) {
      button.disabled = false;
      button.textContent = 'Удалить';
      notify('Не удалось удалить комментарий');
      return;
    }

    button.closest('.comment')?.remove();
    notify('Комментарий удалён');
    if (typeof window.loadAnimeComments === 'function') window.loadAnimeComments();
  }, true);

  const start = () => {
    const list = document.querySelector('#commentList');
    if (!list) {
      setTimeout(start, 300);
      return;
    }
    new MutationObserver(addDeleteButtons).observe(list, { childList: true, subtree: true });
    addDeleteButtons();
    setInterval(addDeleteButtons, 1500);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  const style = document.createElement('style');
  style.textContent = `.comment-delete{border:1px solid rgba(244,90,90,.28);background:rgba(244,90,90,.08);color:#ff9b9b;border-radius:9px;padding:6px 10px;font:inherit;font-size:12px;cursor:pointer;transition:background .2s ease,color .2s ease,border-color .2s ease}.comment-delete:hover{background:rgba(244,90,90,.16);border-color:rgba(244,90,90,.5);color:#ffc0c0}.comment-delete:disabled{opacity:.55;cursor:wait}`;
  document.head.append(style);
})();