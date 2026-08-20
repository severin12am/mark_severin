import type { Vec2 } from '../core/types';
import { SeededRng, centroid, lerp, shuffle, vec2 } from '../core/rng';

const HEX_SIZE = 1.0;
const JITTER = 0.04;

export interface RawFace {
  vertIndices: number[];
}

export interface ChunkMesh {
  vertices: Vec2[];
  faces: RawFace[];
  borderVertIndices: Set<number>;
}

function axialToCartesian(q: number, r: number, size: number): Vec2 {
  return vec2(size * 1.5 * q, size * Math.sqrt(3) * (r + q / 2));
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

function hexCornerOffset(corner: number, size: number): Vec2 {
  const angle = (Math.PI / 180) * (60 * corner);
  return vec2(Math.cos(angle) * size, Math.sin(angle) * size);
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function orderRing(indices: number[], vertices: Vec2[]): number[] {
  const c = centroid(indices.map(i => vertices[i]));
  return [...indices].sort((a, b) => {
    const aa = Math.atan2(vertices[a].y - c.y, vertices[a].x - c.x);
    const bb = Math.atan2(vertices[b].y - c.y, vertices[b].x - c.x);
    return aa - bb;
  });
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
    vertices.push(vec2(
      pos.x + (rng.next() - 0.5) * JITTER,
      pos.y + (rng.next() - 0.5) * JITTER,
    ));
    vertexMap.set(key, idx);
    if (isBorder) borderVertIndices.add(idx);
    return idx;
  };

  const hexFaces: { q: number; r: number; vertIndices: number[] }[] = [];
  const hexIndex = new Map<string, number>();

  for (const [q, r] of hexes) {
    const isBorder = Math.abs(q) === radius || Math.abs(r) === radius || Math.abs(-q - r) === radius;
    const pos = axialToCartesian(q, r, HEX_SIZE);
    const vertIndices: number[] = [];
    for (let c = 0; c < 6; c++) {
      const offset = hexCornerOffset(c, HEX_SIZE);
      const cornerPos = vec2(pos.x + offset.x, pos.y + offset.y);
      const key = `p:${Math.round(cornerPos.x * 50)},${Math.round(cornerPos.y * 50)}`;
      vertIndices.push(getOrCreateVertex(key, cornerPos, isBorder));
    }
    hexIndex.set(`${q},${r}`, hexFaces.length);
    hexFaces.push({ q, r, vertIndices });
  }

  const used = new Set<number>();
  const faces: RawFace[] = [];
  const dirs: [number, number][] = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
  const order = shuffle(hexFaces.map((_, i) => i), rng);

  for (const i of order) {
    if (used.has(i)) continue;
    const hex = hexFaces[i];
    let merged = false;
    if (rng.chance(0.28)) {
      for (const [dq, dr] of dirs) {
        const ni = hexIndex.get(`${hex.q + dq},${hex.r + dr}`);
        if (ni == null || used.has(ni)) continue;
        const other = hexFaces[ni];
        const combined = [...new Set([...hex.vertIndices, ...other.vertIndices])];
        if (combined.length < 8) continue;
        const ring = orderRing(combined, vertices);
        let minE = Infinity;
        for (let k = 0; k < ring.length; k++) {
          minE = Math.min(minE, dist(vertices[ring[k]], vertices[ring[(k + 1) % ring.length]]));
        }
        if (minE < 0.25) continue;
        faces.push({ vertIndices: ring });
        used.add(i);
        used.add(ni);
        merged = true;
        break;
      }
    }
    if (!merged) {
      used.add(i);
      faces.push({ vertIndices: [...hex.vertIndices] });
    }
  }

  return { vertices, faces, borderVertIndices };
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
