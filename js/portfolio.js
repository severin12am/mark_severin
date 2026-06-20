/*
 * Portfolio renderer — intentionally simple and synchronous.
 * Data comes from window.GAME_CATALOG (data/catalog.js, loaded before this file).
 * No fetching, no media "probing", no timeouts: nothing here can hang the page.
 * Images/videos load natively and fall back to a placeholder on error.
 */

console.log('[portfolio] script loaded');

const UI = {
  en: {
    games: 'Games',
    apps: 'Apps',
    heroEyebrow: 'Indie developer',
    emptyGames: 'No games yet — add entries to data/catalog.js',
    emptyApps: 'No apps yet — add entries to data/catalog.js',
    loadError: 'Could not load the catalog (data/catalog.js).',
    statusWip: 'In development',
    linkSoon: 'Link coming soon',
    appStore: 'App Store',
    appStoreSoon: 'App Store — coming soon',
    comingSoon: 'This game is not in the portfolio yet — coming soon.',
  },
  ru: {
    games: 'Игры',
    apps: 'Приложения',
    heroEyebrow: 'Инди-разработчик',
    emptyGames: 'Пока нет игр — добавьте записи в data/catalog.js',
    emptyApps: 'Пока нет приложений — добавьте записи в data/catalog.js',
    loadError: 'Не удалось загрузить каталог (data/catalog.js).',
    statusWip: 'В разработке',
    linkSoon: 'Ссылка скоро',
    appStore: 'App Store',
    appStoreSoon: 'App Store — скоро',
    comingSoon: 'Игра ещё не добавлена в портфолио — скоро.',
  },
};

let catalog = { games: [], apps: [], site: {} };
let siteLang = 'en';

function init() {
  siteLang = getSiteLang();
  catalog = normalizeCatalog(window.GAME_CATALOG || {});
  console.log('[portfolio] init', { games: catalog.games.length, apps: catalog.apps.length });

  if (!catalog.games.length && !catalog.apps.length) {
    showLoadError();
    return;
  }

  applySiteLang();
  renderGames(catalog.games);
  renderApps(catalog.apps);
  toggleEmptySection('apps-section', catalog.apps.length);
  const appsTab = document.querySelector('.nav-tab[data-target="apps-section"]');
  if (appsTab) appsTab.style.display = catalog.apps.length ? '' : 'none';
  setupLangSwitcher();
  setupNav();
  setupPlayer();
}

function getSiteLang() {
  const saved = localStorage.getItem('portfolio-lang');
  if (saved === 'ru' || saved === 'en') return saved;
  return navigator.language && navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

function t(key) {
  return (UI[siteLang] && UI[siteLang][key]) || UI.en[key] || key;
}

function normalizeCatalog(data) {
  const normalizeItem = (item) => {
    const languages = item.languages || ['en'];
    let title = item.title;
    let description = item.description;
    if (typeof title === 'string') title = { [languages[0]]: title };
    if (typeof description === 'string') description = { [languages[0]]: description };
    return { ...item, languages, title, description };
  };

  const site = data.site || {};
  let siteTitle = site.title;
  let siteTagline = site.tagline;
  if (typeof siteTitle === 'string') siteTitle = { en: siteTitle, ru: siteTitle };
  if (typeof siteTagline === 'string') siteTagline = { en: siteTagline, ru: siteTagline };

  return {
    site: { title: siteTitle || {}, tagline: siteTagline || {} },
    games: (data.games || []).map(normalizeItem),
    apps: (data.apps || []).map(normalizeItem),
  };
}

function localized(item, field, lang = siteLang) {
  const map = item[field] || {};
  if (map[lang]) return map[lang];
  for (const code of item.languages || []) {
    if (map[code]) return map[code];
  }
  return Object.values(map)[0] || '';
}

function resolveGameLang(item) {
  const langs = item.languages || ['en'];
  return langs.includes(siteLang) ? siteLang : langs[0];
}

function applySiteLang() {
  document.documentElement.lang = siteLang;
  const siteTitle = localized(catalog.site, 'title') || 'My Games & Apps';
  const siteTagline = localized(catalog.site, 'tagline');
  document.title = siteTitle;
  const titleEl = document.getElementById('site-title');
  if (titleEl) {
    titleEl.textContent = siteTitle;
    titleEl.title = siteTagline;
  }
  const heroTitle = document.getElementById('hero-title');
  if (heroTitle) {
    const lines = heroTitle.querySelectorAll('.hero-v3-line');
    if (lines.length >= 2) {
      const parts = siteTitle.trim().split(/\s+/);
      lines[0].textContent = parts[0] || siteTitle;
      lines[1].textContent = parts.slice(1).join(' ') || '';
    } else {
      heroTitle.textContent = siteTitle;
    }
  }
  const heroTagline = document.getElementById('hero-tagline');
  if (heroTagline && siteTagline) heroTagline.textContent = siteTagline;

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (UI[siteLang][key]) el.textContent = UI[siteLang][key];
  });

  document.querySelectorAll('.lang-switch-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === siteLang);
  });
}

function setupLangSwitcher() {
  document.querySelectorAll('.lang-switch-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      siteLang = btn.dataset.lang;
      localStorage.setItem('portfolio-lang', siteLang);
      applySiteLang();
      renderGames(catalog.games);
      renderApps(catalog.apps);
    });
  });
}

function showLoadError() {
  const grid = document.getElementById('games-grid');
  if (grid) grid.innerHTML = `<div class="empty-state"><strong>${t('loadError')}</strong></div>`;
}

