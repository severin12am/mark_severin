export interface Vec2 {
  x: number;
  y: number;
}

export interface Vec3 extends Vec2 {
  z: number;
}

export type CellId = string;

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface ColorNode extends HSL {
  weight: number;
}

export type Occupancy = 'empty' | 'water' | 'building';

export interface CellState {
  occupancy: Occupancy;
  height: number;
  isTower?: boolean;
  buildingGroup?: number;
  seedColor?: HSL;
  seedRoofColor?: HSL;
}

export interface Cell {
  id: CellId;
  vertIndices: number[];
  centroid: Vec2;
  neighbors: CellId[];
  layer: number;
  elevation: number;
  state: CellState;
}

export interface GlobalGrid {
  vertices: Vec2[];
  cells: Cell[];
}

export type PieceRole = 'base' | 'wall' | 'roof' | 'trim' | 'decor';

export interface PieceInstance {
  id: string;
  cellId: CellId;
  role: PieceRole;
  depthOffset: number;
}

export interface PolygonDraw {
  verts: Vec2[];
  fill: string;
  stroke: string;
  strokeWidth: number;
  role: PieceRole;
  isWall: boolean;
  depthKey: number;
}

export interface RenderConfig {
  angle: number;
  scale: number;
  layerStep: number;
  roundness: number;
  textureIntensity: number;
  grimeAmount: number;
  buildingHeight: number;
  roofPitch: number;
  brickDensity: number;
}

export const DEFAULT_RENDER: RenderConfig = {
  angle: 0.523,
  scale: 55,
  layerStep: 2.5,
  roundness: 8,
  textureIntensity: 0.4,
  grimeAmount: 0.6,
  buildingHeight: 3.5,
  roofPitch: 2.5,
  brickDensity: 0.4,
};

export enum Dir {
  N = 1,
  NE = 2,
  E = 4,
  SE = 8,
  S = 16,
  SW = 32,
  W = 64,
  NW = 128,
}

export interface EdgeProfile {
  northOpen: boolean;
  eastOpen: boolean;
  southOpen: boolean;
  westOpen: boolean;
  exposedCount: number;
  isEnclosed: boolean;
  isCorner: boolean;
  cornerType: string | null;
}

export interface RuleContext {
  cell: Cell;
  mask: number;
  profile: EdgeProfile;
  flatAreaSize: number;
  color: HSL;
}

export interface FlatArea {
  size: number;
  cells: CellId[];
  perimeter: CellId[];
}
