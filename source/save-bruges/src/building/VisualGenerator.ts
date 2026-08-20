import type { Cell, CellId, GlobalGrid, HSL, Vec2 } from '../core/types';
import { cellRng } from '../core/rng';
import { hslToHex, roleColor, WATER_COLOR } from '../color/Palette';
import type { ColorField } from '../color/ColorField';
import type { GridGraph } from '../grid/GridGraph';
import type { IsometricProjector } from '../grid/IsometricProjector';
import { classifyEdges } from './NeighborMask';

export type RoofKind = 'flat' | 'gable' | 'stepped' | 'spire';
export type GroundKind = 'grass' | 'plaza' | 'park' | 'quay' | 'water';

export interface BuildingStyle {
  wallColor: string;
  roofColor: string;
  trimColor: string;
  roofType: RoofKind;
  isTower: boolean;
  depthKey: number;
}

export interface WindowSpec {
  wallIndex: number;
  u: number;
  v: number;
  wu: number;
  hv: number;
}

export interface SceneDrawItem {
  kind: 'ground' | 'building' | 'tree';
  depthKey: number;
  cellId: CellId;
  groundVerts?: Vec2[];
  groundFill?: string;
  groundIsWater?: boolean;
  groundKind?: GroundKind;
  waterAdjacent?: boolean;
  tree?: { x: number; y: number; scale: number; seed: number };
  building?: {
    topVerts: Vec2[];
    walls: Vec2[][];
    style: BuildingStyle;
    roofKind: RoofKind;
    chimney: boolean;
    windows: WindowSpec[];
    seed: number;
    height: number;
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
      items.push(this.groundItem(cell, grid, graph, projector, selectedId));
      const tree = this.treeItem(cell, graph, projector);
      if (tree) items.push(tree);
    }

    for (const cell of graph.getBuildingCells()) {
      const built = this.buildingItem(cell, graph, projector, colors);
      if (built) items.push(built);
    }

    items.sort((a, b) => a.depthKey - b.depthKey);
    return items;
  }

  private waterNeighbor(cell: Cell, graph: GridGraph): boolean {
    return cell.neighbors.some(nid => graph.getCell(nid)?.state.occupancy === 'water');
  }

  private groundItem(
    cell: Cell,
    grid: GlobalGrid,
    graph: GridGraph,
    projector: IsometricProjector,
    selectedId: CellId | null,
  ): SceneDrawItem {
    const z = cell.layer * projector.config.layerStep + cell.elevation;
    const verts = cell.vertIndices.map(i => {
      const v = grid.vertices[i];
      return projector.project({ x: v.x, y: v.y, z });
    });

    const rng = cellRng(cell.id, 3);
    const isWater = cell.state.occupancy === 'water';
    const waterAdj = !isWater && this.waterNeighbor(cell, graph);
    let kind: GroundKind = 'grass';
    let fill = '#d7e8c3';

    if (isWater) {
      kind = 'water';
      fill = WATER_COLOR;
    } else if (waterAdj) {
      kind = 'quay';
      fill = '#cfc0ae';
    } else if (cell.state.occupancy === 'empty' && rng.chance(0.28)) {
      kind = 'park';
      fill = '#c5ddb0';
    } else if (cell.state.occupancy === 'empty' && rng.chance(0.45)) {
      kind = 'plaza';
      fill = '#e6d5c3';
    }

    if (cell.id === selectedId) fill = '#fff1b8';

    return {
      kind: 'ground',
      cellId: cell.id,
      depthKey: projector.cellDepth(cell.centroid, cell.layer, cell.elevation) - 100,
      groundVerts: verts,
      groundFill: fill,
      groundIsWater: isWater,
      groundKind: kind,
      waterAdjacent: waterAdj,
    };
  }

  private treeItem(
    cell: Cell,
    graph: GridGraph,
    projector: IsometricProjector,
  ): SceneDrawItem | null {
    if (cell.state.occupancy !== 'empty') return null;
    if (this.waterNeighbor(cell, graph)) return null;
    const rng = cellRng(cell.id, 11);
    if (cell.neighbors.some(nid => graph.getCell(nid)?.state.occupancy === 'building')) {
      return null;
    }
    if (!rng.chance(0.28)) return null;

    const z = cell.layer * projector.config.layerStep + cell.elevation;
    const p = projector.project({ x: cell.centroid.x, y: cell.centroid.y, z });
    return {
      kind: 'tree',
      cellId: cell.id,
      depthKey: projector.cellDepth(cell.centroid, cell.layer, z) + 6,
      tree: {
        x: p.x,
        y: p.y,
        scale: 0.4 + rng.next() * 0.22,
        seed: rng.int(9999),
      },
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
    const profile = classifyEdges(cell, graph);

    const baseZ = cell.layer * projector.config.layerStep + cell.elevation;
    const tier = cell.state.height || 1;
    let height = projector.config.buildingHeight * (0.72 + tier * 0.3);
    if (cell.state.isTower) height *= 1.42;

    const worldVerts = graph.getCellVerts(cell);
    const box = fitIsoBox(worldVerts, cell.centroid, hasSameHeightNeighbor(cell, graph));
    const topVerts = box.map(v => projector.project({ x: v.x, y: v.y, z: baseZ + height }));
    const walls = collectExposedWalls(cell, graph, box, baseZ, height, projector);

    const roofKind = pickRoof(cell, profile, rng.chance(0.5), rng.chance(0.4));
    const chimney = !cell.state.isTower && profile.isEnclosed && rng.chance(0.55);
    const windows = buildWindows(walls.length, tier, rng);

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
          trimColor: '#cbb9a8',
          roofType: roofKind,
          isTower: !!cell.state.isTower,
          depthKey: projector.cellDepth(cell.centroid, cell.layer, baseZ + height),
        },
        roofKind,
        chimney,
        windows,
        seed: rng.int(9999),
        height: tier,
      },
    };
  }
}

