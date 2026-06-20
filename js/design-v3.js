/*
 * V3 — Particles scatter in hero, then form: things I've built → Games → Apps.
 * Pool capped at 500; stroke sampling + farthest-point selection for readable text.
 */
(function initDesignV3() {
  const field = document.getElementById('particle-field');
  if (!field) return;
  const ambient = field.closest('.ambient');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const POOL_MAX = reduced ? 0 : 500;
  const DOT_PX = 2;
  const SCATTER_COLORS = ['#ff2d55', '#22d3ee', '#f472b6', '#fbbf24', '#c084fc'];
  const FORM_ANCHOR = { x: 50, y: 50 };

  const TEXT = {
    things: "things I've built",
    games: 'Games',
    apps: 'Apps',
  };

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpColor(a, b, t) {
    const parse = (hex) => {
      const n = parseInt(hex.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const [r1, g1, b1] = parse(a);
    const [r2, g2, b2] = parse(b);
    return `rgb(${Math.round(lerp(r1, r2, t))}, ${Math.round(lerp(g1, g2, t))}, ${Math.round(lerp(b1, b2, t))})`;
  }

  /** Scroll-driven — no extra ease so motion matches scroll speed */
  function formDrive(t) {
    return clamp(t, 0, 1);
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function parseFontSize(font) {
    const match = font.match(/(\d+(?:\.\d+)?)\s*px/);
    return match ? parseFloat(match[1]) : 32;
  }

  function scaleOffsets(offsets, maxHalfWvw, maxHalfVh) {
    if (!offsets.length) return offsets;
    let maxDx = 0;
    let maxDy = 0;
    for (const p of offsets) {
      maxDx = Math.max(maxDx, Math.abs(p.dx));
      maxDy = Math.max(maxDy, Math.abs(p.dy));
    }
    const scale = Math.min(
      maxHalfWvw / Math.max(maxDx, 0.001),
      maxHalfVh / Math.max(maxDy, 0.001)
    );
    return offsets.map((p) => ({ dx: p.dx * scale, dy: p.dy * scale }));
  }

  function snapGrid(points, step) {
    const seen = new Set();
    const out = [];
    for (const p of points) {
      const x = Math.round(p.x / step) * step;
      const y = Math.round(p.y / step) * step;
      const key = `${x}|${y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ x, y });
    }
    return out;
  }

  function farthestPointSample(points, targetCount) {
    if (points.length <= targetCount) return points.slice();
    if (!targetCount) return [];

    const selected = [];
    const used = new Uint8Array(points.length);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let iMinX = 0;
    let iMaxX = 0;
    let iMinY = 0;
    let iMaxY = 0;

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (p.x < minX) {
        minX = p.x;
        iMinX = i;
      }
      if (p.x > maxX) {
        maxX = p.x;
        iMaxX = i;
      }
      if (p.y < minY) {
        minY = p.y;
        iMinY = i;
      }
      if (p.y > maxY) {
        maxY = p.y;
        iMaxY = i;
      }
    }

    for (const idx of [iMinX, iMaxX, iMinY, iMaxY, points.length >> 1]) {
      if (!used[idx]) {
        used[idx] = 1;
        selected.push(points[idx]);
      }
    }

    while (selected.length < targetCount) {
      let bestIdx = -1;
      let bestMinDist = -1;

      for (let i = 0; i < points.length; i++) {
        if (used[i]) continue;
        let minDist = Infinity;
        for (const s of selected) {
          const dx = points[i].x - s.x;
          const dy = points[i].y - s.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < minDist) minDist = d2;
        }
        if (minDist > bestMinDist) {
          bestMinDist = minDist;
          bestIdx = i;
        }
      }

      if (bestIdx === -1) break;
      used[bestIdx] = 1;
      selected.push(points[bestIdx]);
    }

    return selected;
  }

  function measurePhraseWidth(ctx, text, fontSize, font, isLong) {
    ctx.font = font;
    const letterGap = isLong ? fontSize * 0.085 : fontSize * 0.022;
    const wordGap = isLong ? fontSize * 0.16 : fontSize * 0.04;
    let width = 0;
    const words = text.split(' ');

    for (let wi = 0; wi < words.length; wi++) {
      const word = words[wi];
      for (let ci = 0; ci < word.length; ci++) {
        width += ctx.measureText(word[ci]).width;
        if (ci < word.length - 1) width += letterGap;
      }
      if (wi < words.length - 1) width += wordGap;
    }

    return width;
  }

  function drawPhraseStrokes(ctx, text, x, y, fontSize, font, isLong) {
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.15, fontSize * 0.038);
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = 'rgba(255,255,255,0.1)';

    const letterGap = isLong ? fontSize * 0.085 : fontSize * 0.022;
    const wordGap = isLong ? fontSize * 0.16 : fontSize * 0.04;
    let cx = x;
    const words = text.split(' ');

    for (let wi = 0; wi < words.length; wi++) {
      const word = words[wi];
      for (let ci = 0; ci < word.length; ci++) {
        const ch = word[ci];
        ctx.fillText(ch, cx, y);
        ctx.strokeText(ch, cx, y);
        cx += ctx.measureText(ch).width;
        if (ci < word.length - 1) cx += letterGap;
      }
      if (wi < words.length - 1) cx += wordGap;
    }
  }

  function canvasPointsToOffsets(points, logicalW, logicalH) {
    const cx = logicalW / 2;
    const cy = logicalH / 2;
    const vw = window.innerWidth || 1;
    const vh = window.innerHeight || 1;

    return points.map((p) => ({
      dx: ((p.x - cx) / vw) * 100,
      dy: ((p.y - cy) / vh) * 100,
    }));
  }

  function samplePhrase(text, font, options) {
    const { targetCount, isLong, maxHalfWvw, maxHalfVh } = options;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return [{ dx: 0, dy: 0 }];

    const fontSize = parseFontSize(font);
    const dpr = Math.min(window.devicePixelRatio || 2, 3);
    const supersample = 2.5;
    const scale = dpr * supersample;

    ctx.font = font;
    const textW = measurePhraseWidth(ctx, text, fontSize, font, isLong);
    const pad = Math.ceil(fontSize * 0.28);
    const logicalW = Math.ceil(textW) + pad * 2;
    const logicalH = Math.ceil(fontSize * 1.22) + pad * 2;

    canvas.width = Math.ceil(logicalW * scale);
    canvas.height = Math.ceil(logicalH * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.font = font;
    drawPhraseStrokes(ctx, text, pad, logicalH / 2, fontSize, font, isLong);

    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const cw = canvas.width;
    const step = DOT_PX * scale;
    const raw = [];

    for (let y = 0; y < canvas.height; y += step) {
      for (let x = 0; x < canvas.width; x += step) {
        const i = (Math.floor(y) * cw + Math.floor(x)) * 4;
        if (data[i + 3] > 36) {
          raw.push({ x: x / scale, y: y / scale });
        }
      }
    }

    let snapped = snapGrid(raw, DOT_PX);
    if (snapped.length > targetCount) {
      snapped = farthestPointSample(snapped, targetCount);
    }

    if (!snapped.length) return [{ dx: 0, dy: 0 }];

    return scaleOffsets(
      canvasPointsToOffsets(snapped, logicalW, logicalH),
      maxHalfWvw,
      maxHalfVh
    );
  }

  function buildPhraseData() {
    const thingsSize = Math.round(clamp(window.innerWidth * 0.054, 28, 52));
    const headingSize = Math.round(clamp(window.innerWidth * 0.118, 54, 104));

    const thingsFont = `700 ${thingsSize}px Syne, sans-serif`;
    const headingFont = `800 ${headingSize}px Syne, sans-serif`;

    const thingsPts = samplePhrase(TEXT.things, thingsFont, {
      targetCount: POOL_MAX,
      isLong: true,
      maxHalfWvw: 44,
      maxHalfVh: 7.5,
    });
    const gamesPts = samplePhrase(TEXT.games, headingFont, {
      targetCount: POOL_MAX,
      isLong: false,
      maxHalfWvw: 30,
      maxHalfVh: 9,
    });
    const appsPts = samplePhrase(TEXT.apps, headingFont, {
      targetCount: POOL_MAX,
      isLong: false,
      maxHalfWvw: 24,
      maxHalfVh: 9,
    });

    const counts = {
      things: thingsPts.length,
      games: gamesPts.length,
      apps: appsPts.length,
    };

    const scatterCount = clamp(
      Math.round(Math.min(counts.games, counts.apps) * 0.65 + 48),
      64,
      140
    );

    return {
      counts,
      scatterCount,
      targets: {
        things: thingsPts,
        games: gamesPts,
        apps: appsPts,
      },
    };
  }

  function gapWeight(el) {
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.bottom < vh * 0.06 || r.top > vh * 0.94) return 0;
    const elCenter = r.top + r.height * 0.5;
    const viewCenter = vh * 0.5;
    // Viewport-based band keeps tight scatter gaps between adjacent words.
    const band = vh * 0.34;
    const t = clamp(Math.abs(elCenter - viewCenter) / band, 0, 1);
    // Short dwell so the formed word is readable without killing the motion.
    const PLATEAU = 0.2;
    if (t <= PLATEAU) return 1;
    return (1 - t) / (1 - PLATEAU);
  }

  function formationWeights() {
    const things = document.getElementById('formation-things');
    const gamesGap = document.getElementById('formation-games');
    const appsGap = document.getElementById('formation-apps');

    const wThings = gapWeight(things);
    const wGames = gapWeight(gamesGap);
    const wApps = gapWeight(appsGap);

    const max = Math.max(wThings, wGames, wApps);
    if (max < 0.04) {
      return { monoThings: 0, monoGames: 0, monoApps: 0, formed: 0, mode: 'scatter' };
    }

    if (wThings === max) {
      return { monoThings: wThings, monoGames: 0, monoApps: 0, formed: wThings, mode: 'things' };
    }
    if (wGames === max) {
      return { monoThings: 0, monoGames: wGames, monoApps: 0, formed: wGames, mode: 'games' };
    }
    return { monoThings: 0, monoGames: 0, monoApps: wApps, formed: wApps, mode: 'apps' };
  }

  let phrase = buildPhraseData();
  const particles = [];

  for (let i = 0; i < POOL_MAX; i++) {
    const color = SCATTER_COLORS[i % SCATTER_COLORS.length];
    const el = document.createElement('span');
    el.className = 'particle particle--dot';
    el.style.background = color;
    el.style.color = color;
    field.appendChild(el);

    particles.push({
      el,
      scatterColor: color,
      scatter: { x: rand(4, 96), y: rand(6, 94) },
      rot: rand(-12, 12),
      spin: rand(-0.15, 0.15),
      floatPhase: rand(0, Math.PI * 2),
      floatAmp: rand(2, 7),
      parallax: rand(0.06, 0.22),
    });
  }

  let scrollY = 0;
  let raf = 0;
  let tick = 0;

  function onScroll() {
    scrollY = window.scrollY;
    if (!raf) raf = requestAnimationFrame(update);
  }

  function rebuildTargets() {
    phrase = buildPhraseData();
    update();
  }

  function phraseTargetCount(mode) {
    const { counts } = phrase;
    if (mode === 'things') return counts.things;
    if (mode === 'games') return counts.games;
    if (mode === 'apps') return counts.apps;
    return phrase.scatterCount;
  }

  function preloadFonts() {
    if (!document.fonts) return Promise.resolve();
    return Promise.all([
      document.fonts.load('700 32px Syne'),
      document.fonts.load('800 64px Syne'),
      document.fonts.ready,
    ]).catch(() => {});
  }

  function update() {
    raf = 0;
    tick += 1;

    const { monoThings, monoGames, monoApps, formed, mode } = formationWeights();
    const driveThings = formDrive(monoThings);
    const driveGames = formDrive(monoGames);
    const driveApps = formDrive(monoApps);
    const live = formed > 0.98 ? 0 : 1 - formed;
    const ax = FORM_ANCHOR.x;
    const ay = FORM_ANCHOR.y;

    const phraseCount = phraseTargetCount(mode);
    const activeCount = Math.round(lerp(phrase.scatterCount, phraseCount, formed));

    field.classList.toggle('particle-field--formed', formed > 0.12);
    field.classList.toggle('particle-field--sharp', formed > 0.5);
    if (ambient) ambient.classList.toggle('ambient--formed', formed > 0.12);

    particles.forEach((p, i) => {
      if (i >= activeCount) {
        p.el.style.opacity = '0';
        return;
      }

      const fadeIn = i >= activeCount - 6 ? clamp((activeCount - i) / 6, 0, 1) : 1;

      let x = p.scatter.x;
      let y = p.scatter.y;

      const tThings = phrase.targets.things[i];
      const tGames = phrase.targets.games[i];
      const tApps = phrase.targets.apps[i];

      if (tThings) {
        x = lerp(x, ax + tThings.dx, driveThings);
        y = lerp(y, ay + tThings.dy, driveThings);
      }
      if (tGames) {
        x = lerp(x, ax + tGames.dx, driveGames);
        y = lerp(y, ay + tGames.dy, driveGames);
      }
      if (tApps) {
        x = lerp(x, ax + tApps.dx, driveApps);
        y = lerp(y, ay + tApps.dy, driveApps);
      }

      const float = Math.sin(tick * 0.014 + p.floatPhase) * p.floatAmp * live;
      const drift = scrollY * p.parallax * 0.004 * live;
      const rot = (p.rot + tick * p.spin) * live;

      const formColor = '#ffffff';
      const color = formed > 0.05
        ? lerpColor(p.scatterColor, formColor, formed)
        : p.scatterColor;

      p.el.style.background = color;
      p.el.style.color = color;
      p.el.style.transform =
        `translate3d(calc(${x}vw - 50%), calc(${y}vh - 50% + ${float - drift}px), 0) rotate(${rot}deg)`;
      p.el.style.opacity = String(lerp(0.4, 1, formed) * fadeIn);
    });
  }

  if (!POOL_MAX) return;

  window.rebuildParticlePhrases = (nextText) => {
    if (nextText?.things) TEXT.things = nextText.things;
    if (nextText?.games) TEXT.games = nextText.games;
    if (nextText?.apps) TEXT.apps = nextText.apps;
    return preloadFonts().then(rebuildTargets);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    rebuildTargets();
    onScroll();
  }, { passive: true });
  window.addEventListener('load', () => preloadFonts().then(rebuildTargets));

  preloadFonts().then(rebuildTargets);

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      rebuildTargets();
    }).observe(document.body);
  }

  requestAnimationFrame(update);
  setTimeout(() => preloadFonts().then(rebuildTargets), 120);
  setTimeout(() => preloadFonts().then(rebuildTargets), 600);
})();
