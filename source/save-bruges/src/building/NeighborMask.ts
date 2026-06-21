import type { Cell, EdgeProfile } from '../core/types';
import type { GridGraph } from '../grid/GridGraph';

export function buildNeighborMask(cell: Cell, graph: GridGraph): number {
  let mask = 0;
  for (const nid of cell.neighbors) {
    const n = graph.getCell(nid);
    if (!n || n.state.occupancy !== 'building') continue;
    const dx = n.centroid.x - cell.centroid.x;
    const dy = n.centroid.y - cell.centroid.y;
    const angle = Math.atan2(dy, dx);
    const octant = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8;
    mask |= 1 << octant;
  }
  return mask;
}

export function classifyEdges(cell: Cell, graph: GridGraph): EdgeProfile {
  const openDirs = getOpenDirections(cell, graph);
  const n = !openDirs.includes('n');
  const e = !openDirs.includes('e');
  const s = !openDirs.includes('s');
  const w = !openDirs.includes('w');
  const filled = [n, e, s, w].filter(Boolean).length;

  let cornerType: string | null = null;
  let isCorner = false;
  if (filled === 2) {
    if (n && e) { isCorner = true; cornerType = 'ne'; }
    else if (e && s) { isCorner = true; cornerType = 'se'; }
    else if (s && w) { isCorner = true; cornerType = 'sw'; }
    else if (w && n) { isCorner = true; cornerType = 'nw'; }
  }

  const exposedCount = openDirs.length;

  return {
    northOpen: openDirs.includes('n'),
    eastOpen: openDirs.includes('e'),
    southOpen: openDirs.includes('s'),
    westOpen: openDirs.includes('w'),
    exposedCount,
    isEnclosed: exposedCount === 0,
    isCorner,
    cornerType,
  };
}

function getOpenDirections(cell: Cell, graph: GridGraph): string[] {
  const dirs: string[] = [];
  const checks: { name: string; dx: number; dy: number }[] = [
    { name: 'e', dx: 1, dy: 0 },
    { name: 'ne', dx: 0.7, dy: -0.7 },
    { name: 'n', dx: 0, dy: -1 },
    { name: 'nw', dx: -0.7, dy: -0.7 },
    { name: 'w', dx: -1, dy: 0 },
    { name: 'sw', dx: -0.7, dy: 0.7 },
    { name: 's', dx: 0, dy: 1 },
    { name: 'se', dx: 0.7, dy: 0.7 },
  ];

  for (const { name, dx, dy } of checks) {
    const hasBuilding = cell.neighbors.some(nid => {
      const n = graph.getCell(nid);
      if (!n || n.state.occupancy !== 'building') return false;
      const nx = n.centroid.x - cell.centroid.x;
      const ny = n.centroid.y - cell.centroid.y;
      const len = Math.hypot(nx, ny);
      if (len < 0.01) return false;
      const dot = (nx / len) * dx + (ny / len) * dy;
      return dot > 0.55;
    });
    if (!hasBuilding && ['n', 'e', 's', 'w'].includes(name)) {
      dirs.push(name);
    }
  }
  return dirs;
}

export function analyzeFlatArea(startId: string, graph: GridGraph) {
  const start = graph.getCell(startId);
  if (!start) return { size: 0, cells: [] as string[], perimeter: [] as string[] };

  const targetHeight = start.state.height;
  const visited = new Set<string>();
  const queue = [startId];
  const cells: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    const c = graph.getCell(id);
    if (!c || c.state.occupancy !== 'building' || c.state.height !== targetHeight) continue;
    cells.push(id);
    for (const n of c.neighbors) {
      if (!visited.has(n)) queue.push(n);
    }
  }

  const cellSet = new Set(cells);
  const perimeter = cells.filter(id => {
    const c = graph.getCell(id)!;
    return c.neighbors.some(n => !cellSet.has(n));
  });

  return { size: cells.length, cells, perimeter };
}

export function isExposedCell(cell: Cell, graph: GridGraph): boolean {
  return cell.neighbors.some(nid => {
    const n = graph.getCell(nid);
    return !n || n.state.occupancy !== 'building';
  });
}
