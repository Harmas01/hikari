'use strict';
/* rating-fix.js */
(()=>{
  let shownAnime=null;
  const mountRating=()=>{
    const host=document.querySelector('#animeAwards');
    if(!host||typeof selectedAnime==='undefined'||typeof authClient==='undefined')return;
    const currentAnime=selectedAnime;
    host.querySelectorAll('.rating-widget,.personal-rating').forEach(node=>node.remove());
    const existing=host.querySelector('#fixedRating');
    if(existing&&shownAnime===currentAnime)return;
    existing?.remove();
    shownAnime=currentAnime;
    const card=document.createElement('section');
    card.id='fixedRating';
    card.innerHTML='<div class="fixed-rating-head"><span>Ваша оценка</span><b>—</b></div><input type="range" min="1" max="10" step="0.1" value="7.1" aria-label="Оценка аниме"><div class="fixed-rating-scale"><span>1</span><span>10</span></div>';
    host.append(card);
    const slider=card.querySelector('input'),label=card.querySelector('b');
    authClient.auth.getUser().then(({data:{user}})=>{
      const scores=user?.user_metadata?.personalRatings||{};
      const saved=Number(scores[currentAnime]);
      if(Number.isFinite(saved)&&saved>=1&&saved<=10){slider.value=saved.toFixed(1);label.textContent=saved.toFixed(1)}else label.textContent=user?'7.1':'—';
      slider.disabled=!user;
      slider.oninput=()=>label.textContent=Number(slider.value).toFixed(1);
      slider.onchange=async()=>{
        const {data:{user:activeUser}}=await authClient.auth.getUser();
        if(!activeUser){setAuthMode('signin');authModal.classList.add('open');return}
        const meta=activeUser.user_metadata||{};
        const personalRatings={...(meta.personalRatings||{}),[currentAnime]:Number(slider.value)};
        const {data,error}=await authClient.auth.updateUser({data:{...meta,personalRatings}});
        if(error){toastMessage('Не удалось сохранить оценку.');return}
        setProfile(data.user);toastMessage(`Ваша оценка: ${Number(slider.value).toFixed(1)}`);
      };
    });
  };
  document.head.insertAdjacentHTML('beforeend','<style>#animeAwards .rating-widget,#animeAwards .personal-rating{display:none!important}#fixedRating{margin-top:14px;padding-top:14px;border-top:1px solid #ffffff12}#fixedRating .fixed-rating-head{display:flex;align-items:center;justify-content:space-between}#fixedRating span{font-size:10px;color:#a9aab2}#fixedRating b{font:700 21px Manrope;color:#f3c957}#fixedRating input{width:100%;accent-color:#8a6cf6;cursor:pointer;margin:13px 0 1px}#fixedRating input:disabled{opacity:.45;cursor:not-allowed}.fixed-rating-scale{display:flex;justify-content:space-between;color:#777984;font-size:10px}</style>');
  mountRating();setInterval(mountRating,250);
})();

/* comment-filter.js */
(()=>{
  const profanity=/(?:хуй[а-яё]*|хуе[а-яё]*|пизд[а-яё]*|еб[а-яё]*|ёб[а-яё]*|бля[а-яё]*|сука[а-яё]*|мраз[а-яё]*|гандон[а-яё]*|пидор[а-яё]*|долбо[а-яё]*)/giu;
  document.addEventListener('submit',event=>{
    const form=event.target;
    if(form?.id!=='commentForm')return;
    const input=form.querySelector('#commentInput');
    if(!input)return;
    const original=input.value;
    const cleaned=original.replace(profanity,match=>'*'.repeat(match.length));
    if(cleaned!==original){input.value=cleaned;setTimeout(()=>toastMessage('Грубые слова заменены на ****.'),0)}
  },true);
})();

/* comment-delete.js */
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
    const auth = getClient();
    auth?.auth?.onAuthStateChange(() => setTimeout(addDeleteButtons, 0));
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  const style = document.createElement('style');
  style.textContent = `.comment-delete{border:1px solid rgba(244,90,90,.28);background:rgba(244,90,90,.08);color:#ff9b9b;border-radius:9px;padding:6px 10px;font:inherit;font-size:12px;cursor:pointer;transition:background .2s ease,color .2s ease,border-color .2s ease}.comment-delete:hover{background:rgba(244,90,90,.16);border-color:rgba(244,90,90,.5);color:#ffc0c0}.comment-delete:disabled{opacity:.55;cursor:wait}`;
  document.head.append(style);
})();

