import type { RenderConfig, Vec2 } from '../core/types';
import type { BuildingStyle, SceneDrawItem, WindowSpec } from '../building/VisualGenerator';

let texturePattern: CanvasPattern | null = null;

function ensureTexture(intensity: number, ctx: CanvasRenderingContext2D): CanvasPattern {
  if (texturePattern) return texturePattern;
  const off = document.createElement('canvas');
  off.width = 256;
  off.height = 256;
  const octx = off.getContext('2d')!;
  octx.fillStyle = '#ffffff';
  octx.fillRect(0, 0, 256, 256);
  const blobs = Math.floor(400 * intensity);
  for (let i = 0; i < blobs; i++) {
    octx.beginPath();
    octx.arc(Math.random() * 256, Math.random() * 256, 5 + Math.random() * 20, 0, Math.PI * 2);
    octx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)';
    octx.fill();
  }
  for (let i = 0; i < 3000; i++) {
    octx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
    octx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
  }
  texturePattern = ctx.createPattern(off, 'repeat')!;
  return texturePattern;
}

function centroid(points: Vec2[]): Vec2 {
  const c = points.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
  c.x /= points.length;
  c.y /= points.length;
  return c;
}

function lerp2(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function wallPoint(wall: Vec2[], u: number, v: number): Vec2 {
  const bottom = lerp2(wall[0], wall[1], u);
  const top = lerp2(wall[3], wall[2], u);
  return lerp2(bottom, top, v);
}

function drawSoftPoly(
  ctx: CanvasRenderingContext2D,
  points: Vec2[],
  fill: string,
  stroke: string,
  lineWidth: number,
): void {
  if (points.length < 3) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke && lineWidth > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function applyWeathering(
  ctx: CanvasRenderingContext2D,
  points: Vec2[],
  config: RenderConfig,
  isWall: boolean,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.clip();

  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = ensureTexture(config.textureIntensity, ctx);
  ctx.fill();

  if (isWall && config.grimeAmount > 0) {
    ctx.globalCompositeOperation = 'source-atop';
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    const dirt = ctx.createLinearGradient(0, maxY, 0, minY + (maxY - minY) * 0.5);
    dirt.addColorStop(0, `rgba(70, 60, 45, ${0.4 * config.grimeAmount})`);
    dirt.addColorStop(1, 'rgba(70, 60, 45, 0)');
    ctx.fillStyle = dirt;
    ctx.fill();
    const ao = ctx.createLinearGradient(0, minY, 0, minY + (maxY - minY) * 0.3);
    ao.addColorStop(0, `rgba(0, 0, 0, ${0.3 * config.grimeAmount})`);
    ao.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ao;
    ctx.fill();
  }
  ctx.restore();
}

function applyGroundDirt(
  ctx: CanvasRenderingContext2D,
  points: Vec2[],
  config: RenderConfig,
): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.clip();

  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = ensureTexture(config.textureIntensity * 0.8, ctx);
  ctx.fill();

  ctx.globalCompositeOperation = 'source-atop';
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  const c = centroid(points);

  const spot = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, Math.max(maxY - minY, 20));
  spot.addColorStop(0, 'rgba(90, 75, 55, 0.08)');
  spot.addColorStop(1, 'rgba(90, 75, 55, 0.18)');
  ctx.fillStyle = spot;
  ctx.fill();

  const edgeDirt = ctx.createLinearGradient(0, maxY, 0, minY);
  edgeDirt.addColorStop(0, `rgba(80, 65, 45, ${0.22 * config.grimeAmount})`);
  edgeDirt.addColorStop(0.4, 'rgba(80, 65, 45, 0.06)');
  edgeDirt.addColorStop(1, 'rgba(80, 65, 45, 0)');
  ctx.fillStyle = edgeDirt;
  ctx.fill();

  ctx.restore();
}

function applyPastelAesthetic(hex: string, satMult = 1, lightMult = 1): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  s = Math.min(1, s * satMult);
  const nl = Math.min(1, Math.max(0, l * lightMult));
  return `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(nl * 100)}%)`;
}

function insetPoly(verts: Vec2[], factor: number): Vec2[] {
  const c = centroid(verts);
  return verts.map(v => ({
    x: c.x + (v.x - c.x) * factor,
    y: c.y + (v.y - c.y) * factor,
  }));
}

function drawFlatRoof(
  ctx: CanvasRenderingContext2D,
  topVerts: Vec2[],
  style: BuildingStyle,
  config: RenderConfig,
): void {
  const trim = topVerts.map(v => ({ x: v.x, y: v.y + 1 }));
  drawSoftPoly(ctx, trim, style.trimColor, style.trimColor, 2);

  const surface = topVerts;
  const roofFill = style.isTower
    ? applyPastelAesthetic(style.roofColor, 0.9, 0.88)
    : style.roofColor;
  drawSoftPoly(ctx, surface, roofFill, roofFill, 1.5);
  applyWeathering(ctx, surface, config, false);
}

