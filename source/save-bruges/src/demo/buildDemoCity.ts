import type { Cell, CellId } from '../core/types';
import { hexToHsl, PALETTE, complementaryRoofColor } from '../color/Palette';
import type { ColorField } from '../color/ColorField';
import type { GridGraph } from '../grid/GridGraph';
import { cellRng } from '../core/rng';

const HEIGHT_TIERS = [1, 1, 1, 1.5, 1.5, 2, 2, 2.5, 3];

function bfsDepths(graph: GridGraph, startId: CellId): Map<CellId, number> {
  const depths = new Map<CellId, number>();
  const queue: [CellId, number][] = [[startId, 0]];
  while (queue.length > 0) {
    const [id, d] = queue.shift()!;
    if (depths.has(id)) continue;
    depths.set(id, d);
    const cell = graph.getCell(id);
    if (!cell) continue;
    for (const n of cell.neighbors) {
      if (!depths.has(n)) queue.push([n, d + 1]);
    }
  }
  return depths;
}

function isWaterCell(depth: number): boolean {
  if (depth <= 0) return false;
  if (depth >= 2 && depth <= 4) return true;
  if (depth >= 6 && depth <= 8) return true;
  if (depth >= 11 && depth <= 12) return true;
  if (depth % 5 === 0 && depth <= 20) return true;
  return false;
}

function assignHeightBlocks(graph: GridGraph, buildingCells: Cell[]): void {
  const unvisited = new Set(buildingCells.map(c => c.id));
  let groupId = 0;

  while (unvisited.size > 0) {
    const seedId = unvisited.values().next().value as CellId;
    unvisited.delete(seedId);

    const tier = HEIGHT_TIERS[groupId % HEIGHT_TIERS.length];
    const rng = cellRng(`block-${groupId}`);
    const targetSize = 2 + rng.int(5);

    const block: CellId[] = [seedId];
    const queue: CellId[] = [seedId];

    while (queue.length > 0 && block.length < targetSize) {
      const id = queue.shift()!;
      const cell = graph.getCell(id)!;
      for (const nid of cell.neighbors) {
        if (!unvisited.has(nid)) continue;
        unvisited.delete(nid);
        block.push(nid);
        queue.push(nid);
      }
    }

    for (const id of block) {
      const cell = graph.getCell(id)!;
      cell.state.height = tier;
      cell.state.buildingGroup = groupId;
    }
    groupId++;
  }
}

function pickWallColor(groupId: number): ReturnType<typeof hexToHsl> {
  const palette = [
    hexToHsl(PALETTE[0]),
    hexToHsl(PALETTE[1]),
    hexToHsl(PALETTE[2]),
    hexToHsl(PALETTE[4]),
    hexToHsl(PALETTE[6]),
    hexToHsl(PALETTE[7]),
  ];
  return palette[groupId % palette.length];
}

export function buildDemoCity(graph: GridGraph, colors: ColorField): string {
  const cells = graph.grid.cells;

  for (const cell of cells) {
    cell.state.occupancy = 'empty';
    cell.state.height = 0;
    cell.state.isTower = false;
    cell.state.buildingGroup = undefined;
    delete cell.state.seedColor;
    delete cell.state.seedRoofColor;
  }

  let centerCell = cells[0];
  let bestDist = Infinity;
  let cx = 0;
  let cy = 0;
  for (const c of cells) { cx += c.centroid.x; cy += c.centroid.y; }
  cx /= cells.length;
  cy /= cells.length;

  for (const cell of cells) {
    const d = Math.hypot(cell.centroid.x - cx, cell.centroid.y - cy);
    if (d < bestDist) { bestDist = d; centerCell = cell; }
  }

  const depths = bfsDepths(graph, centerCell.id);

  for (const cell of cells) {
    const depth = depths.get(cell.id) ?? 99;
    if (isWaterCell(depth)) {
      cell.state.occupancy = 'water';
      cell.elevation = -0.12;
    } else {
      cell.elevation = simplexBump(cell.centroid.x, cell.centroid.y) * 0.04;
    }
  }

  const buildingCells: Cell[] = [];
  for (const cell of cells) {
    if (cell.state.occupancy === 'water') continue;
    cell.state.occupancy = 'building';
    buildingCells.push(cell);
  }

  assignHeightBlocks(graph, buildingCells);

  const center = graph.getCell(centerCell.id)!;
  center.state.isTower = true;
  center.state.height = 3.5;

  for (const cell of buildingCells) {
    const gid = cell.state.buildingGroup ?? 0;
    const wall = pickWallColor(gid);
    cell.state.seedColor = { ...wall };
    cell.state.seedRoofColor = complementaryRoofColor(wall);
    colors.seed(cell.id, wall, cell.state.seedRoofColor);
  }

  colors.rebuildFromGrid(graph.grid);
  return centerCell.id;
}

function simplexBump(x: number, y: number): number {
  return Math.sin(x * 2.1) * 0.3 + Math.cos(y * 1.8) * 0.3;
}
