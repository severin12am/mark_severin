import type { Cell, CellId, ColorNode, GlobalGrid, HSL } from '../core/types';
import { DEFAULT_BUILDING_COLOR, DEFAULT_ROOF_COLOR, complementaryRoofColor } from './Palette';

export class ColorField {
  private field = new Map<CellId, ColorNode>();
  private roofField = new Map<CellId, ColorNode>();

  seed(cellId: CellId, wallColor: HSL, roofColor?: HSL): void {
    this.field.set(cellId, { ...wallColor, weight: 1 });
    this.roofField.set(cellId, { ...(roofColor ?? complementaryRoofColor(wallColor)), weight: 1 });
  }

  clear(): void {
    this.field.clear();
    this.roofField.clear();
  }

  get(cellId: CellId): HSL | undefined {
    const n = this.field.get(cellId);
    return n ? { h: n.h, s: n.s, l: n.l } : undefined;
  }

  resolve(cellId: CellId): HSL {
    return this.get(cellId) ?? DEFAULT_BUILDING_COLOR;
  }

  resolveRoof(cellId: CellId): HSL {
    const n = this.roofField.get(cellId);
    return n ? { h: n.h, s: n.s, l: n.l } : DEFAULT_ROOF_COLOR;
  }

  diffuse(cells: Map<CellId, Cell>, steps = 4): void {
    for (let s = 0; s < steps; s++) {
      const next = new Map(this.field);
      const nextRoof = new Map(this.roofField);
      for (const [id, cell] of cells) {
        if (cell.state.occupancy !== 'building') continue;
        this.diffuseOne(id, cell, this.field, next);
        this.diffuseOne(id, cell, this.roofField, nextRoof);
      }
      this.field = next;
      this.roofField = nextRoof;
    }
  }

  private diffuseOne(
    id: CellId,
    cell: Cell,
    source: Map<CellId, ColorNode>,
    dest: Map<CellId, ColorNode>,
  ): void {
    let h = 0;
    let sat = 0;
    let l = 0;
    let w = 0;
    for (const src of [id, ...cell.neighbors]) {
      const c = source.get(src);
      if (!c) continue;
      const nw = c.weight * (src === id ? 1 : 0.5);
      h += c.h * nw;
      sat += c.s * nw;
      l += c.l * nw;
      w += nw;
    }
    if (w > 0) {
      dest.set(id, { h: h / w, s: sat / w, l: l / w, weight: Math.min(1, w) });
    }
  }

  rebuildFromGrid(grid: GlobalGrid): void {
    this.field.clear();
    this.roofField.clear();
    for (const cell of grid.cells) {
      if (cell.state.seedColor) {
        this.seed(cell.id, cell.state.seedColor, cell.state.seedRoofColor);
      }
    }
    const map = new Map(grid.cells.map(c => [c.id, c]));
    this.diffuse(map, 5);
  }
}
