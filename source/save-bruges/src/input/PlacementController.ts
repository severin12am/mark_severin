import type { HSL } from '../core/types';
import { complementaryRoofColor, snapToPalette } from '../color/Palette';
import type { ColorField } from '../color/ColorField';
import type { GridGraph } from '../grid/GridGraph';
import type { SceneRenderer } from '../render/SceneRenderer';

const DRAG_THRESHOLD = 6;

export class PlacementController {
  private pointerDown = false;
  private dragStart = { x: 0, y: 0 };
  private didDrag = false;
  private activeColor: HSL;
  private pendingRemove = false;

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
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  setColor(hex: string): void {
    this.activeColor = snapToPalette(hex);
  }

  private get graph(): GridGraph {
    return this.renderer.getGraph();
  }

  setGraph(_graph: GridGraph): void {
    this.colors.clear();
  }

  clearAll(): void {
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
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.pointerDown = true;
    this.didDrag = false;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.pendingRemove = e.button === 2;
    if (e.button === 0 || e.button === 1) {
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;

    if (this.pointerDown && !this.didDrag && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      this.didDrag = true;
    }

    if (this.pointerDown && this.didDrag) {
      this.renderer.panBy(dx, dy);
      this.dragStart = { x: e.clientX, y: e.clientY };
      return;
    }

    const world = this.renderer.screenToWorld(e.clientX, e.clientY);
    const cell = this.graph.findCellAt(world);
    this.renderer.setSelected(cell?.id ?? null);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.pointerDown) return;
    this.pointerDown = false;

    if (!this.didDrag) {
      if (this.pendingRemove || e.button === 2) {
        this.handleClick(e, true);
      } else if (e.button === 0) {
        this.handleClick(e, false);
      }
    }
    this.pendingRemove = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.92 : 1.08;
    this.renderer.zoomAt(factor, e.clientX, e.clientY);
  };

  private handleClick(e: PointerEvent, remove: boolean): void {
    const world = this.renderer.screenToWorld(e.clientX, e.clientY);
    const cell = this.graph.findCellAt(world);
    if (!cell || cell.state.occupancy === 'water') return;

    const dirty = this.graph.getDirtyRing(cell.id, 2);

    if (remove) {
      if (cell.state.occupancy !== 'building') return;
      cell.state.occupancy = 'empty';
      cell.state.height = 0;
      cell.state.isTower = false;
      delete cell.state.seedColor;
      delete cell.state.seedRoofColor;
    } else {
      cell.state.occupancy = 'building';
      const neighborHeights = cell.neighbors
        .map(nid => this.graph.getCell(nid))
        .filter(n => n?.state.occupancy === 'building')
        .map(n => n!.state.height);
      cell.state.height = neighborHeights.length > 0
        ? neighborHeights[0]
        : 1 + Math.floor(Math.random() * 2);
      cell.state.isTower = false;
      cell.state.seedColor = { ...this.activeColor };
      cell.state.seedRoofColor = complementaryRoofColor(this.activeColor);
      this.colors.seed(cell.id, this.activeColor, cell.state.seedRoofColor);
    }

    this.colors.rebuildFromGrid(this.graph.grid);
    this.renderer.invalidateCells(dirty);
    this.renderer.rebuildCells(
      this.graph.grid.cells.filter(c => c.state.occupancy === 'building').map(c => c.id),
    );
    this.renderer.setSelected(cell.id);
  }
}