/* comment-auth.js */
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

  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  const style = document.createElement('style');
  style.textContent = `.comment-form input:disabled{opacity:.65;cursor:not-allowed}.comment-form button:disabled{opacity:.45;cursor:not-allowed}.comment-auth-note{display:flex;align-items:center;gap:10px;margin:10px 0 0;color:#999;font-size:13px}.comment-auth-note[hidden]{display:none}.comment-login-button{border:1px solid rgba(139,92,246,.38);background:rgba(139,92,246,.12);color:#cbb8ff;border-radius:9px;padding:7px 12px;font:inherit;font-weight:600;cursor:pointer;transition:background .2s ease,border-color .2s ease}.comment-login-button:hover{background:rgba(139,92,246,.2);border-color:rgba(139,92,246,.62)}`;
  document.head.append(style);
})();

/* anime-interface.js */
(() => {
  const page = document.querySelector('#anime .anime-page');
  if (!page || page.dataset.redesigned) return;
  page.dataset.redesigned = 'true';

  const cover = page.querySelector('.anime-cover');
  const info = page.querySelector('.anime-info');
  const awards = page.querySelector('#animeAwards');
  if (!cover || !info) return;

  const sidebar = document.createElement('aside');
  sidebar.className = 'anime-sidebar';
  const main = document.createElement('div');
  main.className = 'anime-main-panel';
  page.prepend(sidebar);
  page.append(main);
  sidebar.append(cover);
  main.append(info);
  if (awards) main.append(awards);

  const actions = info.querySelector('.hero-actions');
  if (actions) sidebar.append(actions);

  const facts = document.createElement('div');
  facts.className = 'anime-facts';
  facts.innerHTML = `
    <div><span>Тип</span><b>TV-сериал</b></div>
    <div><span>Эпизоды</span><b>28 × 24 мин.</b></div>
    <div><span>Статус</span><b>Завершён</b></div>
    <div><span>Студия</span><b>Madhouse</b></div>
    <div><span>Сезон</span><b>Осень 2023</b></div>
    <div><span>Возраст</span><b>PG-13</b></div>`;
  sidebar.append(facts);

  const top = document.createElement('div');
  top.className = 'anime-title-score';
  top.innerHTML = `<div class="community-score"><span>Рейтинг тайтла</span><strong>★ <em>9.1</em></strong><small>по данным каталога</small></div>`;
  info.prepend(top);
  top.prepend(info.querySelector('.eyebrow'));
  top.prepend(info.querySelector('h1'));
  top.querySelector('h1').insertAdjacentElement('afterend', info.querySelector('.alternative'));

  const tabs = document.createElement('nav');
  tabs.className = 'anime-tabs';
  tabs.innerHTML = `<button class="active" type="button">О тайтле</button><button type="button" data-scroll-comments>Комментарии</button><button type="button" class="muted-tab" title="Скоро">Обсуждения</button><button type="button" class="muted-tab" title="Скоро">Отзывы</button>`;
  info.insertBefore(tabs, info.querySelector('.meta'));

  const related = document.createElement('section');
  related.className = 'anime-related-card';
  related.innerHTML = `<div><span>Связанное произведение</span><b>Фрирен: За гранью путешествия</b><small>Манга · первоисточник</small></div><button type="button" aria-label="Открыть связанное произведение">→</button>`;
  info.append(related);

  const rating = document.createElement('section');
  rating.className = 'rating-overview';
  rating.innerHTML = `
    <div class="rating-heading"><div><span>Оценки пользователей</span><strong>★ 9.1</strong></div><small>Распределение оценок сообщества</small></div>
    <div class="rating-bars">
      <div><b>10</b><i><u style="width:76%"></u></i><span>48%</span></div>
      <div><b>9</b><i><u style="width:58%"></u></i><span>31%</span></div>
      <div><b>8</b><i><u style="width:31%"></u></i><span>14%</span></div>
      <div><b>7</b><i><u style="width:14%"></u></i><span>5%</span></div>
      <div><b>≤6</b><i><u style="width:6%"></u></i><span>2%</span></div>
    </div>`;
  main.append(rating);

  tabs.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || button.classList.contains('muted-tab')) return;
    tabs.querySelectorAll('button').forEach((item) => item.classList.toggle('active', item === button));
    if (button.hasAttribute('data-scroll-comments')) {
      if (typeof setView === 'function') setView('watch');
      else {
        document.querySelectorAll('.view').forEach((view) => view.classList.toggle('active', view.id === 'watch'));
      }
      setTimeout(() => {
        const comments = document.querySelector('#watch .comments');
        comments?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        comments?.classList.add('comments-highlight');
        setTimeout(() => comments?.classList.remove('comments-highlight'), 900);
      }, 180);
    }
  });

  function syncBackdrop() {
    page.style.setProperty('--anime-backdrop', `url("${cover.querySelector('img')?.src || ''}")`);
  }
  syncBackdrop();
  new MutationObserver(syncBackdrop).observe(cover.querySelector('img'), { attributes: true, attributeFilter: ['src'] });

  const detail = document.querySelector('#anime .detail-section');
  if (detail) detail.classList.add('anime-detail-redesign');

  const style = document.createElement('style');
  style.textContent = `
  #anime{background:#0c0d10}.anime-page[data-redesigned]{position:relative;display:grid;grid-template-columns:270px minmax(0,1fr)!important;gap:28px;max-width:1180px;padding-top:52px;isolation:isolate}.anime-page[data-redesigned]::before{content:"";position:absolute;z-index:-2;top:0;left:270px;right:0;height:270px;background:linear-gradient(180deg,rgba(12,13,16,.36),#0c0d10 96%),linear-gradient(90deg,#0c0d10 0%,transparent 45%),var(--anime-backdrop) center 24%/cover no-repeat;opacity:.28;filter:saturate(.72)}.anime-page[data-redesigned]::after{content:"";position:absolute;z-index:-1;inset:0;background:linear-gradient(90deg,#0c0d10 0 270px,transparent 270px)}
  .anime-sidebar{display:flex;flex-direction:column;gap:14px;align-self:start}.anime-page[data-redesigned] .anime-cover{width:100%;aspect-ratio:2/3;border-radius:14px;overflow:hidden;border:1px solid #2d2f36;box-shadow:0 18px 50px #0008}.anime-page[data-redesigned] .anime-cover img{width:100%;height:100%;object-fit:cover}.anime-sidebar .hero-actions{display:grid;grid-template-columns:1fr;gap:9px;margin:0}.anime-sidebar .hero-actions button{width:100%;min-height:43px;border-radius:10px}.anime-facts{display:grid;gap:0;padding:8px 16px;background:#17181c;border:1px solid #292b31;border-radius:13px}.anime-facts div{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid #ffffff0a;font-size:12px}.anime-facts div:last-child{border:0}.anime-facts span{color:#777a84}.anime-facts b{color:#d0d1d5;font-weight:500;text-align:right}
  .anime-main-panel{min-width:0;padding-top:9px}.anime-page[data-redesigned] .anime-info{padding:0;background:transparent}.anime-title-score{display:grid;grid-template-columns:minmax(0,1fr) 150px;column-gap:24px;align-items:start;min-height:150px}.anime-title-score>h1{font-size:clamp(28px,4vw,43px);line-height:1.08;letter-spacing:-.035em;max-width:720px;margin:22px 0 7px}.anime-title-score>.alternative{grid-column:1;color:#9b9da6;font-size:15px;margin:0}.anime-title-score>.eyebrow{position:absolute;margin:0;color:#9b7bff}.community-score{grid-column:2;grid-row:1/3;text-align:right;padding-top:22px}.community-score span,.community-score small{display:block;color:#777a84;font-size:11px}.community-score strong{display:block;margin:7px 0 3px;color:#f5bc52;font-size:17px}.community-score em{color:#f1f1f3;font-style:normal;font-size:25px;margin-left:3px}.anime-tabs{display:flex;gap:27px;margin:9px 0 24px;border-bottom:1px solid #2a2b30}.anime-tabs button{position:relative;border:0;background:transparent;color:#8e9098;padding:13px 0;font:500 12px Inter;cursor:pointer}.anime-tabs button.active{color:#f1f1f3}.anime-tabs button.active::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;border-radius:2px;background:#8b68f7}.anime-tabs .muted-tab{opacity:.6}.anime-page[data-redesigned] .meta{margin:0 0 15px}.anime-page[data-redesigned] .tags{margin:0 0 18px}.anime-page[data-redesigned] .description{max-width:840px;color:#b3b5bc;line-height:1.72;font-size:13px}.anime-related-card{display:flex;align-items:center;justify-content:space-between;margin-top:23px;padding:16px 18px;background:#17181c;border:1px solid #292b31;border-radius:12px}.anime-related-card div{display:grid;gap:3px}.anime-related-card span,.anime-related-card small{color:#777a84;font-size:10px}.anime-related-card b{font-size:13px}.anime-related-card button{width:34px;height:34px;border:1px solid #353640;border-radius:9px;background:#202126;color:#bbb;cursor:pointer}.anime-page[data-redesigned] .anime-awards{margin:20px 0 0;padding:17px 18px;background:#17181c;border-color:#292b31}.anime-page[data-redesigned] .anime-awards h3{font-size:13px}.anime-page[data-redesigned] .anime-awards .award-item{display:inline-flex;width:calc(33.333% - 7px);vertical-align:top;border:0;padding:8px;margin-right:6px;background:#1c1d22;border-radius:9px}.rating-overview{margin-top:20px;padding:20px;background:#17181c;border:1px solid #292b31;border-radius:13px}.rating-heading{display:flex;justify-content:space-between;align-items:end;margin-bottom:16px}.rating-heading div{display:flex;gap:12px;align-items:center}.rating-heading span{font-weight:700;font-size:14px}.rating-heading strong{color:#f5bc52}.rating-heading small{color:#777a84}.rating-bars{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:13px}.rating-bars>div{display:grid;grid-template-columns:22px 1fr 28px;align-items:center;gap:7px;font-size:10px;color:#81838c}.rating-bars b{font-weight:500}.rating-bars i{height:5px;background:#2b2d33;border-radius:8px;overflow:hidden}.rating-bars u{display:block;height:100%;background:#8c68f7;border-radius:inherit;text-decoration:none}.anime-detail-redesign{max-width:1180px;padding-top:32px;padding-left:298px}.anime-detail-redesign .section-head{margin-top:26px}.anime-detail-redesign .episode-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.anime-detail-redesign .episode-grid button{background:#17181c;border-color:#292b31}.anime-detail-redesign .poster-row{padding-bottom:18px}
  @media(max-width:900px){.anime-page[data-redesigned]{grid-template-columns:210px minmax(0,1fr)!important;gap:22px}.anime-page[data-redesigned]::before{left:210px}.anime-page[data-redesigned]::after{background:linear-gradient(90deg,#0c0d10 0 210px,transparent 210px)}.anime-detail-redesign{padding-left:248px}.anime-title-score{grid-template-columns:1fr}.community-score{grid-column:1;grid-row:auto;text-align:left;padding:12px 0}.rating-bars{grid-template-columns:1fr}.anime-page[data-redesigned] .anime-awards .award-item{display:flex;width:100%;margin:4px 0}.anime-detail-redesign .episode-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:650px){.anime-page[data-redesigned]{grid-template-columns:1fr!important;padding-top:24px}.anime-page[data-redesigned]::before{left:0;height:210px}.anime-page[data-redesigned]::after{display:none}.anime-sidebar{display:grid;grid-template-columns:126px minmax(0,1fr);align-items:start}.anime-sidebar .anime-cover{grid-row:1/3}.anime-sidebar .hero-actions{grid-column:2}.anime-facts{grid-column:1/-1}.anime-title-score{min-height:0}.anime-title-score>h1{margin-top:25px}.anime-tabs{gap:20px;overflow-x:auto}.anime-detail-redesign{padding-left:18px;padding-right:18px}.anime-detail-redesign .episode-grid{grid-template-columns:1fr}.rating-heading{align-items:start;gap:10px}.rating-heading small{text-align:right}}
  `;
  document.head.append(style);
})();