function drawSteppedRoof(ctx: CanvasRenderingContext2D, topVerts: Vec2[], style: BuildingStyle): void {
  const steps = 5;
  for (let i = 0; i < steps; i++) {
    const t = i / steps;
    const layer = insetPoly(topVerts, 1 - t * 0.62).map(v => ({
      x: v.x,
      y: v.y - i * 6.2,
    }));
    const fill = i % 2 === 0
      ? style.roofColor
      : applyPastelAesthetic(style.roofColor, 0.95, 0.9);
    drawSoftPoly(ctx, layer, fill, style.trimColor, 1.6);
  }
}

function drawGableRoof(ctx: CanvasRenderingContext2D, topVerts: Vec2[], style: BuildingStyle): void {
  if (topVerts.length < 4) {
    drawFlatRoof(ctx, topVerts, style, { roundness: 4 } as RenderConfig);
    return;
  }
  const [a, b, c, d] = topVerts;
  const midAD = lerp2(a, d, 0.5);
  const midBC = lerp2(b, c, 0.5);
  const lift = 16;
  const r1 = { x: midAD.x, y: midAD.y - lift };
  const r2 = { x: midBC.x, y: midBC.y - lift };
  drawSoftPoly(ctx, [a, b, r2, r1], applyPastelAesthetic(style.roofColor, 1, 0.92), style.trimColor, 1.8);
  drawSoftPoly(ctx, [d, c, r2, r1], style.roofColor, style.trimColor, 1.8);
  ctx.strokeStyle = style.trimColor;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r1.x, r1.y);
  ctx.lineTo(r2.x, r2.y);
  ctx.stroke();
}

