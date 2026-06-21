import type { Cell, CellId, CellState, GlobalGrid, Vec2 } from '../core/types';
import { generateWorldGrid } from './GridWelder';

export class GridGraph {
  readonly grid: GlobalGrid;
  readonly cellMap = new Map<CellId, Cell>();

  constructor(seed: number) {
    this.grid = generateWorldGrid(seed, 0);
    for (const cell of this.grid.cells) {
      this.cellMap.set(cell.id, cell);
    }
  }

  getCell(id: CellId): Cell | undefined {
    return this.cellMap.get(id);
  }

  getCellVerts(cell: Cell): Vec2[] {
    return cell.vertIndices.map(i => this.grid.vertices[i]);
  }

  findCellAt(world: Vec2): Cell | null {
    let best: Cell | null = null;
    let bestDist = Infinity;
    for (const cell of this.grid.cells) {
      if (cell.state.occupancy === 'water') continue;
      const d = Math.hypot(cell.centroid.x - world.x, cell.centroid.y - world.y);
      if (d < bestDist && pointInPolygon(world, this.getCellVerts(cell))) {
        bestDist = d;
        best = cell;
      }
    }
    if (best) return best;
    for (const cell of this.grid.cells) {
      const d = Math.hypot(cell.centroid.x - world.x, cell.centroid.y - world.y);
      if (d < bestDist) { bestDist = d; best = cell; }
    }
    return bestDist < 2 ? best : null;
  }

  setCellState(id: CellId, state: Partial<CellState>): void {
    const cell = this.cellMap.get(id);
    if (!cell) return;
    Object.assign(cell.state, state);
  }

  getBuildingCells(): Cell[] {
    return this.grid.cells.filter(c => c.state.occupancy === 'building');
  }

  getDirtyRing(centerId: CellId, radius = 2): CellId[] {
    const visited = new Set<CellId>();
    const queue: [CellId, number][] = [[centerId, 0]];
    const result: CellId[] = [];
    while (queue.length > 0) {
      const [id, depth] = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      result.push(id);
      if (depth >= radius) continue;
      const cell = this.cellMap.get(id);
      if (!cell) continue;
      for (const n of cell.neighbors) queue.push([n, depth + 1]);
    }
    return result;
  }
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
