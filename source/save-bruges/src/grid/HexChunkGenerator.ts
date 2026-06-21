import type { Vec2 } from '../core/types';
import { SeededRng, centroid, lerp, shuffle, vec2 } from '../core/rng';

const HEX_SIZE = 1.0;
const MERGE_PROB = 0.58;
const JITTER = 0.07;

export interface RawFace {
  vertIndices: number[];
}

export interface ChunkMesh {
  vertices: Vec2[];
  faces: RawFace[];
  borderVertIndices: Set<number>;
}

interface Triangle {
  id: number;
  verts: [number, number, number];
}

function axialToCartesian(q: number, r: number, size: number): Vec2 {
  return vec2(size * 1.5 * q, size * Math.sqrt(3) * (r + q / 2));
}

function edgeKey(a: number, b: number): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function hexDisk(radius: number): [number, number][] {
  const coords: [number, number][] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      coords.push([q, r]);
    }
  }
  return coords;
}

function cornerKey(q: number, r: number, corner: number): string {
  const dirs = [
    [1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1],
  ];
  const [dq, dr] = dirs[corner];
  return `${q + dq},${r + dr},${corner}`;
}

function hexCornerOffset(corner: number, size: number): Vec2 {
  const angle = (Math.PI / 180) * (60 * corner - 30);
  return vec2(Math.cos(angle) * size, Math.sin(angle) * size);
}

function isConvexQuad(verts: Vec2[]): boolean {
  if (verts.length !== 4) return false;
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % 4];
    const c = verts[(i + 2) % 4];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 1e-6) return false;
    if (sign === 0) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

