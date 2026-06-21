import { Graphics, Texture } from 'pixi.js';
import type { PolygonDraw, RenderConfig } from '../core/types';
import { applyPastelShade } from '../color/Palette';
import { hexToHsl } from '../color/Palette';

let texturePattern: CanvasPattern | null = null;
let textureCanvas: HTMLCanvasElement | null = null;

export function generateTexturePattern(intensity: number): CanvasPattern | null {
  if (!textureCanvas) textureCanvas = document.createElement('canvas');
  textureCanvas.width = 256;
  textureCanvas.height = 256;
  const ctx = textureCanvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 256, 256);

  const blobs = Math.floor(400 * intensity);
  for (let i = 0; i < blobs; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 256, 5 + Math.random() * 20, 0, Math.PI * 2);
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)';
    ctx.fill();
  }
  for (let i = 0; i < 3000; i++) {
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
  }

  const tmp = document.createElement('canvas');
  tmp.width = 1;
  tmp.height = 1;
  const tctx = tmp.getContext('2d')!;
  texturePattern = tctx.createPattern(textureCanvas, 'repeat');
  return texturePattern;
}

export class PieceDrawer {
  private gfx: Graphics;
  private config: RenderConfig;

  constructor(config: RenderConfig) {
    this.config = config;
    this.gfx = new Graphics();
  }

  get displayObject(): Graphics {
    return this.gfx;
  }

  clear(): void {
    this.gfx.clear();
  }

  drawAll(polygons: PolygonDraw[]): void {
    this.gfx.clear();
    for (const poly of polygons) {
      this.drawPolygon(poly);
    }
  }

  private drawPolygon(poly: PolygonDraw): void {
    const { verts, fill, stroke, strokeWidth, isWall } = poly;
    if (verts.length < 3) return;

    let fillColor = fill;
    if (isWall) {
      const hsl = hexToHsl(fill.startsWith('#') ? fill : '#cccccc');
      fillColor = applyPastelShade(hsl, 0.95, 0.92);
    }

    this.gfx.poly(verts.flatMap(v => [v.x, v.y]));
    this.gfx.fill({ color: fillColor, alpha: 1 });

    if (strokeWidth > 0 && stroke !== 'transparent') {
      this.gfx.poly(verts.flatMap(v => [v.x, v.y]));
      this.gfx.stroke({
        color: stroke,
        width: strokeWidth,
        alpha: stroke === '#3a3530' ? 0.35 : 1,
        join: 'round',
        cap: 'round',
      });
    }

    if (isWall && this.config.grimeAmount > 0) {
      this.drawGrime(verts);
    }
  }

  private drawGrime(verts: { x: number; y: number }[]): void {
    const minY = Math.min(...verts.map(v => v.y));
    const maxY = Math.max(...verts.map(v => v.y));
    const h = maxY - minY;
    if (h <= 0) return;

    this.gfx.poly(verts.flatMap(v => [v.x, v.y]));
    this.gfx.fill({ color: 0x463c2d, alpha: 0.15 * this.config.grimeAmount });
  }

  updateConfig(config: RenderConfig): void {
    this.config = config;
  }
}

export function createBackgroundTexture(width: number, height: number): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.7);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#e8e4d9');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
  return Texture.from(canvas);
}
