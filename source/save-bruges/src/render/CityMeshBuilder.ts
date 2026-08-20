import * as THREE from 'three';
import type { Vec2 } from '../core/types';
import { cellRng, type SeededRng } from '../core/rng';
import { hslToHex, LAND_COLOR, WATER_COLOR } from '../color/Palette';
import type { ColorField } from '../color/ColorField';
import type { GridGraph } from '../grid/GridGraph';
import type { Cell, Occupancy } from '../core/types';
import { makePaperLambert, makeWaterMaterial, type PaperKind } from './paperLook';
import { person as addFigure } from './figures';

const STORY = 0.88;
const LOT_H = 0.06;
const ROOF_RISE = 0.52;

const GLASS = [0.08, 0.11, 0.16] as const;
const FRAME = [0.92, 0.88, 0.78] as const;
const DOOR = [0.28, 0.16, 0.08] as const;
const DOOR_INNER = [0.14, 0.08, 0.04] as const;
const SILL = [0.78, 0.72, 0.62] as const;
const WALL = [1, 1, 1] as const;
const OPEN_UV = 0.008;

function signedArea(verts: Vec2[]): number {
  let a = 0;
  for (let i = 0; i < verts.length; i++) {
    const p = verts[i];
    const q = verts[(i + 1) % verts.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a * 0.5;
}

function areaCentroid(verts: Vec2[]): Vec2 {
  let a = 0, x = 0, y = 0;
  for (let i = 0; i < verts.length; i++) {
    const p = verts[i];
    const q = verts[(i + 1) % verts.length];
    const c = p.x * q.y - q.x * p.y;
    a += c;
    x += (p.x + q.x) * c;
    y += (p.y + q.y) * c;
  }
  if (Math.abs(a) < 1e-8) {
    let sx = 0, sy = 0;
    for (const v of verts) { sx += v.x; sy += v.y; }
    return { x: sx / Math.max(1, verts.length), y: sy / verts.length };
  }
  return { x: x / (3 * a), y: y / (3 * a) };
}

function pointInPolygon(p: Vec2, poly: Vec2[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function cleanVerts(verts: Vec2[]): Vec2[] {
  const out: Vec2[] = [];
  for (const v of verts) {
    const p = out[out.length - 1];
    if (!p || Math.hypot(p.x - v.x, p.y - v.y) > 1e-5) out.push({ x: v.x, y: v.y });
  }
  if (out.length > 2) {
    const a = out[0];
    const b = out[out.length - 1];
    if (Math.hypot(a.x - b.x, a.y - b.y) < 1e-5) out.pop();
  }
  return out;
}

function scaleAbout(verts: Vec2[], s: number): Vec2[] {
  const c = areaCentroid(verts);
  return verts.map(v => ({
    x: c.x + (v.x - c.x) * s,
    y: c.y + (v.y - c.y) * s,
  }));
}

function scaleToward(verts: Vec2[], s: number, focus: Vec2): Vec2[] {
  return verts.map(v => ({
    x: focus.x + (v.x - focus.x) * s,
    y: focus.y + (v.y - focus.y) * s,
  }));
}

function shrink(verts: Vec2[], s: number): Vec2[] {
  const inner = scaleAbout(verts, s);
  const a0 = Math.abs(signedArea(verts));
  const a1 = Math.abs(signedArea(inner));
  if (a1 < a0 * 0.3) return verts;
  if (!pointInPolygon(areaCentroid(inner), verts)) return verts;
  return inner;
}

function ccw(verts: Vec2[]): Vec2[] {
  const cleaned = cleanVerts(verts);
  return signedArea(cleaned) >= 0 ? cleaned : [...cleaned].reverse();
}

function lambert(color: string, kind: PaperKind = 'wall', vertexColors = false): THREE.MeshLambertMaterial {
  return makePaperLambert(color, kind, vertexColors);
}

function outwardNormal(a: Vec2, b: Vec2, inside: Vec2): Vec2 {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  let nx = -(b.y - a.y) / len;
  let ny = (b.x - a.x) / len;
  const mid = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
  if (nx * (inside.x - mid.x) + ny * (inside.y - mid.y) > 0) {
    nx = -nx;
    ny = -ny;
  }
  return { x: nx, y: ny };
}

function neighborToward<T>(
  cell: Cell,
  graph: GridGraph,
  outward: Vec2,
  pick: (n: Cell) => T | null,
): T | null {
  let best: T | null = null;
  let bestDot = 0.18;
  for (const nid of cell.neighbors) {
    const n = graph.getCell(nid);
    if (!n) continue;
    const val = pick(n);
    if (val == null) continue;
    const dx = n.centroid.x - cell.centroid.x;
    const dy = n.centroid.y - cell.centroid.y;
    const len = Math.hypot(dx, dy) || 1;
    const dot = (dx / len) * outward.x + (dy / len) * outward.y;
    if (dot > bestDot) {
      bestDot = dot;
      best = val;
    }
  }
  return best;
}

function neighborOccupancyToward(cell: Cell, graph: GridGraph, outward: Vec2): Occupancy | null {
  return neighborToward(cell, graph, outward, n => n.state.occupancy);
}

type MeshStats = { ok: number; fail: number; houses: number };

function addMesh(
  group: THREE.Group,
  geo: THREE.BufferGeometry | null,
  y: number,
  mat: THREE.Material,
  cellId: string,
  stats: MeshStats,
  cast = true,
): void {
  if (!geo) {
    stats.fail++;
    return;
  }
  stats.ok++;
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = y;
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  mesh.userData.cellId = cellId;
  group.add(mesh);
}

function uniqueSorted(values: number[], eps = 0.01): number[] {
  const s = [...values].sort((a, b) => a - b);
  const out: number[] = [];
  for (const v of s) {
    if (!out.length || v - out[out.length - 1] > eps) out.push(v);
    else out[out.length - 1] = (out[out.length - 1] + v) * 0.5;
  }
  return out;
}

type Opening = {
  s0: number;
  s1: number;
  y0: number;
  y1: number;
  kind: 'window' | 'door' | 'door-inner' | 'frame';
};

function pushTri(
  pos: number[],
  uvs: number[],
  cols: number[],
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
  rgb: readonly [number, number, number],
  uv?: readonly [number, number, number, number, number, number],
): void {
  pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  if (uv) {
    uvs.push(uv[0], uv[1], uv[2], uv[3], uv[4], uv[5]);
  } else {
    uvs.push(
      ax * 0.9 + az * 0.4, az * 0.9,
      bx * 0.9 + bz * 0.4, bz * 0.9,
      cx * 0.9 + cz * 0.4, cz * 0.9,
    );
  }
  cols.push(rgb[0], rgb[1], rgb[2], rgb[0], rgb[1], rgb[2], rgb[0], rgb[1], rgb[2]);
}

function finishGeo(pos: number[], uvs: number[], cols?: number[]): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  if (cols) geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  geo.computeVertexNormals();
  return geo;
}

function pushTriRaw(
  pos: number[],
  uvs: number[],
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): void {
  pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
  uvs.push(ax * 0.55, az * 0.55, bx * 0.55, bz * 0.55, cx * 0.55, cz * 0.55);
}

function pushRoofTri(
  pos: number[],
  uvs: number[],
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number,
  cx: number, cy: number, cz: number,
): void {
  const abx = bx - ax, abz = bz - az;
  const acx = cx - ax, acz = cz - az;
  const ny = abz * acx - abx * acz;
  if (ny < 0) {
    pos.push(ax, ay, az, cx, cy, cz, bx, by, bz);
    uvs.push(ax * 0.55, az * 0.55, cx * 0.55, cz * 0.55, bx * 0.55, bz * 0.55);
  } else {
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    uvs.push(ax * 0.55, az * 0.55, bx * 0.55, bz * 0.55, cx * 0.55, cz * 0.55);
  }
}

function clampInside(poly: Vec2[], p: Vec2): Vec2 {
  if (pointInPolygon(p, poly)) return p;
  const c = areaCentroid(poly);
  for (let t = 0.8; t > 0.05; t -= 0.15) {
    const q = { x: c.x + (p.x - c.x) * t, y: c.y + (p.y - c.y) * t };
    if (pointInPolygon(q, poly)) return q;
  }
  return c;
}

function prismGeometry(
  raw: Vec2[],
  height: number,
  opts: { bottom?: boolean; sides?: boolean } = {},
): THREE.BufferGeometry | null {
  const poly = ccw(raw);
  if (poly.length < 3 || height <= 0) return null;
  if (Math.abs(signedArea(poly)) < 1e-6) return null;
  const drawBottom = opts.bottom !== false;
  const drawSides = opts.sides !== false;

  const contour = poly.map(v => new THREE.Vector2(v.x, v.y));
  let tris: number[][] = [];
  try {
    tris = THREE.ShapeUtils.triangulateShape(contour, []);
  } catch {
    tris = [];
  }

  const pos: number[] = [];
  const uvs: number[] = [];
  const push = (ax: number, ay: number, az: number, bx: number, by: number, bz: number, cx: number, cy: number, cz: number) => {
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    uvs.push(
      ax * 0.16 + az * 0.08, ay * 0.28 + az * 0.18,
      bx * 0.16 + bz * 0.08, by * 0.28 + bz * 0.18,
      cx * 0.16 + cz * 0.08, cy * 0.28 + cz * 0.18,
    );
  };

  if (tris.length) {
    for (const tri of tris) {
      const a = poly[tri[0]], b = poly[tri[1]], c = poly[tri[2]];
      if (drawBottom) push(a.x, 0, a.y, c.x, 0, c.y, b.x, 0, b.y);
      push(a.x, height, a.y, b.x, height, b.y, c.x, height, c.y);
    }
  } else {
    const o = areaCentroid(poly);
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      if (drawBottom) push(o.x, 0, o.y, b.x, 0, b.y, a.x, 0, a.y);
      push(o.x, height, o.y, a.x, height, a.y, b.x, height, b.y);
    }
  }

  if (drawSides) {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      // CCW footprint: this winding points the side normal outward.
      push(a.x, 0, a.y, a.x, height, a.y, b.x, height, b.y);
      push(a.x, 0, a.y, b.x, height, b.y, b.x, 0, b.y);
    }
  }

  return finishGeo(pos, uvs);
}

function drapedFanGeometry(raw: Vec2[], hOf: (p: Vec2) => number): THREE.BufferGeometry | null {
  const outer = ccw(raw);
  if (outer.length < 3) return null;
  const n = outer.length;
  const c = areaCentroid(outer);
  const pos: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = outer[i];
    const b = outer[(i + 1) % n];
    const m = { x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 };
    pushRoofTri(pos, uvs, c.x, hOf(c), c.y, a.x, hOf(a), a.y, m.x, hOf(m), m.y);
    pushRoofTri(pos, uvs, c.x, hOf(c), c.y, m.x, hOf(m), m.y, b.x, hOf(b), b.y);
  }
  return pos.length ? finishGeo(pos, uvs) : null;
}

