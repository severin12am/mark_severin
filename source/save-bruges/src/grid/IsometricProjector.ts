import type { RenderConfig, Vec2, Vec3 } from '../core/types';

export class IsometricProjector {
  constructor(
    public config: RenderConfig,
    public origin: Vec2 = { x: 0, y: 0 },
  ) {}

  project(world: Vec3): Vec2 {
    const { angle, scale } = this.config;
    return {
      x: (world.x - world.y) * Math.cos(angle) * scale + this.origin.x,
      y: (world.x + world.y) * Math.sin(angle) * scale - world.z * scale + this.origin.y,
    };
  }

  unproject(screen: Vec2, z = 0): Vec2 {
    const { angle, scale } = this.config;
    const sx = (screen.x - this.origin.x) / (Math.cos(angle) * scale);
    const sy = (screen.y - this.origin.y + z * scale) / (Math.sin(angle) * scale);
    return {
      x: (sx + sy) / 2,
      y: (sy - sx) / 2,
    };
  }

  cellDepth(centroid: Vec2, layer: number, elevation: number): number {
    const p = this.project({ x: centroid.x, y: centroid.y, z: layer * this.config.layerStep + elevation });
    return p.y + layer * 1000;
  }

  setOrigin(origin: Vec2): void {
    this.origin = origin;
  }
}