function quadAspectRatio(verts: Vec2[]): number {
  const edges = [
    dist(verts[0], verts[1]),
    dist(verts[1], verts[2]),
    dist(verts[2], verts[3]),
    dist(verts[3], verts[0]),
  ];
  const max = Math.max(...edges);
  const min = Math.min(...edges);
  return min > 0 ? max / min : Infinity;
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function generateHexChunk(radius: number, seed: number): ChunkMesh {
  const rng = new SeededRng(seed);
  const hexes = hexDisk(radius);

  const vertexMap = new Map<string, number>();
  const vertices: Vec2[] = [];
  const borderVertIndices = new Set<number>();

  const getOrCreateVertex = (key: string, pos: Vec2, isBorder: boolean): number => {
    if (vertexMap.has(key)) return vertexMap.get(key)!;
    const idx = vertices.length;
    const jittered = vec2(
      pos.x + (rng.next() - 0.5) * JITTER,
      pos.y + (rng.next() - 0.5) * JITTER,
    );
    vertices.push(jittered);
    vertexMap.set(key, idx);
    if (isBorder) borderVertIndices.add(idx);
    return idx;
  };

  const centerIndices = new Map<string, number>();
  for (const [q, r] of hexes) {
    const pos = axialToCartesian(q, r, HEX_SIZE);
    const isBorder = Math.abs(q) === radius || Math.abs(r) === radius || Math.abs(-q - r) === radius;
    const idx = getOrCreateVertex(`c:${q},${r}`, pos, isBorder);
    centerIndices.set(`${q},${r}`, idx);
  }

  const cornerIndices = new Map<string, number>();
  for (const [q, r] of hexes) {
    for (let c = 0; c < 6; c++) {
      const pos = axialToCartesian(q, r, HEX_SIZE);
      const offset = hexCornerOffset(c, HEX_SIZE * 0.95);
      const cornerPos = vec2(pos.x + offset.x, pos.y + offset.y);
      const key = cornerKey(q, r, c);
      const isBorder = Math.abs(q) === radius || Math.abs(r) === radius || Math.abs(-q - r) === radius;
      cornerIndices.set(key, getOrCreateVertex(`k:${key}`, cornerPos, isBorder));
    }
  }

  const triangles: Triangle[] = [];
  let triId = 0;
  for (const [q, r] of hexes) {
    const center = centerIndices.get(`${q},${r}`)!;
    for (let c = 0; c < 6; c++) {
      const k0 = cornerKey(q, r, c);
      const k1 = cornerKey(q, r, (c + 1) % 6);
      const v0 = cornerIndices.get(k0)!;
      const v1 = cornerIndices.get(k1)!;
      triangles.push({ id: triId++, verts: [center, v0, v1] });
    }
  }

  const mergedFaces: RawFace[] = [];
  const usedTris = new Set<number>();
  const edgeToTri = new Map<string, number[]>();

  for (const tri of triangles) {
    const [a, b, c] = tri.verts;
    for (const [e0, e1] of [[a, b], [b, c], [c, a]] as [number, number][]) {
      const ek = edgeKey(e0, e1);
      if (!edgeToTri.has(ek)) edgeToTri.set(ek, []);
      edgeToTri.get(ek)!.push(tri.id);
    }
  }

  const mergeCandidates: [Triangle, Triangle][] = [];
  for (const tri of triangles) {
    const [a, b, c] = tri.verts;
    for (const [e0, e1] of [[a, b], [b, c], [c, a]] as [number, number][]) {
      const ek = edgeKey(e0, e1);
      const neighbors = edgeToTri.get(ek) ?? [];
      for (const nid of neighbors) {
        if (nid === tri.id) continue;
        mergeCandidates.push([tri, triangles[nid]]);
        break;
      }
    }
  }

  const shuffled = shuffle(mergeCandidates, rng);
  for (const [tA, tB] of shuffled) {
    if (usedTris.has(tA.id) || usedTris.has(tB.id)) continue;
    if (!rng.chance(MERGE_PROB)) continue;

    const shared = tA.verts.filter(v => tB.verts.includes(v));
    if (shared.length !== 2) continue;
    const unique = [...new Set([...tA.verts, ...tB.verts])];
    if (unique.length !== 4) continue;

    const ordered = orderQuadIndices(unique, vertices);
    const quadVerts = ordered.map(i => vertices[i]);
    if (!isConvexQuad(quadVerts) || quadAspectRatio(quadVerts) > 2.8) continue;

    mergedFaces.push({ vertIndices: ordered });
    usedTris.add(tA.id);
    usedTris.add(tB.id);
  }

  for (const tri of triangles) {
    if (usedTris.has(tri.id)) continue;
    mergedFaces.push({ vertIndices: [...tri.verts] });
  }

  return { vertices, faces: mergedFaces, borderVertIndices };
}

function orderQuadIndices(indices: number[], vertices: Vec2[]): number[] {
  const c = centroid(indices.map(i => vertices[i]));
  return [...indices].sort((a, b) => {
    const aa = Math.atan2(vertices[a].y - c.y, vertices[a].x - c.x);
    const bb = Math.atan2(vertices[b].y - c.y, vertices[b].x - c.x);
    return aa - bb;
  });
}

export function relaxChunk(
  mesh: ChunkMesh,
  iterations: number,
  alpha: number,
): void {
  const { vertices, borderVertIndices } = mesh;
  const adjacency = buildAdjacency(mesh);

  for (let iter = 0; iter < iterations; iter++) {
    const next = vertices.map(v => ({ ...v }));
    for (let i = 0; i < vertices.length; i++) {
      if (borderVertIndices.has(i)) continue;
      const neighbors = adjacency.get(i);
      if (!neighbors || neighbors.size === 0) continue;
      const avg = centroid([...neighbors].map(n => vertices[n]));
      next[i] = vec2(
        lerp(vertices[i].x, avg.x, alpha),
        lerp(vertices[i].y, avg.y, alpha),
      );
    }
    for (let i = 0; i < vertices.length; i++) vertices[i] = next[i];
  }
}

function buildAdjacency(mesh: ChunkMesh): Map<number, Set<number>> {
  const adj = new Map<number, Set<number>>();
  const add = (a: number, b: number) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a)!.add(b);
  };
  for (const face of mesh.faces) {
    const v = face.vertIndices;
    for (let i = 0; i < v.length; i++) {
      add(v[i], v[(i + 1) % v.length]);
      add(v[(i + 1) % v.length], v[i]);
    }
  }
  return adj;
}

export function offsetChunk(mesh: ChunkMesh, offset: Vec2): ChunkMesh {
  return {
    ...mesh,
    vertices: mesh.vertices.map(v => vec2(v.x + offset.x, v.y + offset.y)),
  };
}

export { axialToCartesian, HEX_SIZE };
