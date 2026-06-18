const PREVIEW_NAMES = {
  video: ['preview.mp4', 'preview.webm'],
  image: ['preview.gif', 'preview.webp', 'preview.jpg', 'preview.png', 'thumbnail.gif', 'thumbnail.jpg', 'thumbnail.png'],
};

const DEBUG = {
  enabled() {
    return (
      /(?:\?|&)debug=1(?:&|$)/.test(location.search) ||
      localStorage.getItem('portfolio-debug') === '1'
    );
  },
  log(...args) {
    if (this.enabled()) console.log('[portfolio]', ...args);
  },
  warn(...args) {
    console.warn('[portfolio]', ...args);
  },
  error(...args) {
    console.error('[portfolio]', ...args);
  },
  since(start) {
    return `${Math.round(performance.now() - start)}ms`;
  },
};

const PROBE_TIMEOUT_MS = 8000;
const FETCH_TIMEOUT_MS = 10000;

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(`Timeout after ${ms}ms: ${label}`);
      DEBUG.warn('timeout', label, ms);
      reject(err);
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function fetchWithTimeout(url, options = {}, ms = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

const UI = {
  en: {
    games: 'Games',
    apps: 'Apps',
    emptyGames: 'No games yet — add folders and update data/catalog.js',
    emptyApps: 'No apps yet — add entries to data/catalog.js',
    loadError: 'Could not load game list.',
    fileHint:
      'Double-clicking index.html blocks loading. Run start.bat in the Portfolio folder, or open via http://localhost:3456.',
    catalogHint: 'Check that data/catalog.js is present and has your games listed.',
    serverBanner: 'For games to play correctly, use a local server — run',
    serverBannerOr: 'or open',
    statusWip: 'In development',
    linkSoon: 'Link coming soon',
    appStore: 'App Store',
    appStoreSoon: 'App Store — coming soon',
    comingSoon: 'This game is not in the portfolio yet — coming soon.',
  },
  ru: {
    games: 'Игры',
    apps: 'Приложения',
    emptyGames: 'Пока нет игр — добавьте папки и обновите data/catalog.js',
    emptyApps: 'Пока нет приложений — добавьте записи в data/catalog.js',
    loadError: 'Не удалось загрузить список игр.',
    fileHint:
      'При открытии index.html напрямую список не загружается. Запустите start.bat или откройте http://localhost:3456.',
    catalogHint: 'Проверьте, что data/catalog.js существует и содержит ваши игры.',
    serverBanner: 'Чтобы игры работали, нужен локальный сервер — запустите',
    serverBannerOr: 'или откройте',
    statusWip: 'В разработке',
    linkSoon: 'Ссылка скоро',
    appStore: 'App Store',
    appStoreSoon: 'App Store — скоро',
    comingSoon: 'Игра ещё не добавлена в портфолио — скоро.',
  },
};

let catalog = { games: [], apps: [], site: {} };
let siteLang = 'en';

async function init() {
  const t0 = performance.now();
  DEBUG.log('init:start', { protocol: location.protocol, href: location.href, debug: DEBUG.enabled() });

  siteLang = getSiteLang();
  const catalogT0 = performance.now();
  catalog = normalizeCatalog(await loadCatalog());
  DEBUG.log('init:catalog', {
    ms: DEBUG.since(catalogT0),
    games: catalog.games?.length ?? 0,
    apps: catalog.apps?.length ?? 0,
    source: window.GAME_CATALOG?.games?.length ? 'GAME_CATALOG' : 'fetch/fallback',
  });

  if (!catalog.games?.length) {
    DEBUG.warn('init:empty-catalog');
    showLoadError();
    return;
  }

  applySiteLang();
  const renderT0 = performance.now();
  renderGames(catalog.games);
  renderApps(catalog.apps);
  DEBUG.log('init:rendered', { ms: DEBUG.since(renderT0) });

  toggleEmptySection('apps-section', catalog.apps.length);
  const appsTab = document.querySelector('.nav-tab[data-target="apps-section"]');
  if (appsTab) appsTab.style.display = catalog.apps.length ? '' : 'none';
  setupLangSwitcher();
  setupNav();
  setupPlayer();

  if (location.protocol === 'file:') {
    const banner = document.getElementById('server-banner');
    if (banner) banner.hidden = false;
  }

  DEBUG.log('init:done', { totalMs: DEBUG.since(t0) });
}

function getSiteLang() {
  const saved = localStorage.getItem('portfolio-lang');
  if (saved === 'ru' || saved === 'en') return saved;
  return navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

function t(key) {
  return UI[siteLang][key] || UI.en[key] || key;
}

function normalizeCatalog(data) {
  const normalizeItem = (item) => {
    const languages = item.languages || ['en'];
    let title = item.title;
    let description = item.description;

    if (typeof title === 'string') {
      title = { [languages[0]]: title };
    }
    if (typeof description === 'string') {
      description = { [languages[0]]: description };
    }

    return { ...item, languages, title, description };
  };

  const site = data.site || {};
  let siteTitle = site.title;
  let siteTagline = site.tagline;
  if (typeof siteTitle === 'string') {
    siteTitle = { en: siteTitle, ru: siteTitle };
  }
  if (typeof siteTagline === 'string') {
    siteTagline = { en: siteTagline, ru: siteTagline };
  }

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
  if (langs.includes(siteLang)) return siteLang;
  return langs[0];
}

function applySiteLang() {
  document.documentElement.lang = siteLang;
  document.title = localized(catalog.site, 'title') || 'My Games & Apps';
  document.getElementById('site-title').textContent = localized(catalog.site, 'title');
  document.getElementById('site-title').title = localized(catalog.site, 'tagline');

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    if (UI[siteLang][key]) el.textContent = UI[siteLang][key];
  });

  document.querySelectorAll('.lang-switch-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.lang === siteLang);
  });

  updateServerBanner();
}