const HILL_WATER = 3;
const HILL_PIT = 4;

function hillFieldGeometries(graph: GridGraph): {
  grass: THREE.BufferGeometry | null;
} {
  const verts = graph.grid.vertices;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const v of verts) {
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minZ = Math.min(minZ, v.y);
    maxZ = Math.max(maxZ, v.y);
  }
  // Must be wide enough to contain the whole hill; a grid that stops mid-slope
  // leaves the terrain ending on a cliff.
  minX -= 18;
  maxX += 18;
  minZ -= 18;
  maxZ += 18;
  const step = 0.16;
  const nx = Math.floor((maxX - minX) / step) + 1;
  const nz = Math.floor((maxZ - minZ) / step) + 1;
  const hArr = new Float32Array(nx * nz);
  const tag = new Uint8Array(nx * nz);
  const waterCells = graph.grid.cells.filter(c => c.state.occupancy === 'water');
  const pitCells = graph.grid.cells.filter(c => (
    c.state.defense === 'ditch' || c.state.defense === 'moat'
  ));
  const waterPolys = waterCells.map(c => ({
    cell: c,
    poly: scaleAbout(ccw(graph.getCellVerts(c)), 1.06),
    pit: false as const,
  }));
  const pitPolys = pitCells.map(c => ({
    cell: c,
    poly: scaleAbout(ccw(graph.getCellVerts(c)), 1.16),
    pit: true as const,
  }));
  const holePolys = [...waterPolys, ...pitPolys];
  const at = (ix: number, iz: number) => iz * nx + ix;

  // The grid is far larger than the canals, so reject the bulk of the samples
  // with a bounding box before running any polygon tests.
  let wMinX = Infinity;
  let wMaxX = -Infinity;
  let wMinZ = Infinity;
  let wMaxZ = -Infinity;
  for (const { poly } of holePolys) {
    for (const p of poly) {
      wMinX = Math.min(wMinX, p.x);
      wMaxX = Math.max(wMaxX, p.x);
      wMinZ = Math.min(wMinZ, p.y);
      wMaxZ = Math.max(wMaxZ, p.y);
    }
  }
  wMinX -= 0.7;
  wMaxX += 0.7;
  wMinZ -= 0.7;
  wMaxZ += 0.7;

  const inHole = (x: number, z: number): 0 | typeof HILL_WATER | typeof HILL_PIT => {
    if (!holePolys.length) return 0;
    if (x < wMinX || x > wMaxX || z < wMinZ || z > wMaxZ) return 0;
    const p = { x, y: z };
    for (const { poly, pit } of holePolys) {
      if (pointInPolygon(p, poly)) return pit ? HILL_PIT : HILL_WATER;
    }
    return 0;
  };

  for (let iz = 0; iz < nz; iz++) {
    for (let ix = 0; ix < nx; ix++) {
      const x = minX + ix * step;
      const z = minZ + iz * step;
      const i = at(ix, iz);
      const hole = inHole(x, z);
      if (hole) {
        hArr[i] = 0;
        tag[i] = hole;
        continue;
      }
      hArr[i] = graph.hillAt(x, z);
      tag[i] = 0;
    }
  }

  const grassPos: number[] = [];
  const grassUv: number[] = [];

  for (let iz = 0; iz < nz - 1; iz++) {
    for (let ix = 0; ix < nx - 1; ix++) {
      const i00 = at(ix, iz);
      const i10 = at(ix + 1, iz);
      const i01 = at(ix, iz + 1);
      const i11 = at(ix + 1, iz + 1);
      const waterN = (tag[i00] === HILL_WATER ? 1 : 0)
        + (tag[i10] === HILL_WATER ? 1 : 0)
        + (tag[i01] === HILL_WATER ? 1 : 0)
        + (tag[i11] === HILL_WATER ? 1 : 0);
      const pitN = (tag[i00] === HILL_PIT ? 1 : 0)
        + (tag[i10] === HILL_PIT ? 1 : 0)
        + (tag[i01] === HILL_PIT ? 1 : 0)
        + (tag[i11] === HILL_PIT ? 1 : 0);
      if (waterN > 0) continue;
      if (pitN > 0) continue;
      const x0 = minX + ix * step;
      const z0 = minZ + iz * step;
      const x1 = x0 + step;
      const z1 = z0 + step;
      const h00 = hArr[i00];
      const h10 = hArr[i10];
      const h01 = hArr[i01];
      const h11 = hArr[i11];
      pushRoofTri(grassPos, grassUv, x0, h00, z0, x1, h10, z0, x0, h01, z1);
      pushRoofTri(grassPos, grassUv, x1, h10, z0, x1, h11, z1, x0, h01, z1);
    }
  }

  return {
    grass: grassPos.length ? finishGeo(grassPos, grassUv) : null,
  };
}

function raySegT(ox: number, oy: number, dx: number, dy: number, a: Vec2, b: Vec2): number {
  const ex = b.x - a.x;
  const ey = b.y - a.y;
  const det = dx * ey - dy * ex;
  if (Math.abs(det) < 1e-8) return 0;
  const tx = a.x - ox;
  const ty = a.y - oy;
  const t = (tx * ey - ty * ex) / det;
  const s = (tx * dy - ty * dx) / det;
  return t > 1e-4 && s >= -0.001 && s <= 1.001 ? t : 0;
}

function hippedHeightAt(raw: Vec2[], rise: number, peakShift: Vec2 | undefined, x: number, z: number): number {
  const outer = ccw(raw);
  if (outer.length < 3 || rise <= 0) return 0;
  const c = areaCentroid(outer);
  let peak = clampInside(outer, peakShift
    ? { x: c.x + peakShift.x, y: c.y + peakShift.y }
    : c);
  peak = {
    x: c.x + (peak.x - c.x) * 0.78,
    y: c.y + (peak.y - c.y) * 0.78,
  };
  if (!pointInPolygon(peak, outer)) peak = c;
  const dx = x - peak.x;
  const dy = z - peak.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-4) return rise;
  const dirx = dx / len;
  const diry = dy / len;
  let tHit = 0;
  for (let i = 0; i < outer.length; i++) {
    const t = raySegT(peak.x, peak.y, dirx, diry, outer[i], outer[(i + 1) % outer.length]);
    if (t > 0 && (tHit === 0 || t < tHit)) tHit = t;
  }
  if (tHit < 1e-4) return 0;
  const u = Math.min(1, len / tHit);
  return rise * (1 - u);
}

function hippedRoofGeometry(raw: Vec2[], rise: number, peakShift?: Vec2, skipEdge = -1): THREE.BufferGeometry | null {
  const outer = ccw(raw);
  if (outer.length < 3 || rise <= 0) return null;
  const c = areaCentroid(outer);
  let peak = clampInside(outer, peakShift
    ? { x: c.x + peakShift.x, y: c.y + peakShift.y }
    : c);
  peak = {
    x: c.x + (peak.x - c.x) * 0.78,
    y: c.y + (peak.y - c.y) * 0.78,
  };
  if (!pointInPolygon(peak, outer)) peak = c;
  const pos: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i < outer.length; i++) {
    if (i === skipEdge) continue;
    const a = outer[i];
    const b = outer[(i + 1) % outer.length];
    pushRoofTri(pos, uvs, a.x, 0, a.y, b.x, 0, b.y, peak.x, rise, peak.y);
  }
  return pos.length ? finishGeo(pos, uvs) : null;
}

