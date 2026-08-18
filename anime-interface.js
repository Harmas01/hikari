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