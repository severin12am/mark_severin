// Painted board, enamel tiles, and the observatory behind them.
// Tiles are drawn once into sprites so the frame loop stays light.

import { CT, MR, BD, G, SHAPES, cheb, ghostRow } from "./logic.js";

const PALETTE = [
  { base: [46, 184, 168], deep: [12, 88, 82], light: [214, 248, 238] },
  { base: [228, 168, 48], deep: [120, 74, 14], light: [255, 236, 190] },
  { base: [164, 96, 198], deep: [82, 36, 108], light: [240, 214, 252] },
  { base: [52, 168, 104], deep: [16, 90, 52], light: [206, 244, 214] },
  { base: [210, 84, 70], deep: [116, 32, 28], light: [255, 210, 196] },
  { base: [226, 124, 48], deep: [124, 60, 16], light: [255, 220, 180] },
  { base: [70, 118, 206], deep: [26, 54, 118], light: [206, 222, 252] },
];

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(r, c) {
  let n = Math.imul(r, 374761393) ^ Math.imul(c, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

function rgb(c) {
  return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function makeTile(id) {
  const S = 192;
  const m = 10;
  const palette = PALETTE[id];
  const rnd = mulberry32(1000 + id * 97);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = S;
  const g = canvas.getContext("2d");
  roundRect(g, m, m, S - m * 2, S - m * 2, 28);
  const body = g.createLinearGradient(m, m, S - m, S - m);
  body.addColorStop(0, rgb(mix(palette.base, palette.light, 0.55)));
  body.addColorStop(0.42, rgb(palette.base));
  body.addColorStop(1, rgb(palette.deep));
  g.fillStyle = body;
  g.fill();
  g.save();
  g.clip();
  g.lineWidth = 14;
  g.strokeStyle = "rgba(255,255,255,0.38)";
  g.beginPath();
  g.moveTo(m + 20, S - m - 26);
  g.lineTo(m + 16, m + 30);
  g.quadraticCurveTo(m + 14, m + 14, m + 32, m + 14);
  g.lineTo(S - m - 28, m + 14);
  g.stroke();
  g.strokeStyle = "rgba(40,16,8,0.28)";
  g.beginPath();
  g.moveTo(S - m - 18, m + 36);
  g.lineTo(S - m - 16, S - m - 28);
  g.quadraticCurveTo(S - m - 14, S - m - 12, S - m - 34, S - m - 14);
  g.lineTo(m + 40, S - m - 14);
  g.stroke();
  drawMotif(g, id, S, rnd, palette);
  // Glaze specks, stable per tile.
  for (let i = 0; i < 26; i++) {
    const x = m + 12 + rnd() * (S - m * 2 - 24);
    const y = m + 12 + rnd() * (S - m * 2 - 24);
    g.fillStyle = `rgba(255,255,255,${0.04 + rnd() * 0.08})`;
    g.fillRect(x, y, 2, 2);
  }
  const spec = g.createRadialGradient(S * 0.34, S * 0.28, 4, S * 0.34, S * 0.3, S * 0.48);
  spec.addColorStop(0, "rgba(255,255,255,0.55)");
  spec.addColorStop(0.35, "rgba(255,255,255,0.08)");
  spec.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = spec;
  g.fillRect(0, 0, S, S);
  g.restore();
  // Corner pip so the set reads as made, not flat color.
  g.fillStyle = rgb(palette.deep);
  g.globalAlpha = 0.85;
  roundRect(g, S - m - 28, m + 16, 14, 14, 4);
  g.fill();
  g.globalAlpha = 1;
  return canvas;
}

function drawMotif(g, id, S, rnd, palette) {
  g.save();
  g.translate(S / 2, S / 2);
  g.strokeStyle = rgb(palette.light);
  g.fillStyle = rgb(palette.light);
  g.globalAlpha = 0.7;
  g.lineWidth = 4;
  g.lineCap = "round";
  if (id === 0) {
    for (let i = -1; i <= 1; i++) {
      g.beginPath();
      const y = i * 22;
      g.moveTo(-58, y);
      for (let x = -58; x <= 58; x += 6) g.lineTo(x, y + Math.sin(x * 0.18 + i) * 7);
      g.stroke();
    }
  } else if (id === 1) {
    for (let i = 1; i <= 3; i++) {
      g.beginPath();
      g.arc(0, 0, 14 + i * 14, 0, Math.PI * 2);
      g.stroke();
    }
  } else if (id === 2) {
    g.beginPath();
    for (let i = -2; i <= 2; i++) {
      g.moveTo(-60, i * 24);
      g.lineTo(60, i * 24);
      g.moveTo(i * 24, -60);
      g.lineTo(i * 24, 60);
    }
    g.stroke();
    g.globalAlpha = 0.9;
    g.beginPath();
    g.moveTo(0, -28);
    g.lineTo(22, 0);
    g.lineTo(0, 28);
    g.lineTo(-22, 0);
    g.closePath();
    g.fill();
  } else if (id === 3) {
    for (let i = 0; i < 3; i++) {
      g.save();
      g.rotate((i - 1) * 0.7);
      g.beginPath();
      g.ellipse(0, -8, 16, 32, 0, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(0, 24);
      g.quadraticCurveTo(10, 0, 0, -36);
      g.stroke();
      g.restore();
    }
  } else if (id === 4) {
    g.beginPath();
    for (let y = -60; y <= 60; y += 16) {
      g.moveTo(-70, y);
      g.lineTo(-30, y + 12);
      g.lineTo(10, y);
      g.lineTo(50, y + 12);
      g.lineTo(70, y);
    }
    g.stroke();
  } else if (id === 5) {
    g.translate(-20, 16);
    for (let i = 0; i < 8; i++) {
      const a = -2.4 + i * 0.42;
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.cos(a) * 70, Math.sin(a) * 70);
      g.stroke();
    }
    g.beginPath();
    g.arc(0, 0, 10, 0, Math.PI * 2);
    g.fill();
  } else {
    const pts = [[-30, -20], [-8, -36], [24, -18], [36, 10], [6, 28], [-28, 16], [-8, -4]];
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
    g.stroke();
    pts.forEach((p) => {
      g.beginPath();
      g.arc(p[0], p[1], 5, 0, Math.PI * 2);
      g.fill();
    });
  }
  g.restore();
}

function makeShadow() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const g = canvas.getContext("2d");
  for (let i = 10; i >= 1; i--) {
    g.fillStyle = `rgba(0,0,0,${0.025 + i * 0.012})`;
    g.beginPath();
    g.ellipse(32, 36, 14 + i * 1.3, 7 + i * 0.45, 0, 0, Math.PI * 2);
    g.fill();
  }
  return canvas;
}

function makeNoise() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const g = canvas.getContext("2d");
  const img = g.createImageData(128, 128);
  const rnd = mulberry32(42);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 90 + rnd() * 120;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return canvas;
}

export function createView(canvas) {
  const ctx = canvas.getContext("2d", { alpha: false });
  const tiles = PALETTE.map((_, id) => makeTile(id));
  const shadow = makeShadow();
  const noise = makeNoise();
  let layout = null;
  let staticCanvas = null;
  let stoneCanvas = null;
  let built = "";
  let stoneKey = "";
  let dpr = 1;

  function safeInset() {
    const cs = getComputedStyle(document.documentElement);
    const read = (name) => parseFloat(cs.getPropertyValue(name)) || 0;
    return {
      l: read("--sal"),
      r: read("--sar"),
      t: read("--sat"),
      b: read("--sab"),
    };
  }

  function compute(w, h, showTouch) {
    const inset = safeInset();
    const maxRatio = 2;
    let fw = w;
    let fh = h;
    if (fw / fh > maxRatio) fw = Math.round(fh * maxRatio);
    if (fh / fw > maxRatio) fh = Math.round(fw * maxRatio);
    const frame = {
      x: Math.round((w - fw) / 2),
      y: Math.round((h - fh) / 2),
      w: fw,
      h: fh,
    };
    const landscapeTouch = showTouch && w > h * 1.05;
    const hudH = showTouch && landscapeTouch ? 52 : showTouch ? 78 : 86;
    const dockH = showTouch ? (landscapeTouch ? 0 : Math.max(132, Math.min(156, fh * 0.2))) : 28;
    const side = landscapeTouch ? Math.max(78, Math.min(112, fw * 0.15)) : 0;
    const pad = 8;
    const innerX = frame.x + inset.l + side + pad;
    const innerY = frame.y + inset.t + hudH;
    const innerW = Math.max(40, frame.w - inset.l - inset.r - side * 2 - pad * 2);
    const innerH = Math.max(40, frame.h - inset.t - inset.b - hudH - dockH - pad);
    const wide = !showTouch && innerW > 640 && innerW / innerH > 0.95;
    const panel = wide ? Math.min(132, innerW * 0.16) : 0;
    const previewH = wide ? 0 : Math.min(64, Math.max(48, innerH * 0.1));
    const boardMaxW = innerW - (panel ? panel * 2 + 20 : 0);
    const boardMaxH = innerH - previewH;
    const cells = MR * 2 + 1;
    let cs = Math.floor(Math.min(boardMaxW / cells, boardMaxH / cells));
    cs = Math.max(6, cs);
    const boardPx = cs * cells;
    const clusterW = boardPx + (panel ? panel * 2 + 20 : 0);
    const cx0 = innerX + Math.max(0, (innerW - clusterW) / 2);
    const cy0 = innerY + previewH + Math.max(0, (boardMaxH - boardPx) / 2);
    const board = {
      x: Math.round(cx0 + (panel ? panel + 10 : 0)),
      y: Math.round(cy0),
      size: boardPx,
      cs,
    };
    const originX = board.x - (CT - MR) * cs;
    const originY = board.y - (CT - MR) * cs;
    return {
      frame, board, cs, originX, originY, hudH, dockH, side, showTouch, landscapeTouch, panel, previewH,
      hold: panel ? { x: Math.round(cx0), y: board.y, w: panel, h: boardPx } : null,
      next: panel ? { x: board.x + boardPx + 10, y: board.y, w: panel, h: boardPx } : null,
      strip: panel ? null : { x: board.x, y: board.y - previewH, w: boardPx, h: previewH },
    };
  }

  function paintStatic(w, h, lay) {
    const c = document.createElement("canvas");
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const g = c.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#12101c");
    sky.addColorStop(0.42, "#1a2740");
    sky.addColorStop(0.72, "#243044");
    sky.addColorStop(1, "#2a1a12");
    g.fillStyle = sky;
    g.fillRect(0, 0, w, h);
    // Lamp wash and a cooler pool of night, placed by hand.
    const lamp = g.createRadialGradient(w * 0.12, h * 0.08, 10, w * 0.18, h * 0.0, w * 0.55);
    lamp.addColorStop(0, "rgba(255, 196, 120, 0.22)");
    lamp.addColorStop(1, "rgba(255, 196, 120, 0)");
    g.fillStyle = lamp;
    g.fillRect(0, 0, w, h);
    const pool = g.createRadialGradient(w * 0.78, h * 0.22, 20, w * 0.72, h * 0.3, w * 0.4);
    pool.addColorStop(0, "rgba(90, 120, 180, 0.18)");
    pool.addColorStop(1, "rgba(90, 120, 180, 0)");
    g.fillStyle = pool;
    g.fillRect(0, 0, w, h);
    // Moon, with two craters so it is not a blank disc.
    const moonX = w * 0.8;
    const moonY = h * 0.16;
    const moonR = Math.min(w, h) * 0.055;
    const glow = g.createRadialGradient(moonX, moonY, moonR * 0.2, moonX, moonY, moonR * 5);
    glow.addColorStop(0, "rgba(255, 236, 196, 0.35)");
    glow.addColorStop(1, "rgba(255, 236, 196, 0)");
    g.fillStyle = glow;
    g.beginPath();
    g.arc(moonX, moonY, moonR * 5, 0, Math.PI * 2);
    g.fill();
    const moon = g.createRadialGradient(moonX - moonR * 0.3, moonY - moonR * 0.35, 2, moonX, moonY, moonR);
    moon.addColorStop(0, "#fff8ea");
    moon.addColorStop(0.7, "#f0e0c0");
    moon.addColorStop(1, "#d9c39a");
    g.fillStyle = moon;
    g.beginPath();
    g.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(180, 150, 110, 0.35)";
    g.beginPath();
    g.arc(moonX + moonR * 0.25, moonY + moonR * 0.1, moonR * 0.18, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(moonX - moonR * 0.28, moonY + moonR * 0.22, moonR * 0.1, 0, Math.PI * 2);
    g.fill();
    // A small drawn constellation, not a random scribble.
    const star = (nx, ny) => [w * nx, h * ny];
    const figure = [star(0.16, 0.2), star(0.22, 0.14), star(0.3, 0.18), star(0.26, 0.26), star(0.16, 0.2)];
    const figureB = [star(0.62, 0.12), star(0.68, 0.08), star(0.74, 0.13), star(0.7, 0.2)];
    g.strokeStyle = "rgba(232, 214, 180, 0.35)";
    g.lineWidth = 1;
    const strokeFig = (pts) => {
      g.beginPath();
      pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
      g.stroke();
      pts.forEach((p) => {
        g.fillStyle = "#f7edd8";
        g.beginPath();
        g.arc(p[0], p[1], 1.7, 0, Math.PI * 2);
        g.fill();
      });
    };
    strokeFig(figure);
    strokeFig(figureB);
    const rnd = mulberry32(9);
    for (let i = 0; i < 110; i++) {
      const x = rnd() * w;
      const y = rnd() * h * 0.72;
      const s = rnd() < 0.08 ? 1.8 : rnd() < 0.3 ? 1.2 : 0.7;
      g.globalAlpha = 0.35 + rnd() * 0.65;
      g.fillStyle = rnd() < 0.15 ? "#f0d2a0" : "#f4f0e6";
      g.fillRect(x, y, s, s);
    }
    g.globalAlpha = 1;
    // Wooden table under the slab.
    const bx = lay.board.x + lay.board.size / 2;
    const by = lay.board.y + lay.board.size * 0.62;
    const table = g.createRadialGradient(bx, by, 20, bx, by, lay.board.size * 0.75);
    table.addColorStop(0, "#4a3424");
    table.addColorStop(0.55, "#2c1d14");
    table.addColorStop(1, "rgba(28,18,12,0)");
    g.fillStyle = table;
    g.beginPath();
    g.ellipse(bx, by + lay.board.size * 0.42, lay.board.size * 0.72, lay.board.size * 0.28, 0, 0, Math.PI * 2);
    g.fill();
    g.save();
    g.beginPath();
    g.ellipse(bx, by + lay.board.size * 0.42, lay.board.size * 0.72, lay.board.size * 0.28, 0, 0, Math.PI * 2);
    g.clip();
    g.strokeStyle = "rgba(255, 220, 170, 0.05)";
    for (let i = -8; i < 10; i++) {
      g.lineWidth = 2;
      g.beginPath();
      const y = by + lay.board.size * 0.28 + i * 7;
      g.moveTo(bx - lay.board.size, y);
      g.bezierCurveTo(bx - 40, y + 4, bx + 30, y - 3, bx + lay.board.size, y + 2);
      g.stroke();
    }
    g.restore();
    // Grain over the whole sky, very light.
    g.globalAlpha = 0.05;
    g.drawImage(noise, 0, 0, w, h);
    g.globalAlpha = 1;
    const vignette = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.72);
    vignette.addColorStop(0, "rgba(0,0,0,0)");
    vignette.addColorStop(1, "rgba(0,0,0,0.55)");
    g.fillStyle = vignette;
    g.fillRect(0, 0, w, h);
    return c;
  }

  function paintStone(lay) {
    const size = lay.board.size;
    const c = document.createElement("canvas");
    c.width = c.height = Math.max(1, Math.round(size * dpr));
    const g = c.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { cs } = lay;
    for (let r = CT - MR; r <= CT + MR; r++) {
      for (let c0 = CT - MR; c0 <= CT + MR; c0++) {
        const dist = cheb(r, c0);
        const h = hash(r, c0);
        const danger = dist > BD;
        const base = danger ? [48, 40, 34] : [92, 78, 62];
        const alt = danger ? [32, 27, 24] : [118, 98, 76];
        const col = mix(base, alt, h);
        const x = (c0 - (CT - MR)) * cs;
        const y = (r - (CT - MR)) * cs;
        const inset = Math.max(0.5, cs * 0.045);
        g.fillStyle = rgb(col);
        g.fillRect(x + inset, y + inset, cs - inset * 2, cs - inset * 2);
        if (h > 0.82 && danger) {
          g.strokeStyle = "rgba(20,12,8,0.45)";
          g.lineWidth = 1;
          g.beginPath();
          g.moveTo(x + cs * 0.2, y + cs * 0.3);
          g.lineTo(x + cs * 0.78, y + cs * 0.72);
          g.stroke();
        }
      }
    }
    g.globalAlpha = 0.18;
    g.globalCompositeOperation = "overlay";
    g.drawImage(noise, 0, 0, size, size);
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    const shade = g.createRadialGradient(size / 2, size / 2, size * 0.2, size / 2, size / 2, size * 0.72);
    shade.addColorStop(0, "rgba(255,255,255,0.04)");
    shade.addColorStop(1, "rgba(0,0,0,0.28)");
    g.fillStyle = shade;
    g.fillRect(0, 0, size, size);
    return c;
  }

  function resize(w, h) {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
  }

  function cellCenter(r, c) {
    if (!layout) return { x: 0, y: 0 };
    return {
      x: layout.originX + (c + 0.5) * layout.cs,
      y: layout.originY + (r + 0.5) * layout.cs,
    };
  }

  function drawTile(id, x, y, size, alpha) {
    if (id < 0 || !tiles[id]) return;
    ctx.save();
    ctx.globalAlpha = alpha == null ? 1 : alpha;
    const sh = size * 0.22;
    ctx.drawImage(shadow, x + size * 0.08, y + size * 0.16, size * 0.9, sh + size * 0.45);
    const inset = Math.max(1, size * 0.06);
    ctx.drawImage(tiles[id], x + inset, y + inset, size - inset * 2, size - inset * 2);
    ctx.restore();
  }

  function drawCore(x, y, s, time) {
    const cx = x + s / 2;
    const cy = y + s / 2;
    const radius = s * 0.48;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(time * 0.35);
    ctx.strokeStyle = "#e7cb8c";
    ctx.lineWidth = Math.max(1, s * 0.045);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * radius * 0.72, Math.sin(a) * radius * 0.72);
      ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.68, 0, Math.PI * 2);
    ctx.strokeStyle = "#8d6428";
    ctx.lineWidth = Math.max(1, s * 0.06);
    ctx.stroke();
    ctx.restore();
    const pulse = 0.92 + Math.sin(time * 2.2) * 0.08;
    const gem = ctx.createRadialGradient(cx - radius * 0.15, cy - radius * 0.2, 1, cx, cy, radius * 0.55);
    gem.addColorStop(0, "#fff7dc");
    gem.addColorStop(0.4, "#f0c15a");
    gem.addColorStop(1, "#8a5414");
    ctx.fillStyle = gem;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.4 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(cx - radius * 0.1, cy - radius * 0.12, radius * 0.07, radius * 0.13, -0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawArmillary(cx, cy, radius, time, calm) {
    ctx.save();
    ctx.translate(cx, cy);
    const speed = calm ? 0.02 : 1;
    const rings = [
      { rx: radius, ry: radius * 0.36, rot: time * 0.12 * speed, color: "rgba(232, 198, 132, 0.5)" },
      { rx: radius * 0.78, ry: radius * 0.78, rot: -time * 0.07 * speed, color: "rgba(196, 154, 92, 0.32)" },
      { rx: radius * 0.5, ry: radius * 0.92, rot: 0.7 + time * 0.09 * speed, color: "rgba(244, 220, 170, 0.28)" },
    ];
    rings.forEach((ring) => {
      ctx.save();
      ctx.rotate(ring.rot);
      ctx.beginPath();
      ctx.ellipse(0, 0, ring.rx, ring.ry, 0, 0, Math.PI * 2);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    });
    const a = time * 0.28 * speed;
    ctx.rotate(a);
    ctx.fillStyle = "#f3d48a";
    ctx.beginPath();
    ctx.arc(radius * 0.78, 0, Math.max(3, radius * 0.025), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,244,214,0.9)";
    ctx.beginPath();
    ctx.arc(radius * 0.78 - 1.2, -1, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBrassFrame(lay, flash) {
    const { cs, originX, originY } = lay;
    const x = originX + (CT - BD) * cs;
    const y = originY + (CT - BD) * cs;
    const s = (BD * 2 + 1) * cs;
    ctx.save();
    ctx.strokeStyle = flash > 0 ? `rgba(255, 220, 150, ${0.45 + flash})` : "rgba(214, 176, 106, 0.9)";
    ctx.lineWidth = Math.max(2, cs * 0.09);
    ctx.strokeRect(x + 1, y + 1, s - 2, s - 2);
    ctx.strokeStyle = "rgba(92, 62, 24, 0.8)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 3, y + 3, s - 6, s - 6);
    ctx.fillStyle = "#e6c98a";
    const screws = [
      [x, y], [x + s, y], [x, y + s], [x + s, y + s],
      [x + s / 2, y], [x + s / 2, y + s], [x, y + s / 2], [x + s, y + s / 2],
    ];
    screws.forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(2, cs * 0.11), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#6e4e22";
      ctx.stroke();
    });
    ctx.restore();
  }

  function drawPieceInRect(id, x, y, w, h, padTop) {
    const shape = SHAPES[id];
    if (!shape) return;
    let minR = 0;
    let maxR = 0;
    let minC = 0;
    let maxC = 0;
    shape.forEach(([r, c]) => {
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      minC = Math.min(minC, c);
      maxC = Math.max(maxC, c);
    });
    const cols = maxC - minC + 1;
    const rows = maxR - minR + 1;
    const top = padTop || 0;
    const cell = Math.max(8, Math.min((w - 12) / cols, (h - top - 8) / rows));
    const ox = x + (w - cols * cell) / 2 - minC * cell;
    const oy = y + top + (h - top - rows * cell) / 2 - minR * cell;
    shape.forEach(([r, c]) => drawTile(id, ox + c * cell, oy + r * cell, cell, 1));
  }

  function fatalLanding(game, row) {
    return game.piece.cells.some(([dr, dc]) => {
      const r = row + dr;
      const c = game.piece.col + dc;
      if (r < 0 || c < 0 || c >= G || r >= G) return true;
      return cheb(r, c) > BD;
    });
  }

  function draw(scene) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (canvas.width !== Math.round(w * Math.min(2, window.devicePixelRatio || 1))) resize(w, h);
    layout = compute(w, h, scene.showTouch);
    const key = `${w}x${h}:${layout.board.x},${layout.board.y},${layout.board.size}:${dpr}`;
    if (key !== built) {
      staticCanvas = paintStatic(w, h, layout);
      built = key;
    }
    const skey = `${layout.board.size}:${dpr}`;
    if (skey !== stoneKey) {
      stoneCanvas = paintStone(layout);
      stoneKey = skey;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(staticCanvas, 0, 0, w, h);
    const cx = layout.board.x + layout.board.size / 2;
    const cy = layout.board.y + layout.board.size / 2;
    drawArmillary(cx, cy, layout.board.size * 0.72, scene.time, scene.calm);
    // Dust in the lamplight.
    for (let i = 0; i < 22; i++) {
      const px = ((i * 97) % 100) / 100 * w + Math.sin(scene.time * 0.25 + i) * 10;
      const py = ((i * 53) % 100) / 100 * h + Math.cos(scene.time * 0.18 + i * 0.7) * 8;
      ctx.globalAlpha = 0.15 + (i % 5) * 0.05;
      ctx.fillStyle = i % 2 ? "#f0d7a4" : "#f7f1e4";
      ctx.fillRect(px, py, 2, 2);
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.translate(scene.shakeX || 0, scene.shakeY || 0);

    // Slab.
    const { x, y, size, cs } = layout.board;
    const radius = Math.max(8, cs * 0.45);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.ellipse(x + size / 2, y + size * 0.98, size * 0.42, Math.max(8, cs * 0.85), 0, 0, Math.PI * 2);
    ctx.fill();
    roundRect(ctx, x + cs * 0.12, y + cs * 0.18, size, size, radius);
    ctx.fillStyle = "#1a140f";
    ctx.fill();
    roundRect(ctx, x, y, size, size, radius);
    ctx.save();
    ctx.clip();
    ctx.drawImage(stoneCanvas, x, y, size, size);
    drawBrassFrame(layout, scene.levelFlash || 0);

    const game = scene.game;
    let angle = 0;
    if (game && game.spin > 0) {
      const u = 1 - game.spin / 0.22;
      const eased = 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);
      const start = game.spinDir === -1 ? Math.PI / 2 : -Math.PI / 2;
      angle = start * (1 - eased);
    }
    ctx.save();
    if (angle) {
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.translate(-cx, -cy);
    }
    if (game && game.grid && !scene.showcase) {
      const clearing = new Set((game.clearMarks || []).map((cell) => cell.r + "," + cell.c));
      for (let r = 0; r < game.grid.length; r++) {
        for (let c = 0; c < game.grid[r].length; c++) {
          const cell = game.grid[r][c];
          if (!cell || cell.core) continue;
          const px = layout.originX + c * cs;
          const py = layout.originY + r * cs;
          drawTile(cell.id, px, py, cs, 1);
          if (clearing.has(r + "," + c)) {
            const pulse = 0.35 + Math.abs(Math.sin(scene.time * 22)) * 0.45;
            ctx.fillStyle = `rgba(255, 236, 200, ${pulse})`;
            const inset = cs * 0.12;
            roundRect(ctx, px + inset, py + inset, cs - inset * 2, cs - inset * 2, cs * 0.16);
            ctx.fill();
          }
        }
      }
    }
    ctx.restore();

    if (scene.showcase) {
      ctx.save();
      ctx.translate(cx, cy);
      if (!scene.calm) ctx.rotate(scene.time * 0.12);
      ctx.translate(-cx, -cy);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const rad = cs * 4.3;
        drawTile(i % 7, cx + Math.cos(a) * rad - cs / 2, cy + Math.sin(a) * rad - cs / 2, cs * 0.86, 0.95);
      }
      ctx.restore();
    }

    drawCore(layout.originX + CT * cs, layout.originY + CT * cs, cs, scene.time);

    ctx.restore(); // slab clip

    if (game && game.piece && game.phase === "fall" && game.spin <= 0) {
      const ghost = ghostRow(game);
      const fatal = ghost !== game.piece.row && fatalLanding(game, ghost);
      if (ghost !== game.piece.row) {
        game.piece.cells.forEach(([dr, dc]) => {
          const px = layout.originX + (game.piece.col + dc) * cs;
          const py = layout.originY + (ghost + dr) * cs;
          drawTile(game.piece.id, px, py, cs, fatal ? 0.28 : 0.2);
          if (fatal) {
            ctx.fillStyle = "rgba(176, 48, 36, 0.45)";
            const inset = cs * 0.12;
            roundRect(ctx, px + inset, py + inset, cs - inset * 2, cs - inset * 2, cs * 0.16);
            ctx.fill();
          }
        });
      }
      const age = game.piece.age || 0;
      const pop = Math.min(1, age / 0.12);
      const scale = 0.84 + 0.16 * (1 - Math.pow(1 - pop, 3));
      game.piece.cells.forEach(([dr, dc]) => {
        const px = layout.originX + (game.piece.col + dc) * cs;
        const py = layout.originY + (game.piece.row + dr) * cs;
        const cx2 = px + cs / 2;
        const cy2 = py + cs / 2;
        ctx.save();
        ctx.translate(cx2, cy2);
        ctx.scale(scale, scale);
        ctx.translate(-cx2, -cy2);
        drawTile(game.piece.id, px, py, cs, 1);
        ctx.strokeStyle = "rgba(255, 248, 230, 0.85)";
        ctx.lineWidth = Math.max(1.5, cs * 0.06);
        const inset = cs * 0.1;
        roundRect(ctx, px + inset, py + inset, cs - inset * 2, cs - inset * 2, cs * 0.16);
        ctx.stroke();
        ctx.restore();
      });
    }

    if (game && game.practice && layout) {
      const gap = cellCenter(13, 14.5);
      const bob = scene.calm ? 0 : Math.sin(scene.time * 4) * 4;
      ctx.fillStyle = "rgba(240, 212, 138, 0.95)";
      ctx.beginPath();
      ctx.moveTo(gap.x, gap.y - cs * 1.6 + bob);
      ctx.lineTo(gap.x - cs * 0.28, gap.y - cs * 2.15 + bob);
      ctx.lineTo(gap.x + cs * 0.28, gap.y - cs * 2.15 + bob);
      ctx.closePath();
      ctx.fill();
    }
    roundRect(ctx, x, y, size, size, radius);
    ctx.strokeStyle = "rgba(230, 200, 140, 0.65)";
    ctx.lineWidth = 2;
    ctx.stroke();

    drawPreviews(scene);
    ctx.restore(); // shake

    (scene.particles || []).forEach((p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      if (p.shape === "shard") ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
      else {
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(0.5, p.size * 0.35), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    const popups = scene.popups || [];
    popups.forEach((p, i) => {
      const t = 1 - p.life / p.max;
      const alpha = t > 0.7 ? (1 - t) / 0.3 : Math.min(1, t / 0.08);
      const scale = 0.72 + 0.32 * Math.sin(Math.min(1, t / 0.14) * Math.PI / 2);
      ctx.save();
      ctx.translate(cx, cy - 10 - t * 64 - i * 6);
      ctx.scale(scale, scale);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = `700 ${p.big ? Math.max(28, cs * 1.35) : Math.max(18, cs * 0.9)}px Fraunces, Palatino, serif`;
      ctx.lineWidth = 8;
      ctx.strokeStyle = "rgba(32, 20, 10, 0.55)";
      ctx.strokeText(p.text, 0, 0);
      ctx.fillStyle = p.color || "#f6e7c8";
      ctx.fillText(p.text, 0, 0);
      ctx.restore();
    });

    ctx.globalAlpha = 1;
  }

  function drawPreviews(scene) {
    const game = scene.game;
    if (!game || scene.showcase) return;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "600 12px Outfit, sans-serif";
    const tray = (x, y, w, h, title, id) => {
      ctx.save();
      roundRect(ctx, x, y, w, h, 12);
      ctx.clip();
      ctx.fillStyle = "rgba(22, 16, 12, 0.62)";
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "#f3e6cf";
      if (title) ctx.fillText(title, x + w / 2, y + 14);
      if (id != null) drawPieceInRect(id, x, y, w, h, title ? 22 : 8);
      ctx.restore();
      roundRect(ctx, x, y, w, h, 12);
      ctx.strokeStyle = "rgba(214,176,106,0.5)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };
    if (layout.hold) {
      const slotH = Math.min(150, Math.max(96, layout.board.size * 0.22));
      tray(layout.hold.x, layout.hold.y, layout.hold.w, slotH, "Hold", game.hold);
      const queue = game.queue || [];
      queue.forEach((id, i) => {
        tray(layout.next.x, layout.next.y + i * (slotH + 8), layout.next.w, slotH, i === 0 ? "Next" : "", id);
      });
    } else if (layout.strip) {
      const queue = game.queue || [];
      const slots = [{ title: "Hold", id: game.hold }, { title: "Next", id: queue[0] }, { title: "", id: queue[1] }, { title: "", id: queue[2] }];
      const gap = 8;
      const slotW = Math.min(108, (layout.strip.w - gap * (slots.length - 1)) / slots.length);
      slots.forEach((slot, i) => {
        if (slot.id == null && slot.title !== "Hold") return;
        tray(layout.strip.x + i * (slotW + gap), layout.strip.y, slotW, layout.strip.h - 4, slot.title, slot.id);
      });
    }
  }

  return {
    draw,
    cellCenter,
    get layout() { return layout; },
  };
}