function paneWindow(s0: number, s1: number, y0: number, y1: number): Opening[] {
  const mx = (s0 + s1) * 0.5;
  const my = (y0 + y1) * 0.5;
  const bar = Math.min(0.035, (s1 - s0) * 0.12, (y1 - y0) * 0.12);
  return [
    { s0, s1: mx - bar, y0, y1: my - bar, kind: 'window' },
    { s0: mx + bar, s1, y0, y1: my - bar, kind: 'window' },
    { s0, s1: mx - bar, y0: my + bar, y1, kind: 'window' },
    { s0: mx + bar, s1, y0: my + bar, y1, kind: 'window' },
  ];
}

function pushWindow(out: Opening[], s0: number, s1: number, y0: number, y1: number, pane: boolean): void {
  const pad = Math.min(0.028, (s1 - s0) * 0.16);
  out.push({ s0: s0 - pad, s1: s1 + pad, y0: y0 - pad, y1: y1 + pad, kind: 'frame' });
  if (pane) out.push(...paneWindow(s0, s1, y0, y1));
  else out.push({ s0, s1, y0, y1, kind: 'window' });
}

function openingsForEdge(len: number, height: number, withDoor: boolean, style: number): Opening[] {
  if (len < 0.16 || height < 0.28) return [];
  const out: Opening[] = [];
  const stories = Math.max(1, Math.min(3, Math.floor((height - 0.08) / 0.58)));
  const doorH = withDoor && len > 0.24 ? (style === 1 ? 0.64 : 0.56) : 0;
  const count = style === 4 ? (len > 0.62 ? 3 : 2) : len > 0.52 ? 2 : 1;

  for (let story = 0; story < stories; story++) {
    const winH = style === 1
      ? Math.min(0.58, height * 0.5)
      : style === 3
        ? Math.min(0.44, height * 0.4)
        : Math.min(0.5, height * 0.46);
    const winW = style === 4
      ? Math.min(0.26, len * 0.28)
      : style === 2
        ? Math.min(0.46, len * 0.4)
        : Math.min(0.38, len * 0.4);
    const y0 = 0.22 + story * 0.64;
    const y1 = y0 + winH;
    if (y1 > height - 0.06) continue;
    for (let w = 0; w < count; w++) {
      const t = count === 1 ? 0.5 : 0.2 + w * (0.6 / Math.max(1, count - 1));
      if (story === 0 && doorH && Math.abs(t - 0.5) < 0.18) continue;
      const s0 = t * len - winW * 0.5;
      const s1 = t * len + winW * 0.5;
      if (s0 < 0.02 || s1 > len - 0.02) continue;
      pushWindow(out, s0, s1, y0, y1, true);
      if (style === 3) {
        const arch = Math.min(0.08, winW * 0.28);
        pushWindow(out, s0 + winW * 0.18, s1 - winW * 0.18, y1 - 0.01, Math.min(height - 0.06, y1 + arch), false);
      }
    }
  }

  if (doorH) {
    const dw = Math.min(style === 1 ? 0.3 : 0.36, len * 0.42);
    const s0 = len * 0.5 - dw * 0.5;
    const s1 = len * 0.5 + dw * 0.5;
    out.push({ s0: s0 - 0.025, s1: s1 + 0.025, y0: 0, y1: doorH + 0.03, kind: 'frame' });
    out.push({ s0, s1, y0: 0, y1: doorH, kind: 'door' });
    out.push({
      s0: s0 + 0.04,
      s1: s1 - 0.04,
      y0: 0.1,
      y1: doorH - 0.08,
      kind: 'door-inner',
    });
  }
  return out;
}

function openingAt(openings: Opening[], s: number, y: number): Opening | null {
  let best: Opening | null = null;
  let bestArea = Infinity;
  for (const o of openings) {
    if (s > o.s0 && s < o.s1 && y > o.y0 && y < o.y1) {
      const area = (o.s1 - o.s0) * (o.y1 - o.y0);
      if (area < bestArea) {
        best = o;
        bestArea = area;
      }
    }
  }
  return best;
}

function buildingPrismGeometry(
  raw: Vec2[],
  height: number,
  doorEdge: number,
  style: number,
  skipTop = false,
): THREE.BufferGeometry | null {
  const poly = ccw(raw);
  if (poly.length < 3 || height <= 0) return null;
  if (Math.abs(signedArea(poly)) < 1e-6) return null;

  const inside = areaCentroid(poly);
  const contour = poly.map(v => new THREE.Vector2(v.x, v.y));
  let tris: number[][] = [];
  try {
    tris = THREE.ShapeUtils.triangulateShape(contour, []);
  } catch {
    tris = [];
  }

  const pos: number[] = [];
  const uvs: number[] = [];
  const cols: number[] = [];

  if (tris.length) {
    for (const tri of tris) {
      const a = poly[tri[0]], b = poly[tri[1]], c = poly[tri[2]];
      pushTri(pos, uvs, cols, a.x, 0, a.y, c.x, 0, c.y, b.x, 0, b.y, WALL);
      if (!skipTop) pushTri(pos, uvs, cols, a.x, height, a.y, b.x, height, b.y, c.x, height, c.y, WALL);
    }
  } else {
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      pushTri(pos, uvs, cols, inside.x, 0, inside.y, b.x, 0, b.y, a.x, 0, a.y, WALL);
      if (!skipTop) pushTri(pos, uvs, cols, inside.x, height, inside.y, a.x, height, a.y, b.x, height, b.y, WALL);
    }
  }

  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1e-4) continue;
    const out = outwardNormal(a, b, inside);
    const openings = style < 0
      ? []
      : openingsForEdge(len, height, i === doorEdge, style);
    const xs = uniqueSorted([0, len, ...openings.flatMap(o => [o.s0, o.s1])]);
    const ys = uniqueSorted([0, height, ...openings.flatMap(o => [o.y0, o.y1])]);
    const dx = (b.x - a.x) / len;
    const dy = (b.y - a.y) / len;

    for (let xi = 0; xi < xs.length - 1; xi++) {
      for (let yi = 0; yi < ys.length - 1; yi++) {
        const s0 = xs[xi], s1 = xs[xi + 1];
        const y0 = ys[yi], y1 = ys[yi + 1];
        if (s1 - s0 < 0.006 || y1 - y0 < 0.006) continue;
        const hit = openingAt(openings, (s0 + s1) * 0.5, (y0 + y1) * 0.5);
        const ax = a.x + dx * s0;
        const az = a.y + dy * s0;
        const bx = a.x + dx * s1;
        const bz = a.y + dy * s1;
        const u0 = s0 * 1.35;
        const u1 = s1 * 1.35;
        const v0 = y0 * 1.15;
        const v1 = y1 * 1.15;
        if (!hit) {
          pushTri(pos, uvs, cols, ax, y0, az, ax, y1, az, bx, y1, bz, WALL, [u0, v0, u0, v1, u1, v1]);
          pushTri(pos, uvs, cols, ax, y0, az, bx, y1, bz, bx, y0, bz, WALL, [u0, v0, u1, v1, u1, v0]);
          continue;
        }
        const rgb = hit.kind === 'window'
          ? GLASS
          : hit.kind === 'frame'
            ? FRAME
            : hit.kind === 'door-inner'
              ? DOOR_INNER
              : DOOR;
        const off = hit.kind === 'door-inner' ? 0.022 : hit.kind === 'frame' ? 0.01 : 0.018;
        const ox = out.x * off;
        const oz = out.y * off;
        const px0 = ax + ox, pz0 = az + oz;
        const px1 = bx + ox, pz1 = bz + oz;
        pushTri(pos, uvs, cols, px0, y0, pz0, px0, y1, pz0, px1, y1, pz1, rgb, [OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV]);
        pushTri(pos, uvs, cols, px0, y0, pz0, px1, y1, pz1, px1, y0, pz1, rgb, [OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV]);
        if (hit.kind === 'window' && Math.abs(y0 - hit.y0) < 0.012) {
          const sill = 0.02;
          const sy = y0 + 0.014;
          const cx0 = px0 + out.x * sill;
          const cz0 = pz0 + out.y * sill;
          const cx1 = px1 + out.x * sill;
          const cz1 = pz1 + out.y * sill;
          pushTri(pos, uvs, cols, px0, sy, pz0, px1, sy, pz1, cx1, sy, cz1, SILL, [OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV]);
          pushTri(pos, uvs, cols, px0, sy, pz0, cx1, sy, cz1, cx0, sy, cz0, SILL, [OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV]);
        }
        if (hit.kind === 'door' && y0 < 0.02) {
          const step = 0.04;
          const sy = 0.035;
          const cx0 = px0 + out.x * step;
          const cz0 = pz0 + out.y * step;
          const cx1 = px1 + out.x * step;
          const cz1 = pz1 + out.y * step;
          pushTri(pos, uvs, cols, px0, sy, pz0, px1, sy, pz1, cx1, sy, cz1, SILL, [OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV]);
          pushTri(pos, uvs, cols, px0, sy, pz0, cx1, sy, cz1, cx0, sy, cz0, SILL, [OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV]);
          pushTri(pos, uvs, cols, cx0, 0, cz0, cx1, 0, cz1, cx1, sy, cz1, SILL, [OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV]);
          pushTri(pos, uvs, cols, cx0, 0, cz0, cx1, sy, cz1, cx0, sy, cz0, SILL, [OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV, OPEN_UV]);
        }
      }
    }
  }

  return finishGeo(pos, uvs, cols);
}