/* profile-history.js */
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
    if (watchView && playing && activeUser) addWatchTime(60);
  }, 60000);

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
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();

  const style = document.createElement('style');
  style.textContent = `.real-history-item{cursor:pointer;transition:transform .2s ease,border-color .2s ease,background .2s ease}.real-history-item:hover{transform:translateY(-1px);border-color:#6653b4;background:#1d1e25}.history-empty{display:grid;place-items:center;text-align:center;min-height:170px;padding:25px;border:1px dashed #343641;border-radius:12px;color:#8e9099}.history-empty b{color:#d6d7db;font-size:13px;margin-bottom:6px}.history-empty span{font-size:11px}.profile-stats b{font-variant-numeric:tabular-nums}`;
  document.head.append(style);
})();

/* anime-tabs.js */
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

/* catalog-filters.js */
(() => {
  const toolbar = document.querySelector('.catalog-toolbar');
  const grid = document.querySelector('#catalogGrid');
  const search = document.querySelector('#catalogSearch');
  if (!toolbar || !grid || !search || toolbar.dataset.functional) return;
  toolbar.dataset.functional = 'true';

  const getShows = () => typeof shows !== 'undefined' ? shows : [];
  const getProfiles = () => typeof animeProfiles !== 'undefined' ? animeProfiles : [];
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  search.oninput = null;
  const oldFilters = [...toolbar.querySelectorAll('.filter, .sort')];
  oldFilters.forEach((item) => item.remove());

  const genres = [...new Set(getProfiles().flatMap((profile) => profile.genres || []))].sort((a, b) => a.localeCompare(b, 'ru'));
  const years = [...new Set(getProfiles().map((profile) => profile.year).filter(Boolean))].sort((a, b) => b - a);
  const statuses = [...new Set(getProfiles().map((profile) => profile.status).filter(Boolean))];

  const controls = document.createElement('div');
  controls.className = 'catalog-filter-controls';
  controls.innerHTML = `
    <label class="catalog-select"><span>Жанр</span><select data-filter="genre"><option value="">Все жанры</option>${genres.map((genre) => `<option value="${escapeHtml(genre)}">${escapeHtml(genre)}</option>`).join('')}</select></label>
    <label class="catalog-select"><span>Год</span><select data-filter="year"><option value="">Все годы</option>${years.map((year) => `<option value="${year}">${year}</option>`).join('')}</select></label>
    <label class="catalog-select"><span>Статус</span><select data-filter="status"><option value="">Любой статус</option>${statuses.map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`).join('')}</select></label>
    <label class="catalog-select"><span>Рейтинг</span><select data-filter="rating"><option value="0">Любой</option><option value="9">От 9.0</option><option value="8.5">От 8.5</option><option value="8">От 8.0</option></select></label>
    <label class="catalog-select catalog-sort"><span>Сортировка</span><select data-filter="sort"><option value="rating">По рейтингу</option><option value="newest">Сначала новые</option><option value="oldest">Сначала старые</option><option value="title">По названию</option></select></label>`;
  toolbar.append(controls);

  const footer = document.createElement('div');
  footer.className = 'catalog-results-summary';
  footer.innerHTML = '<span></span><button type="button">Сбросить фильтры</button>';
  toolbar.insertAdjacentElement('afterend', footer);

  function itemCard(show, index) {
    const profile = getProfiles()[index] || {};
    return `<article class="card catalog-result-card" data-view="anime" data-show="${index}"><div class="poster"><img src="${escapeHtml(show[3])}" alt="${escapeHtml(show[0])}" loading="lazy"><span class="rating-badge">★ ${escapeHtml(show[2])}</span><span class="catalog-year">${profile.year || ''}</span></div><h3>${escapeHtml(show[0])}</h3><p>${escapeHtml(show[1])} <b>★ ${escapeHtml(show[2])}</b></p></article>`;
  }

  function applyFilters() {
    const values = Object.fromEntries([...controls.querySelectorAll('select')].map((select) => [select.dataset.filter, select.value]));
    const query = search.value.trim().toLocaleLowerCase('ru');
    let result = getShows().map((show, index) => ({ show, index, profile: getProfiles()[index] || {} }));

    if (query) result = result.filter(({ show, profile }) => `${show[0]} ${profile.alternative || ''}`.toLocaleLowerCase('ru').includes(query));
    if (values.genre) result = result.filter(({ profile }) => (profile.genres || []).includes(values.genre));
    if (values.year) result = result.filter(({ profile }) => String(profile.year) === values.year);
    if (values.status) result = result.filter(({ profile }) => profile.status === values.status);
    if (Number(values.rating)) result = result.filter(({ show }) => Number(show[2]) >= Number(values.rating));

    result.sort((a, b) => {
      if (values.sort === 'newest') return Number(b.profile.year || 0) - Number(a.profile.year || 0);
      if (values.sort === 'oldest') return Number(a.profile.year || 0) - Number(b.profile.year || 0);
      if (values.sort === 'title') return a.show[0].localeCompare(b.show[0], 'ru');
      return Number(b.show[2]) - Number(a.show[2]);
    });

    footer.querySelector('span').textContent = `Найдено: ${result.length}`;
    footer.classList.toggle('has-filters', Boolean(query || values.genre || values.year || values.status || Number(values.rating) || values.sort !== 'rating'));
    grid.innerHTML = result.length ? result.map(({ show, index }) => itemCard(show, index)).join('') : '<div class="catalog-empty"><b>Ничего не найдено</b><span>Измените фильтры или очистите строку поиска.</span><button type="button">Сбросить фильтры</button></div>';
  }

  function resetFilters() {
    search.value = '';
    controls.querySelectorAll('select').forEach((select) => select.selectedIndex = 0);
    applyFilters();
  }

  toolbar.addEventListener('input', applyFilters);
  toolbar.addEventListener('change', applyFilters);
  search.addEventListener('input', () => setTimeout(applyFilters, 0));
  footer.querySelector('button').addEventListener('click', resetFilters);
  grid.addEventListener('click', (event) => {
    if (event.target.closest('.catalog-empty button')) resetFilters();
  });

  const style = document.createElement('style');
  style.textContent = `.catalog-toolbar[data-functional]{display:grid;grid-template-columns:minmax(230px,1fr);gap:12px;align-items:end}.catalog-filter-controls{display:grid;grid-template-columns:repeat(5,minmax(120px,1fr));gap:9px}.catalog-select{display:grid;gap:6px}.catalog-select>span{padding-left:2px;color:#777a84;font-size:9px;text-transform:uppercase;letter-spacing:.08em}.catalog-select select{width:100%;height:39px;padding:0 31px 0 11px;border:1px solid #30323a;border-radius:9px;background:#191a1f;color:#cacbd0;font:11px Inter;outline:none;cursor:pointer;transition:border-color .2s ease,background .2s ease}.catalog-select select:hover,.catalog-select select:focus{border-color:#6552b1;background:#1d1e24}.catalog-results-summary{display:flex;justify-content:space-between;align-items:center;margin:13px 0 4px;color:#777a84;font-size:10px}.catalog-results-summary button{visibility:hidden;border:0;background:transparent;color:#a994ff;font:10px Inter;cursor:pointer}.catalog-results-summary.has-filters button{visibility:visible}.catalog-result-card .poster{position:relative}.catalog-year{position:absolute;left:8px;bottom:8px;padding:4px 6px;border:1px solid #ffffff1a;border-radius:6px;background:#101116d9;color:#ccc;font-size:9px}.catalog-empty{grid-column:1/-1;display:grid;place-items:center;min-height:260px;padding:30px;border:1px dashed #30323a;border-radius:14px;text-align:center;color:#83858e}.catalog-empty b{color:#d1d2d6;font-size:15px}.catalog-empty span{margin:6px 0 14px;font-size:11px}.catalog-empty button{border:1px solid #5f4da5;border-radius:9px;background:#7c5be3;color:#fff;padding:9px 14px;font:600 11px Inter;cursor:pointer}@media(max-width:900px){.catalog-filter-controls{grid-template-columns:repeat(3,minmax(120px,1fr))}.catalog-sort{grid-column:span 2}}@media(max-width:560px){.catalog-filter-controls{display:flex;overflow-x:auto;padding-bottom:5px}.catalog-select{min-width:145px}.catalog-sort{min-width:170px}}`;
  document.head.append(style);
  applyFilters();
})();

