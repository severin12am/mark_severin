import type { HSL } from '../core/types';
import { clamp, lerp } from '../core/rng';

export const PALETTE: string[] = [
  '#fcd5ce', '#e2f0cb', '#b5ead7', '#c7ceea',
  '#ffdac1', '#f8ad9d', '#75b8c8', '#a8d8ea',
  '#ff9aa2', '#dfe7fd', '#fff5ba',
];

export function hexToHsl(hex: string): HSL {
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
  return { h: h * 360, s, l };
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 1);
  l = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function snapToPalette(hex: string): HSL {
  let best = PALETTE[0];
  let bestDist = Infinity;
  const target = hexToHsl(hex);
  for (const c of PALETTE) {
    const h = hexToHsl(c);
    const d = Math.abs(target.h - h.h) + Math.abs(target.s - h.s) * 100 + Math.abs(target.l - h.l) * 100;
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return hexToHsl(best);
}

export function applyPastelHex(hex: string, satMult = 1, lightMult = 1): string {
  const hsl = hexToHsl(hex);
  return hslToHex(hsl.h, clamp(hsl.s * satMult, 0.2, 0.8), clamp(hsl.l * lightMult, 0.3, 0.9));
}

export function complementaryRoofColor(wall: HSL): HSL {
  return {
    h: (wall.h + 35) % 360,
    s: clamp(wall.s + 0.05, 0.25, 0.7),
    l: clamp(wall.l - 0.08, 0.35, 0.75),
  };
}

export const DEFAULT_ROOF_COLOR: HSL = hexToHsl('#75b8c8');

export function applyPastelShade(hsl: HSL, satMult = 1, lightMult = 1): string {
  return hslToHex(hsl.h, clamp(hsl.s * satMult, 0.2, 0.8), clamp(hsl.l * lightMult, 0.3, 0.9));
}

export function roleColor(base: HSL, role: string, jitter: number): string {
  const shifts: Record<string, { dh: number; ds: number; dl: number }> = {
    wall: { dh: 0, ds: 0, dl: 0 },
    roof: { dh: 12, ds: -0.08, dl: -0.06 },
    trim: { dh: -8, ds: -0.25, dl: 0.12 },
    decor: { dh: 20, ds: 0.05, dl: -0.1 },
    base: { dh: -5, ds: -0.1, dl: 0.08 },
  };
  const s = shifts[role] ?? shifts.wall;
  const j = (jitter % 7) - 3;
  return hslToHex(
    base.h + s.dh + j,
    clamp(base.s + s.ds, 0.22, 0.72),
    clamp(base.l + s.dl + ((jitter >> 3) % 5 - 2) * 0.015, 0.32, 0.88),
  );
}

export function mixHsl(a: HSL, b: HSL, t: number): HSL {
  return {
    h: lerp(a.h, b.h, t),
    s: lerp(a.s, b.s, t),
    l: lerp(a.l, b.l, t),
  };
}

export const DEFAULT_BUILDING_COLOR: HSL = hexToHsl('#fcd5ce');
export const WATER_COLOR = '#6ec4d8';
export const GROUND_COLOR = '#e8e4d9';
export const OUTLINE_COLOR = '#3a3530';
export const GAP_COLOR = '#fdfbf7';