function roofSkirtGeometry(eaves: Vec2[], drop: number): THREE.BufferGeometry | null {
  const outer = ccw(eaves);
  if (outer.length < 3 || drop <= 0) return null;
  const pos: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i];
    const b = outer[(i + 1) % outer.length];
    pos.push(a.x, 0, a.y, a.x, -drop, a.y, b.x, -drop, b.y);
    pos.push(a.x, 0, a.y, b.x, -drop, b.y, b.x, 0, b.y);
    uvs.push(
      a.x * 0.55, a.y * 0.55, a.x * 0.55, a.y * 0.55, b.x * 0.55, b.y * 0.55,
      a.x * 0.55, a.y * 0.55, b.x * 0.55, b.y * 0.55, b.x * 0.55, b.y * 0.55,
    );
  }
  return finishGeo(pos, uvs);
}

function roofSoffitGeometry(house: Vec2[], eaves: Vec2[]): THREE.BufferGeometry | null {
  const inner = ccw(house);
  const outer = ccw(eaves);
  if (inner.length < 3 || outer.length !== inner.length) return null;
  const pos: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i < inner.length; i++) {
    const a = inner[i];
    const b = inner[(i + 1) % inner.length];
    const c = outer[(i + 1) % outer.length];
    const d = outer[i];
    // Wind so the soffit faces down — otherwise eaves are hollow from below.
    pos.push(a.x, 0, a.y, c.x, 0, c.y, b.x, 0, b.y);
    pos.push(a.x, 0, a.y, d.x, 0, d.y, c.x, 0, c.y);
    uvs.push(
      a.x * 0.55, a.y * 0.55, c.x * 0.55, c.y * 0.55, b.x * 0.55, b.y * 0.55,
      a.x * 0.55, a.y * 0.55, d.x * 0.55, d.y * 0.55, c.x * 0.55, c.y * 0.55,
    );
  }
  return finishGeo(pos, uvs);
}

function waterHeight(x: number, z: number): number {
  return -0.04 + 0.003 * Math.sin(x * 1.7) * Math.cos(z * 1.4);
}

function canalGeometry(graph: GridGraph): THREE.BufferGeometry | null {
  const pos: number[] = [];
  const nrm: number[] = [];
  const uvs: number[] = [];
  const push = (
    ax: number, ay: number, az: number,
    bx: number, by: number, bz: number,
    cx: number, cy: number, cz: number,
  ) => {
    pos.push(ax, ay, az, bx, by, bz, cx, cy, cz);
    const abx = bx - ax, aby = by - ay, abz = bz - az;
    const acx = cx - ax, acy = cy - ay, acz = cz - az;
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;
    const len = Math.hypot(nx, ny, nz) || 1;
    const x = nx / len, y = ny / len, z = nz / len;
    nrm.push(x, y, z, x, y, z, x, y, z);
    uvs.push(ax * 0.45, az * 0.45, bx * 0.45, bz * 0.45, cx * 0.45, cz * 0.45);
  };
  let any = false;
  for (const cell of graph.grid.cells) {
    if (cell.state.occupancy !== 'water') continue;
    const poly = ccw(graph.getCellVerts(cell));
    if (poly.length < 3) continue;
    any = true;
    const water = scaleAbout(poly, 1.12);
    const c = areaCentroid(water);
    const yc = waterHeight(c.x, c.y);
    for (let i = 0; i < water.length; i++) {
      const a = water[i];
      const b = water[(i + 1) % water.length];
      push(c.x, yc, c.y, a.x, waterHeight(a.x, a.y), a.y, b.x, waterHeight(b.x, b.y), b.y);
    }
  }
  if (!any) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  return geo;
}

function canalBankGeometry(graph: GridGraph): THREE.BufferGeometry | null {
  const pos: number[] = [];
  const uvs: number[] = [];
  const yBot = -0.08;
  let any = false;
  for (const cell of graph.grid.cells) {
    if (cell.state.occupancy !== 'water') continue;
    const poly = ccw(graph.getCellVerts(cell));
    if (poly.length < 3) continue;
    any = true;
    const inside = areaCentroid(poly);
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const out = outwardNormal(a, b, inside);
      if (neighborOccupancyToward(cell, graph, out) === 'water') continue;
      const ya = graph.hillAt(a.x, a.y) + 0.01;
      const yb = graph.hillAt(b.x, b.y) + 0.01;
      pushTriRaw(pos, uvs, a.x, ya, a.y, b.x, yb, b.y, b.x, yBot, b.y);
      pushTriRaw(pos, uvs, a.x, ya, a.y, b.x, yBot, b.y, a.x, yBot, a.y);
    }
  }
  return any && pos.length ? finishGeo(pos, uvs) : null;
}

function pickDoorEdge(house: Vec2[], cell: Cell, graph: GridGraph): number {
  const inside = areaCentroid(house);
  let best = 0;
  let bestScore = -Infinity;
  for (let i = 0; i < house.length; i++) {
    const a = house[i];
    const b = house[(i + 1) % house.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const out = outwardNormal(a, b, inside);
    const n = neighborToward(cell, graph, out, c => c);
    let score = len;
    if (n) {
      if (n.state.ground === 'road') score += 8;
      else if (n.state.ground === 'plaza' || n.state.ground === 'garden') score += 5;
      else if (n.state.occupancy === 'empty') score += 3;
      else if (n.state.occupancy === 'water') score += 2;
      else if (n.state.occupancy === 'building') score -= 4;
    } else {
      score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

const CANOPY = ['#7ba055', '#8cb063', '#98bb6e', '#6d9349', '#a3c479'];
let trunkMat: THREE.MeshLambertMaterial | null = null;
const canopyMats: THREE.MeshLambertMaterial[] = [];

function treeTrunkMat(): THREE.MeshLambertMaterial {
  if (!trunkMat) trunkMat = lambert('#8a6f57', 'trim');
  return trunkMat;
}

function canopyMat(i: number): THREE.MeshLambertMaterial {
  const idx = ((i % CANOPY.length) + CANOPY.length) % CANOPY.length;
  if (!canopyMats[idx]) canopyMats[idx] = lambert(CANOPY[idx], 'trim');
  return canopyMats[idx];
}

function addTree(group: THREE.Group, x: number, y: number, z: number, seed: number, scale: number): void {
  const s = scale * 1.05;
  const trunkH = (0.4 + (seed % 4) * 0.08) * s;
  const lean = (seed % 7 - 3) * 0.025;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035 * s, 0.07 * s, trunkH, 7),
    treeTrunkMat(),
  );
  trunk.position.set(x + lean * 0.4, y + trunkH * 0.5, z);
  trunk.rotation.z = lean;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  const layers = [
    { r: 0.4 * s, y: trunkH * 0.72, squash: 0.72, gi: seed },
    { r: 0.32 * s, y: trunkH * 1.05, squash: 0.78, gi: seed + 2 },
    { r: 0.2 * s, y: trunkH * 1.32, squash: 0.82, gi: seed + 4 },
  ];
  for (const layer of layers) {
    const geo = new THREE.IcosahedronGeometry(layer.r, 0);
    geo.scale(1, layer.squash, 1.05);
    const canopy = new THREE.Mesh(geo, canopyMat(layer.gi));
    canopy.position.set(
      x + lean + ((seed % 5) - 2) * 0.02,
      y + layer.y,
      z + ((seed % 3) - 1) * 0.02,
    );
    canopy.rotation.set(seed * 0.07, seed * 0.21, seed * 0.05);
    canopy.castShadow = true;
    canopy.receiveShadow = true;
    group.add(canopy);
  }
}

function addGrassTuft(group: THREE.Group, x: number, y: number, z: number, seed: number, scale: number): void {
  const n = 2 + (seed % 2);
  for (let i = 0; i < n; i++) {
    const h = (0.08 + (seed + i) % 3 * 0.03) * scale;
    const blade = new THREE.Mesh(
      new THREE.ConeGeometry(0.035 * scale, h, 5),
      canopyMat(seed + i + 1),
    );
    blade.position.set(x + ((i % 2) - 0.5) * 0.06, y + h * 0.45, z + (i - 1) * 0.04);
    blade.rotation.z = ((seed + i) % 5 - 2) * 0.12;
    blade.castShadow = true;
    group.add(blade);
  }
}

function addRock(group: THREE.Group, x: number, y: number, z: number, seed: number, scale: number): void {
  const s = 0.11 * scale;
  const geo = new THREE.DodecahedronGeometry(s, 0);
  geo.scale(1.35, 0.48 + (seed % 3) * 0.08, 1.05);
  const greys = ['#8b8478', '#7a7368', '#948c80', '#6e675c'];
  const rock = new THREE.Mesh(geo, lambert(greys[seed % greys.length], 'trim'));
  rock.position.set(x, y + s * 0.28, z);
  rock.rotation.set(seed * 0.15, seed * 0.7, seed * 0.11);
  rock.castShadow = true;
  group.add(rock);
}

function addBush(group: THREE.Group, x: number, y: number, z: number, seed: number, scale: number): void {
  const r = 0.16 * scale;
  for (let i = 0; i < 3; i++) {
    const bush = new THREE.Mesh(
      new THREE.IcosahedronGeometry(r * (0.7 + (i % 2) * 0.25), 0),
      canopyMat(seed + i),
    );
    bush.position.set(
      x + (i - 1) * 0.07 * scale,
      y + r * 0.55,
      z + ((i % 2) - 0.5) * 0.05 * scale,
    );
    bush.scale.y = 0.7;
    bush.castShadow = true;
    bush.receiveShadow = true;
    group.add(bush);
  }
}

function addChimney(
  group: THREE.Group,
  house: Vec2[],
  roofY: number,
  hSurf: (x: number, z: number) => number,
  seed: number,
): void {
  const peak = areaCentroid(house);
  // Stubby and brick-toned: tall pale stacks read as candles stuck in the roofs.
  const flue = lambert('#b08268', 'trim');
  const capMat = lambert('#c9b9a2', 'trim');
  const count = seed % 6 === 0 ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const corner = house[(seed + i * 3) % house.length];
    const t = 0.58 + ((seed + i) % 4) * 0.05;
    const x = corner.x + (peak.x - corner.x) * t + (i ? 0.1 : 0);
    const z = corner.y + (peak.y - corner.y) * t;
    const stackH = 0.17 + (seed % 3) * 0.03;
    const local = Math.max(0.04, hSurf(x, z));
    const y = roofY + local + stackH * 0.42;
    const kind = (seed + i) % 3;
    if (kind === 0) {
      const stack = new THREE.Mesh(new THREE.BoxGeometry(0.2, stackH, 0.2), flue);
      stack.position.set(x, y, z);
      stack.castShadow = true;
      stack.receiveShadow = true;
      group.add(stack);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.04, 0.25), capMat);
      cap.position.set(x, y + stackH * 0.48, z);
      cap.castShadow = true;
      group.add(cap);
    } else if (kind === 1) {
      const stack = new THREE.Mesh(new THREE.BoxGeometry(0.23, stackH * 1.05, 0.17), flue);
      stack.position.set(x, y, z);
      stack.castShadow = true;
      stack.receiveShadow = true;
      group.add(stack);
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.07, 7), capMat);
      pot.position.set(x, y + stackH * 0.55 + 0.03, z);
      pot.castShadow = true;
      group.add(pot);
    } else {
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, stackH, 8), flue);
      stack.position.set(x, y, z);
      stack.castShadow = true;
      stack.receiveShadow = true;
      group.add(stack);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.038, 8), capMat);
      cap.position.set(x, y + stackH * 0.48, z);
      cap.castShadow = true;
      group.add(cap);
    }
  }
}