function itemBasePath(item) {
  return `games/${item.folder}`;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatAppLinkLabel(item) {
  if (item.linkText) return localized(item, 'linkText');
  if (!item.url) return '';
  if (item.platform === 'ios' || item.url.includes('apps.apple.com')) return t('appStore');
  try {
    return new URL(item.url).hostname.replace(/^www\./, '') || item.url;
  } catch {
    return item.url;
  }
}

function appLinkHtml(item) {
  const icon =
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>';
  if (item.url) {
    const label = formatAppLinkLabel(item) || item.url;
    return `<span class="app-row-link">${escapeHtml(label)}${icon}</span>`;
  }
  const soon = item.platform === 'ios' ? t('appStoreSoon') : t('linkSoon');
  return `<span class="app-row-link app-row-link-muted">${soon}</span>`;
}

function langBadgesHtml(languages) {
  return languages
    .map((code) => `<span class="lang-badge lang-badge-${code}">${code === 'ru' ? 'RU' : 'EN'}</span>`)
    .join('');
}

function toggleEmptySection(sectionId, count) {
  const section = document.getElementById(sectionId);
  if (section) section.style.display = count ? '' : 'none';
}

const PLAY_BADGE_SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>';

// Build the inner HTML for a card preview. Media loads natively; on error it
// reveals the emoji placeholder underneath. Nothing here blocks or awaits.
function previewHtml(item) {
  const placeholder = '<div class="card-preview-placeholder">🎮</div>';
  const badge = `<div class="play-badge">${PLAY_BADGE_SVG}</div>`;

  if (!item.preview) return placeholder + badge;

  const src = `${itemBasePath(item)}/${escapeHtml(item.preview)}`;
  const ext = item.preview.split('.').pop().toLowerCase();
  const isVideo = ext === 'mp4' || ext === 'webm';
  // onerror hides the broken media so the placeholder below shows through.
  const onError = "this.style.display='none'";

  const media = isVideo
    ? `<video src="${src}" muted loop playsinline autoplay preload="metadata" onerror="${onError}"></video>`
    : `<img src="${src}" alt="${escapeHtml(localized(item, 'title'))}" loading="lazy" onerror="${onError}">`;

  return placeholder + media + badge;
}

function renderGames(items) {
  const grid = document.getElementById('games-grid');
  const count = document.getElementById('games-count');
  if (!grid) return;
  if (count) count.textContent = items.length;

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">${t('emptyGames')}</div>`;
    return;
  }

  grid.innerHTML = items
    .map(
      (item) => `
    <article class="card${item.featured ? ' featured' : ''}${item.wip ? ' card-wip' : ''}${item.comingSoon ? ' card-soon' : ''}" data-id="${item.id}">
      <div class="card-preview" data-preview-base="${itemBasePath(item)}">
        ${previewHtml(item)}
        <div class="card-info">
          <h3 class="card-title">${escapeHtml(localized(item, 'title'))}</h3>
          <div class="card-hover-content">
            <div class="card-hover-inner">
              <div class="card-meta">
                <div class="card-langs">${langBadgesHtml(item.languages)}</div>
                ${item.wip ? `<div class="card-tags"><span class="tag tag-wip">${t('statusWip')}</span></div>` : ''}
              </div>
              <p class="card-desc">${escapeHtml(localized(item, 'description'))}</p>
            </div>
          </div>
        </div>
      </div>
    </article>`
    )
    .join('');

  grid.querySelectorAll('.card').forEach((card) => {
    const item = catalog.games.find((i) => i.id === card.dataset.id);
    if (!item) return;
    card.addEventListener('click', () => openPlayer(item));
  });
}

function renderApps(items) {
  const list = document.getElementById('apps-list');
  const count = document.getElementById('apps-count');
  if (!list) return;
  if (count) count.textContent = items.length;

  if (!items.length) {
    list.innerHTML = `<div class="empty-state">${t('emptyApps')}</div>`;
    return;
  }

  list.innerHTML = items
    .map((item, index) => {
      const delay = `animation-delay: ${index * 0.06}s`;
      const thumb = item.image
        ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(localized(item, 'title'))}" loading="lazy" onerror="this.style.display='none'">`
        : '';
      const content = `
      <div class="app-row-thumb">
        <div class="app-row-thumb-placeholder" aria-hidden="true">📱</div>
        ${thumb}
      </div>
      <div class="app-row-body">
        <h3 class="app-row-title">${escapeHtml(localized(item, 'title'))}</h3>
        ${localized(item, 'description') ? `<p class="app-row-desc">${escapeHtml(localized(item, 'description'))}</p>` : ''}
        ${appLinkHtml(item)}
      </div>`;

      if (item.url) {
        return `<a class="app-row app-row-clickable" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" style="${delay}">${content}</a>`;
      }
      return `<article class="app-row" style="${delay}">${content}</article>`;
    })
    .join('');
}

function setupNav() {
  document.querySelectorAll('.nav-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach((btn) => btn.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.target)?.scrollIntoView({ behavior: 'smooth' });
    });
  });
}

function setupPlayer() {
  document.getElementById('player-close')?.addEventListener('click', closePlayer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePlayer();
  });
}

function openPlayer(item) {
  if (item.comingSoon) {
    alert(t('comingSoon'));
    return;
  }
  const lang = resolveGameLang(item);
  const overlay = document.getElementById('player');
  document.getElementById('player-title').textContent = localized(item, 'title', lang);
  document.getElementById('game-frame').src = `${itemBasePath(item)}/index.html?lang=${lang}`;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closePlayer() {
  const overlay = document.getElementById('player');
  if (!overlay) return;
  overlay.classList.remove('open');
  document.getElementById('game-frame').src = '';
  document.body.style.overflow = '';
}

function start() {
  try {
    init();
  } catch (err) {
    console.error('[portfolio] init failed', err);
    showLoadError();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}
