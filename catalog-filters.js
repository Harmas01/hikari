(() => {
  const toolbar = document.querySelector('.catalog-toolbar');
  const grid = document.querySelector('#catalogGrid');
  const search = document.querySelector('#catalogSearch');
  if (!toolbar || !grid || !search || toolbar.dataset.functional) return;
  toolbar.dataset.functional = 'true';

  const getShows = () => typeof shows !== 'undefined' ? shows : [];
  const getProfiles = () => typeof animeProfiles !== 'undefined' ? animeProfiles : [];
  const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

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