function addGarden(
  group: THREE.Group,
  verts: Vec2[],
  rng: SeededRng,
  cellId: string,
  stats: MeshStats,
  rim: THREE.Material,
  soil: THREE.Material,
  hOf: (p: Vec2) => number,
): void {
  const c = areaCentroid(verts);
  const y = hOf(c);
  addMesh(group, drapedFanGeometry(verts, p => hOf(p) + 0.03), 0, rim, cellId, stats, false);
  const bed = shrink(verts, 0.76);
  addMesh(group, drapedFanGeometry(bed, p => hOf(p) + 0.05), 0, soil, cellId, stats, false);
  const ring = ccw(bed);
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const mx = (a.x + b.x) * 0.5;
    const mz = (a.y + b.y) * 0.5;
    if (rng.chance(0.82)) addBush(group, mx, hOf({ x: mx, y: mz }) + 0.09, mz, rng.int(99), 0.42 + rng.next() * 0.22);
  }
  addTree(group, c.x, y + 0.1, c.y, rng.int(99), 0.52 + rng.next() * 0.22);
  if (rng.chance(0.7)) addGrassTuft(group, c.x + 0.12, y + 0.1, c.y - 0.08, rng.int(99), 0.8);
  if (rng.chance(0.45)) addRock(group, c.x - 0.1, y + 0.08, c.y + 0.1, rng.int(99), 0.55);
}

function edgeTouches(
  a: Vec2,
  b: Vec2,
  neighborVerts: Vec2[],
): boolean {
  const near = (p: Vec2) => neighborVerts.some(v => Math.hypot(v.x - p.x, v.y - p.y) < 0.14);
  return near(a) && near(b);
}

function addStake(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  leanX: number,
  leanZ: number,
  wood: THREE.Material,
  scale = 1,
): void {
  const stake = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035 * scale, 0.045 * scale, 0.52 * scale, 6), wood);
  post.position.y = 0.26 * scale;
  post.castShadow = true;
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055 * scale, 0.22 * scale, 6), wood);
  tip.position.y = 0.6 * scale;
  tip.castShadow = true;
  stake.add(post, tip);
  stake.position.set(x, y, z);
  stake.rotation.z = leanX * 0.28;
  stake.rotation.x = leanZ * 0.28;
  group.add(stake);
}

function isPitDefense(d?: string): boolean {
  return d === 'ditch' || d === 'moat';
}

function pitComponent(start: Cell, graph: GridGraph): Cell[] {
  const seen = new Set<string>([start.id]);
  const out = [start];
  const q = [start];
  while (q.length) {
    const c = q.pop()!;
    for (const nid of c.neighbors) {
      if (seen.has(nid)) continue;
      const n = graph.getCell(nid);
      if (!n || !isPitDefense(n.state.defense)) continue;
      seen.add(nid);
      q.push(n);
      out.push(n);
    }
  }
  return out;
}

function pitComponentWet(start: Cell, graph: GridGraph): boolean {
  return pitComponent(start, graph).some(c => c.state.defense === 'moat');
}

function parapetGeometry(deck: Vec2[], height: number): THREE.BufferGeometry | null {
  const inner = ccw(deck);
  const outer = scaleAbout(inner, 1.16);
  if (inner.length < 3 || outer.length !== inner.length || height <= 0) return null;
  const pos: number[] = [];
  const uvs: number[] = [];
  for (let i = 0; i < inner.length; i++) {
    const a = outer[i];
    const b = outer[(i + 1) % outer.length];
    const c = inner[(i + 1) % inner.length];
    const d = inner[i];
    pushTriRaw(pos, uvs, a.x, 0, a.y, b.x, 0, b.y, b.x, height, b.y);
    pushTriRaw(pos, uvs, a.x, 0, a.y, b.x, height, b.y, a.x, height, a.y);
    pushTriRaw(pos, uvs, d.x, 0, d.y, d.x, height, d.y, c.x, height, c.y);
    pushTriRaw(pos, uvs, d.x, 0, d.y, c.x, height, c.y, c.x, 0, c.y);
    pushTriRaw(pos, uvs, a.x, height, a.y, b.x, height, b.y, c.x, height, c.y);
    pushTriRaw(pos, uvs, a.x, height, a.y, c.x, height, c.y, d.x, height, d.y);
  }
  return pos.length ? finishGeo(pos, uvs) : null;
}

function addArcherPost(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  faceX: number,
  faceZ: number,
  scale: number,
): void {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = Math.atan2(faceX, faceZ);
  addFigure(g, '#3f8a3a', '#3a3228', 'bow', 0, 0, scale, '#4a5450');
  group.add(g);
}

