import type { Cell, PieceInstance, RuleContext } from '../core/types';
import type { HSL } from '../core/types';
import { cellRng } from '../core/rng';
import { analyzeFlatArea, buildNeighborMask, classifyEdges } from './NeighborMask';
// classifyEdges now takes (cell, graph)
import type { GridGraph } from '../grid/GridGraph';
import type { ColorField } from '../color/ColorField';

interface Rule {
  priority: number;
  match: (ctx: RuleContext) => boolean;
  apply: (ctx: RuleContext) => PieceInstance[];
}

const RULES: Rule[] = [
  {
    priority: 100,
    match: ctx => ctx.profile.isCorner && ctx.flatAreaSize >= 5,
    apply: ctx => [
      { id: `tower_${ctx.profile.cornerType}`, cellId: ctx.cell.id, role: 'decor', depthOffset: 3 },
      { id: 'roof_peaked', cellId: ctx.cell.id, role: 'roof', depthOffset: 2 },
    ],
  },
  {
    priority: 85,
    match: ctx => ctx.profile.isEnclosed && ctx.flatAreaSize >= 6,
    apply: ctx => [
      { id: 'roof_dome', cellId: ctx.cell.id, role: 'roof', depthOffset: 2.5 },
      { id: 'chimney_cluster', cellId: ctx.cell.id, role: 'decor', depthOffset: 3.5 },
    ],
  },
  {
    priority: 75,
    match: ctx => ctx.profile.isEnclosed && ctx.flatAreaSize >= 3,
    apply: ctx => [
      { id: 'roof_peaked', cellId: ctx.cell.id, role: 'roof', depthOffset: 2 },
      ...(cellRng(ctx.cell.id, 1).chance(0.35) ? [{ id: 'chimney_single', cellId: ctx.cell.id, role: 'decor' as const, depthOffset: 3 }] : []),
    ],
  },
  {
    priority: 65,
    match: ctx => ctx.profile.isCorner,
    apply: ctx => [
      { id: `corner_${ctx.profile.cornerType}`, cellId: ctx.cell.id, role: 'wall', depthOffset: 1.5 },
      { id: 'roof_corner', cellId: ctx.cell.id, role: 'roof', depthOffset: 2 },
    ],
  },
  {
    priority: 55,
    match: ctx => ctx.profile.exposedCount > 0 && ctx.profile.exposedCount < 4,
    apply: ctx => {
      const pieces: PieceInstance[] = [
        { id: 'plinth', cellId: ctx.cell.id, role: 'base', depthOffset: 0.1 },
      ];
      if (ctx.profile.northOpen || ctx.profile.southOpen) {
        pieces.push({ id: 'wall_ns', cellId: ctx.cell.id, role: 'wall', depthOffset: 1 });
      }
      if (ctx.profile.eastOpen || ctx.profile.westOpen) {
        pieces.push({ id: 'wall_ew', cellId: ctx.cell.id, role: 'wall', depthOffset: 1 });
      }
      if (ctx.profile.exposedCount <= 2) {
        pieces.push({ id: 'roof_shed', cellId: ctx.cell.id, role: 'roof', depthOffset: 1.8 });
      } else {
        pieces.push({ id: 'roof_flat', cellId: ctx.cell.id, role: 'roof', depthOffset: 1.5 });
      }
      return pieces;
    },
  },
  {
    priority: 45,
    match: ctx => ctx.profile.isEnclosed,
    apply: ctx => [
      { id: 'plinth', cellId: ctx.cell.id, role: 'base', depthOffset: 0.1 },
      { id: 'roof_flat', cellId: ctx.cell.id, role: 'roof', depthOffset: 1.5 },
      ...(cellRng(ctx.cell.id, 2).chance(0.25) ? [{ id: 'courtyard', cellId: ctx.cell.id, role: 'decor' as const, depthOffset: 0.5 }] : []),
    ],
  },
  {
    priority: 10,
    match: () => true,
    apply: ctx => [
      { id: 'plinth', cellId: ctx.cell.id, role: 'base', depthOffset: 0.1 },
      { id: 'wall_all', cellId: ctx.cell.id, role: 'wall', depthOffset: 1 },
      { id: 'roof_flat', cellId: ctx.cell.id, role: 'roof', depthOffset: 1.5 },
    ],
  },
];

export class RuleEngine {
  resolveCell(cell: Cell, graph: GridGraph, colors: ColorField): PieceInstance[] {
    const mask = buildNeighborMask(cell, graph);
    const profile = classifyEdges(cell, graph);
    const flat = analyzeFlatArea(cell.id, graph);
    const ctx: RuleContext = {
      cell,
      mask,
      profile,
      flatAreaSize: flat.size,
      color: colors.resolve(cell.id),
    };

    const rule = RULES.filter(r => r.match(ctx)).sort((a, b) => b.priority - a.priority)[0];
    return rule ? rule.apply(ctx) : [];
  }

  resolveDirty(cellIds: string[], graph: GridGraph, colors: ColorField): Map<string, PieceInstance[]> {
    const result = new Map<string, PieceInstance[]>();
    for (const id of cellIds) {
      const cell = graph.getCell(id);
      if (!cell || cell.state.occupancy !== 'building') continue;
      result.set(id, this.resolveCell(cell, graph, colors));
    }
    return result;
  }
}

export function buildRuleContext(cell: Cell, graph: GridGraph, colors: ColorField): RuleContext {
  const mask = buildNeighborMask(cell, graph);
  return {
    cell,
    mask,
    profile: classifyEdges(cell, graph),
    flatAreaSize: analyzeFlatArea(cell.id, graph).size,
    color: colors.resolve(cell.id),
  };
}

export type { HSL };
