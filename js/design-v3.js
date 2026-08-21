/*
 * V3 — Particles form Mark Severin, then things I've built → Games → Apps.
 * Pool capped at 500; stroke sampling + farthest-point selection for readable text.
 *
 * LETTER_SAMPLER: 'v3' traces a thin glyph outline and spaces dots evenly.
 * 'v2' was per-glyph but filled and clumped. 'v1' is the old whole-phrase grid.
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
    const mem = navigator.deviceMemory || 8;
    let cap;
    if (w <= 600) cap = 160;
    else if (w <= 1024) cap = 280;
    else if (w <= 1440) cap = 560;
    else cap = 640;
    if (cores <= 2 || mem <= 2) cap = Math.min(cap, 140);
    else if (cores <= 4 && mem <= 4 && w <= 1024) cap = Math.min(cap, 260);
    return cap;
  }

  const POOL_MAX = maxParticlesForDevice();
  const DOT_PX = 2;
  const LETTER_SAMPLER = 'v3';
  const SCATTER_COLORS = ['#ff2d55', '#22d3ee', '#f472b6', '#fbbf24', '#c084fc'];
  const FORM_ANCHOR = { x: 50, y: 50 };

  const TEXT = {
    name: 'Mark Severin',
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

  function scaleOffsets(offsets, maxHalfWvw, maxHalfVh, maxScale = Infinity) {
    if (!offsets.length) return offsets;
    let maxDx = 0;
    let maxDy = 0;
    for (const p of offsets) {
      maxDx = Math.max(maxDx, Math.abs(p.dx));
      maxDy = Math.max(maxDy, Math.abs(p.dy));
    }
    const scale = Math.min(
      maxHalfWvw / Math.max(maxDx, 0.001),
      maxHalfVh / Math.max(maxDy, 0.001),
      maxScale,
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
    ctx.lineWidth = Math.max(1.5, fontSize * 0.055);
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = 'rgba(255,255,255,0.45)';

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

  function samplePhraseV1(text, font, options) {
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

  function phraseGaps(fontSize, isLong) {
    return {
      letterGap: isLong ? fontSize * 0.22 : fontSize * 0.24,
      wordGap: isLong ? fontSize * 0.38 : fontSize * 0.22,
    };
  }

  function gridKey(gx, gy) {
    return gx + ':' + gy;
  }

  function minDistanceSample(points, minDist) {
    if (points.length <= 1 || minDist <= 0) return points.slice();
    const cell = minDist;
    const minD2 = minDist * minDist;
    const grid = new Map();
    const out = [];
    const ordered = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
    for (const p of ordered) {
      const gx = Math.floor(p.x / cell);
      const gy = Math.floor(p.y / cell);
      let ok = true;
      for (let oy = -1; oy <= 1 && ok; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const bucket = grid.get(gridKey(gx + ox, gy + oy));
          if (!bucket) continue;
          for (const q of bucket) {
            const dx = p.x - q.x;
            const dy = p.y - q.y;
            if (dx * dx + dy * dy < minD2) {
              ok = false;
              break;
            }
          }
        }
      }
      if (!ok) continue;
      out.push(p);
      const k = gridKey(gx, gy);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(p);
    }
    return out;
  }

  function connectedGroups(points, link) {
    const n = points.length;
    if (!n) return [];
    const parent = new Int32Array(n);
    for (let i = 0; i < n; i++) parent[i] = i;
    const find = (i) => {
      while (parent[i] !== i) {
        parent[i] = parent[parent[i]];
        i = parent[i];
      }
      return i;
    };
    const cell = Math.max(link, 0.001);
    const grid = new Map();
    for (let i = 0; i < n; i++) {
      const gx = Math.floor(points[i].x / cell);
      const gy = Math.floor(points[i].y / cell);
      const k = gridKey(gx, gy);
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(i);
    }
    const linkD = link * link;
    for (let i = 0; i < n; i++) {
      const gx = Math.floor(points[i].x / cell);
      const gy = Math.floor(points[i].y / cell);
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const bucket = grid.get(gridKey(gx + ox, gy + oy));
          if (!bucket) continue;
          for (const j of bucket) {
            if (j <= i) continue;
            const dx = points[i].x - points[j].x;
            const dy = points[i].y - points[j].y;
            if (dx * dx + dy * dy <= linkD) {
              const a = find(i);
              const b = find(j);
              if (a !== b) parent[a] = b;
            }
          }
        }
      }
    }
    const groups = new Map();
    for (let i = 0; i < n; i++) {
      const r = find(i);
      if (!groups.has(r)) groups.set(r, []);
      groups.get(r).push(points[i]);
    }
    return [...groups.values()];
  }

  function zhangSuenThin(src, w, h) {
    const img = new Uint8Array(src);
    const idx = (x, y) => y * w + x;
    let changed = true;
    let guard = 0;
    while (changed && guard < 64) {
      changed = false;
      guard += 1;
      for (let pass = 0; pass < 2; pass++) {
        const kill = [];
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const i = idx(x, y);
            if (!img[i]) continue;
            const p2 = img[idx(x, y - 1)];
            const p3 = img[idx(x + 1, y - 1)];
            const p4 = img[idx(x + 1, y)];
            const p5 = img[idx(x + 1, y + 1)];
            const p6 = img[idx(x, y + 1)];
            const p7 = img[idx(x - 1, y + 1)];
            const p8 = img[idx(x - 1, y)];
            const p9 = img[idx(x - 1, y - 1)];
            const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
            if (B < 2 || B > 6) continue;
            const ring = [p2, p3, p4, p5, p6, p7, p8, p9, p2];
            let A = 0;
            for (let k = 0; k < 8; k++) if (!ring[k] && ring[k + 1]) A += 1;
            if (A !== 1) continue;
            if (pass === 0) {
              if (p2 && p4 && p6) continue;
              if (p4 && p6 && p8) continue;
            } else {
              if (p2 && p4 && p8) continue;
              if (p2 && p6 && p8) continue;
            }
            kill.push(i);
          }
        }
        if (kill.length) {
          changed = true;
          for (const i of kill) img[i] = 0;
        }
      }
    }
    return img;
  }

  function chainPoints(points, link) {
    if (points.length <= 2) return [points.slice()];
    const n = points.length;
    const used = new Uint8Array(n);
    const cell = Math.max(link, 0.001);
    const grid = new Map();
    for (let i = 0; i < n; i++) {
      const k = gridKey(Math.floor(points[i].x / cell), Math.floor(points[i].y / cell));
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(i);
    }
    const neighborsOf = (i) => {
      const gx = Math.floor(points[i].x / cell);
      const gy = Math.floor(points[i].y / cell);
      const near = [];
      const maxD = link * 1.9;
      const maxD2 = maxD * maxD;
      for (let oy = -2; oy <= 2; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          const bucket = grid.get(gridKey(gx + ox, gy + oy));
          if (!bucket) continue;
          for (const j of bucket) {
            if (j === i) continue;
            const dx = points[i].x - points[j].x;
            const dy = points[i].y - points[j].y;
            const d2 = dx * dx + dy * dy;
            if (d2 <= maxD2) near.push([j, d2]);
          }
        }
      }
      near.sort((a, b) => a[1] - b[1]);
      return near.map((p) => p[0]);
    };
    const degree = new Int16Array(n);
    const neigh = [];
    for (let i = 0; i < n; i++) {
      neigh[i] = neighborsOf(i);
      degree[i] = neigh[i].length;
    }
    const walk = (start, from) => {
      const chain = [];
      let cur = start;
      let prev = from;
      while (cur >= 0 && !used[cur]) {
        used[cur] = 1;
        chain.push(points[cur]);
        const opts = neigh[cur].filter((j) => !used[j] && j !== prev);
        if (!opts.length) break;
        let next = opts[0];
        let best = Infinity;
        for (const j of opts) {
          const dx = points[cur].x - points[j].x;
          const dy = points[cur].y - points[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < best) {
            best = d2;
            next = j;
          }
        }
        prev = cur;
        cur = next;
      }
      return chain;
    };
    const chains = [];
    const starts = [];
    for (let i = 0; i < n; i++) if (degree[i] <= 1) starts.push(i);
    for (const i of starts) {
      if (used[i]) continue;
      chains.push(walk(i, -1));
    }
    for (let i = 0; i < n; i++) {
      if (used[i]) continue;
      chains.push(walk(i, -1));
    }
    return chains.filter((c) => c.length);
  }

  function resampleChain(chain, spacing) {
    if (chain.length === 1) return chain.slice();
    if (chain.length === 2) return chain.slice();
    let len = 0;
    const seg = [];
    for (let i = 1; i < chain.length; i++) {
      const d = Math.hypot(chain[i].x - chain[i - 1].x, chain[i].y - chain[i - 1].y);
      seg.push(d);
      len += d;
    }
    if (len < spacing * 0.6) {
      const mid = chain[Math.floor(chain.length / 2)];
      return [{ x: mid.x, y: mid.y }];
    }
    const count = Math.max(2, Math.round(len / spacing));
    const step = len / count;
    const out = [chain[0]];
    let acc = 0;
    let si = 0;
    let traveled = 0;
    for (let k = 1; k < count; k++) {
      const target = k * step;
      while (si < seg.length && traveled + seg[si] < target) {
        traveled += seg[si];
        si += 1;
      }
      if (si >= seg.length) break;
      const t = (target - traveled) / Math.max(seg[si], 0.0001);
      const a = chain[si];
      const b = chain[si + 1];
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
    const last = chain[chain.length - 1];
    const tail = out[out.length - 1];
    if (Math.hypot(last.x - tail.x, last.y - tail.y) > spacing * 0.35) out.push(last);
    return out;
  }

  function collapseTinyIslands(points, fontSize, spacing, ch) {
    if (!points.length) return points;
    const groups = connectedGroups(points, Math.max(spacing * 1.15, fontSize * 0.045));
    const out = [];
    const mark = ch === 'i' || ch === 'j' || ch === "'" || ch === '.' || ch === ',' || ch === '`';
    const tiny = mark ? fontSize * 0.36 : fontSize * 0.2;
    for (const g of groups) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      let sx = 0;
      let sy = 0;
      for (const p of g) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
        sx += p.x;
        sy += p.y;
      }
      const w = maxX - minX;
      const h = maxY - minY;
      const span = Math.hypot(w, h);
      const cx = sx / g.length;
      const cy = sy / g.length;
      if (span < tiny || (g.length <= 5 && span < fontSize * 0.28)) {
        if (!mark && h > fontSize * 0.14 && h > w * 1.2) {
          out.push({ x: cx, y: minY + h * 0.18 });
          out.push({ x: cx, y: minY + h * 0.82 });
        } else {
          out.push({ x: cx, y: cy });
        }
        continue;
      }
      for (const chain of chainPoints(g, spacing * 0.85)) {
        out.push(...resampleChain(chain, spacing));
      }
    }
    return out;
  }

  function toFontPoint(px, py, scale, padX, logicalH) {
    return { x: px / scale - padX, y: py / scale - logicalH / 2 };
  }

  function collectMaskPoints(mask, w, h, scale, padX, logicalH, outlineOnly) {
    const pts = [];
    for (let py = 1; py < h - 1; py++) {
      for (let px = 1; px < w - 1; px++) {
        if (!mask[py * w + px]) continue;
        if (outlineOnly) {
          if (
            mask[py * w + px - 1] &&
            mask[py * w + px + 1] &&
            mask[(py - 1) * w + px] &&
            mask[(py + 1) * w + px]
          ) continue;
        }
        pts.push(toFontPoint(px, py, scale, padX, logicalH));
      }
    }
    return pts;
  }

  function restoreVanishedBlobs(mask, skel, w, h, scale, padX, logicalH) {
    const seen = new Uint8Array(w * h);
    const extra = [];
    const dirs = [1, -1, w, -w];
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i] || seen[i]) continue;
      const stack = [i];
      seen[i] = 1;
      let sx = 0;
      let sy = 0;
      let n = 0;
      let skelHits = 0;
      while (stack.length) {
        const cur = stack.pop();
        const x = cur % w;
        const y = (cur / w) | 0;
        sx += x;
        sy += y;
        n += 1;
        if (skel[cur]) skelHits += 1;
        for (const d of dirs) {
          const nxt = cur + d;
          if (nxt < 0 || nxt >= mask.length || seen[nxt] || !mask[nxt]) continue;
          const nx = nxt % w;
          if (Math.abs(nx - x) > 1) continue;
          seen[nxt] = 1;
          stack.push(nxt);
        }
      }
      if (!n) continue;
      if (skelHits === 0) extra.push(toFontPoint(sx / n, sy / n, scale, padX, logicalH));
    }
    return extra;
  }

  function connectedMaskComponents(mask, w, h) {
    const seen = new Uint8Array(w * h);
    const comps = [];
    const dirs = [1, -1, w, -w];
    for (let i = 0; i < mask.length; i++) {
      if (!mask[i] || seen[i]) continue;
      const stack = [i];
      seen[i] = 1;
      let minX = w;
      let maxX = 0;
      let minY = h;
      let maxY = 0;
      let sx = 0;
      let sy = 0;
      let n = 0;
      while (stack.length) {
        const cur = stack.pop();
        const x = cur % w;
        const y = (cur / w) | 0;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        sx += x;
        sy += y;
        n += 1;
        for (const d of dirs) {
          const nxt = cur + d;
          if (nxt < 0 || nxt >= mask.length || seen[nxt] || !mask[nxt]) continue;
          if (Math.abs((nxt % w) - x) > 1) continue;
          seen[nxt] = 1;
          stack.push(nxt);
        }
      }
      comps.push({ minX, maxX, minY, maxY, cx: sx / n, cy: sy / n, n });
    }
    return comps;
  }

  function resampleSegment(x0, y0, x1, y1, spacing) {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const count = Math.max(1, Math.round(len / Math.max(spacing, 0.001)));
    const out = [];
    for (let k = 0; k <= count; k++) {
      const t = k / count;
      out.push({ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t });
    }
    return out;
  }

  function sampleDotLetter(ch, mask, w, h, scale, padX, logicalH, fontSize) {
    const comps = connectedMaskComponents(mask, w, h);
    if (!comps.length) return [];
    comps.sort((a, b) => b.n - a.n);
    const stem = comps[0];
    const spacing = fontSize * 0.046;
    const stemX = toFontPoint(stem.cx, 0, scale, padX, logicalH).x;
    const stemTop = toFontPoint(0, stem.minY, scale, padX, logicalH).y;
    const stemBot = toFontPoint(0, stem.maxY, scale, padX, logicalH).y;
    const stemPts = resampleSegment(stemX, stemTop, stemX, stemBot, spacing);
    if (ch === 'j') {
      stemPts.push(...resampleSegment(
        stemX,
        stemBot,
        stemX - fontSize * 0.2,
        stemBot + fontSize * 0.04,
        spacing
      ));
    }
    const tittleComp = comps.find((c) => c !== stem && c.cy < stem.cy && c.n < stem.n * 0.45);
    const naturalY = tittleComp
      ? toFontPoint(0, tittleComp.cy, scale, padX, logicalH).y
      : stemTop - fontSize * 0.2;
    const tittleY = Math.min(naturalY, stemTop - fontSize * 0.24);
    stemPts.push({ x: stemX, y: tittleY });
    return stemPts;
  }

  function sampleTee(mask, w, h, scale, padX, logicalH, fontSize) {
    const rowMin = new Int32Array(h).fill(w);
    const rowMax = new Int32Array(h).fill(-1);
    let minX = w;
    let maxX = 0;
    let minY = h;
    let maxY = 0;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!mask[y * w + x]) continue;
        if (x < rowMin[y]) rowMin[y] = x;
        if (x > rowMax[y]) rowMax[y] = x;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxY < minY) return [];
    const gh = maxY - minY;
    const searchEnd = minY + Math.round(gh * 0.48);
    let bestW = -1;
    for (let y = minY; y <= searchEnd; y++) {
      if (rowMax[y] < 0) continue;
      bestW = Math.max(bestW, rowMax[y] - rowMin[y]);
    }
    let barSum = 0;
    let barN = 0;
    let bL = minX;
    let bR = maxX;
    const wide = Math.max(3, bestW * 0.72);
    for (let y = minY; y <= searchEnd; y++) {
      if (rowMax[y] < 0) continue;
      if (rowMax[y] - rowMin[y] < wide) continue;
      barSum += y;
      barN += 1;
      bL = Math.min(bL, rowMin[y]);
      bR = Math.max(bR, rowMax[y]);
    }
    const barY = barN ? Math.round(barSum / barN) : minY + Math.round(gh * 0.22);
    let stemSum = 0;
    let stemN = 0;
    for (let y = Math.min(h - 1, barY + 2); y <= maxY; y++) {
      for (let x = 0; x < w; x++) {
        if (!mask[y * w + x]) continue;
        stemSum += x;
        stemN += 1;
      }
    }
    const stemPx = stemN ? stemSum / stemN : (minX + maxX) / 2;
    const spacing = fontSize * 0.046;
    const sx = toFontPoint(stemPx, 0, scale, padX, logicalH).x;
    const bot = toFontPoint(0, maxY, scale, padX, logicalH).y;
    const by = toFontPoint(0, barY, scale, padX, logicalH).y;
    let left = toFontPoint(bL, 0, scale, padX, logicalH).x;
    let right = toFontPoint(bR, 0, scale, padX, logicalH).x;
    if (sx - left < fontSize * 0.2) left = sx - fontSize * 0.2;
    if (right - sx < fontSize * 0.26) right = sx + fontSize * 0.26;
    const stemTop = by - fontSize * 0.07;
    return minDistanceSample([
      ...resampleSegment(sx, stemTop, sx, bot, spacing),
      ...resampleSegment(left, by, right, by, spacing),
    ], spacing * 0.8);
  }

  function sampleGlyphOutline(ch, font, fontSize, scale) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
    if (!ctx) return { points: [], advance: fontSize * 0.5 };
    ctx.font = font;
    const advance = Math.max(ctx.measureText(ch).width, fontSize * 0.12);
    const padX = Math.ceil(fontSize * 0.32);
    const padY = Math.ceil(fontSize * 0.4);
    const logicalW = Math.max(1, Math.ceil(advance) + padX * 2);
    const logicalH = Math.ceil(fontSize * 1.4) + padY * 2;
    canvas.width = Math.max(1, Math.ceil(logicalW * scale));
    canvas.height = Math.max(1, Math.ceil(logicalH * scale));
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(ch, padX, logicalH / 2);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const cw = canvas.width;
    const chh = canvas.height;
    const mask = new Uint8Array(cw * chh);
    for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] >= 80 ? 1 : 0;
    if (ch === 'i' || ch === 'j') {
      return { points: sampleDotLetter(ch, mask, cw, chh, scale, padX, logicalH, fontSize), advance };
    }
    if (ch === 'I') {
      const spacing = fontSize * 0.046;
      const comps = connectedMaskComponents(mask, cw, chh);
      const stem = comps.sort((a, b) => b.n - a.n)[0];
      if (!stem) return { points: [], advance };
      const sx = toFontPoint(stem.cx, 0, scale, padX, logicalH).x;
      const top = toFontPoint(0, stem.minY, scale, padX, logicalH).y;
      const bot = toFontPoint(0, stem.maxY, scale, padX, logicalH).y;
      const half = fontSize * 0.16;
      return {
        points: minDistanceSample([
          ...resampleSegment(sx, top, sx, bot, spacing),
          ...resampleSegment(sx - half, top, sx + half, top, spacing),
          ...resampleSegment(sx - half, bot, sx + half, bot, spacing),
        ], spacing * 0.8),
        advance,
      };
    }
    if (ch === 't') {
      return { points: sampleTee(mask, cw, chh, scale, padX, logicalH, fontSize), advance };
    }
    const skel = zhangSuenThin(mask, cw, chh);
    const raw = collectMaskPoints(skel, cw, chh, scale, padX, logicalH, false);
    raw.push(...restoreVanishedBlobs(mask, skel, cw, chh, scale, padX, logicalH));
    const spacing = fontSize * 0.048;
    return { points: collapseTinyIslands(raw, fontSize, spacing, ch), advance };
  }

  function samplePhraseV3(text, font, options) {
    const { targetCount, isLong, maxHalfWvw, maxHalfVh, maxScale = Infinity } = options;
    const probe = document.createElement('canvas').getContext('2d');
    if (!probe) return [{ dx: 0, dy: 0 }];
    const fontSize = parseFontSize(font);
    const dpr = Math.min(window.devicePixelRatio || 2, 3);
    const scale = Math.max(2.5, Math.min(dpr * 2, 5));
    const { letterGap, wordGap } = phraseGaps(fontSize, isLong);
    probe.font = font;
    const glyphs = [];
    let cursorX = 0;
    const words = text.split(' ');
    for (let wi = 0; wi < words.length; wi++) {
      const word = words[wi];
      for (let ci = 0; ci < word.length; ci++) {
        glyphs.push({ ch: word[ci], x: cursorX });
        cursorX += probe.measureText(word[ci]).width;
        if (ci < word.length - 1) cursorX += letterGap;
      }
      if (wi < words.length - 1) cursorX += wordGap;
    }
    const allPoints = [];
    let maxX = 0;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const g of glyphs) {
      const { points, advance } = sampleGlyphOutline(g.ch, font, fontSize, scale);
      for (const p of points) {
        const x = g.x + p.x;
        const y = p.y;
        allPoints.push({ x, y });
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
      maxX = Math.max(maxX, g.x + advance);
    }
    const cap = isLong ? targetCount : Math.min(targetCount, 480);
    let spaced = allPoints;
    if (spaced.length > cap) {
      let minDist = fontSize * 0.042;
      spaced = minDistanceSample(allPoints, minDist);
      while (spaced.length > cap && minDist < fontSize * 0.09) {
        minDist += fontSize * 0.006;
        spaced = minDistanceSample(allPoints, minDist);
      }
    }
    if (!spaced.length) return [{ dx: 0, dy: 0 }];
    const pad = Math.ceil(fontSize * 0.28);
    const logicalW = Math.ceil(maxX) + pad * 2;
    const logicalH = Math.ceil(Math.max(fontSize * 1.22, maxY - minY + fontSize * 0.28)) + pad * 2;
    const midY = (minY + maxY) / 2;
    const finalPts = spaced.map((p) => ({ x: p.x + pad, y: p.y - midY + logicalH / 2 }));
    return scaleOffsets(
      canvasPointsToOffsets(finalPts, logicalW, logicalH),
      maxHalfWvw,
      maxHalfVh,
      maxScale
    );
  }

  function samplePhrase(text, font, options) {
    if (LETTER_SAMPLER === 'v1') return samplePhraseV1(text, font, options);
    return samplePhraseV3(text, font, options);
  }

  function buildPhraseData() {
    const thingsSize = Math.round(clamp(window.innerWidth * 0.054, 28, 52));
    const headingSize = Math.round(clamp(window.innerWidth * 0.1, 52, 90));

    const nameFont = `700 ${headingSize}px Syne, sans-serif`;
    const thingsFont = `700 ${thingsSize}px Syne, sans-serif`;
    const headingFont = `700 ${headingSize}px Syne, sans-serif`;

    const namePts = samplePhrase(TEXT.name, nameFont, {
      targetCount: POOL_MAX,
      isLong: true,
      maxHalfWvw: 36,
      maxHalfVh: 7.2,
      maxScale: 1.25,
    });
    const thingsPts = samplePhrase(TEXT.things, thingsFont, {
      targetCount: POOL_MAX,
      isLong: true,
      maxHalfWvw: 34,
      maxHalfVh: 6.8,
      maxScale: 1.2,
    });
    const gamesPts = samplePhrase(TEXT.games, headingFont, {
      targetCount: POOL_MAX,
      isLong: false,
      maxHalfWvw: 28,
      maxHalfVh: 6.8,
      maxScale: 1.35,
    });
    const appsPts = samplePhrase(TEXT.apps, headingFont, {
      targetCount: POOL_MAX,
      isLong: false,
      maxHalfWvw: 24,
      maxHalfVh: 6.8,
      maxScale: 1.35,
    });

    const counts = {
      name: namePts.length,
      things: thingsPts.length,
      games: gamesPts.length,
      apps: appsPts.length,
    };

    const scatterCount = clamp(
      Math.round(Math.min(counts.name, counts.games, counts.apps) * 0.65 + 48),
      64,
      140
    );

    return {
      counts,
      scatterCount,
      targets: {
        name: namePts,
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
    const elCenter = r.top + Math.max(r.height, 1) * 0.5;
    const dist = Math.abs(elCenter - vh * 0.5);
    // One wheel step of full lock, then a short falloff into scatter.
    const HOLD = vh * 0.1;
    const END = vh * 0.34;
    if (dist <= HOLD) return 1;
    if (dist >= END) return 0;
    return 1 - (dist - HOLD) / (END - HOLD);
  }

  function formationWeights() {
    const name = document.getElementById('formation-name');
    const things = document.getElementById('formation-things');
    const gamesGap = document.getElementById('formation-games');
    const appsGap = document.getElementById('formation-apps');

    const wName = gapWeight(name);
    const wThings = gapWeight(things);
    const wGames = gapWeight(gamesGap);
    const wApps = gapWeight(appsGap);

    const max = Math.max(wName, wThings, wGames, wApps);
    if (max < 0.04) {
      return { monoName: 0, monoThings: 0, monoGames: 0, monoApps: 0, formed: 0, mode: 'scatter' };
    }

    if (wName === max) {
      return { monoName: wName, monoThings: 0, monoGames: 0, monoApps: 0, formed: wName, mode: 'name' };
    }
    if (wThings === max) {
      return { monoName: 0, monoThings: wThings, monoGames: 0, monoApps: 0, formed: wThings, mode: 'things' };
    }
    if (wGames === max) {
      return { monoName: 0, monoThings: 0, monoGames: wGames, monoApps: 0, formed: wGames, mode: 'games' };
    }
    return { monoName: 0, monoThings: 0, monoGames: 0, monoApps: wApps, formed: wApps, mode: 'apps' };
  }

  function emptyPhrase() {
    const z = [{ dx: 0, dy: 0 }];
    return {
      counts: { name: 1, things: 1, games: 1, apps: 1 },
      scatterCount: 96,
      targets: { name: z, things: z, games: z, apps: z },
    };
  }

  let phrase = emptyPhrase();
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

  function bootPhrases() {
    const thingsSize = Math.round(clamp(window.innerWidth * 0.054, 28, 52));
    const headingSize = Math.round(clamp(window.innerWidth * 0.1, 52, 90));
    const nameFont = `700 ${headingSize}px Syne, sans-serif`;
    phrase.targets.name = samplePhrase(TEXT.name, nameFont, {
      targetCount: POOL_MAX,
      isLong: true,
      maxHalfWvw: 36,
      maxHalfVh: 7.2,
      maxScale: 1.25,
    });
    phrase.counts.name = phrase.targets.name.length;
    lastBuildW = window.innerWidth;
    update();
    setTimeout(rebuildTargets, 50);
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
    if (mode === 'name') return counts.name;
    if (mode === 'things') return counts.things;
    if (mode === 'games') return counts.games;
    if (mode === 'apps') return counts.apps;
    return phrase.scatterCount;
  }

  function preloadFonts() {
    if (!document.fonts) return Promise.resolve();
    return Promise.all([
      document.fonts.load('700 32px Syne'),
      document.fonts.load('700 64px Syne'),
      document.fonts.ready,
    ]).catch(() => {});
  }

  function update() {
    raf = 0;
    tick += 1;
    markAnimating();

    const { monoName, monoThings, monoGames, monoApps, formed, mode } = formationWeights();
    const driveName = formDrive(monoName);
    const driveThings = formDrive(monoThings);
    const driveGames = formDrive(monoGames);
    const driveApps = formDrive(monoApps);
    const live = formed > 0.88 ? 0 : 1 - formed;
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

      const tName = phrase.targets.name[i];
      const tThings = phrase.targets.things[i];
      const tGames = phrase.targets.games[i];
      const tApps = phrase.targets.apps[i];

      if (tName) {
        x = lerp(x, ax + tName.dx, driveName);
        y = lerp(y, ay + tName.dy, driveName);
      }
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
    if (nextText?.name) TEXT.name = nextText.name;
    if (nextText?.things) TEXT.things = nextText.things;
    if (nextText?.games) TEXT.games = nextText.games;
    if (nextText?.apps) TEXT.apps = nextText.apps;
    return preloadFonts().then(rebuildTargets);
  };

  window.LETTER_SAMPLER = LETTER_SAMPLER;
  window.__debugPhraseTargets = () => ({
    texts: { ...TEXT },
    targets: phrase.targets,
    sampler: LETTER_SAMPLER,
    counts: phrase.counts,
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', () => {
    scheduleRebuild();
    onScroll();
  }, { passive: true });

  preloadFonts().then(bootPhrases);

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      scheduleRebuild();
    }).observe(document.body);
  }

  requestAnimationFrame(update);
})();
