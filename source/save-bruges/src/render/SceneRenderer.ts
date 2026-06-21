import type { CellId, RenderConfig, Vec2 } from '../core/types';
import { DEFAULT_RENDER } from '../core/types';
import type { GridGraph } from '../grid/GridGraph';
import { IsometricProjector } from '../grid/IsometricProjector';
import type { ColorField } from '../color/ColorField';
import { VisualGenerator } from '../building/VisualGenerator';
import { drawBackground, WeatheredRenderer } from './WeatheredRenderer';

export class SceneRenderer {
  readonly projector: IsometricProjector;
  readonly visualGen: VisualGenerator;
  readonly weathered: WeatheredRenderer;

  private bgCanvas: HTMLCanvasElement;
  private bgCtx: CanvasRenderingContext2D;
  private container: HTMLElement | null = null;
  private graph: GridGraph;
  private colors: ColorField;

  private pan: Vec2 = { x: 0, y: 0 };
  private zoom = 1;
  private selectedId: CellId | null = null;
  private needsRedraw = true;
  private viewOffset: Vec2 = { x: 0, y: 0 };
  private rafId = 0;

  constructor(graph: GridGraph, colors: ColorField, config: RenderConfig = DEFAULT_RENDER) {
    this.graph = graph;
    this.colors = colors;
    this.projector = new IsometricProjector(config);
    this.visualGen = new VisualGenerator();
    this.weathered = new WeatheredRenderer(config);
    this.bgCanvas = document.createElement('canvas');
    const ctx = this.bgCanvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D unavailable');
    this.bgCtx = ctx;
  }

  async init(container: HTMLElement): Promise<void> {
    this.container = container;
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    this.bgCanvas.style.position = 'absolute';
    this.bgCanvas.style.inset = '0';
    this.bgCanvas.style.width = '100%';
    this.bgCanvas.style.height = '100%';
    this.bgCanvas.style.pointerEvents = 'none';

    const canvas = this.weathered.getCanvas();
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.cursor = 'crosshair';

    container.appendChild(this.bgCanvas);
    container.appendChild(canvas);

    await new Promise<void>(r => requestAnimationFrame(() => r()));
    this.handleResize();
    this.centerCamera();

    window.addEventListener('resize', () => {
      this.handleResize();
      this.centerCamera();
    });

    const loop = () => {
      if (this.needsRedraw) {
        this.render();
        this.needsRedraw = false;
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  get canvas(): HTMLCanvasElement {
    return this.weathered.getCanvas();
  }

  private handleResize(): void {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    this.bgCanvas.width = w * dpr;
    this.bgCanvas.height = h * dpr;
    this.bgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.weathered.resize(w, h, dpr);
    drawBackground(this.bgCtx, w, h);
    this.markDirty();
  }

  centerCamera(): void {
    this.projector.setOrigin({ x: 0, y: 0 });
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const cell of this.graph.grid.cells) {
      for (const vi of cell.vertIndices) {
        const v = this.graph.grid.vertices[vi];
        const p = this.projector.project({ x: v.x, y: v.y, z: 0 });
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
      }
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    this.viewOffset = { x: -cx, y: -cy };
    const w = this.container?.clientWidth ?? 800;
    const h = this.container?.clientHeight ?? 600;
    this.pan = { x: w / 2, y: h / 2 };
    const gridW = maxX - minX;
    const gridH = maxY - minY;
    const margin = 80;
    this.zoom = Math.min((w - margin) / gridW, (h - margin) / gridH, 1.15);
    this.markDirty();
  }

  setSelected(id: CellId | null): void {
    this.selectedId = id;
    this.markDirty();
  }

  markDirty(): void {
    this.needsRedraw = true;
  }

  invalidateCells(cellIds: CellId[]): void {
    this.visualGen.invalidate(cellIds);
    this.markDirty();
  }

  rebuildCells(cellIds: CellId[]): void {
    this.visualGen.rebuild(cellIds, this.graph, this.colors);
    this.markDirty();
  }

  render(): void {
    this.projector.setOrigin({ x: this.viewOffset.x, y: this.viewOffset.y });
    const items = this.visualGen.generateSceneItems(
      this.graph,
      this.projector,
      this.colors,
      this.selectedId,
    );
    this.weathered.draw(items, this.pan, this.zoom, { x: 0, y: 0 });
  }

  screenToWorld(screenX: number, screenY: number): Vec2 {
    const lx = (screenX - this.pan.x) / this.zoom + this.viewOffset.x;
    const ly = (screenY - this.pan.y) / this.zoom + this.viewOffset.y;
    return this.projector.unproject({ x: lx, y: ly }, 0);
  }

  panBy(dx: number, dy: number): void {
    this.pan.x += dx;
    this.pan.y += dy;
    this.markDirty();
  }

  zoomAt(factor: number, screenX: number, screenY: number): void {
    const oldZoom = this.zoom;
    const newZoom = Math.max(0.35, Math.min(2.5, oldZoom * factor));
    this.pan.x = screenX - newZoom * ((screenX - this.pan.x) / oldZoom);
    this.pan.y = screenY - newZoom * ((screenY - this.pan.y) / oldZoom);
    this.zoom = newZoom;
    this.markDirty();
  }

  resetGraph(graph: GridGraph): void {
    this.graph = graph;
    this.visualGen.invalidateAll();
    this.centerCamera();
    this.markDirty();
  }

  getGraph(): GridGraph {
    return this.graph;
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
  }
}

// Compatibility shim for PlacementController
export const app = { canvas: null as HTMLCanvasElement | null };
