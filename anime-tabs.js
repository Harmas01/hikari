(() => {
  const tabs = document.querySelector('.anime-tabs');
  const info = document.querySelector('.anime-info');
  const main = document.querySelector('.anime-main-panel');
  if (!tabs || !info || !main || tabs.dataset.functional) return;
  tabs.dataset.functional = 'true';

  const buttons = [...tabs.querySelectorAll('button')];
  const names = ['about', 'comments', 'discussions', 'reviews'];
  buttons.forEach((button, index) => {
    button.dataset.animeTab = names[index];
    button.classList.remove('muted-tab');
    button.removeAttribute('title');
  });

  const content = document.createElement('section');
  content.className = 'anime-community-panels';
  content.innerHTML = `
    <div class="anime-community-panel" data-panel="discussions">
      <div class="community-panel-heading"><div><span>Обсуждения</span><small>Ваши заметки и темы об этом аниме</small></div></div>
      <form class="community-editor" data-community-form="discussions">
        <input maxlength="80" name="title" placeholder="Название обсуждения" required>
        <textarea maxlength="800" name="body" placeholder="Что вы хотите обсудить?" required></textarea>
        <div><span class="community-status"></span><button type="submit">Опубликовать</button></div>
      </form>
      <div class="community-items" data-community-items="discussions"></div>
    </div>
    <div class="anime-community-panel" data-panel="reviews">
      <div class="community-panel-heading"><div><span>Ваш отзыв</span><small>Оценка и впечатления сохраняются в Supabase</small></div></div>
      <form class="community-editor" data-community-form="reviews">
        <label class="review-score"><span>Оценка <b>8.0</b></span><input name="score" type="range" min="1" max="10" step="0.1" value="8"></label>
        <textarea maxlength="1200" name="body" placeholder="Напишите честный отзыв без спойлеров…" required></textarea>
        <div><span class="community-status"></span><button type="submit">Сохранить отзыв</button></div>
      </form>
      <div class="community-items" data-community-items="reviews"></div>
    </div>`;
  tabs.insertAdjacentElement('afterend', content);

  const client = () => window.authClient || (typeof authClient !== 'undefined' ? authClient : null);
  const animeId = () => typeof selectedAnime !== 'undefined' ? String(selectedAnime) : '0';
  const safe = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const censor = (value) => String(value).replace(/\b(бля(?:ть|дь)?|сука|хуй\w*|пизд\w*|еба\w*|ёба\w*|мудак\w*)\b/giu, (word) => '*'.repeat(word.length));
  const aboutElements = () => [info.querySelector('.meta'), info.querySelector('.tags'), info.querySelector('.description'), info.querySelector('.anime-related-card'), main.querySelector('.anime-awards'), main.querySelector('.rating-overview')].filter(Boolean);

  function openLogin() {
    document.querySelector('#authModal')?.classList.add('open');
  }

  async function renderCommunity(type) {
    const auth = client();
    const target = content.querySelector(`[data-community-items="${type}"]`);
    if (!auth || !target) return;
    const { data: { user } } = await auth.auth.getUser();
    if (!user) {
      target.innerHTML = '<div class="community-empty"><b>Войдите в аккаунт</b><span>После входа записи будут сохраняться в Supabase.</span><button type="button" data-community-login>Войти</button></div>';
      return;
    }

    const key = type === 'reviews' ? 'animeReviews' : 'animeDiscussions';
    const storage = user.user_metadata?.[key] || {};
    const records = Array.isArray(storage[animeId()]) ? storage[animeId()] : storage[animeId()] ? [storage[animeId()]] : [];
    if (!records.length) {
      target.innerHTML = `<div class="community-empty"><b>${type === 'reviews' ? 'Отзыв ещё не написан' : 'Обсуждений пока нет'}</b><span>Создайте первую запись с помощью формы выше.</span></div>`;
      return;
    }

    target.innerHTML = records.slice().reverse().map((item) => `<article class="community-entry"><div><b>${safe(item.title || (type === 'reviews' ? `★ ${Number(item.score).toFixed(1)}` : 'Обсуждение'))}</b><time>${new Date(item.createdAt).toLocaleDateString('ru-RU')}</time></div><p>${safe(item.body)}</p><button type="button" data-remove-community="${safe(type)}" data-entry-id="${safe(item.id)}">Удалить</button></article>`).join('');

    if (type === 'reviews' && records[0]) {
      const form = content.querySelector('[data-community-form="reviews"]');
      form.elements.body.value = records[0].body || '';
      form.elements.score.value = records[0].score || 8;
      form.querySelector('.review-score b').textContent = Number(records[0].score || 8).toFixed(1);
    }
  }

  function activate(name) {
    buttons.forEach((button) => button.classList.toggle('active', button.dataset.animeTab === name));
    const showAbout = name === 'about';
    aboutElements().forEach((element) => element.classList.toggle('tab-hidden', !showAbout));
    content.classList.toggle('active', name === 'discussions' || name === 'reviews');
    content.querySelectorAll('.anime-community-panel').forEach((panel) => panel.classList.toggle('active', panel.dataset.panel === name));
    if (name === 'discussions' || name === 'reviews') renderCommunity(name);
  }

  tabs.addEventListener('click', (event) => {
    const button = event.target.closest('[data-anime-tab]');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const name = button.dataset.animeTab;
    if (name === 'comments') {
      if (typeof setView === 'function') setView('watch');
      setTimeout(() => document.querySelector('#watch .comments')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 180);
      return;
    }
    activate(name);
  }, true);

  content.addEventListener('input', (event) => {
    if (event.target.matches('[name="score"]')) event.target.closest('form').querySelector('.review-score b').textContent = Number(event.target.value).toFixed(1);
  });

  content.addEventListener('click', async (event) => {
    if (event.target.closest('[data-community-login]')) return openLogin();
    const remove = event.target.closest('[data-remove-community]');
    if (!remove) return;
    const auth = client();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return openLogin();
    const type = remove.dataset.removeCommunity;
    const key = type === 'reviews' ? 'animeReviews' : 'animeDiscussions';
    const storage = { ...(user.user_metadata?.[key] || {}) };
    const records = Array.isArray(storage[animeId()]) ? storage[animeId()] : storage[animeId()] ? [storage[animeId()]] : [];
    storage[animeId()] = records.filter((item) => String(item.id) !== remove.dataset.entryId);
    const metadata = { ...(user.user_metadata || {}), [key]: storage };
    await auth.auth.updateUser({ data: metadata });
    renderCommunity(type);
  });

  content.querySelectorAll('[data-community-form]').forEach((form) => form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const auth = client();
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return openLogin();

    const type = form.dataset.communityForm;
    const key = type === 'reviews' ? 'animeReviews' : 'animeDiscussions';
    const status = form.querySelector('.community-status');
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    status.textContent = 'Сохраняем…';

    const storage = { ...(user.user_metadata?.[key] || {}) };
    const old = Array.isArray(storage[animeId()]) ? storage[animeId()] : storage[animeId()] ? [storage[animeId()]] : [];
    const record = {
      id: type === 'reviews' ? `review-${animeId()}` : `${Date.now()}`,
      title: type === 'reviews' ? '' : censor(form.elements.title.value.trim()),
      body: censor(form.elements.body.value.trim()),
      score: type === 'reviews' ? Number(form.elements.score.value) : undefined,
      createdAt: new Date().toISOString()
    };
    storage[animeId()] = type === 'reviews' ? [record] : [...old, record].slice(-20);
    const metadata = { ...(user.user_metadata || {}), [key]: storage };
    const { error } = await auth.auth.updateUser({ data: metadata });
    button.disabled = false;
    status.textContent = error ? 'Не удалось сохранить' : 'Сохранено в Supabase';
    if (!error) {
      if (type === 'discussions') form.reset();
      renderCommunity(type);
    }
  }));

  const title = document.querySelector('.anime-info h1');
  if (title) new MutationObserver(() => activate('about')).observe(title, { childList: true });

  const style = document.createElement('style');
  style.textContent = `.tab-hidden{display:none!important}.anime-community-panels{display:none}.anime-community-panels.active{display:block}.anime-community-panel{display:none;padding:3px 0 8px}.anime-community-panel.active{display:block}.community-panel-heading{display:flex;justify-content:space-between;align-items:center;margin:7px 0 18px}.community-panel-heading div{display:grid;gap:4px}.community-panel-heading span{font:700 18px Manrope}.community-panel-heading small{color:#888b94;font-size:11px}.community-editor{display:grid;gap:10px;padding:16px;background:#17181c;border:1px solid #2b2d34;border-radius:12px}.community-editor input[type="text"],.community-editor>input,.community-editor textarea{width:100%;border:1px solid #32343c;border-radius:9px;background:#202126;color:#eee;padding:11px 12px;font:12px Inter;outline:none}.community-editor textarea{min-height:110px;resize:vertical;line-height:1.55}.community-editor input:focus,.community-editor textarea:focus{border-color:#7961d5}.community-editor>div{display:flex;justify-content:space-between;align-items:center}.community-editor button,.community-empty button{border:0;border-radius:9px;background:#7958e8;color:#fff;padding:9px 15px;font:600 11px Inter;cursor:pointer}.community-editor button:disabled{opacity:.55}.community-status{color:#8e9099;font-size:10px}.community-items{display:grid;gap:10px;margin-top:13px}.community-entry{padding:15px 16px;background:#17181c;border:1px solid #2b2d34;border-radius:11px}.community-entry>div{display:flex;justify-content:space-between;gap:12px}.community-entry b{font-size:12px}.community-entry time{color:#777a84;font-size:10px}.community-entry p{color:#b7b8be;font-size:12px;line-height:1.6;white-space:pre-wrap}.community-entry>button{border:0;background:transparent;color:#d67b83;padding:0;font-size:10px;cursor:pointer}.community-empty{display:grid;justify-items:start;gap:6px;padding:25px;border:1px dashed #343641;border-radius:11px;color:#898b94}.community-empty b{color:#d4d5d9;font-size:13px}.community-empty span{font-size:11px}.community-empty button{margin-top:7px}.review-score{display:grid;gap:8px;color:#aaa;font-size:11px}.review-score span{display:flex;justify-content:space-between}.review-score b{color:#d6caff;font-size:16px}.review-score input{accent-color:#8665ef}`;
  document.head.append(style);
  activate('about');
})();