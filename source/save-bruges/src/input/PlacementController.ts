import type { CellId, HSL, Occupancy } from '../core/types';
import { complementaryRoofColor, snapToPalette } from '../color/Palette';
import type { ColorField } from '../color/ColorField';
import type { GridGraph } from '../grid/GridGraph';
import type { SceneRenderer } from '../render/SceneRenderer';

const DRAG_THRESHOLD = 6;
const MAX_HEIGHT = 4;

interface CellSnap {
  id: CellId;
  occupancy: Occupancy;
  height: number;
  isTower: boolean;
  seedColor?: HSL;
  seedRoofColor?: HSL;
}

export class PlacementController {
  private pointerDown = false;
  private dragStart = { x: 0, y: 0 };
  private didDrag = false;
  private activeColor: HSL;
  private pendingRemove = false;
  private history: CellSnap[][] = [];
  heightBrush = 2;
  onChange: (() => void) | null = null;

  constructor(
    private colors: ColorField,
    private renderer: SceneRenderer,
    canvas: HTMLCanvasElement,
    initialColorHex: string,
  ) {
    this.activeColor = snapToPalette(initialColorHex);

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerUp);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  setColor(hex: string): void {
    this.activeColor = snapToPalette(hex);
  }

  setHeightBrush(h: number): void {
    this.heightBrush = Math.max(1, Math.min(MAX_HEIGHT, h));
  }

  private get graph(): GridGraph {
    return this.renderer.getGraph();
  }

  setGraph(_graph: GridGraph): void {
    this.colors.clear();
    this.history = [];
    this.onChange?.();
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  undo(): boolean {
    const snaps = this.history.pop();
    if (!snaps) return false;
    this.applySnaps(snaps);
    this.rebuildVisuals(snaps.map(s => s.id));
    this.onChange?.();
    return true;
  }

  clearAll(): void {
    const snaps = this.captureAllEditable();
    if (snaps.length) this.history.push(snaps);
    for (const cell of this.graph.grid.cells) {
      if (cell.state.occupancy === 'water') continue;
      cell.state.occupancy = 'empty';
      cell.state.height = 0;
      cell.state.isTower = false;
      delete cell.state.seedColor;
      delete cell.state.seedRoofColor;
    }
    this.colors.clear();
    this.renderer.visualGen.invalidateAll();
    this.renderer.markDirty();
    this.onChange?.();
  }

  private captureAllEditable(): CellSnap[] {
    return this.graph.grid.cells
      .filter(c => c.state.occupancy !== 'water')
      .map(c => this.snapCell(c.id))
      .filter((s): s is CellSnap => !!s);
  }

  private snapCell(id: CellId): CellSnap | null {
    const cell = this.graph.getCell(id);
    if (!cell) return null;
    return {
      id,
      occupancy: cell.state.occupancy,
      height: cell.state.height,
      isTower: !!cell.state.isTower,
      seedColor: cell.state.seedColor ? { ...cell.state.seedColor } : undefined,
      seedRoofColor: cell.state.seedRoofColor ? { ...cell.state.seedRoofColor } : undefined,
    };
  }

  private applySnaps(snaps: CellSnap[]): void {
    for (const s of snaps) {
      const cell = this.graph.getCell(s.id);
      if (!cell) continue;
      cell.state.occupancy = s.occupancy;
      cell.state.height = s.height;
      cell.state.isTower = s.isTower;
      if (s.seedColor) cell.state.seedColor = { ...s.seedColor };
      else delete cell.state.seedColor;
      if (s.seedRoofColor) cell.state.seedRoofColor = { ...s.seedRoofColor };
      else delete cell.state.seedRoofColor;
    }
  }

  private rebuildVisuals(ids: CellId[]): void {
    this.colors.rebuildFromGrid(this.graph.grid);
    this.renderer.invalidateCells(ids);
    this.renderer.rebuildCells(
      this.graph.grid.cells.filter(c => c.state.occupancy === 'building').map(c => c.id),
    );
    this.renderer.markDirty();
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.pointerDown = true;
    this.didDrag = false;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.pendingRemove = e.button === 2;
    if (e.button === 0) {
      (e.target as HTMLCanvasElement).style.cursor = 'pointer';
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;

    if (this.pointerDown && !this.didDrag && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      this.didDrag = true;
    }

    if (this.pointerDown && this.didDrag) return;

    const world = this.renderer.screenToWorld(e.clientX, e.clientY);
    const cell = this.graph.findCellAt(world);
    this.renderer.setSelected(cell?.id ?? null);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.pointerDown) return;
    this.pointerDown = false;
    (e.target as HTMLElement).style.cursor = 'default';

    if (!this.didDrag) {
      if (this.pendingRemove || e.button === 2) {
        this.handleClick(e, true, e.shiftKey);
      } else if (e.button === 0) {
        this.handleClick(e, false, e.shiftKey);
      }
    }
    this.pendingRemove = false;
  };

  private handleClick(e: PointerEvent, remove: boolean, lower: boolean): void {
    const world = this.renderer.screenToWorld(e.clientX, e.clientY);
    const cell = this.graph.findCellAt(world);
    if (!cell || cell.state.occupancy === 'water') return;

    const dirty = this.graph.getDirtyRing(cell.id, 2);
    const before = dirty.map(id => this.snapCell(id)).filter((s): s is CellSnap => !!s);
    this.history.push(before);
    if (this.history.length > 80) this.history.shift();

    if (remove) {
      if (cell.state.occupancy !== 'building') {
        this.history.pop();
        return;
      }
      cell.state.occupancy = 'empty';
      cell.state.height = 0;
      cell.state.isTower = false;
      delete cell.state.seedColor;
      delete cell.state.seedRoofColor;
    } else if (cell.state.occupancy === 'building') {
      if (lower) {
        cell.state.height = Math.max(1, cell.state.height - 0.5);
      } else {
        cell.state.height = Math.min(MAX_HEIGHT, cell.state.height + 0.5);
      }
      cell.state.seedColor = { ...this.activeColor };
      cell.state.seedRoofColor = complementaryRoofColor(this.activeColor);
      this.colors.seed(cell.id, this.activeColor, cell.state.seedRoofColor);
    } else {
      cell.state.occupancy = 'building';
      cell.state.height = this.heightBrush;
      cell.state.isTower = false;
      cell.state.seedColor = { ...this.activeColor };
      cell.state.seedRoofColor = complementaryRoofColor(this.activeColor);
      this.colors.seed(cell.id, this.activeColor, cell.state.seedRoofColor);
    }

    this.rebuildVisuals(dirty);
    this.renderer.setSelected(cell.id);
    this.onChange?.();
  }
}
