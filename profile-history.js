(() => {
  let activeUser = null;
  let saveQueue = Promise.resolve();
  let currentHistory = [];

  const client = () => window.authClient || (typeof authClient !== 'undefined' ? authClient : null);
  const safe = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  function selectedShow() {
    const index = typeof selectedAnime !== 'undefined' ? Number(selectedAnime) : 0;
    const show = typeof shows !== 'undefined' ? shows[index] : null;
    return {
      id: index,
      title: show?.[0] || document.querySelector('.anime-info h1')?.textContent || 'Аниме',
      image: show?.[3] || document.querySelector('.anime-cover img')?.src || '',
      episode: Number(document.querySelector('#currentEpisode')?.textContent || 1)
    };
  }

  function historyFrom(user) {
    const value = user?.user_metadata?.watchHistory;
    return Array.isArray(value) ? value.filter((item) => item && Number.isFinite(Number(item.id))) : [];
  }

  function formatTime(seconds) {
    const total = Math.max(0, Number(seconds) || 0);
    if (total < 60) return `${total}с`;
    if (total < 3600) return `${Math.floor(total / 60)}м`;
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    return minutes ? `${hours}ч ${minutes}м` : `${hours}ч`;
  }

  function renderProfile() {
    const stats = document.querySelector('.profile-stats');
    const list = document.querySelector('#profileActivity .watched-list');
    if (!stats || !list) return;

    const history = activeUser ? currentHistory : [];
    const episodes = history.reduce((sum, item) => sum + new Set((item.episodes || []).map(Number)).size, 0);
    const seconds = history.reduce((sum, item) => sum + (Number(item.seconds) || 0), 0);
    const boxes = stats.querySelectorAll('div');
    if (boxes[0]) boxes[0].innerHTML = `<b>${episodes}</b><span>серий</span>`;
    if (boxes[1]) boxes[1].innerHTML = `<b>${history.length}</b><span>аниме</span>`;
    if (boxes[2]) boxes[2].innerHTML = `<b>${formatTime(seconds)}</b><span>просмотра</span>`;

    const subtitle = document.querySelector('#profileActivity > p');
    if (subtitle) subtitle.textContent = activeUser ? 'История сохраняется в вашем аккаунте Supabase.' : 'Войдите, чтобы увидеть историю просмотра.';

    if (!activeUser) {
      list.innerHTML = '<div class="history-empty"><b>История недоступна</b><span>Войдите в аккаунт, чтобы сохранять просмотренное.</span></div>';
      return;
    }
    if (!history.length) {
      list.innerHTML = '<div class="history-empty"><b>Вы ещё ничего не смотрели</b><span>Запустите любое аниме — оно появится здесь.</span></div>';
      return;
    }

    list.innerHTML = [...history]
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
      .map((item) => `<article class="watched-item real-history-item" data-view="watch" data-show="${Number(item.id)}"><img src="${safe(item.image)}" alt="${safe(item.title)}"><div><b>${safe(item.title)}</b><span>${Number(item.episode) || 1} серия · ${formatTime(item.seconds)}</span></div><i>Продолжить →</i></article>`)
      .join('');
  }

  async function refreshUser() {
    const auth = client();
    if (!auth) return;
    const { data: { user } } = await auth.auth.getUser();
    activeUser = user || null;
    currentHistory = historyFrom(activeUser);
    renderProfile();
  }

  function saveHistory(mutator) {
    saveQueue = saveQueue.then(async () => {
      const auth = client();
      if (!auth) return;
      const { data: { user } } = await auth.auth.getUser();
      if (!user) {
        activeUser = null;
        currentHistory = [];
        renderProfile();
        return;
      }

      const history = historyFrom(user);
      const next = mutator(history);
      const metadata = { ...(user.user_metadata || {}), watchHistory: next };
      const { data, error } = await auth.auth.updateUser({ data: metadata });
      if (error) return;
      activeUser = data.user;
      currentHistory = historyFrom(data.user);
      renderProfile();
    });
    return saveQueue;
  }

  function recordOpen() {
    const show = selectedShow();
    saveHistory((history) => {
      const other = history.filter((item) => Number(item.id) !== show.id);
      const old = history.find((item) => Number(item.id) === show.id) || {};
      const episodes = new Set((old.episodes || []).map(Number));
      episodes.add(show.episode);
      return [...other, {
        ...old,
        id: show.id,
        title: show.title,
        image: show.image,
        episode: show.episode,
        episodes: [...episodes],
        seconds: Number(old.seconds) || 0,
        updatedAt: new Date().toISOString()
      }].slice(-50);
    });
  }

  function addWatchTime(seconds) {
    const show = selectedShow();
    saveHistory((history) => {
      const other = history.filter((item) => Number(item.id) !== show.id);
      const old = history.find((item) => Number(item.id) === show.id) || {};
      const episodes = new Set((old.episodes || []).map(Number));
      episodes.add(show.episode);
      return [...other, {
        ...old,
        id: show.id,
        title: show.title,
        image: show.image,
        episode: show.episode,
        episodes: [...episodes],
        seconds: (Number(old.seconds) || 0) + seconds,
        updatedAt: new Date().toISOString()
      }].slice(-50);
    });
  }

  document.addEventListener('click', (event) => {
    const watch = event.target.closest('[data-view="watch"]');
    if (watch && !watch.classList.contains('real-history-item')) setTimeout(recordOpen, 30);
    if (event.target.closest('.episode')) setTimeout(recordOpen, 30);
    if (event.target.closest('[data-profile-tab="watched"], .profile')) setTimeout(refreshUser, 50);
  });

  setInterval(() => {
    const watchView = document.querySelector('#watch.active');
    const playing = document.querySelector('#playButton')?.textContent?.trim() === 'Ⅱ';
    if (watchView && playing && activeUser) addWatchTime(30);
  }, 30000);

  async function start() {
    const auth = client();
    if (!auth) {
      setTimeout(start, 250);
      return;
    }
    await refreshUser();
    auth.auth.onAuthStateChange((_event, session) => {
      activeUser = session?.user || null;
      currentHistory = historyFrom(activeUser);
      renderProfile();
    });
    new MutationObserver(renderProfile).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  const style = document.createElement('style');
  style.textContent = `.real-history-item{cursor:pointer;transition:transform .2s ease,border-color .2s ease,background .2s ease}.real-history-item:hover{transform:translateY(-1px);border-color:#6653b4;background:#1d1e25}.history-empty{display:grid;place-items:center;text-align:center;min-height:170px;padding:25px;border:1px dashed #343641;border-radius:12px;color:#8e9099}.history-empty b{color:#d6d7db;font-size:13px;margin-bottom:6px}.history-empty span{font-size:11px}.profile-stats b{font-variant-numeric:tabular-nums}`;
  document.head.append(style);
})();