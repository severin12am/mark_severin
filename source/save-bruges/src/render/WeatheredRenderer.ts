import type { RenderConfig, Vec2 } from '../core/types';
import type { BuildingStyle, SceneDrawItem } from '../building/VisualGenerator';

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
  const c = points.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }), { x: 0, y: 0 });
  c.x /= points.length;
  c.y /= points.length;

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
  const c = verts.reduce((a, v) => ({ x: a.x + v.x, y: a.y + v.y }), { x: 0, y: 0 });
  c.x /= verts.length;
  c.y /= verts.length;
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

  const surface = insetPoly(topVerts, 0.96);
  const roofFill = style.isTower
    ? applyPastelAesthetic(style.roofColor, 0.9, 0.88)
    : style.roofColor;
  drawSoftPoly(ctx, surface, roofFill, roofFill, 4);
  applyWeathering(ctx, surface, config, false);
}

function drawLandGround(
  ctx: CanvasRenderingContext2D,
  verts: Vec2[],
  fill: string,
  config: RenderConfig,
): void {
  drawSoftPoly(ctx, verts, fill, fill, 0);
  applyGroundDirt(ctx, verts, config);
}

function drawWaterCell(
  ctx: CanvasRenderingContext2D,
  verts: Vec2[],
  fill: string,
  config: RenderConfig,
): void {
  drawSoftPoly(ctx, verts, fill, '#a8dce8', 2);

  const c = verts.reduce((a, v) => ({ x: a.x + v.x, y: a.y + v.y }), { x: 0, y: 0 });
  c.x /= verts.length;
  c.y /= verts.length;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
  ctx.closePath();
  ctx.clip();

  const shine = ctx.createLinearGradient(c.x, c.y - 20, c.x, c.y + 20);
  shine.addColorStop(0, 'rgba(255,255,255,0.35)');
  shine.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  shine.addColorStop(1, 'rgba(60,120,140,0.15)');
  ctx.fillStyle = shine;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  const rippleScale = config.scale * 0.18;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + 3, rippleScale * (0.8 + i * 0.5), rippleScale * (0.35 + i * 0.2), 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
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

  draw(items: SceneDrawItem[], pan: Vec2, zoom: number, viewOffset: Vec2): void {
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
          drawWaterCell(ctx, item.groundVerts!, item.groundFill!, this.config);
        } else {
          drawLandGround(ctx, item.groundVerts!, item.groundFill!, this.config);
        }
        continue;
      }

      const b = item.building!;
      const s = b.style;
      const r = this.config.roundness;

      for (let i = 0; i < b.walls.length; i++) {
        const wall = b.walls[i];
        const isLeft = i % 2 === 0;
        const color = isLeft ? s.wallColor : applyPastelAesthetic(s.wallColor, 0.8, 0.85);
        drawSoftPoly(ctx, wall, color, color, r);
        applyWeathering(ctx, wall, this.config, true);
      }

      drawFlatRoof(ctx, b.topVerts, s, this.config);
    }

    ctx.restore();
  }

  updateConfig(config: RenderConfig): void {
    this.config = config;
    texturePattern = null;
  }
}

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#e8e4d9');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}