function addDefenseWorks(
  group: THREE.Group,
  cell: Cell,
  verts: Vec2[],
  stats: MeshStats,
  canal: THREE.Material,
  graph: GridGraph,
): void {
  const kind = cell.state.defense;
  if (!kind) return;
  const c = areaCentroid(verts);
  const y = graph.hillAt(c.x, c.y) + 0.02;
  const drape = (p: Vec2, lift: number) => graph.hillAt(p.x, p.y) + lift;
  const soil = lambert('#a58260', 'trim');
  const wood = lambert('#9b7d5e', 'trim');
  const stone = lambert('#d6c8a8', 'trim');
  const dark = lambert('#6d5a48', 'trim');
  const packed = lambert('#bfae88', 'cobble');
  const poly = ccw(verts);
  soil.side = THREE.DoubleSide;

  if (kind === 'ditch' || kind === 'moat') {
    const depth = 1.05;
    const comp = pitComponent(cell, graph);
    const lipMin = Math.min(...comp.map(n => graph.hillAt(n.centroid.x, n.centroid.y)));
    const floorPoly = scaleAbout(poly, 1.08);
    const waterPoly = scaleAbout(poly, 1.18);
    const floorY = lipMin - depth;
    const spilled = kind === 'moat' || pitComponentWet(cell, graph);
    const waterY = lipMin - 0.12;
    const bankBottom = spilled ? waterY : floorY;
    const lip = (p: Vec2) => graph.hillAt(p.x, p.y);
    if (!spilled) {
      addMesh(group, drapedFanGeometry(floorPoly, () => floorY), 0, dark, cell.id, stats, false);
    }
    const bankPos: number[] = [];
    const bankUv: number[] = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      let shared = false;
      for (const nid of cell.neighbors) {
        const n = graph.getCell(nid);
        if (!n || !isPitDefense(n.state.defense)) continue;
        if (edgeTouches(a, b, graph.getCellVerts(n))) {
          shared = true;
          break;
        }
      }
      if (shared) continue;
      const ya = lip(a);
      const yb = lip(b);
      const ia = floorPoly[i] ?? a;
      const ib = floorPoly[(i + 1) % floorPoly.length] ?? b;
      pushTriRaw(bankPos, bankUv, a.x, ya, a.y, b.x, yb, b.y, ib.x, bankBottom, ib.y);
      pushTriRaw(bankPos, bankUv, a.x, ya, a.y, ib.x, bankBottom, ib.y, ia.x, bankBottom, ia.y);
    }
    soil.side = THREE.DoubleSide;
    dark.side = THREE.DoubleSide;
    if (bankPos.length) addMesh(group, finishGeo(bankPos, bankUv), 0, soil, cell.id, stats, false);
    if (spilled) {
      addMesh(group, drapedFanGeometry(waterPoly, () => waterY), 0, canal, cell.id, stats, false);
    }
    return;
  }

  if (kind === 'spikes') {
    addMesh(group, drapedFanGeometry(scaleAbout(verts, 0.88), p => drape(p, 0.03)), 0, soil, cell.id, stats, false);
    let ox = 0;
    let oz = 0;
    let nOut = 0;
    for (const nid of cell.neighbors) {
      const n = graph.getCell(nid);
      if (!n || n.state.occupancy !== 'building') continue;
      ox += c.x - n.centroid.x;
      oz += c.y - n.centroid.y;
      nOut++;
    }
    if (!nOut) {
      ox = c.x;
      oz = c.y;
    }
    const olen = Math.hypot(ox, oz) || 1;
    ox /= olen;
    oz /= olen;
    const px = -oz;
    const pz = ox;
    const alignN = cell.neighbors.some(id => graph.getCell(id)?.state.defense === 'spikes');
    const count = alignN ? 7 : 6;
    for (let i = 0; i < count; i++) {
      const t = (i / Math.max(1, count - 1) - 0.5) * 0.85;
      const row = i % 2 === 0 ? 0.12 : -0.1;
      addStake(
        group,
        c.x + px * t + ox * row,
        graph.hillAt(c.x + px * t, c.y + pz * t) + 0.02,
        c.y + pz * t + oz * row,
        ox,
        oz,
        wood,
        0.95 + (i % 3) * 0.08,
      );
    }
    return;
  }

  if (kind === 'tower') {
    const base = shrink(verts, 0.72);
    const shaft = shrink(verts, 0.58);
    const deck = shrink(verts, 0.7);
    addMesh(group, prismGeometry(base, 0.48, { bottom: false }), y, stone, cell.id, stats);
    addMesh(group, prismGeometry(shaft, 1.22, { bottom: false }), y + 0.48, stone, cell.id, stats);
    addMesh(group, prismGeometry(deck, 0.12, { bottom: false }), y + 1.68, wood, cell.id, stats, false);
    stone.side = THREE.DoubleSide;
    addMesh(group, parapetGeometry(deck, 0.38), y + 1.78, stone, cell.id, stats);
    addArcherPost(group, c.x + 0.12, y + 1.8, c.y + 0.08, 0.4, 0.2, 0.42);
    addArcherPost(group, c.x - 0.1, y + 1.8, c.y - 0.1, -0.3, 0.35, 0.4);
    addArcherPost(group, c.x + 0.02, y + 1.8, c.y + 0.14, 0.1, -0.4, 0.4);
    return;
  }

  addMesh(group, drapedFanGeometry(scaleAbout(verts, 0.9), p => drape(p, 0.05)), 0, packed, cell.id, stats, false);
  const garrison = kind === 'archers' || kind === 'pikemen' || kind === 'militia';
  if (garrison) {
    const pal = shrink(verts, 0.78);
    addMesh(group, prismGeometry(pal, 0.12, { bottom: false }), y, wood, cell.id, stats, false);
    let ox = 0;
    let oz = 0;
    let nOut = 0;
    for (const nid of cell.neighbors) {
      const n = graph.getCell(nid);
      if (!n || n.state.occupancy !== 'building') continue;
      ox += c.x - n.centroid.x;
      oz += c.y - n.centroid.y;
      nOut++;
    }
    if (!nOut) {
      ox = c.x;
      oz = c.y;
    }
    const olen = Math.hypot(ox, oz) || 1;
    ox /= olen;
    oz /= olen;
    const px = -oz;
    const pz = ox;
    const count = kind === 'archers' ? 7 : 5;
    for (let i = 0; i < count; i++) {
      const t = (i / Math.max(1, count - 1) - 0.5) * 0.72;
      addStake(
        group,
        c.x + px * t + ox * 0.18,
        y + 0.04,
        c.y + pz * t + oz * 0.18,
        ox,
        oz,
        wood,
        kind === 'archers' ? 0.82 : 0.7,
      );
    }
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.95, 6), wood);
    pole.position.set(c.x - ox * 0.12, y + 0.55, c.y - oz * 0.12);
    pole.castShadow = true;
    group.add(pole);
    const flag = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.16, 0.04),
      kind === 'pikemen' ? lambert('#c4b48a', 'trim') : kind === 'archers' ? lambert('#4e7a40', 'trim') : lambert('#6d8fa8', 'trim'),
    );
    flag.position.set(c.x - ox * 0.12 + px * 0.12, y + 0.92, c.y - oz * 0.12 + pz * 0.12);
    flag.castShadow = true;
    group.add(flag);
    return;
  }
  const crate = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.18), wood);
  crate.position.set(c.x + 0.28, y + 0.1, c.y - 0.18);
  crate.castShadow = true;
  group.add(crate);
}

