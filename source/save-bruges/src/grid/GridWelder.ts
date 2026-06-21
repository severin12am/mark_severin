import type { Cell, GlobalGrid, Occupancy, Vec2 } from '../core/types';
import type { ChunkMesh } from './HexChunkGenerator';
import { axialToCartesian, generateHexChunk, HEX_SIZE, offsetChunk, relaxChunk } from './HexChunkGenerator';
import { centroid, vec2 } from '../core/rng';

const WELD_EPS = 0.08;
const CHUNK_RADIUS = 4;

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
    relaxChunk(mesh, 12, 0.42);
    mesh = offsetChunk(mesh, chunkOffset);
    rawChunks.push({ mesh, offset: chunkOffset, cq, cr });
  }

  return weldChunks(rawChunks, seed);
}

function weldChunks(
  chunks: { mesh: ChunkMesh; cq: number; cr: number }[],
  seed: number,
): GlobalGrid {
  const globalVerts: Vec2[] = [];
  const vertRemap = new Map<string, number>();

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
      const key = `${cq},${cr},${i}`;
      const welded = findOrCreate(mesh.vertices[i]);
      localRemap.set(i, welded);
      vertRemap.set(key, welded);
    }
    for (const face of mesh.faces) {
      allFaces.push({
        vertIndices: face.vertIndices.map(vi => localRemap.get(vi)!),
        chunkKey: `${cq},${cr}`,
      });
    }
  }

  globalRelax(globalVerts, allFaces, 4, 0.22);

  const cells: Cell[] = allFaces.map((face, idx) => {
    const worldVerts = face.vertIndices.map(vi => globalVerts[vi]);
    const c = centroid(worldVerts);
    return {
      id: `cell-${idx}`,
      vertIndices: face.vertIndices,
      centroid: c,
      neighbors: [] as string[],
      layer: 0,
      elevation: simplexElevation(c.x, c.y, seed) * 0.15,
      state: {
        occupancy: 'empty' as Occupancy,
        height: 0,
      },
    };
  });

  buildNeighborGraph(cells);

  return { vertices: globalVerts, cells };
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
  cells: { id: string; vertIndices: number[]; neighbors: string[] }[],
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
}

function simplexElevation(x: number, y: number, seed: number): number {
  return (
    Math.sin(x * 1.7 + seed * 0.01) * 0.3 +
    Math.cos(y * 2.1 + seed * 0.013) * 0.3 +
    Math.sin((x + y) * 1.3) * 0.2
  );
}

export { CHUNK_RADIUS };
