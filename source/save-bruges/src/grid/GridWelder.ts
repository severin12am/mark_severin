import type { Cell, GlobalGrid, Occupancy, Vec2 } from '../core/types';
import type { ChunkMesh } from './HexChunkGenerator';
import { axialToCartesian, generateHexChunk, HEX_SIZE, offsetChunk, relaxChunk } from './HexChunkGenerator';
import { centroid, vec2 } from '../core/rng';

const WELD_EPS = 0.12;
const CHUNK_RADIUS = 8;

export function generateWorldGrid(seed: number, chunkRing = 1): GlobalGrid {
  const chunkCoords: [number, number][] = [[0, 0]];
  if (chunkRing >= 1) {
    for (let q = -chunkRing; q <= chunkRing; q++) {
      for (let r = -chunkRing; r <= chunkRing; r++) {
        if (q === 0 && r === 0) continue;
        if (Math.abs(q) <= chunkRing && Math.abs(r) <= chunkRing && Math.abs(-q - r) <= chunkRing) {
          chunkCoords.push([q, r]);
        }
      }
    }
  }

  const chunkSpan = HEX_SIZE * 3 * (CHUNK_RADIUS + 0.5);
  const rawChunks: { mesh: ChunkMesh; offset: Vec2; cq: number; cr: number }[] = [];

  for (const [cq, cr] of chunkCoords) {
    const chunkOffset = axialToCartesian(cq, cr, chunkSpan);
    let mesh = generateHexChunk(CHUNK_RADIUS, seed + cq * 997 + cr * 991);
    mesh = offsetChunk(mesh, chunkOffset);
    relaxChunk(mesh, 4, 0.18);
    rawChunks.push({ mesh, offset: chunkOffset, cq, cr });
  }

  return weldChunks(rawChunks, seed);
}

function weldChunks(
  chunks: { mesh: ChunkMesh; cq: number; cr: number }[],
  _seed: number,
): GlobalGrid {
  const globalVerts: Vec2[] = [];

  const findOrCreate = (v: Vec2): number => {
    for (let i = 0; i < globalVerts.length; i++) {
      const g = globalVerts[i];
      if (Math.hypot(g.x - v.x, g.y - v.y) < WELD_EPS) {
        globalVerts[i] = vec2(
          (g.x + v.x) / 2,
          (g.y + v.y) / 2,
        );
        return i;
      }
    }
    const idx = globalVerts.length;
    globalVerts.push({ ...v });
    return idx;
  };

  const allFaces: { vertIndices: number[]; chunkKey: string }[] = [];

  for (const { mesh, cq, cr } of chunks) {
    const localRemap = new Map<number, number>();
    for (let i = 0; i < mesh.vertices.length; i++) {
      const welded = findOrCreate(mesh.vertices[i]);
      localRemap.set(i, welded);
    }
    for (const face of mesh.faces) {
      allFaces.push({
        vertIndices: face.vertIndices.map(vi => localRemap.get(vi)!),
        chunkKey: `${cq},${cr}`,
      });
    }
  }

  globalRelax(globalVerts, allFaces, 1, 0.08);
  const welded = snapWeld(globalVerts, allFaces, 0.05);
  const vertices = welded.vertices;
  const faces = welded.faces;

  const cells: Cell[] = faces.map((face, idx) => {
    const worldVerts = face.vertIndices.map(vi => vertices[vi]);
    const c = centroid(worldVerts);
    return {
      id: `cell-${idx}`,
      vertIndices: face.vertIndices,
      centroid: c,
      neighbors: [] as string[],
      layer: 0,
      elevation: 0,
      state: {
        occupancy: 'empty' as Occupancy,
        height: 0,
      },
    };
  });

  buildNeighborGraph(cells, vertices);

  return { vertices, cells };
}