export function buildCityGroup(
  graph: GridGraph,
  colors: ColorField,
): { group: THREE.Group; water: THREE.Mesh[]; stats: MeshStats } {
  const group = new THREE.Group();
  const water: THREE.Mesh[] = [];
  const stats: MeshStats = { ok: 0, fail: 0, houses: 0 };
  const cobble = lambert('#c4b89a', 'cobble');
  const road = lambert('#6e6456', 'cobble');
  road.polygonOffset = true;
  road.polygonOffsetFactor = -4;
  road.polygonOffsetUnits = -4;
  const soil = lambert('#8ba368', 'ground');
  const lot = lambert('#9aaa70', 'ground');
  // Matching the surrounding plain hides the seam where the hill's toe lands.
  const grass = lambert(LAND_COLOR, 'ground');
  // Faint worn grass on the three rings — cobble here swallowed the streets.
  const line1Mat = lambert('#c2c894', 'ground');
  const line2Mat = lambert('#b8c08c', 'ground');
  const line3Mat = lambert('#adc086', 'ground');
  for (const m of [line1Mat, line2Mat, line3Mat]) {
    m.polygonOffset = true;
    m.polygonOffsetFactor = -2;
    m.polygonOffsetUnits = -2;
  }
  grass.side = THREE.DoubleSide;
  grass.polygonOffset = true;
  grass.polygonOffsetFactor = -1;
  grass.polygonOffsetUnits = -1;
  const canal = makeWaterMaterial(WATER_COLOR);
  canal.polygonOffset = false;
  const wallCache = new Map<string, THREE.MeshLambertMaterial>();
  const roofCache = new Map<string, THREE.MeshLambertMaterial>();
  const of = (map: Map<string, THREE.MeshLambertMaterial>, hex: string, kind: PaperKind) => {
    let m = map.get(hex);
    if (!m) {
      m = lambert(hex, kind, kind === 'wall');
      map.set(hex, m);
    }
    return m;
  };

  const hAt = (x: number, y: number) => graph.hillAt(x, y);
  const hill = hillFieldGeometries(graph);
  addMesh(group, hill.grass, 0, grass, 'hill', stats, false);

  const rockRng = cellRng('hill-rocks', 19);
  for (const cell of graph.grid.cells) {
    if (cell.state.occupancy === 'water' || cell.state.occupancy === 'building') continue;
    if (cell.state.ground === 'road' || cell.state.ground === 'plaza') continue;
    const h = hAt(cell.centroid.x, cell.centroid.y);
    if (h < 0.55) continue;
    const nearBuild = cell.neighbors.some(id => graph.getCell(id)?.state.occupancy === 'building');
    if (!nearBuild) continue;
    if (!rockRng.chance(0.18)) continue;
    const jx = cell.centroid.x + (rockRng.next() - 0.5) * 0.45;
    const jz = cell.centroid.y + (rockRng.next() - 0.5) * 0.45;
    addRock(group, jx, hAt(jx, jz), jz, rockRng.int(99), 0.7 + rockRng.next() * 0.9);
    if (h > 0.7 && rockRng.chance(0.4)) {
      addRock(
        group,
        jx + 0.18,
        hAt(jx + 0.18, jz - 0.1),
        jz - 0.1,
        rockRng.int(99),
        0.45 + rockRng.next() * 0.4,
      );
    }
  }

  for (const cell of graph.grid.cells) {
    const verts = graph.getCellVerts(cell);
    if (verts.length < 3) {
      stats.fail++;
      continue;
    }
    const isWater = cell.state.occupancy === 'water';
    const isBuilding = cell.state.occupancy === 'building';
    const waterAdj = !isWater && cell.neighbors.some(id => graph.getCell(id)?.state.occupancy === 'water');
    const rng = cellRng(cell.id, 3);
    const elev = isWater ? 0 : (cell.elevation || 0);
    const drape = (p: Vec2, lift: number) => hAt(p.x, p.y) + lift;

    if (isWater) continue;

    if (!isBuilding) {
      const c = areaCentroid(verts);
      const line = cell.state.defenseLine;
      const pit = cell.state.defense === 'ditch' || cell.state.defense === 'moat';
      if (line && !cell.state.ground && !pit) {
        const lineMat = line === 1 ? line1Mat : line === 2 ? line2Mat : line3Mat;
        // Full cell, sitting flush, so adjacent ring cells merge into one band
        // instead of hovering as separate pads.
        addMesh(group, drapedFanGeometry(scaleAbout(verts, 1.0), p => drape(p, 0.012)), 0, lineMat, cell.id, stats, false);
      }
      if (cell.state.ground === 'road') {
        addMesh(group, drapedFanGeometry(scaleAbout(verts, 1.0), p => drape(p, 0.09)), 0, road, cell.id, stats, false);
        if (cell.state.defense) addDefenseWorks(group, cell, verts, stats, canal, graph);
        continue;
      }
      if (cell.state.ground === 'plaza') {
        const mat = cobble;
        addMesh(group, drapedFanGeometry(scaleAbout(verts, 1.06), p => drape(p, 0.048)), 0, mat, cell.id, stats, false);
        if (!waterAdj && !cell.state.defense && rng.chance(0.18)) addBush(group, c.x, elev + 0.08, c.y, rng.int(99), 0.55 + rng.next() * 0.15);
        if (cell.state.defense) addDefenseWorks(group, cell, verts, stats, canal, graph);
        continue;
      }
      if (cell.state.ground === 'garden' && !cell.state.defense) {
        addGarden(group, verts, rng, cell.id, stats, cobble, soil, p => hAt(p.x, p.y));
        continue;
      }
      if (cell.state.defense) {
        addDefenseWorks(group, cell, verts, stats, canal, graph);
        continue;
      }
      if (line) continue;
      const buildingsNear = cell.neighbors.filter(id => graph.getCell(id)?.state.occupancy === 'building').length;
      if (buildingsNear >= 2) {
        if (rng.chance(0.12)) addBush(group, c.x, elev + 0.02, c.y, rng.int(99), 0.55 + rng.next() * 0.15);
        else if (rng.chance(0.08)) addTree(group, c.x, elev + 0.02, c.y, rng.int(99), 0.58 + rng.next() * 0.1);
      } else if (buildingsNear === 0) {
        if ((cell.elevation || 0) > 0.12) continue;
        if (rng.chance(0.05)) addTree(group, c.x, elev + 0.02, c.y, rng.int(99), 0.8 + rng.next() * 0.28);
        else if (rng.chance(0.09)) addRock(group, c.x, elev + 0.02, c.y, rng.int(99), 0.7 + rng.next() * 0.75);
        else if (rng.chance(0.04)) addBush(group, c.x, elev + 0.02, c.y, rng.int(99), 0.65 + rng.next() * 0.25);
        else if (rng.chance(0.08)) addGrassTuft(group, c.x, elev + 0.01, c.y, rng.int(99), 0.9 + rng.next() * 0.4);
      }
      continue;
    }

    const wound = cell.state.wound;
    if (wound?.ruined) {
      const rubble = lambert(wound.burnt ? '#3a3228' : '#6a5a4c', 'trim');
      const ash = lambert(wound.burnt ? '#2c241c' : wound.wet ? '#4a5a58' : '#7a6a58', 'trim');
      const beam = lambert('#5a4636', 'trim');
      addMesh(group, drapedFanGeometry(scaleAbout(verts, 1.02), p => drape(p, 0.04)), 0, ash, cell.id, stats, false);
      addMesh(group, prismGeometry(shrink(verts, 0.9), 0.14 + rng.next() * 0.1, { bottom: false }), elev + 0.02, rubble, cell.id, stats, false);
      const rc = areaCentroid(verts);
      const teeth = 3 + rng.int(2);
      for (let t = 0; t < teeth; t++) {
        const focus = verts[t % verts.length];
        const stub = scaleToward(verts, 0.28 + rng.next() * 0.18, {
          x: rc.x + (focus.x - rc.x) * 0.7,
          y: rc.y + (focus.y - rc.y) * 0.7,
        });
        const h = 0.22 + rng.next() * 0.55 + (wound.burnt ? 0 : 0.08);
        addMesh(group, prismGeometry(stub, h, { bottom: false }), elev + 0.12, rubble, cell.id, stats);
      }
      for (let b = 0; b < 2; b++) {
        const fallen = new THREE.Mesh(new THREE.BoxGeometry(0.48 + rng.next() * 0.2, 0.07, 0.14), beam);
        fallen.position.set(rc.x + (rng.next() - 0.5) * 0.4, elev + 0.22 + b * 0.08, rc.y + (rng.next() - 0.5) * 0.35);
        fallen.rotation.set(0.25 + rng.next() * 0.5, rng.next() * 1.8, 0.15);
        fallen.castShadow = true;
        group.add(fallen);
      }
      if (wound.burnt) {
        const char = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.4, 0.22), lambert('#1a1410', 'trim'));
        char.position.set(rc.x + 0.1, elev + 0.34, rc.y - 0.06);
        group.add(char);
        const ember = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.16), lambert('#6a3020', 'trim'));
        ember.position.set(rc.x - 0.16, elev + 0.22, rc.y + 0.1);
        group.add(ember);
      }
      continue;
    }

    addMesh(group, drapedFanGeometry(scaleAbout(verts, 0.62), p => drape(p, 0.03)), 0, lot, cell.id, stats, false);

    const base = colors.resolve(cell.id);
    let wallHslH = base.h;
    let wallHslS = Math.min(0.42, Math.max(0.1, base.s));
    let wallHslL = Math.min(0.78, Math.max(0.55, base.l));
    const roofCol = colors.resolveRoof(cell.id);
    let roofH = roofCol.h;
    let roofS = Math.min(0.55, Math.max(0.16, roofCol.s));
    let roofL = Math.min(0.68, Math.max(0.26, roofCol.l));
    if (wound?.burnt) {
      wallHslH = 22;
      wallHslS = Math.min(wallHslS, 0.18);
      wallHslL *= 0.55;
      roofH = 18;
      roofS = 0.2;
      roofL *= 0.45;
    } else if (wound?.wet) {
      wallHslH = 198;
      wallHslS = Math.min(0.28, wallHslS + 0.08);
      wallHslL *= 0.78;
      roofL *= 0.82;
    } else if (wound && wound.hp < wound.maxHp * 0.5) {
      wallHslL *= 0.82;
      roofL *= 0.88;
    }
    const wallHex = hslToHex(wallHslH, wallHslS, wallHslL);
    const roofHex = hslToHex(roofH, roofS, roofL);
    const wallMat = of(wallCache, wallHex, 'wall');
    const roofMat = of(roofCache, roofHex, 'roof');

    const packed = cell.neighbors.filter(id => {
      const n = graph.getCell(id);
      return n && n.state.occupancy === 'building' && Math.abs((n.state.height || 1) - (cell.state.height || 1)) < 0.6;
    }).length >= 2;
    const house = shrink(verts, packed ? 0.9 : 0.84);
    const mid = areaCentroid(house);
    let yMin = elev;
    for (const v of verts) yMin = Math.min(yMin, hAt(v.x, v.y));
    if (elev - yMin > 0.08) {
      const drop = Math.min(0.14, elev - yMin);
      addMesh(group, prismGeometry(house, drop + LOT_H, { bottom: false }), elev - drop, lot, cell.id, stats, false);
    }

    const tier = cell.state.height || 1;
    let wallH = STORY * (0.82 + Math.min(3, tier) * 0.46 + rng.next() * 0.12);
    if (cell.state.isTower) wallH *= 1.22;

    const doorEdge = pickDoorEdge(house, cell, graph);
    const facadeStyle = rng.int(5);
    stats.houses++;

    const timber = lambert('#8a6e52', 'trim');
    const smashed = !!(wound && (wound.hp < wound.maxHp * 0.52 || wound.burnt));
    const putRoof = (footprint: Vec2[], yTop: number, rise: number) => {
      const eaves = scaleAbout(footprint, packed ? 1.1 : 1.14);
      const roofY = yTop + 0.02;
      const fascia = 0.11;
      const pitch = Math.max(0.38, rise * (0.85 + rng.next() * 0.35));
      const skip = smashed ? rng.int(Math.max(1, eaves.length)) : -1;
      const roofGeo = hippedRoofGeometry(eaves, pitch, undefined, skip)
        ?? hippedRoofGeometry(eaves, pitch);
      const hSurf = (x: number, z: number) => hippedHeightAt(eaves, pitch, undefined, x, z);
      addMesh(group, prismGeometry(footprint, 0.06, { bottom: true, sides: true }), yTop - 0.01, timber, cell.id, stats, false);
      addMesh(group, roofGeo, roofY, roofMat, cell.id, stats);
      addMesh(group, roofSkirtGeometry(eaves, fascia), roofY, roofMat, cell.id, stats, false);
      addMesh(group, roofSoffitGeometry(footprint, eaves), roofY - 0.01, timber, cell.id, stats, false);
      if (!smashed && rng.chance(0.7)) addChimney(group, eaves, roofY, hSurf, rng.int(99));
      if (smashed) {
        const rubble = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, 0.1, 0.18),
          lambert('#5a4030', 'trim'),
        );
        rubble.position.set(mid.x + 0.12, yTop + 0.1, mid.y);
        rubble.rotation.set(0.35, rng.next(), 0.2);
        group.add(rubble);
      }
    };

    const deck = (footprint: Vec2[], y: number) => {
      addMesh(group, prismGeometry(footprint, 0.05, { bottom: false }), y - 0.02, roofMat, cell.id, stats, false);
    };

    const isKeep = !!cell.state.isTower;
    const yGround = hAt(mid.x, mid.y);
    const yLot = isKeep ? yGround - 0.02 : yGround + LOT_H;
    const wantSetback = !isKeep && wallH > 1.2 && (tier >= 2 && rng.chance(0.8) || tier >= 1.5 && rng.chance(0.4));
    if (isKeep) {
      const found = scaleAbout(house, 1.14);
      const foundH = 0.98;
      const plinth = lambert('#dbd0b6', 'wall', true);
      addMesh(group, buildingPrismGeometry(found, foundH, doorEdge, 0), yLot, plinth, cell.id, stats);
      deck(found, yLot + foundH);
      const y1 = yLot + foundH;
      const baseH = wallH * 0.4;
      const midH = wallH * 0.32;
      const topH = Math.max(0.52, wallH - baseH - midH);
      addMesh(group, buildingPrismGeometry(house, baseH, -1, 2), y1, wallMat, cell.id, stats);
      deck(house, y1 + baseH);
      const midVol = shrink(house, 0.82);
      addMesh(group, buildingPrismGeometry(midVol, midH, -1, 2), y1 + baseH, wallMat, cell.id, stats);
      deck(midVol, y1 + baseH + midH);
      addMesh(group, buildingPrismGeometry(midVol, 0.1, -1, -1), y1 + baseH + midH, wallMat, cell.id, stats, false);
      const lantern = shrink(midVol, 0.58);
      addMesh(group, buildingPrismGeometry(lantern, topH, -1, 2, true), y1 + baseH + midH, wallMat, cell.id, stats);
      const eaves = scaleAbout(lantern, 1.08);
      const roofY = y1 + baseH + midH + topH + 0.04;
      const pitch = 0.48;
      addMesh(group, prismGeometry(lantern, 0.08, { bottom: true, sides: true }), roofY - 0.08, timber, cell.id, stats, false);
      addMesh(group, hippedRoofGeometry(eaves, pitch), roofY, roofMat, cell.id, stats);
      addMesh(group, roofSkirtGeometry(eaves, 0.09), roofY, roofMat, cell.id, stats, false);
      addMesh(group, roofSoffitGeometry(lantern, eaves), roofY - 0.01, timber, cell.id, stats, false);
      addChimney(group, eaves, roofY, (x, z) => hippedHeightAt(eaves, pitch, undefined, x, z), 3);
      const battlement = lambert('#d6c8a8', 'trim');
      battlement.side = THREE.DoubleSide;
      addMesh(group, parapetGeometry(house, 0.36), y1 + baseH, battlement, cell.id, stats);
      const watchY = y1 + baseH + 0.05;
      addArcherPost(group, mid.x + 0.42, watchY, mid.y + 0.22, 0.7, 0.2, 0.52);
      addArcherPost(group, mid.x - 0.38, watchY, mid.y - 0.18, -0.55, 0.35, 0.5);
      addArcherPost(group, mid.x + 0.08, watchY, mid.y + 0.44, 0.15, -0.7, 0.5);
    } else {
      let setback = false;
      if (wantSetback) {
        const focus = house[rng.int(house.length)];
        const upper = scaleToward(house, 0.72 + rng.next() * 0.1, {
          x: mid.x + (focus.x - mid.x) * 0.22,
          y: mid.y + (focus.y - mid.y) * 0.22,
        });
        const a0 = Math.abs(signedArea(house));
        const a1 = Math.abs(signedArea(upper));
        if (a1 >= a0 * 0.5 && pointInPolygon(areaCentroid(upper), house)) {
          setback = true;
          const baseH = wallH * (0.52 + rng.next() * 0.08);
          const upperH = Math.max(0.55, wallH - baseH);
          addMesh(group, buildingPrismGeometry(house, baseH, doorEdge, facadeStyle, true), yLot, wallMat, cell.id, stats);
          deck(house, yLot + baseH);
          addMesh(group, buildingPrismGeometry(upper, upperH, -1, facadeStyle, true), yLot + baseH, wallMat, cell.id, stats);
          putRoof(upper, yLot + baseH + upperH, ROOF_RISE * (0.75 + rng.next() * 0.4));
        }
      }
      if (!setback) {
        addMesh(group, buildingPrismGeometry(house, wallH, doorEdge, facadeStyle, true), yLot, wallMat, cell.id, stats);
        const rise = ROOF_RISE * (0.7 + Math.min(1.2, tier) * 0.1 + rng.next() * 0.35);
        putRoof(house, yLot + wallH, rise);
      }
    }

    if (wound && (wound.burnt || wound.wet || wound.hp < wound.maxHp * 0.72)) {
      const scarCol = wound.burnt ? '#2c241c' : wound.wet ? '#3a5c60' : '#6a5848';
      const board = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.16), lambert(scarCol, 'trim'));
      board.position.set(mid.x, yLot + Math.min(wallH, 1.15) * 0.62, mid.y);
      board.rotation.y = rng.next() * Math.PI;
      board.castShadow = true;
      group.add(board);
      if (wound.burnt || wound.hp < wound.maxHp * 0.5) {
        const soot = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, wallH * 0.7, 0.14),
          lambert(wound.burnt ? '#1a1612' : '#4a4038', 'trim'),
        );
        soot.position.set(mid.x + 0.2, yLot + wallH * 0.4, mid.y - 0.06);
        group.add(soot);
      }
      if (wound.hp < wound.maxHp * 0.5) {
        const crack = new THREE.Mesh(new THREE.BoxGeometry(0.08, wallH * 0.45, 0.12), lambert('#3a322c', 'trim'));
        crack.position.set(mid.x - 0.16, yLot + wallH * 0.32, mid.y + 0.1);
        crack.rotation.z = 0.18;
        group.add(crack);
      }
    }
  }

  const bankMat = lambert('#8a6a48', 'trim');
  bankMat.side = THREE.DoubleSide;
  addMesh(group, canalBankGeometry(graph), 0, bankMat, 'canal-bank', stats, false);
  addMesh(group, canalGeometry(graph), 0, canal, 'canal', stats, false);

  let cx = 0;
  let cz = 0;
  let nBuild = 0;
  for (const cell of graph.grid.cells) {
    if (cell.state.occupancy !== 'building') continue;
    cx += cell.centroid.x;
    cz += cell.centroid.y;
    nBuild++;
  }
  if (nBuild) {
    cx /= nBuild;
    cz /= nBuild;
    const fieldRng = cellRng('countryside', 11);
    for (let i = 0; i < 42; i++) {
      const ang = fieldRng.next() * Math.PI * 2;
      const dist = 9.2 + fieldRng.next() * 16;
      const x = cx + Math.cos(ang) * dist;
      const z = cz + Math.sin(ang) * dist;
      const roll = fieldRng.next();
      if (roll < 0.3) addTree(group, x, 0.02, z, fieldRng.int(99), 0.78 + fieldRng.next() * 0.4);
      else if (roll < 0.55) addRock(group, x, 0.02, z, fieldRng.int(99), 0.65 + fieldRng.next() * 0.95);
      else if (roll < 0.78) addBush(group, x, 0.02, z, fieldRng.int(99), 0.65 + fieldRng.next() * 0.35);
      else addGrassTuft(group, x, 0.01, z, fieldRng.int(99), 0.85 + fieldRng.next() * 0.4);
    }
  }

  return { group, water, stats };
}