function pickRoof(
  cell: Cell,
  profile: ReturnType<typeof classifyEdges>,
  coinA: boolean,
  coinB: boolean,
): RoofKind {
  if (cell.state.isTower) return 'spire';
  const h = cell.state.height || 1;
  if (profile.isCorner && h >= 2 && coinA) return 'stepped';
  if (profile.exposedCount >= 1 && h >= 1.5 && coinB) return 'gable';
  if (h >= 3 && coinA) return 'gable';
  return 'flat';
}

function buildWindows(wallCount: number, tier: number, rng: ReturnType<typeof cellRng>): WindowSpec[] {
  const windows: WindowSpec[] = [];
  const rows = Math.min(2, Math.max(1, Math.round(tier)));
  for (let w = 0; w < wallCount; w++) {
    const cols = 1;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        windows.push({
          wallIndex: w,
          u: 0.32 + col * 0.22 + rng.next() * 0.02,
          v: 0.22 + row * (0.52 / rows),
          wu: 0.16,
          hv: Math.min(0.18, 0.36 / rows),
        });
      }
    }
  }
  return windows;
}

function hasSameHeightNeighbor(cell: Cell, graph: GridGraph): boolean {
  return cell.neighbors.some(nid => {
    const n = graph.getCell(nid);
    return n?.state.occupancy === 'building' && n.state.height === cell.state.height;
  });
}

function collectExposedWalls(
  _cell: Cell,
  _graph: GridGraph,
  box: Vec2[],
  baseZ: number,
  height: number,
  projector: IsometricProjector,
): Vec2[][] {
  const baseVerts = box.map(v => projector.project({ x: v.x, y: v.y, z: baseZ }));
  const topVerts = box.map(v => projector.project({ x: v.x, y: v.y, z: baseZ + height }));

  // Iso camera only sees +Y (south) and +X (east). Drawing the back faces
  // in 2D paints them on top of the front, which reads as hollow glass boxes.
  const wallDefs = [
    [1, 2],
    [2, 3],
  ];

  const walls: Vec2[][] = [];
  for (const [a, b] of wallDefs) {
    walls.push([baseVerts[a], baseVerts[b], topVerts[b], topVerts[a]]);
  }
  return walls;
}

function fitIsoBox(worldVerts: Vec2[], centroidPt: Vec2, mergeWithNeighbor: boolean): Vec2[] {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const v of worldVerts) {
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x);
    minY = Math.min(minY, v.y);
    maxY = Math.max(maxY, v.y);
  }

  const scale = mergeWithNeighbor ? 1.2 : 0.97;
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