function updateServerBanner() {
  const banner = document.getElementById('server-banner');
  if (!banner || banner.hidden) return;
  banner.innerHTML = `${t('serverBanner')} <strong>start.bat</strong> ${t('serverBannerOr')} <a href="http://localhost:3456">http://localhost:3456</a>`;
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

async function loadCatalog() {
  const fromWindow = window.GAME_CATALOG;
  if (fromWindow?.games?.length) {
    DEBUG.log('loadCatalog:window', fromWindow.games.length);
    return fromWindow;
  }

  if (location.protocol === 'http:' || location.protocol === 'https:') {
    try {
      DEBUG.log('loadCatalog:fetch games.json');
      const res = await fetchWithTimeout('data/games.json', { cache: 'no-cache' });
      DEBUG.log('loadCatalog:fetch status', res.status, res.ok);
      if (res.ok) {
        const data = await res.json();
        if (data.games?.length) return data;
      }
    } catch (err) {
      DEBUG.warn('loadCatalog:fetch failed', err?.message || err);
    }
  }

  if (fromWindow?.games?.length) {
    return fromWindow;
  }

  DEBUG.warn('loadCatalog:empty');
  return { site: {}, games: [], apps: [] };
}

function showLoadError() {
  const grid = document.getElementById('games-grid');
  if (!grid) return;

  const isFile = location.protocol === 'file:';
  grid.innerHTML = `<div class="empty-state">
    <strong>${t('loadError')}</strong><br><br>
    ${isFile ? t('fileHint') : t('catalogHint')}
  </div>`;
}

function itemBasePath(item) {
  return `games/${item.folder}`;
}

function previewPaths(item, kind) {
  const base = itemBasePath(item);
  if (item.preview) {
    const explicit = `${base}/${item.preview}`;
    const ext = item.preview.split('.').pop().toLowerCase();
    const isVideo = ext === 'mp4' || ext === 'webm';
    if (kind === 'video' && isVideo) return [explicit];
    if (kind === 'image' && !isVideo) return [explicit];
    if (kind === 'image' && isVideo) return [];
    if (kind === 'video' && !isVideo) return [];
  }
  return PREVIEW_NAMES[kind].map((name) => `${base}/${name}`);
}

function schedulePreviewLoad(container, item) {
  if (!container || !item) return;
  loadCardPreview(container, item).catch((err) => {
    DEBUG.warn('preview:failed', item.id, err?.message || err);
    showPreviewFallback(container, item);
  });
}

function showPreviewFallback(container, item) {
  container.innerHTML = '';
  container.appendChild(makePreviewPlaceholder());
  const badge = document.createElement('div');
  badge.className = 'play-badge';
  badge.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>';
  container.appendChild(badge);
}

function appImagePaths(item) {
  if (item.image) return [item.image];
  const base = `apps/${item.id}`;
  return PREVIEW_NAMES.image.map((name) => `${base}/${name}`);
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
    const host = new URL(item.url).hostname.replace(/^www\./, '');
    return host || item.url;
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

function renderAppRowContent(item) {
  return `
      <div class="app-row-thumb" data-app-id="${item.id}">
        <div class="app-row-thumb-placeholder" aria-hidden="true">📱</div>
      </div>
      <div class="app-row-body">
        <h3 class="app-row-title">${escapeHtml(localized(item, 'title'))}</h3>
        ${localized(item, 'description') ? `<p class="app-row-desc">${escapeHtml(localized(item, 'description'))}</p>` : ''}
        ${appLinkHtml(item)}
      </div>`;
}

function langBadgesHtml(languages) {
  return languages
    .map(
      (code) =>
        `<span class="lang-badge lang-badge-${code}">${code === 'ru' ? 'RU' : 'EN'}</span>`
    )
    .join('');
}

function toggleEmptySection(sectionId, count) {
  const section = document.getElementById(sectionId);
  if (section) section.style.display = count ? '' : 'none';
}

function renderGames(items) {
  const grid = document.getElementById('games-grid');
  const count = document.getElementById('games-count');
  if (!grid) return;

  count.textContent = items.length;

  if (!items.length) {
    grid.innerHTML = `<div class="empty-state">${t('emptyGames')}</div>`;
    return;
  }

  grid.innerHTML = items
    .map(
      (item) => `
    <article class="card${item.featured ? ' featured' : ''}${item.wip ? ' card-wip' : ''}${item.comingSoon ? ' card-soon' : ''}" data-id="${item.id}">
      <div class="card-preview" data-preview-base="${itemBasePath(item)}">
        <div class="card-preview-placeholder">🎮</div>
        <div class="play-badge">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
        </div>
      </div>
      <div class="card-info">
        <h3 class="card-title">${localized(item, 'title')}</h3>
        <div class="card-hover-content">
          <div class="card-hover-inner">
            <div class="card-meta">
              <div class="card-langs">${langBadgesHtml(item.languages)}</div>
              ${item.wip ? `<div class="card-tags"><span class="tag tag-wip">${t('statusWip')}</span></div>` : ''}
            </div>
            <p class="card-desc">${localized(item, 'description')}</p>
          </div>
        </div>
      </div>
    </article>`
    )
    .join('');

  grid.querySelectorAll('.card').forEach((card) => {
    const id = card.dataset.id;
    const item = catalog.games.find((i) => i.id === id);
    schedulePreviewLoad(card.querySelector('.card-preview'), item);
    card.addEventListener('mouseenter', () => {
      if (item?.unity) prefetchUnityBuild();
    });
    card.addEventListener('click', () => openPlayer(item));
  });
}

function renderApps(items) {
  const list = document.getElementById('apps-list');
  const count = document.getElementById('apps-count');
  if (!list) return;

  count.textContent = items.length;

  if (!items.length) {
    list.innerHTML = `<div class="empty-state">${t('emptyApps')}</div>`;
    return;
  }

  list.innerHTML = items
    .map((item, index) => {
      const delay = `animation-delay: ${index * 0.06}s`;
      const content = renderAppRowContent(item);

      if (item.url) {
        return `<a class="app-row app-row-clickable" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" style="${delay}">${content}</a>`;
      }

      return `<article class="app-row" style="${delay}">${content}</article>`;
    })
    .join('');

  list.querySelectorAll('.app-row-thumb').forEach((thumb) => {
    const item = items.find((i) => i.id === thumb.dataset.appId);
    loadAppThumb(thumb, item).catch((err) => {
      DEBUG.warn('app-thumb:failed', item?.id, err?.message || err);
    });
  });
}

async function loadAppThumb(container, item) {
  const t0 = performance.now();
  const paths = appImagePaths(item);
  DEBUG.log('app-thumb:start', item?.id, paths);
  const imageSrc = await findFirstExisting(paths, `app:${item?.id}`);
  DEBUG.log('app-thumb:done', item?.id, { imageSrc, ms: DEBUG.since(t0) });
  if (!imageSrc) return;

  container.innerHTML = '';
  const img = document.createElement('img');
  img.src = imageSrc;
  img.alt = localized(item, 'title');
  img.loading = 'lazy';
  container.appendChild(img);
}

async function loadCardPreview(container, item) {
  const t0 = performance.now();
  const badge = document.createElement('div');
  badge.className = 'play-badge';
  badge.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>';

  container.innerHTML = '';

  if (item.preview) {
    const src = `${itemBasePath(item)}/${item.preview}`;
    DEBUG.log('preview:direct', item.id, src);
    const ext = item.preview.split('.').pop().toLowerCase();
    const isVideo = ext === 'mp4' || ext === 'webm';
    const media = isVideo ? document.createElement('video') : document.createElement('img');
    media.src = src;
    if (!isVideo) {
      media.alt = localized(item, 'title');
      media.loading = 'lazy';
    } else {
      media.muted = true;
      media.loop = true;
      media.playsInline = true;
      media.autoplay = true;
    }
    media.onload = () => DEBUG.log('preview:loaded', item.id, src, DEBUG.since(t0));
    media.onloadeddata = () => DEBUG.log('preview:loaded', item.id, src, DEBUG.since(t0));
    media.onerror = () => {
      DEBUG.warn('preview:error', item.id, src);
      showPreviewFallback(container, item);
    };
    container.appendChild(media);
    container.appendChild(badge);
    return;
  }

  DEBUG.log('preview:probe', item.id);
  const imageSrc = await findFirstExisting(previewPaths(item, 'image'), `preview-image:${item.id}`);
  const videoSrc = imageSrc ? null : await findFirstExisting(previewPaths(item, 'video'), `preview-video:${item.id}`);

  if (videoSrc) {
    const video = document.createElement('video');
    video.src = videoSrc;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.autoplay = true;
    container.appendChild(video);
  } else if (imageSrc) {
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = localized(item, 'title');
    img.loading = 'lazy';
    container.appendChild(img);
  } else {
    container.appendChild(makePreviewPlaceholder());
  }

  container.appendChild(badge);
  DEBUG.log('preview:probed', item.id, { imageSrc, videoSrc, ms: DEBUG.since(t0) });
}

function makePreviewPlaceholder() {
  const ph = document.createElement('div');
  ph.className = 'card-preview-placeholder';
  ph.textContent = '🎮';
  return ph;
}

async function findFirstExisting(paths, label = 'probe') {
  for (const path of paths) {
    DEBUG.log('probe:try', label, path);
    try {
      if (await probeMedia(path, label)) {
        DEBUG.log('probe:hit', label, path);
        return path;
      }
      DEBUG.log('probe:miss', label, path);
    } catch (err) {
      DEBUG.warn('probe:error', label, path, err?.message || err);
    }
  }
  return null;
}

function waitForImage(img, label) {
  if (img.complete && img.naturalWidth > 0) return Promise.resolve();
  return withTimeout(
    new Promise((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Image failed: ${img.src}`));
    }),
    PROBE_TIMEOUT_MS,
    label
  );
}

function waitForVideo(video, label) {
  return withTimeout(
    new Promise((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error(`Video failed: ${video.src}`));
    }),
    PROBE_TIMEOUT_MS,
    label
  );
}

function probeMedia(path, label = 'probe') {
  const ext = path.split('.').pop().toLowerCase();
  const isVideo = ext === 'mp4' || ext === 'webm';

  if (isVideo) {
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      return Promise.resolve(false);
    }
    return withTimeout(
      new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        const done = (ok) => {
          video.onloadedmetadata = null;
          video.onerror = null;
          resolve(ok);
        };
        video.onloadedmetadata = () => done(true);
        video.onerror = () => done(false);
        video.src = path;
      }),
      PROBE_TIMEOUT_MS,
      `${label}:${path}`
    );
  }

  return withTimeout(
    new Promise((resolve) => {
      const img = new Image();
      const done = (ok) => {
        img.onload = null;
        img.onerror = null;
        resolve(ok);
      };
      img.onload = () => done(true);
      img.onerror = () => done(false);
      img.src = path;
    }),
    PROBE_TIMEOUT_MS,
    `${label}:${path}`
  );
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
  document.getElementById('player-close').addEventListener('click', closePlayer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePlayer();
  });
}

function prefetchUnityBuild() {
  if (prefetchUnityBuild.done) return;
  prefetchUnityBuild.done = true;
  const files = [
    'games/BugEaters/Build/TheBugEaters.loader.js',
    'games/BugEaters/Build/TheBugEaters.framework.js.br',
    'games/BugEaters/Build/TheBugEaters.wasm.br',
    'games/BugEaters/Build/TheBugEaters.data.br',
  ];
  files.forEach((href) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    document.head.appendChild(link);
  });
}
prefetchUnityBuild.done = false;

function openPlayer(item) {
  if (item.comingSoon) {
    alert(t('comingSoon'));
    return;
  }
  if (location.protocol === 'file:' && item.unity) {
    alert(
      siteLang === 'ru'
        ? 'Bug Eaters (Unity) нужно открывать через start.bat → http://localhost:3456'
        : 'Bug Eaters (Unity) requires start.bat → http://localhost:3456'
    );
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
  overlay.classList.remove('open');
  document.getElementById('game-frame').src = '';
  document.body.style.overflow = '';
}

function startPortfolio() {
  DEBUG.log('boot', {
    debug: DEBUG.enabled(),
    tip: 'Add ?debug=1 to URL for verbose logs',
  });
  init().catch((err) => {
    DEBUG.error('init:failed', err);
    showLoadError();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startPortfolio);
} else {
  startPortfolio();
}
