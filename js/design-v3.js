/*
 * V3 — Particles scatter in hero, then form: things I've built → Games → Apps.
 * Pool capped at 500; stroke sampling + farthest-point selection for readable text.
 */
(function initDesignV3() {
  const field = document.getElementById('particle-field');
  if (!field) return;
  const ambient = field.closest('.ambient');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Particle count scales with the device so the scatter/formation effect stays
  // readable everywhere but doesn't melt weaker laptops. The farthest-point
  // sampler adapts to whatever count it's given, so fewer dots still spell the
  // words — they're just a little sparser. Fixed at load (resizing never
  // recreates the pool), which keeps things stable.
  function maxParticlesForDevice() {
    if (reduced) return 0;
    const w = window.innerWidth || 1280;
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 4;
    let cap;
    if (w <= 600) cap = 120;
    else if (w <= 1024) cap = 220;
    else if (w <= 1440) cap = 340;
    else cap = 500;
    if (cores <= 4 || mem <= 4) cap = Math.min(cap, 240);
    if (cores <= 2 || mem <= 2) cap = Math.min(cap, 120);
    return cap;
  }

  const POOL_MAX = maxParticlesForDevice();
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

  // Tracking: short headings need air so m≠nn and p/s don't fuse.
  // Long phrases keep a wider, airier rhythm.
  function phraseGaps(fontSize, isLong) {
    return {
      letterGap: isLong ? fontSize * 0.1 : fontSize * 0.1,
      wordGap: isLong ? fontSize * 0.22 : fontSize * 0.1,
    };
  }

  function measurePhraseWidth(ctx, text, fontSize, font, isLong) {
    ctx.font = font;
    const { letterGap, wordGap } = phraseGaps(fontSize, isLong);
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

  /** Thin / easy-to-lose glyphs get a higher sampling weight floor. */
  function glyphWeight(ch, measuredW, fontSize) {
    const base = Math.max(measuredW, fontSize * 0.28);
    if (ch === "'" || ch === '’' || ch === '`' || ch === '.') return Math.max(base, fontSize * 0.5);
    if (ch === 'I' || ch === 'i' || ch === 'l' || ch === 't' || ch === 'f' || ch === 'j') {
      return Math.max(base, fontSize * 0.45);
    }
    // Multi-arch letters need budget for all stems/arches.
    if (ch === 'm' || ch === 'w' || ch === 'M' || ch === 'W') return base * 1.35;
    if (ch === 's' || ch === 'S') return base * 1.2;
    if (ch === 'e' || ch === 'a' || ch === 'g' || ch === 'p' || ch === 'P') return base * 1.1;
    return base;
  }

  /**
   * Sample one glyph with a thin stroke outline (no heavy fill) so counters
   * and multi-arch letters stay open. Returns points in local glyph space
   * (origin at left of advance, vertical center).
   */
  function sampleGlyphPoints(ch, font, fontSize, scale) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
    if (!ctx) return { points: [], advance: fontSize * 0.5 };

    ctx.font = font;
    const advance = ctx.measureText(ch).width;
    const padX = Math.ceil(fontSize * 0.28);
    const padY = Math.ceil(fontSize * 0.36);
    const logicalW = Math.max(1, Math.ceil(advance) + padX * 2);
    const logicalH = Math.ceil(fontSize * 1.35) + padY * 2;

    canvas.width = Math.max(1, Math.ceil(logicalW * scale));
    canvas.height = Math.max(1, Math.ceil(logicalH * scale));
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.clearRect(0, 0, logicalW, logicalH);
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // Thin stroke keeps m arches / s openings from sealing into blobs.
    ctx.lineWidth = Math.max(1.05, fontSize * 0.032);
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = 'rgba(255,255,255,0.03)';

    const x = padX;
    const y = logicalH / 2;
    ctx.fillText(ch, x, y);
    ctx.strokeText(ch, x, y);

    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const cw = canvas.width;
    const chh = canvas.height;
    const step = Math.max(1, Math.round(DOT_PX * scale * 0.75));
    const alphaAt = (px, py) => {
      if (px < 0 || py < 0 || px >= cw || py >= chh) return 0;
      return data[(py * cw + px) * 4 + 3];
    };

    const raw = [];
    for (let py = 0; py < chh; py += step) {
      for (let px = 0; px < cw; px += step) {
        const a = alphaAt(px, py);
        if (a <= 20) continue;
        // Edge-only: letter identity is in the outline, not the fill blob.
        const edge =
          alphaAt(px - step, py) <= 20 ||
          alphaAt(px + step, py) <= 20 ||
          alphaAt(px, py - step) <= 20 ||
          alphaAt(px, py + step) <= 20;
        if (edge) {
          raw.push({
            x: px / scale - padX,
            y: py / scale - logicalH / 2,
          });
        }
      }
    }

    // Tiny marks (') may have almost no edge ring — take all ink.
    if (raw.length < 10) {
      raw.length = 0;
      for (let py = 0; py < chh; py += step) {
        for (let px = 0; px < cw; px += step) {
          if (alphaAt(px, py) > 20) {
            raw.push({
              x: px / scale - padX,
              y: py / scale - logicalH / 2,
            });
          }
        }
      }
    }

    let points = snapGrid(raw, DOT_PX * 0.85);

    // Reinforce multi-arch letters: ensure left / mid / right vertical bands
    // keep samples so m doesn't collapse to "nn".
    if ((ch === 'm' || ch === 'w' || ch === 'M' || ch === 'W') && points.length > 12) {
      points = reinforceVerticalBands(points, 3);
    }
    if ((ch === 's' || ch === 'S' || ch === 'e' || ch === 'a') && points.length > 10) {
      points = reinforceVerticalBands(points, 2);
    }

    return { points, advance };
  }

  /** Keep points spread across N horizontal bands of the glyph bbox. */
  function reinforceVerticalBands(points, bands) {
    let minX = Infinity;
    let maxX = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
    }
    const span = Math.max(maxX - minX, 1);
    const byBand = Array.from({ length: bands }, () => []);
    for (const p of points) {
      const t = (p.x - minX) / span;
      const b = Math.min(bands - 1, Math.floor(t * bands));
      byBand[b].push(p);
    }
    // If a band is starved, pull nearest points from neighbors (already in set).
    // Farthest-point later still thins; this just guarantees candidates exist.
    const minBand = Math.max(4, Math.floor(points.length / (bands * 2.2)));
    const out = points.slice();
    for (let b = 0; b < bands; b++) {
      if (byBand[b].length >= minBand) continue;
      const targetX = minX + ((b + 0.5) / bands) * span;
      // Duplicate a few nearest existing points nudged into the empty band.
      const sorted = points.slice().sort((a, c) => Math.abs(a.x - targetX) - Math.abs(c.x - targetX));
      const need = minBand - byBand[b].length;
      for (let k = 0; k < need && k < sorted.length; k++) {
        out.push({ x: targetX + (k % 3 - 1) * 0.35, y: sorted[k].y });
      }
    }
    return out;
  }

  function allocateGlyphBudgets(weights, targetCount, minPer) {
    const n = weights.length;
    if (!n) return [];
    const totalW = weights.reduce((s, w) => s + w, 0) || 1;
    const budgets = weights.map((w) => Math.max(minPer, Math.round((targetCount * w) / totalW)));
    let sum = budgets.reduce((s, b) => s + b, 0);

    // Trim / grow to match targetCount while keeping at least minPer.
    let guard = 0;
    while (sum > targetCount && guard++ < 10000) {
      let best = -1;
      let bestExtra = -1;
      for (let i = 0; i < n; i++) {
        const extra = budgets[i] - minPer;
        if (extra > bestExtra) {
          bestExtra = extra;
          best = i;
        }
      }
      if (best < 0 || bestExtra <= 0) break;
      budgets[best]--;
      sum--;
    }
    guard = 0;
    while (sum < targetCount && guard++ < 10000) {
      let best = 0;
      for (let i = 1; i < n; i++) {
        if (budgets[i] / weights[i] < budgets[best] / weights[best]) best = i;
      }
      budgets[best]++;
      sum++;
    }
    return budgets;
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

  /**
   * Per-glyph sampling: each letter gets its own budget so G can't starve m/s,
   * and thin marks (I, ') keep enough dots to read at a glance.
   */
  function samplePhrase(text, font, options) {
    const { targetCount, isLong, maxHalfWvw, maxHalfVh } = options;
    const probe = document.createElement('canvas').getContext('2d');
    if (!probe) return [{ dx: 0, dy: 0 }];

    const fontSize = parseFontSize(font);
    const dpr = Math.min(window.devicePixelRatio || 2, 3);
    const supersample = 2.5;
    const scale = dpr * supersample;
    const { letterGap, wordGap } = phraseGaps(fontSize, isLong);

    probe.font = font;

    // Flatten to positioned glyphs (spaces advance cursor only).
    const glyphs = [];
    let cursorX = 0;
    const words = text.split(' ');
    for (let wi = 0; wi < words.length; wi++) {
      const word = words[wi];
      for (let ci = 0; ci < word.length; ci++) {
        const ch = word[ci];
        const measured = probe.measureText(ch).width;
        glyphs.push({
          ch,
          x: cursorX,
          weight: glyphWeight(ch, measured, fontSize),
        });
        cursorX += measured;
        if (ci < word.length - 1) cursorX += letterGap;
      }
      if (wi < words.length - 1) cursorX += wordGap;
    }

    if (!glyphs.length) return [{ dx: 0, dy: 0 }];

    // Guarantee every glyph enough dots. Short words (Games/Apps) can spend more
    // per letter; long phrases and tiny mobile pools stay conservative.
    const glyphN = glyphs.length;
    let minPer;
    if (targetCount >= 280) minPer = glyphN <= 6 ? 14 : 8;
    else if (targetCount >= 160) minPer = glyphN <= 6 ? 10 : 5;
    else minPer = glyphN <= 6 ? 6 : 3;
    // Never demand more than the pool can pay.
    minPer = Math.min(minPer, Math.floor(targetCount / Math.max(glyphN, 1)));
    const budgets = allocateGlyphBudgets(
      glyphs.map((g) => g.weight),
      targetCount,
      Math.max(2, minPer)
    );

    const allPoints = [];
    let maxX = 0;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < glyphs.length; i++) {
      const g = glyphs[i];
      const { points, advance } = sampleGlyphPoints(g.ch, font, fontSize, scale);
      let picked = points;
      if (picked.length > budgets[i]) {
        picked = farthestPointSample(picked, budgets[i]);
      }
      // If a glyph undersampled, duplicate farthest extremes so it doesn't vanish.
      if (picked.length && picked.length < budgets[i]) {
        const need = budgets[i] - picked.length;
        for (let k = 0; k < need; k++) {
          const src = picked[k % picked.length];
          picked.push({
            x: src.x + (k % 2 === 0 ? 0.4 : -0.4),
            y: src.y + (k % 3 === 0 ? 0.4 : -0.4),
          });
        }
      }

      for (const p of picked) {
        const x = g.x + p.x;
        const y = p.y;
        allPoints.push({ x, y });
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      // Keep layout width honest even if last glyph is thin.
      maxX = Math.max(maxX, g.x + advance);
    }

    if (!allPoints.length) return [{ dx: 0, dy: 0 }];

    const pad = Math.ceil(fontSize * 0.28);
    const logicalW = Math.ceil(maxX) + pad * 2;
    const logicalH = Math.ceil(Math.max(fontSize * 1.22, maxY - minY + fontSize * 0.2)) + pad * 2;
    const midY = (minY + maxY) / 2;

    const placed = allPoints.map((p) => ({
      x: p.x + pad,
      y: p.y - midY + logicalH / 2,
    }));

    // Final global thin if rounding overshot (rare).
    let finalPts = placed;
    if (finalPts.length > targetCount) {
      finalPts = farthestPointSample(finalPts, targetCount);
    }

    return scaleOffsets(
      canvasPointsToOffsets(finalPts, logicalW, logicalH),
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
  let animatingTimer = 0;

  // `will-change` is only hinted while particles are actually moving, then
  // released ~300ms after motion stops. Holding it permanently on every
  // particle reserves a compositor layer per dot — cheap on a desktop GPU,
  // expensive on a laptop. Toggling avoids that idle cost without changing how
  // the animation looks.
  function markAnimating() {
    field.classList.add('particle-field--animating');
    if (animatingTimer) clearTimeout(animatingTimer);
    animatingTimer = setTimeout(() => {
      field.classList.remove('particle-field--animating');
      animatingTimer = 0;
    }, 300);
  }

  function onScroll() {
    scrollY = window.scrollY;
    if (!raf) raf = requestAnimationFrame(update);
  }

  let lastBuildW = 0;
  let rebuildTimer = 0;

  function rebuildTargets() {
    if (rebuildTimer) {
      clearTimeout(rebuildTimer);
      rebuildTimer = 0;
    }
    phrase = buildPhraseData();
    lastBuildW = window.innerWidth;
    update();
  }

  // buildPhraseData() is expensive (~0.5s of main-thread work: canvas text
  // sampling + O(n^2) farthest-point selection over the particle pool). The
  // phrase geometry only depends on viewport WIDTH, so height-only changes —
  // opening the fullscreen player (toggles body overflow), mobile toolbars
  // collapsing on scroll, lazy media loading — must NOT trigger a rebuild, or
  // every interaction freezes the page. Width changes are debounced so a
  // resize drag coalesces into a single rebuild.
  function scheduleRebuild() {
    // Ignore sub-threshold width deltas: toggling body overflow (opening the
    // fullscreen player) adds/removes the scrollbar and nudges innerWidth by a
    // few px — not worth a full rebuild. Also skip entirely while the player
    // overlay covers the field.
    const playerOpen = document.getElementById('player')?.classList.contains('open');
    if (playerOpen || Math.abs(window.innerWidth - lastBuildW) < 24) {
      onScroll();
      return;
    }
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => {
      rebuildTimer = 0;
      rebuildTargets();
    }, 160);
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
    markAnimating();

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

  /** Debug: return formed-phrase point clouds (offsets in vw/vh from center). */
  window.__debugPhraseTargets = () => ({
    texts: { ...TEXT },
    counts: { ...phrase.counts },
    targets: {
      things: phrase.targets.things.map((p) => ({ ...p })),
      games: phrase.targets.games.map((p) => ({ ...p })),
      apps: phrase.targets.apps.map((p) => ({ ...p })),
    },
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    scheduleRebuild();
    onScroll();
  }, { passive: true });
  window.addEventListener('load', () => preloadFonts().then(rebuildTargets));

  preloadFonts().then(rebuildTargets);

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      scheduleRebuild();
    }).observe(document.body);
  }

  requestAnimationFrame(update);
})();