function snapWeld(
  vertices: Vec2[],
  faces: { vertIndices: number[]; chunkKey: string }[],
  eps: number,
): { vertices: Vec2[]; faces: { vertIndices: number[]; chunkKey: string }[] } {
  const parent = vertices.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      if (Math.hypot(vertices[i].x - vertices[j].x, vertices[i].y - vertices[j].y) < eps) {
        const a = find(i);
        const b = find(j);
        if (a !== b) parent[a] = b;
      }
    }
  }
  const groups = new Map<number, number[]>();
  for (let i = 0; i < vertices.length; i++) {
    const p = find(i);
    if (!groups.has(p)) groups.set(p, []);
    groups.get(p)!.push(i);
  }
  const nextVerts: Vec2[] = [];
  const remap = new Array<number>(vertices.length);
  for (const members of groups.values()) {
    let x = 0, y = 0;
    for (const i of members) {
      x += vertices[i].x;
      y += vertices[i].y;
    }
    const idx = nextVerts.length;
    nextVerts.push({ x: x / members.length, y: y / members.length });
    for (const i of members) remap[i] = idx;
  }
  const nextFaces: { vertIndices: number[]; chunkKey: string }[] = [];
  for (const face of faces) {
    const idx: number[] = [];
    for (const vi of face.vertIndices) {
      const r = remap[vi];
      if (idx[idx.length - 1] !== r) idx.push(r);
    }
    if (idx.length > 1 && idx[0] === idx[idx.length - 1]) idx.pop();
    if (idx.length >= 3) nextFaces.push({ vertIndices: idx, chunkKey: face.chunkKey });
  }
  return { vertices: nextVerts, faces: nextFaces };
}

function globalRelax(
  vertices: Vec2[],
  faces: { vertIndices: number[] }[],
  iterations: number,
  alpha: number,
): void {
  const adj = new Map<number, Set<number>>();
  const add = (a: number, b: number) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a)!.add(b);
  };
  for (const face of faces) {
    for (let i = 0; i < face.vertIndices.length; i++) {
      add(face.vertIndices[i], face.vertIndices[(i + 1) % face.vertIndices.length]);
    }
  }

  const border = findBorderVerts(vertices);

  for (let iter = 0; iter < iterations; iter++) {
    const next = vertices.map(v => ({ ...v }));
    for (let i = 0; i < vertices.length; i++) {
      if (border.has(i)) continue;
      const n = adj.get(i);
      if (!n || n.size === 0) continue;
      const avg = centroid([...n].map(vi => vertices[vi]));
      next[i] = vec2(
        vertices[i].x + (avg.x - vertices[i].x) * alpha,
        vertices[i].y + (avg.y - vertices[i].y) * alpha,
      );
    }
    for (let i = 0; i < vertices.length; i++) vertices[i] = next[i];
  }
}

function findBorderVerts(vertices: Vec2[]): Set<number> {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of vertices) {
    minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
  }
  const margin = 0.5;
  const border = new Set<number>();
  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];
    if (v.x - minX < margin || maxX - v.x < margin || v.y - minY < margin || maxY - v.y < margin) {
      border.add(i);
    }
  }
  return border;
}

function buildNeighborGraph(
  cells: { id: string; vertIndices: number[]; centroid?: Vec2; neighbors: string[] }[],
  vertices: Vec2[],
): void {
  const edgeToCell = new Map<string, string>();
  for (const cell of cells) {
    const v = cell.vertIndices;
    for (let i = 0; i < v.length; i++) {
      const a = v[i];
      const b = v[(i + 1) % v.length];
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      const existing = edgeToCell.get(key);
      if (existing && existing !== cell.id) {
        const other = cells.find(c => c.id === existing)!;
        if (!cell.neighbors.includes(existing)) cell.neighbors.push(existing);
        if (!other.neighbors.includes(cell.id)) other.neighbors.push(cell.id);
      } else {
        edgeToCell.set(key, cell.id);
      }
    }
  }

  for (let i = 0; i < cells.length; i++) {
    const a = cells[i];
    const ac = centroidOfIndices(a.vertIndices, vertices);
    for (let j = i + 1; j < cells.length; j++) {
      const b = cells[j];
      if (a.neighbors.includes(b.id)) continue;
      const bc = centroidOfIndices(b.vertIndices, vertices);
      const d = Math.hypot(ac.x - bc.x, ac.y - bc.y);
      if (d > 1.25) continue;
      let shared = 0;
      for (const ia of a.vertIndices) {
        const va = vertices[ia];
        for (const ib of b.vertIndices) {
          const vb = vertices[ib];
          if (Math.hypot(va.x - vb.x, va.y - vb.y) < 0.12) {
            shared++;
            break;
          }
        }
      }
      if (shared >= 2 || d < 0.7) {
        a.neighbors.push(b.id);
        b.neighbors.push(a.id);
      }
    }
  }
}

function centroidOfIndices(idx: number[], vertices: Vec2[]): Vec2 {
  let x = 0, y = 0;
  for (const i of idx) {
    x += vertices[i].x;
    y += vertices[i].y;
  }
  const n = Math.max(1, idx.length);
  return { x: x / n, y: y / n };
}

export { CHUNK_RADIUS };