/* performance optimizations */
(() => {
  const optimizeImage = (img) => {
    if (img.dataset.optimized) return;
    img.dataset.optimized = 'true';
    img.decoding = 'async';
    const critical = Boolean(img.closest('.hero-progress, .anime-cover'));
    img.loading = critical ? 'eager' : 'lazy';
    if (critical) img.fetchPriority = 'high';
  };
  document.querySelectorAll('img').forEach(optimizeImage);
  new MutationObserver((records) => records.forEach((record) => record.addedNodes.forEach((node) => {
    if (!(node instanceof Element)) return;
    if (node.matches('img')) optimizeImage(node);
    node.querySelectorAll?.('img').forEach(optimizeImage);
  }))).observe(document.body, { childList: true, subtree: true });
  const style = document.createElement('style');
  style.textContent = `.poster-row,.catalog-grid,.episode-grid,.watched-list{content-visibility:auto;contain-intrinsic-size:1px 420px}img{background:#17181d}@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}`;
  document.head.append(style);
})();
/* email magic-link login */
(() => {
  const start = () => {
    const form = document.querySelector('#authForm');
    const title = document.querySelector('#authTitle');
    const description = document.querySelector('#authDescription');
    const email = document.querySelector('#authEmail');
    const password = document.querySelector('#authPassword');
    const submit = document.querySelector('#authSubmit');
    const message = document.querySelector('#authError');
    if (!form || !title || !email || !password || !submit || !message) {
      setTimeout(start, 250);
      return;
    }

    const passwordLabel = password.previousElementSibling;
    const isSignin = () => title.textContent.trim() === 'Войти в Hikari';

    const syncMode = () => {
      const signin = isSignin();
      password.hidden = signin;
      password.disabled = signin;
      password.required = !signin;
      if (passwordLabel?.tagName === 'LABEL') passwordLabel.hidden = signin;
      if (signin) {
        description.textContent = 'Получите безопасную ссылку для входа на вашу почту.';
        submit.textContent = 'Получить ссылку на почту';
      }
    };

    new MutationObserver(syncMode).observe(title, { childList: true, characterData: true, subtree: true });
    document.querySelector('#authSwitch')?.addEventListener('click', () => setTimeout(syncMode, 0));
    syncMode();

    form.addEventListener('submit', async (event) => {
      if (!isSignin()) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      const address = email.value.trim();
      if (!address) {
        message.textContent = 'Введите email.';
        return;
      }

      const auth = window.authClient || (typeof authClient !== 'undefined' ? authClient : null);
      if (!auth) {
        message.textContent = 'Сервис авторизации ещё загружается. Попробуйте снова.';
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Отправляем письмо…';
      message.classList.remove('auth-email-success');
      message.textContent = '';
      const redirectTo = `${location.origin}${location.pathname}`;
      const { error } = await auth.auth.signInWithOtp({
        email: address,
        options: { shouldCreateUser: false, emailRedirectTo: redirectTo }
      });
      submit.disabled = false;
      submit.textContent = 'Отправить письмо ещё раз';

      if (error) {
        message.textContent = error.message.includes('rate') ? 'Слишком много попыток. Подождите минуту.' : 'Не удалось отправить письмо. Проверьте email.';
        return;
      }

      message.classList.add('auth-email-success');
      message.textContent = 'Письмо отправлено. Откройте ссылку внутри него. Проверьте папку «Спам».';
    }, true);

    const style = document.createElement('style');
    style.textContent = `.auth-card input[hidden],.auth-card label[hidden]{display:none!important}.auth-email-success{color:#88d8ac!important;background:rgba(70,180,120,.1);border:1px solid rgba(90,200,140,.2);border-radius:8px;padding:9px 10px}`;
    document.head.append(style);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();