function drawSpire(ctx: CanvasRenderingContext2D, topVerts: Vec2[], style: BuildingStyle): void {
  drawFlatRoof(ctx, topVerts, style, { textureIntensity: 0.2, grimeAmount: 0.2, roundness: 4 } as RenderConfig);
  let layer = topVerts;
  for (let i = 1; i <= 5; i++) {
    layer = insetPoly(layer, 0.7).map(v => ({ x: v.x, y: v.y - 9 }));
    const fill = i === 5 ? style.trimColor : applyPastelAesthetic(style.roofColor, 0.85, 0.82 + i * 0.02);
    drawSoftPoly(ctx, layer, fill, style.trimColor, 1.2);
  }
  const tip = centroid(layer);
  ctx.fillStyle = '#f7c948';
  ctx.beginPath();
  ctx.arc(tip.x, tip.y - 6, 3.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawChimney(ctx: CanvasRenderingContext2D, topVerts: Vec2[], style: BuildingStyle): void {
  const c = centroid(topVerts);
  const x = c.x + 6;
  const y = c.y - 4;
  ctx.fillStyle = applyPastelAesthetic(style.wallColor, 0.9, 0.78);
  ctx.fillRect(x, y - 14, 6, 16);
  ctx.fillStyle = style.trimColor;
  ctx.fillRect(x - 1, y - 16, 8, 3);
}

function drawWindows(ctx: CanvasRenderingContext2D, walls: Vec2[][], windows: WindowSpec[]): void {
  for (const win of windows) {
    const wall = walls[win.wallIndex];
    if (!wall || wall.length < 4) continue;
    const p0 = wallPoint(wall, win.u, win.v);
    const p1 = wallPoint(wall, win.u + win.wu, win.v);
    const p2 = wallPoint(wall, win.u + win.wu, win.v + win.hv);
    const p3 = wallPoint(wall, win.u, win.v + win.hv);
    drawSoftPoly(ctx, [p0, p1, p2, p3], '#2a4458', '#8eb4c8', 0.9);
    ctx.strokeStyle = 'rgba(255,255,255,0.28)';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
    ctx.lineTo((p3.x + p2.x) / 2, (p3.y + p2.y) / 2);
    ctx.stroke();
  }
}

function drawLandGround(
  ctx: CanvasRenderingContext2D,
  verts: Vec2[],
  fill: string,
  config: RenderConfig,
  kind?: string,
  waterAdj?: boolean,
): void {
  drawSoftPoly(ctx, verts, fill, fill, 0);
  applyGroundDirt(ctx, verts, config);

  if (kind === 'plaza') {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
    ctx.closePath();
    ctx.clip();
    ctx.strokeStyle = 'rgba(120, 95, 70, 0.12)';
    ctx.lineWidth = 1;
    const c = centroid(verts);
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(c.x - 40, c.y + i * 7);
      ctx.lineTo(c.x + 40, c.y + i * 7 + 8);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (waterAdj) {
    drawSoftPoly(ctx, insetPoly(verts, 0.86), 'rgba(90, 80, 70, 0.18)', 'rgba(90, 80, 70, 0.28)', 1.5);
  }
}

function drawWaterCell(
  ctx: CanvasRenderingContext2D,
  verts: Vec2[],
  fill: string,
  config: RenderConfig,
  time: number,
): void {
  drawSoftPoly(ctx, verts, fill, '#8ecfdd', 2);

  const c = centroid(verts);

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
  ctx.closePath();
  ctx.clip();

  const shine = ctx.createLinearGradient(c.x, c.y - 20, c.x, c.y + 20);
  shine.addColorStop(0, 'rgba(255,255,255,0.38)');
  shine.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  shine.addColorStop(1, 'rgba(60,120,140,0.18)');
  ctx.fillStyle = shine;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.6;
  const rippleScale = config.scale * 0.18;
  for (let i = 1; i <= 3; i++) {
    const wobble = Math.sin(time * 1.4 + i * 1.1) * 2.2;
    ctx.beginPath();
    ctx.ellipse(
      c.x + wobble,
      c.y + 3 + Math.cos(time * 1.1 + i) * 1.4,
      rippleScale * (0.8 + i * 0.5),
      rippleScale * (0.32 + i * 0.18),
      0, 0, Math.PI * 2,
    );
    ctx.stroke();
  }
  ctx.restore();
}

function drawTree(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, seed: number): void {
  const s = 7 * scale;
  ctx.fillStyle = 'rgba(90, 70, 50, 0.9)';
  ctx.fillRect(x - 1.1 * scale, y - s * 0.35, 2.2 * scale, s * 0.45);
  const greens = ['#7fb069', '#5b8c5a', '#9ccc65'];
  for (let i = 0; i < 3; i++) {
    const ox = ((seed + i * 17) % 7) - 3;
    const oy = ((seed + i * 11) % 5) - 2;
    ctx.fillStyle = greens[i];
    ctx.beginPath();
    ctx.ellipse(x + ox * scale * 0.35, y - s * 0.4 + oy * scale * 0.12, s * (0.55 - i * 0.08), s * (0.38 - i * 0.05), 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export class WeatheredRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;

  constructor(config: RenderConfig) {
    this.config = config;
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');
    this.ctx = ctx;
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  resize(w: number, h: number, dpr: number): void {
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw(items: SceneDrawItem[], pan: Vec2, zoom: number, viewOffset: Vec2, time = 0): void {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    ctx.translate(viewOffset.x, viewOffset.y);

    for (const item of items) {
      if (item.kind === 'ground') {
        if (item.groundIsWater) {
          drawWaterCell(ctx, item.groundVerts!, item.groundFill!, this.config, time);
        } else {
          drawLandGround(
            ctx,
            item.groundVerts!,
            item.groundFill!,
            this.config,
            item.groundKind,
            item.waterAdjacent,
          );
        }
        continue;
      }

      if (item.kind === 'tree' && item.tree) {
        drawTree(ctx, item.tree.x, item.tree.y, item.tree.scale, item.tree.seed);
        continue;
      }

      const b = item.building!;
      const s = b.style;
      const roof = b.topVerts;

      if (b.walls.length >= 2 && roof.length >= 4) {
        const south = b.walls[0];
        const east = b.walls[1];
        const hull = [south[0], south[1], east[1], east[2], roof[0], south[3]];
        drawSoftPoly(ctx, hull, s.wallColor, s.wallColor, 1.2);
      } else if (roof.length >= 3) {
        const c = centroid(roof);
        ctx.fillStyle = 'rgba(40, 30, 20, 0.14)';
        ctx.beginPath();
        ctx.ellipse(c.x + 6, Math.max(...roof.map(p => p.y)) + 10, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < b.walls.length; i++) {
        const wall = b.walls[i];
        const isLeft = i % 2 === 0;
        const color = isLeft ? s.wallColor : applyPastelAesthetic(s.wallColor, 0.8, 0.85);
        drawSoftPoly(ctx, wall, color, color, 1.15);
        applyWeathering(ctx, wall, this.config, true);
      }

      drawWindows(ctx, b.walls, b.windows);

      if (b.roofKind === 'stepped') drawSteppedRoof(ctx, b.topVerts, s);
      else if (b.roofKind === 'gable') drawGableRoof(ctx, b.topVerts, s);
      else if (b.roofKind === 'spire') drawSpire(ctx, b.topVerts, s);
      else drawFlatRoof(ctx, b.topVerts, s, this.config);

      if (b.chimney && b.roofKind !== 'spire') drawChimney(ctx, b.topVerts, s);
    }

    ctx.restore();
  }

  updateConfig(config: RenderConfig): void {
    this.config = config;
    texturePattern = null;
  }
}

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = ctx.createRadialGradient(w * 0.45, h * 0.35, 0, w / 2, h / 2, w * 0.78);
  grad.addColorStop(0, '#fffaf2');
  grad.addColorStop(0.55, '#f3eee4');
  grad.addColorStop(1, '#e4ddd0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  const sun = ctx.createRadialGradient(w * 0.18, h * 0.12, 0, w * 0.18, h * 0.12, w * 0.28);
  sun.addColorStop(0, 'rgba(255, 214, 160, 0.45)');
  sun.addColorStop(1, 'rgba(255, 214, 160, 0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, w, h);
}
