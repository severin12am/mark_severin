import type { Cell } from '../core/types';
import { hexToHsl, PALETTE } from '../color/Palette';
import type { ColorField } from '../color/ColorField';
import type { GridGraph } from '../grid/GridGraph';
import { cellRng } from '../core/rng';

const WALL_PALETTE = [
  hexToHsl(PALETTE[0]),
  hexToHsl(PALETTE[1]),
  hexToHsl(PALETTE[4]),
  hexToHsl(PALETTE[2]),
  hexToHsl(PALETTE[8]),
  hexToHsl(PALETTE[5]),
  hexToHsl(PALETTE[3]),
  hexToHsl(PALETTE[7]),
  hexToHsl(PALETTE[9]),
  hexToHsl(PALETTE[6]),
  hexToHsl(PALETTE[10]),
  hexToHsl('#ded2bd'),
];

// Weighted toward warm tile with slate as an accent, and spread across
// lightness so a street of red roofs still reads as many separate houses.
const ROOF_PALETTE = [
  hexToHsl('#c67d5c'),
  hexToHsl('#94513e'),
  hexToHsl('#d99b74'),
  hexToHsl('#8e9aa0'),
  hexToHsl('#a86a4e'),
  hexToHsl('#7d4536'),
  hexToHsl('#94806e'),
  hexToHsl('#e0ab84'),
  hexToHsl('#6f8288'),
  hexToHsl('#b8714f'),
  hexToHsl('#a3897a'),
];

