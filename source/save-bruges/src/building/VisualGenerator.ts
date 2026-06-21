import type { Cell, CellId, GlobalGrid, HSL, Vec2 } from '../core/types';
import { cellRng } from '../core/rng';
import { hslToHex, roleColor, WATER_COLOR } from '../color/Palette';
import type { ColorField } from '../color/ColorField';
import type { GridGraph } from '../grid/GridGraph';
import type { IsometricProjector } from '../grid/IsometricProjector';

export interface BuildingStyle {
  wallColor: string;
  roofColor: string;
  trimColor: string;
  roofType: 'flat';
  isTower: boolean;
  depthKey: number;
}

export interface SceneDrawItem {
  kind: 'ground' | 'building';
  depthKey: number;
  cellId: CellId;
  groundVerts?: Vec2[];
  groundFill?: string;
  groundIsWater?: boolean;
  building?: {
    topVerts: Vec2[];
    walls: Vec2[][];
    style: BuildingStyle;
  };
}

export class VisualGenerator {
  invalidate(cellIds: CellId[]): void { void cellIds; }
  invalidateAll(): void {}
  rebuild(_cellIds: CellId[], _graph: GridGraph, _colors: ColorField): void {}

  generateSceneItems(
    graph: GridGraph,
    projector: IsometricProjector,
    colors: ColorField,
    selectedId: CellId | null,
  ): SceneDrawItem[] {
    const items: SceneDrawItem[] = [];
    const { grid } = graph;

    for (const cell of grid.cells) {
      items.push(this.groundItem(cell, grid, projector, selectedId));
    }

    for (const cell of graph.getBuildingCells()) {
      const built = this.buildingItem(cell, graph, projector, colors);
      if (built) items.push(built);
    }

    items.sort((a, b) => a.depthKey - b.depthKey);
    return items;
  }

  private groundItem(
    cell: Cell,
    grid: GlobalGrid,
    projector: IsometricProjector,
    selectedId: CellId | null,
  ): SceneDrawItem {
    const z = cell.layer * projector.config.layerStep + cell.elevation;
    const verts = cell.vertIndices.map(i => {
      const v = grid.vertices[i];
      return projector.project({ x: v.x, y: v.y, z });
    });

    const isWater = cell.state.occupancy === 'water';
    let fill = isWater ? WATER_COLOR : '#e2f0cb';
    if (cell.id === selectedId) fill = '#fff5ba';

    return {
      kind: 'ground',
      cellId: cell.id,
      depthKey: projector.cellDepth(cell.centroid, cell.layer, cell.elevation) - 100,
      groundVerts: verts,
      groundFill: fill,
      groundIsWater: isWater,
    };
  }

  private buildingItem(
    cell: Cell,
    graph: GridGraph,
    projector: IsometricProjector,
    colors: ColorField,
  ): SceneDrawItem | null {
    const rng = cellRng(cell.id);
    const wallHsl = colors.resolve(cell.id);
    const roofHsl = colors.resolveRoof(cell.id);
    const wallColor = roleColor(wallHsl, 'wall', rng.int(100));
    const roofColor = hslToHex(roofHsl.h, roofHsl.s, roofHsl.l);

    const baseZ = cell.layer * projector.config.layerStep + cell.elevation;
    const tier = cell.state.height || 1;
    let height = projector.config.buildingHeight * (0.75 + tier * 0.28);
    if (cell.state.isTower) height *= 1.35;

    const worldVerts = graph.getCellVerts(cell);
    const box = fitIsoBox(worldVerts, cell.centroid, hasSameHeightNeighbor(cell, graph));

    const topVerts = box.map(v => projector.project({ x: v.x, y: v.y, z: baseZ + height }));
    const walls = collectExposedWalls(cell, graph, box, baseZ, height, projector);

    return {
      kind: 'building',
      cellId: cell.id,
      depthKey: projector.cellDepth(cell.centroid, cell.layer, baseZ + height) + 10,
      building: {
        topVerts,
        walls,
        style: {
          wallColor,
          roofColor,
          trimColor: '#ffffff',
          roofType: 'flat',
          isTower: !!cell.state.isTower,
          depthKey: projector.cellDepth(cell.centroid, cell.layer, baseZ + height),
        },
      },
    };
  }
}

function hasSameHeightNeighbor(cell: Cell, graph: GridGraph): boolean {
  return cell.neighbors.some(nid => {
    const n = graph.getCell(nid);
    return n?.state.occupancy === 'building' && n.state.height === cell.state.height;
  });
}

function collectExposedWalls(
  cell: Cell,
  graph: GridGraph,
  box: Vec2[],
  baseZ: number,
  height: number,
  projector: IsometricProjector,
): Vec2[][] {
  const baseVerts = box.map(v => projector.project({ x: v.x, y: v.y, z: baseZ }));
  const topVerts = box.map(v => projector.project({ x: v.x, y: v.y, z: baseZ + height }));

  const wallDefs = [
    { indices: [0, 1], outward: { x: -1, y: 1 } },
    { indices: [1, 2], outward: { x: -1, y: -1 } },
    { indices: [2, 3], outward: { x: 1, y: -1 } },
    { indices: [3, 0], outward: { x: 1, y: 1 } },
  ];

  const walls: Vec2[][] = [];
  for (const def of wallDefs) {
    if (!isWallExposed(cell, graph, def.outward)) continue;
    const [a, b] = def.indices;
    walls.push([baseVerts[a], baseVerts[b], topVerts[b], topVerts[a]]);
  }
  return walls;
}

function isWallExposed(cell: Cell, graph: GridGraph, outward: Vec2): boolean {
  for (const nid of cell.neighbors) {
    const n = graph.getCell(nid);
    if (!n || n.state.occupancy !== 'building') continue;

    if (n.state.height === cell.state.height) {
      const dir = {
        x: n.centroid.x - cell.centroid.x,
        y: n.centroid.y - cell.centroid.y,
      };
      const len = Math.hypot(dir.x, dir.y);
      if (len < 0.01) continue;
      const dot = (dir.x / len) * outward.x + (dir.y / len) * outward.y;
      if (dot > 0.2) return false;
    } else {
      const dir = {
        x: n.centroid.x - cell.centroid.x,
        y: n.centroid.y - cell.centroid.y,
      };
      const len = Math.hypot(dir.x, dir.y);
      if (len < 0.01) continue;
      const dot = (dir.x / len) * outward.x + (dir.y / len) * outward.y;
      if (dot > 0.35) return false;
    }
  }
  return true;
}

function fitIsoBox(worldVerts: Vec2[], centroidPt: Vec2, mergeWithNeighbor: boolean): Vec2[] {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of worldVerts) {
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
  }

  const scale = mergeWithNeighbor ? 0.96 : 0.88;
  const w = Math.max(0.7, (maxX - minX) * scale);
  const d = Math.max(0.7, (maxY - minY) * scale);
  const cx = centroidPt.x;
  const cy = centroidPt.y;

  return [
    { x: cx - w * 0.5, y: cy - d * 0.5 },
    { x: cx - w * 0.5, y: cy + d * 0.5 },
    { x: cx + w * 0.5, y: cy + d * 0.5 },
    { x: cx + w * 0.5, y: cy - d * 0.5 },
  ];
}

export type { HSL };
