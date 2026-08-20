import type { DefenseKind } from '../core/types';
import type { SceneRenderer } from '../render/SceneRenderer';
import type { Match } from '../game/Match';

const DRAG_THRESHOLD = 6;
const PLACE_COOLDOWN = 180;

export class DefensePlacer {
  private pointerDown = false;
  private dragStart = { x: 0, y: 0 };
  private didDrag = false;
  private pendingRemove = false;
  private lastPlaceAt = 0;
  onPlace: (() => void) | null = null;

  constructor(
    private match: Match,
    private renderer: SceneRenderer,
    canvas: HTMLCanvasElement,
  ) {
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('contextmenu', e => e.preventDefault());
  }

  setKind(kind: DefenseKind): void {
    this.match.selected = kind;
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.pointerDown = true;
    this.didDrag = false;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.pendingRemove = e.button === 2;
  };

  private onPointerMove = (e: PointerEvent): void => {
    const dx = e.clientX - this.dragStart.x;
    const dy = e.clientY - this.dragStart.y;
    if (this.pointerDown && !this.didDrag && Math.hypot(dx, dy) > DRAG_THRESHOLD) this.didDrag = true;
    if (this.pointerDown && this.didDrag) return;
    const world = this.renderer.screenToWorld(e.clientX, e.clientY);
    const cell = this.match.graph.findCellAt(world);
    this.renderer.setSelected(cell?.id ?? null);
    this.renderer.setHoverOk(this.match.canPlace(cell) || (!!cell?.state.defense && this.match.phase !== 'wave'));
  };

  private onPointerLeave = (): void => {
    this.pointerDown = false;
    this.didDrag = false;
    this.pendingRemove = false;
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.pointerDown) return;
    this.pointerDown = false;
    if (this.didDrag) {
      this.pendingRemove = false;
      return;
    }
    const world = this.renderer.screenToWorld(e.clientX, e.clientY);
    const cell = this.match.graph.findCellAt(world);
    if (!cell) return;
    const now = performance.now();
    if (this.pendingRemove || e.button === 2) {
      if (this.match.refund(cell)) this.onPlace?.();
    } else if (e.button === 0) {
      if (now - this.lastPlaceAt < PLACE_COOLDOWN) return;
      if (this.match.place(cell)) {
        this.lastPlaceAt = now;
        this.onPlace?.();
      }
    }
    this.pendingRemove = false;
  };
}