function hillNoise(x: number, y: number): number {
  const n = (a: number, b: number) => {
    const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = n(ix, iy);
  const b = n(ix + 1, iy);
  const c = n(ix, iy + 1);
  const d = n(ix + 1, iy + 1);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function assignHill(
  graph: GridGraph,
  cx: number,
  cy: number,
  maxD: number,
  townR: number,
  centerId: string,
): void {
  const townDist = townR * maxD;
  const camAng = Math.atan2(13.8, 14.8);
  const hx = Math.cos(camAng);
  const hy = Math.sin(camAng);
  const keep = graph.getCell(centerId);
  const ox = keep?.centroid.x ?? cx;
  const oy = keep?.centroid.y ?? cy;

  // Quintic smoothstep: reaches 0 and 1 with zero slope, so the slopes ease off
  // instead of ending on a crease. `falloff` is 1 at the summit, 0 at the toe.
  const smoother = (t: number): number => {
    const c = t < 0 ? 0 : t > 1 ? 1 : t;
    return c * c * c * (c * (c * 6 - 15) + 10);
  };
  const falloff = (t: number): number => 1 - smoother(t);

  /**
   * Elongated domes along the axis running out of town. Each one dies to exactly
   * zero at its toe, so the massif blends into the plain from every direction
   * and never needs a stitched-on skirt. Footprint stays inside ~15 units of the
   * town centre so the terrain mesh can contain it whole.
   */
  const domes = [
    {
      along: townDist * 0.18,
      across: 0,
      height: 2.15,
      lenIn: townDist * 0.4,
      lenOut: townDist * 1.18,
      halfW: townDist * 0.34,
      flare: 0.16,
    },
    {
      along: townDist * 1.05,
      across: townDist * -0.34,
      height: 2.55,
      lenIn: townDist * 1.55,
      lenOut: townDist * 0.78,
      halfW: townDist * 0.8,
      flare: 0.42,
    },
    {
      along: townDist * 1.62,
      across: townDist * 0.48,
      height: 1.95,
      lenIn: townDist * 1.0,
      lenOut: townDist * 0.5,
      halfW: townDist * 0.62,
      flare: 0.3,
    },
  ];

  const domeAt = (
    d: (typeof domes)[number],
    x: number,
    y: number,
  ): number => {
    const px = ox + hx * d.along - hy * d.across;
    const pz = oy + hy * d.along + hx * d.across;
    const dx = x - px;
    const dz = y - pz;
    const u = dx * hx + dz * hy;
    const v = -dx * hy + dz * hx;
    const un = u / (u < 0 ? d.lenIn : d.lenOut);
    const w = d.halfW * (1 + d.flare * Math.max(0, un));
    const vn = v / w;
    const r = Math.hypot(un, vn);
    return r >= 1 ? 0 : d.height * falloff(r);
  };

  const hillAt = (x: number, y: number): number => {
    let h = 0;
    for (const d of domes) h = Math.max(h, domeAt(d, x, y));
    if (h <= 0) return 0;

    // Keep sits on the mound. Flatten only past it, toward the canal / anti-hill.
    const along = (x - ox) * hx + (y - oy) * hy;
    if (along < -townDist * 0.1) {
      h *= 1 - smoother((-along - townDist * 0.1) / (townDist * 0.48));
    }
    if (h <= 0.002) return 0;

    const n = hillNoise(x * 0.26 + 4.2, y * 0.26) * 0.68
      + hillNoise(x * 0.62, y * 0.62) * 0.32;
    h *= 0.88 + n * 0.24;
    return h <= 0.002 ? 0 : h;
  };

  graph.hillAt = hillAt;
  for (const c of graph.grid.cells) {
    if (c.state.occupancy === 'water') {
      c.elevation = 0;
      continue;
    }
    c.elevation = hillAt(c.centroid.x, c.centroid.y);
  }
}

function assignDefenseLines(
  graph: GridGraph,
  cx: number,
  cy: number,
  maxD: number,
  townR: number,
): void {
  const cells = graph.grid.cells;
  for (const c of cells) delete c.state.defenseLine;
  const dist = new Map<string, number>();
  const q: string[] = [];
  for (const c of cells) {
    if (c.state.occupancy !== 'building') continue;
    dist.set(c.id, 0);
    q.push(c.id);
  }
  while (q.length) {
    const id = q.shift()!;
    const d = dist.get(id) ?? 0;
    if (d >= 3) continue;
    const cell = graph.getCell(id);
    if (!cell) continue;
    for (const nid of cell.neighbors) {
      if (dist.has(nid)) continue;
      const n = graph.getCell(nid);
      if (!n || n.state.occupancy === 'water' || n.state.occupancy === 'building') continue;
      if (d === 0 && radOf(n, cx, cy, maxD) < townR * 0.7) continue;
      dist.set(nid, d + 1);
      q.push(nid);
    }
  }
  for (const [id, d] of dist) {
    if (d < 1 || d > 3) continue;
    const c = graph.getCell(id);
    if (c) c.state.defenseLine = d as 1 | 2 | 3;
  }
}

function radOf(c: Cell, cx: number, cy: number, maxD: number): number {
  return Math.hypot(c.centroid.x - cx, c.centroid.y - cy) / maxD;
}

function walkPath(
  graph: GridGraph,
  start: Cell,
  goal: Cell,
  avoid: (c: Cell) => boolean,
): Cell[] {
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const heap: { id: string; d: number }[] = [{ id: start.id, d: 0 }];
  dist.set(start.id, 0);
  while (heap.length) {
    heap.sort((a, b) => a.d - b.d);
    const cur = heap.shift()!;
    if (cur.id === goal.id) break;
    const known = dist.get(cur.id);
    if (known != null && cur.d > known) continue;
    const cell = graph.getCell(cur.id);
    if (!cell) continue;
    for (const nid of cell.neighbors) {
      const n = graph.getCell(nid);
      if (!n || avoid(n)) continue;
      const step = Math.hypot(n.centroid.x - cell.centroid.x, n.centroid.y - cell.centroid.y);
      const nd = cur.d + step;
      if (nd < (dist.get(nid) ?? Infinity)) {
        dist.set(nid, nd);
        prev.set(nid, cur.id);
        heap.push({ id: nid, d: nd });
      }
    }
  }
  if (!prev.has(goal.id) && goal.id !== start.id) return [start];
  const path: Cell[] = [];
  let walk: string | undefined = goal.id;
  while (walk) {
    const cell = graph.getCell(walk);
    if (cell) path.push(cell);
    walk = prev.get(walk);
  }
  path.reverse();
  return path.length ? path : [start];
}

function pickExtreme(pool: Cell[], score: (c: Cell) => number): Cell | null {
  if (!pool.length) return null;
  return pool.reduce((best, c) => (score(c) < score(best) ? c : best));
}

export function buildDemoCity(graph: GridGraph, colors: ColorField): string {
  const cells = graph.grid.cells;
  for (const cell of cells) {
    cell.state.occupancy = 'empty';
    cell.state.height = 0;
    cell.state.isTower = false;
    cell.state.buildingGroup = undefined;
    cell.elevation = 0;
    delete cell.state.seedColor;
    delete cell.state.seedRoofColor;
    delete cell.state.ground;
    delete cell.state.defense;
    delete cell.state.defenseLine;
    delete cell.state.wound;
  }

  let cx = 0;
  let cy = 0;
  for (const c of cells) {
    cx += c.centroid.x;
    cy += c.centroid.y;
  }
  cx /= cells.length;
  cy /= cells.length;

  let centerCell = cells[0];
  let bestDist = Infinity;
  const maxD = Math.max(...cells.map(c => Math.hypot(c.centroid.x - cx, c.centroid.y - cy)), 0.001);
  for (const cell of cells) {
    const d = Math.hypot(cell.centroid.x - cx, cell.centroid.y - cy);
    if (d < bestDist) {
      bestDist = d;
      centerCell = cell;
    }
  }

  const townR = 0.64;
  assignHill(graph, cx, cy, maxD, townR, centerCell.id);

  const keepId = centerCell.id;
  const camAng = Math.atan2(13.8, 14.8);
  const hx = Math.cos(camAng);
  const hy = Math.sin(camAng);
  const alongHill = (c: Cell) => (
    (c.centroid.x - centerCell.centroid.x) * hx
    + (c.centroid.y - centerCell.centroid.y) * hy
  );
  const inTown = (c: Cell) => {
    const t = radOf(c, cx, cy, maxD);
    const extra = alongHill(c) < townR * maxD * 0.02 ? 0.04 : 0;
    return t < townR + extra;
  };

  const lowBand = cells.filter(c => {
    const t = radOf(c, cx, cy, maxD);
    return t > 0.3 && t < townR - 0.08 && alongHill(c) < -townR * maxD * 0.06 && c.id !== keepId;
  });
  if (lowBand.length >= 4) {
    const west = pickExtreme(lowBand, c => c.centroid.x);
    const east = pickExtreme(lowBand, c => -c.centroid.x);
    if (west && east) {
      const canalPath = walkPath(graph, west, east, c => (
        c.id === keepId
        || radOf(c, cx, cy, maxD) < 0.26
        || radOf(c, cx, cy, maxD) > townR - 0.04
        || alongHill(c) > townR * maxD * 0.02
      ));
      for (const cell of canalPath) {
        if (cell.id === keepId) continue;
        const t = radOf(cell, cx, cy, maxD);
        if (t < 0.26 || t > townR - 0.06) continue;
        cell.state.occupancy = 'water';
        cell.state.height = 0;
        cell.elevation = 0;
      }
      const basin = canalPath
        .filter(c => c.state.occupancy === 'water')
        .sort((a, b) => Math.hypot(a.centroid.x - cx, a.centroid.y - cy) - Math.hypot(b.centroid.x - cx, b.centroid.y - cy))[0];
      if (basin) {
        let widen: Cell | undefined;
        let best = Infinity;
        for (const nid of basin.neighbors) {
          const n = graph.getCell(nid);
          if (!n || n.id === keepId || n.state.occupancy === 'water') continue;
          if (alongHill(n) >= alongHill(basin) + 0.04) continue;
          if (radOf(n, cx, cy, maxD) < 0.28) continue;
          const d = Math.hypot(n.centroid.x - cx, n.centroid.y - cy);
          if (d < best) {
            best = d;
            widen = n;
          }
        }
        if (widen) {
          widen.state.occupancy = 'water';
          widen.state.height = 0;
          widen.elevation = 0;
        }
      }
    }
  }

  for (const cell of cells) {
    if (cell.state.occupancy === 'water') continue;
    if (cell.id === keepId || inTown(cell)) cell.state.occupancy = 'building';
    else cell.state.occupancy = 'empty';
  }

  const take = (cell: Cell, ground: 'road' | 'plaza' | 'garden') => {
    if (cell.id === keepId || cell.state.occupancy === 'water') return;
    if (ground !== 'road' && ground !== 'garden' && (cell.elevation || 0) > 1.8) return;
    cell.state.occupancy = 'empty';
    cell.state.height = 0;
    cell.state.ground = ground;
  };

  for (const cell of cells) {
    if (cell.state.occupancy !== 'water') continue;
    const neigh = cell.neighbors
      .map(id => graph.getCell(id))
      .filter((n): n is Cell => !!n && n.id !== keepId && n.state.occupancy !== 'water' && inTown(n));
    neigh.sort((a, b) => alongHill(a) - alongHill(b));
    let placed = 0;
    for (const n of neigh) {
      if (radOf(n, cx, cy, maxD) < 0.32) continue;
      if ((n.elevation || 0) > 0.4) continue;
      take(n, 'plaza');
      placed++;
      if (placed >= 1) break;
    }
  }
  const extraPlaza = cells.filter(c => c.state.ground === 'plaza');
  if (extraPlaza.length > 5) {
    for (const c of extraPlaza.slice(5)) {
      c.state.occupancy = 'building';
      c.state.height = 1;
      delete c.state.ground;
    }
  }

  const quayCells = cells.filter(c => (
    c.state.ground === 'plaza' && c.neighbors.some(id => graph.getCell(id)?.state.occupancy === 'water')
  ));
  const plazaGoal = quayCells[0] || null;

  const edgePool = cells.filter(c => {
    const t = radOf(c, cx, cy, maxD);
    return t > townR * 0.82 && t < townR + 0.04 && c.state.occupancy !== 'water' && c.id !== keepId;
  });
  if (plazaGoal && edgePool.length) {
    const lowEdge = edgePool.filter(c => alongHill(c) < townR * maxD * -0.02);
    const gate = pickExtreme(lowEdge.length ? lowEdge : edgePool, c => c.centroid.x) || edgePool[0];
    const toPlaza = walkPath(graph, gate, plazaGoal, c => c.id === keepId || c.state.occupancy === 'water');
    let laid = 0;
    for (const cell of toPlaza) {
      if (cell.state.ground === 'plaza') continue;
      if (radOf(cell, cx, cy, maxD) < 0.3) continue;
      take(cell, 'road');
      laid++;
      if (laid >= 4) break;
    }
  }

  const canalGardens = cells.filter(c => {
    if (!inTown(c) || c.id === keepId || c.state.occupancy === 'water' || c.state.ground) return false;
    const waterN = c.neighbors.some(id => graph.getCell(id)?.state.occupancy === 'water');
    const quayN = c.neighbors.some(id => graph.getCell(id)?.state.ground === 'plaza');
    return !waterN && quayN && alongHill(c) < 0;
  });
  for (const cell of canalGardens.slice(0, 2)) take(cell, 'garden');

  for (const c of cells) {
    if (c.id === keepId || c.state.occupancy === 'water') continue;
    if (!inTown(c)) continue;
    if (alongHill(c) > townR * maxD * 0.08) continue;
    if (c.state.occupancy === 'building') continue;
    if (c.state.ground === 'plaza' && c.neighbors.some(id => graph.getCell(id)?.state.occupancy === 'water')) continue;
    if (c.state.ground === 'garden' || c.state.ground === 'road') continue;
    c.state.occupancy = 'building';
    c.state.height = 1;
    delete c.state.ground;
  }

  const kx = centerCell.centroid.x;
  const ky = centerCell.centroid.y;
  const keepN = keepId
    ? (graph.getCell(keepId)?.neighbors.map(id => graph.getCell(id)).filter((n): n is Cell => !!n) ?? [])
    : [];
  const keepNIds = new Set(keepN.map(n => n.id));
  const approach = pickExtreme(
    keepN.filter(n => n.state.occupancy !== 'water'),
    n => alongHill(n),
  );
  if (approach) take(approach, 'road');

  const ring = cells.filter(c => {
    if (c.id === keepId || !inTown(c) || c.state.occupancy === 'water') return false;
    if (keepNIds.has(c.id)) return false;
    return c.neighbors.some(id => keepNIds.has(id));
  });
  ring.forEach((c, i) => {
    if (i % 2 === 0) take(c, 'road');
  });

  const spokeStarts = [
    ...ring.filter(c => c.state.ground === 'road'),
    ...keepN.filter(n => n.state.ground === 'road'),
  ];
  const spokes: [number, number][] = [
    [1, 0.1], [-0.9, 0.15], [0.2, 0.95], [-0.25, -1],
  ];
  for (const [dx, dy] of spokes) {
    const goal = pickExtreme(
      cells.filter(c => inTown(c) && c.id !== keepId && c.state.occupancy !== 'water'),
      c => -((c.centroid.x - kx) * dx + (c.centroid.y - ky) * dy),
    );
    const start = pickExtreme(
      spokeStarts.length ? spokeStarts : keepN,
      c => -((c.centroid.x - kx) * dx + (c.centroid.y - ky) * dy),
    );
    if (!goal || !start) continue;
    const path = walkPath(graph, start, goal, c => c.id === keepId || c.state.occupancy === 'water');
    let laid = 0;
    for (const cell of path) {
      if (cell.state.ground === 'plaza') continue;
      take(cell, 'road');
      laid++;
      if (laid >= 5) break;
    }
  }
  let alleys = 0;
  for (const c of cells) {
    if (alleys >= 8) break;
    if (c.id === keepId || c.state.occupancy !== 'building' || !inTown(c)) continue;
    const access = c.neighbors.some(id => {
      const n = graph.getCell(id);
      return n && (n.state.ground === 'road' || n.state.ground === 'plaza');
    });
    if (access) continue;
    const bridge = c.neighbors
      .map(id => graph.getCell(id))
      .filter((n): n is Cell => !!n && n.id !== keepId && n.state.occupancy === 'building')
      .find(n => n.neighbors.some(id => {
        const g = graph.getCell(id);
        return g && (g.state.ground === 'road' || g.state.ground === 'plaza');
      }));
    if (bridge) {
      take(bridge, 'road');
      alleys++;
    }
  }

  const center = graph.getCell(keepId)!;
  center.state.occupancy = 'building';
  center.state.isTower = true;
  center.state.height = 3.5;
  center.state.ground = undefined;

  const buildingCells = cells.filter(c => c.state.occupancy === 'building');
  for (const cell of buildingCells) {
    const t = radOf(cell, cx, cy, maxD);
    const waterAdj = cell.neighbors.some(id => graph.getCell(id)?.state.occupancy === 'water');
    if (cell.id === keepId) {
      cell.state.height = 3.5;
      cell.state.isTower = true;
      cell.state.buildingGroup = 0;
    } else if (waterAdj) {
      cell.state.height = 2;
      cell.state.buildingGroup = 1;
    } else if (t < 0.28) {
      cell.state.height = 2.5;
      cell.state.buildingGroup = 2;
    } else if (t < 0.48) {
      cell.state.height = 2;
      cell.state.buildingGroup = 3;
    } else {
      cell.state.height = 1;
      cell.state.buildingGroup = 4;
    }
    cell.state.isTower = cell.id === keepId;
    const rng = cellRng(cell.id, 8);
    const gid = cell.state.buildingGroup ?? 0;
    const wall = cell.state.isTower
      ? hexToHsl('#efe6d6')
      : { ...WALL_PALETTE[gid % WALL_PALETTE.length] };
    wall.h += (rng.next() - 0.5) * 10;
    wall.s = Math.min(0.48, Math.max(0.12, wall.s + (rng.next() - 0.5) * 0.06));
    wall.l = Math.min(0.82, Math.max(0.6, wall.l + (rng.next() - 0.5) * 0.05));
    const roof = { ...ROOF_PALETTE[(gid * 3) % ROOF_PALETTE.length] };
    roof.h += (rng.next() - 0.5) * 6;
    cell.state.seedColor = { ...wall };
    cell.state.seedRoofColor = roof;
    const maxHp = cell.state.isTower ? 260 : 34 + Math.round((cell.state.height || 1) * 14);
    cell.state.wound = {
      hp: maxHp,
      maxHp,
      wet: false,
      burnt: false,
      burning: false,
      ruined: false,
    };
    colors.seed(cell.id, wall, roof);
  }

  assignHill(graph, cx, cy, maxD, townR, keepId);
  assignDefenseLines(graph, cx, cy, maxD, townR);
  colors.rebuildFromGrid(graph.grid);
  return keepId;
}
