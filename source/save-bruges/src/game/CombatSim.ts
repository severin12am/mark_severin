import type { Cell, CellId, DefenseKind } from '../core/types';
import type { GridGraph } from '../grid/GridGraph';
import {
  FIRE_DPS,
  FIRE_SPREAD,
  MOAT_DPS,
  SPIKE_DPS,
  TOWER_COOLDOWN,
  TOWER_DAMAGE,
  TOWER_RANGE,
  UNIT_STATS,
  type EnemyKind,
  type SpawnEdge,
  type UnitKind,
  type WaveSpec,
} from './catalog';

export interface SimUnit {
  id: string;
  team: 'atk' | 'def';
  kind: UnitKind;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  cooldown: number;
  path: CellId[];
  pathI: number;
  home?: CellId;
  repathIn: number;
}

export interface Projectile {
  x: number;
  y: number;
  z: number;
  tx: number;
  ty: number;
  tz: number;
  t: number;
  life: number;
}

export interface Lightning {
  x: number;
  z: number;
  t: number;
}

export class CombatSim {
  units: SimUnit[] = [];
  projectiles: Projectile[] = [];
  lightning: Lightning[] = [];
  flooded = new Set<CellId>();
  floodT = 0;
  stormLeft = 0;
  stormCd = 0;
  waveAlive = false;
  spawnQ: { t: number; kind: EnemyKind; edge: SpawnEdge }[] = [];
  time = 0;
  dirtyCity = false;
  hits = 0;
  private uid = 1;
  private towerCd = new Map<string, number>();
  private wetPits = new Set<string>();
  private edges: Record<SpawnEdge, Cell[]> = { west: [], south: [], east: [] };
  private keepId = '';

  constructor(readonly graph: GridGraph) {
    this.scan();
  }

  reset(): void {
    this.units = this.units.filter(u => u.team === 'def');
    this.projectiles = [];
    this.lightning = [];
    this.flooded.clear();
    this.floodT = 0;
    this.stormLeft = 0;
    this.stormCd = 0;
    this.waveAlive = false;
    this.spawnQ = [];
    this.time = 0;
    this.hits = 0;
    this.scan();
    this.syncGarrisons();
  }

  scan(): void {
    const cells = this.graph.grid.cells;
    let keep = cells.find(c => c.state.isTower);
    if (!keep) keep = cells.find(c => c.state.occupancy === 'building');
    this.keepId = keep?.id ?? '';
    const kx = keep?.centroid.x ?? 0;
    const kz = keep?.centroid.y ?? 0;
    const camx = 14.8 / Math.hypot(14.8, 13.8);
    const camz = 13.8 / Math.hypot(14.8, 13.8);
    const empty = cells.filter(c => (
      c.state.occupancy !== 'water'
      && c.state.occupancy !== 'building'
    ));
    const along = (c: Cell, x: number, z: number) => (
      (c.centroid.x - kx) * x + (c.centroid.y - kz) * z
    );
    const distOf = (c: Cell) => Math.hypot(c.centroid.x - kx, c.centroid.y - kz);
    const townR = Math.max(
      4.2,
      ...cells.filter(c => c.state.occupancy === 'building').map(distOf),
    );
    const beyond = townR + 2.6;
    const pick = (x: number, z: number) => {
      const scored = empty
        .map(c => ({ c, along: along(c, x, z), dist: distOf(c) }))
        .filter(s => (
          !s.c.state.defenseLine
          && !s.c.state.defense
          && s.dist > beyond
          && s.along > 1.2
        ));
      scored.sort((a, b) => b.along - a.along || b.dist - a.dist);
      let chosen = scored.filter(s => s.dist < beyond + 10).slice(0, 12).map(s => s.c);
      if (chosen.length < 4) chosen = scored.slice(0, 12).map(s => s.c);
      if (chosen.length < 3) {
        chosen = empty
          .filter(c => !c.state.defenseLine && !c.state.defense && distOf(c) > townR + 2.4)
          .sort((a, b) => along(b, x, z) - along(a, x, z))
          .slice(0, 8);
      }
      return chosen;
    };
    this.edges.south = pick(camx, camz);
    this.edges.west = pick(-camz, camx);
    this.edges.east = pick(camz, -camx);
  }

  syncGarrisons(): void {
    const wanted = new Map<string, DefenseKind>();
    for (const cell of this.graph.grid.cells) {
      const d = cell.state.defense;
      if (d === 'militia' || d === 'archers' || d === 'pikemen') wanted.set(cell.id, d);
    }
    this.units = this.units.filter(u => {
      if (u.team !== 'def') return true;
      if (!u.home || !wanted.has(u.home)) return false;
      return wanted.get(u.home) === u.kind;
    });
    const have = new Set(this.units.filter(u => u.team === 'def' && u.home).map(u => u.home));
    for (const [id, kind] of wanted) {
      if (have.has(id)) continue;
      const cell = this.graph.getCell(id);
      if (!cell) continue;
      this.units.push(this.makeUnit(kind as UnitKind, 'def', cell.centroid.x, cell.centroid.y, id));
    }
  }

  startWave(spec: WaveSpec): void {
    this.waveAlive = true;
    this.spawnQ = [];
    this.time = 0;
    for (const s of spec.spawns) {
      for (let i = 0; i < s.count; i++) {
        this.spawnQ.push({ t: s.delay + i * s.interval, kind: s.kind, edge: s.edge });
      }
    }
    if (spec.flood) this.floodT = 0.01;
    else this.floodT = 0;
    this.stormLeft = spec.storm ? 13 : 0;
    this.stormCd = spec.storm ? 1.6 : 0;
  }

  get enemiesLeft(): number {
    return this.spawnQ.length + this.units.filter(u => u.team === 'atk' && u.hp > 0).length;
  }

  keepRuined(): boolean {
    const keep = this.graph.getCell(this.keepId);
    return !!keep?.state.wound?.ruined;
  }

  tick(dt: number): void {
    this.time += dt;
    this.tickSpawns();
    this.tickFlood(dt);
    this.tickStorm(dt);
    this.refreshWetPits();
    this.tickMoatWet();
    this.tickFire(dt);
    this.tickUnits(dt);
    this.tickTowers(dt);
    this.tickProjectiles(dt);
    this.units = this.units.filter(u => u.hp > 0);
    if (this.waveAlive && this.enemiesLeft === 0) this.waveAlive = false;
  }

  private makeUnit(kind: UnitKind, team: 'atk' | 'def', x: number, z: number, home?: CellId): SimUnit {
    const st = UNIT_STATS[kind];
    return {
      id: `u${this.uid++}`,
      team,
      kind,
      x,
      z,
      hp: st.hp,
      maxHp: st.hp,
      cooldown: 0,
      path: [],
      pathI: 0,
      home,
      repathIn: 0,
    };
  }

  private spawnAt(kind: EnemyKind, edge: SpawnEdge): void {
    const pool = this.edges[edge];
    let cell: Cell | undefined = pool[Math.floor(Math.random() * Math.max(1, pool.length))];
    if (!cell) {
      cell = this.graph.grid.cells.find(c => (
        c.state.occupancy !== 'water' && c.state.occupancy !== 'building'
      ));
    }
    if (!cell) return;
    const jitter = 0.35;
    this.units.push(this.makeUnit(
      kind,
      'atk',
      cell.centroid.x + (Math.random() - 0.5) * jitter,
      cell.centroid.y + (Math.random() - 0.5) * jitter,
    ));
  }

  private tickSpawns(): void {
    const left: typeof this.spawnQ = [];
    for (const s of this.spawnQ) {
      if (s.t <= this.time) this.spawnAt(s.kind, s.edge);
      else left.push(s);
    }
    this.spawnQ = left;
  }

  private tickFlood(dt: number): void {
    if (this.floodT <= 0) return;
    this.floodT += dt;
    const water = this.graph.grid.cells.filter(c => c.state.occupancy === 'water');
    const radius = Math.min(4.0, this.floodT * 0.62);
    const next = new Set<CellId>();
    for (const w of water) {
      next.add(w.id);
      for (const nid of w.neighbors) {
        const n = this.graph.getCell(nid);
        if (!n) continue;
        if (Math.hypot(n.centroid.x - w.centroid.x, n.centroid.y - w.centroid.y) < radius + 0.4) {
          next.add(n.id);
        }
      }
    }
    if (this.floodT > 2.4) {
      for (const id of [...next]) {
        const c = this.graph.getCell(id);
        if (!c) continue;
        for (const nid of c.neighbors) next.add(nid);
      }
    }
    this.flooded = next;
    for (const id of next) {
      const c = this.graph.getCell(id);
      if (!c?.state.wound || c.state.wound.ruined) continue;
      if (!c.state.wound.wet) this.dirtyCity = true;
      c.state.wound.wet = true;
      if (c.state.wound.burning) {
        c.state.wound.burning = false;
        this.dirtyCity = true;
      }
      this.hurt(c, 2.1 * dt, false);
    }
    if (this.floodT > 18) {
      this.floodT = 0;
      this.flooded.clear();
    }
  }

  private tickStorm(dt: number): void {
    if (this.stormLeft <= 0) return;
    this.stormLeft -= dt;
    this.stormCd -= dt;
    if (this.stormCd > 0) return;
    this.stormCd = 3.4;
    const houses = this.graph.grid.cells.filter(c => (
      c.state.occupancy === 'building' && !c.state.wound?.ruined && !c.state.isTower
    ));
    for (let i = 0; i < 2 && houses.length; i++) {
      const c = houses.splice(Math.floor(Math.random() * houses.length), 1)[0];
      this.lightning.push({ x: c.centroid.x, z: c.centroid.y, t: 0 });
      this.hurt(c, 14, true);
      if (c.state.wound && !c.state.wound.wet && Math.random() < 0.6) {
        c.state.wound.burning = true;
        c.state.wound.burnt = true;
        this.dirtyCity = true;
      }
    }
  }

  private tickMoatWet(): void {
    for (const cell of this.graph.grid.cells) {
      if (cell.state.defense !== 'moat' && !this.wetPits.has(cell.id)) continue;
      if (cell.state.defense !== 'ditch' && cell.state.defense !== 'moat') continue;
      for (const nid of cell.neighbors) {
        const n = this.graph.getCell(nid);
        if (!n?.state.wound || n.state.wound.ruined) continue;
        if (n.state.occupancy !== 'building') continue;
        if (!n.state.wound.wet) {
          n.state.wound.wet = true;
          this.dirtyCity = true;
        }
        if (n.state.wound.burning) {
          n.state.wound.burning = false;
          this.dirtyCity = true;
        }
      }
    }
  }

  private refreshWetPits(): void {
    this.wetPits.clear();
    const seen = new Set<string>();
    for (const start of this.graph.grid.cells) {
      if (start.state.defense !== 'ditch' && start.state.defense !== 'moat') continue;
      if (seen.has(start.id)) continue;
      const comp: Cell[] = [];
      const q = [start];
      seen.add(start.id);
      let wet = start.state.defense === 'moat';
      while (q.length) {
        const c = q.pop()!;
        comp.push(c);
        if (c.state.defense === 'moat') wet = true;
        for (const nid of c.neighbors) {
          if (seen.has(nid)) continue;
          const n = this.graph.getCell(nid);
          if (!n || (n.state.defense !== 'ditch' && n.state.defense !== 'moat')) continue;
          seen.add(nid);
          q.push(n);
        }
      }
      if (wet) for (const c of comp) this.wetPits.add(c.id);
    }
  }

  private tickFire(dt: number): void {
    const burning: Cell[] = [];
    for (const c of this.graph.grid.cells) {
      if (!c.state.wound?.burning || c.state.wound.ruined) continue;
      if (c.state.isTower) {
        c.state.wound.burning = false;
        this.dirtyCity = true;
        continue;
      }
      burning.push(c);
      this.hurt(c, FIRE_DPS * dt, true);
      if (c.state.wound.wet) {
        c.state.wound.burning = false;
        this.dirtyCity = true;
      }
    }
    for (const c of burning) {
      if (Math.random() > FIRE_SPREAD * dt) continue;
      for (const nid of c.neighbors) {
        const n = this.graph.getCell(nid);
        if (!n?.state.wound || n.state.wound.ruined || n.state.wound.wet || n.state.wound.burning) continue;
        if (n.state.occupancy !== 'building' || n.state.isTower) continue;
        if (n.neighbors.some(id => this.graph.getCell(id)?.state.defense === 'moat')) continue;
        n.state.wound.burning = true;
        n.state.wound.burnt = true;
        this.dirtyCity = true;
        break;
      }
    }
  }

  private tickUnits(dt: number): void {
    for (const u of this.units) {
      if (u.hp <= 0) continue;
      u.cooldown = Math.max(0, u.cooldown - dt);
      u.repathIn -= dt;
      this.applyGround(u, dt);
      if (u.hp <= 0) continue;
      if (u.team === 'atk') this.tickEnemy(u, dt);
      else this.tickAlly(u, dt);
    }
  }

  private applyGround(u: SimUnit, dt: number): void {
    const cell = this.cellAt(u.x, u.z);
    if (!cell) return;
    if (this.flooded.has(cell.id) && u.team === 'atk') u.hp -= 1.6 * dt;
    if (cell.state.defense === 'spikes' && u.team === 'atk') {
      u.hp -= SPIKE_DPS * dt;
      const w = cell.state.wound;
      if (w && !w.ruined) {
        w.hp -= 3.2 * dt;
        if (w.hp <= 0) {
          w.ruined = true;
          delete cell.state.defense;
          this.dirtyCity = true;
        }
      }
    }
    if (this.wetPits.has(cell.id) && u.team === 'atk') u.hp -= MOAT_DPS * dt;
    else if (cell.state.defense === 'moat' && u.team === 'atk') u.hp -= MOAT_DPS * dt;
  }

  private tickEnemy(u: SimUnit, dt: number): void {
    const target = this.bestBuilding(u);
    if (!target) return;
    const range = UNIT_STATS[u.kind].range;
    const dist = Math.hypot(target.centroid.x - u.x, target.centroid.y - u.z);
    if (dist <= range + 0.35) {
      if (u.cooldown <= 0) {
        this.hurt(target, UNIT_STATS[u.kind].dmg, u.kind === 'firebrand' || u.kind === 'siege');
        if (
          u.kind === 'firebrand'
          && target.state.wound
          && !target.state.wound.wet
          && !target.state.isTower
          && Math.random() < 0.42
        ) {
          target.state.wound.burning = true;
          target.state.wound.burnt = true;
          this.dirtyCity = true;
        }
        u.cooldown = UNIT_STATS[u.kind].cooldown;
        this.hits++;
      }
      return;
    }
    this.followPath(u, target.id, dt);
  }

  private tickAlly(u: SimUnit, dt: number): void {
    const home = u.home ? this.graph.getCell(u.home) : null;
    const hunt = 32;
    const foe = this.nearestEnemy(u.x, u.z, hunt);
    if (!foe) {
      if (home) this.steer(u, home.centroid.x, home.centroid.y, dt, 0.28);
      return;
    }
    const range = UNIT_STATS[u.kind].range;
    const dist = Math.hypot(foe.x - u.x, foe.z - u.z);
    if (dist <= range) {
      if (u.cooldown <= 0) {
        let dmg = UNIT_STATS[u.kind].dmg;
        if (u.kind === 'pikemen' && foe.kind === 'cavalry') dmg *= 1.65;
        foe.hp -= dmg;
        u.cooldown = UNIT_STATS[u.kind].cooldown;
        if (range > 1.6) {
          this.projectiles.push({
            x: u.x, y: 0.7, z: u.z,
            tx: foe.x, ty: 0.55, tz: foe.z,
            t: 0, life: 0.22,
          });
        }
      }
      return;
    }
    this.steer(u, foe.x, foe.z, dt, 0);
  }

  private tickTowers(dt: number): void {
    for (const cell of this.graph.grid.cells) {
      const keepWatch = !!cell.state.isTower && cell.state.occupancy === 'building' && !cell.state.wound?.ruined;
      if (cell.state.defense !== 'tower' && !keepWatch) continue;
      if (cell.state.wound?.ruined) continue;
      const range = keepWatch ? TOWER_RANGE + 1.4 : TOWER_RANGE;
      const foe = this.nearestEnemy(cell.centroid.x, cell.centroid.y, range);
      if (!foe) continue;
      const key = cell.id;
      let cd = this.towerCd.get(key) ?? 0;
      cd -= dt;
      if (cd <= 0) {
        foe.hp -= TOWER_DAMAGE;
        const y = (keepWatch ? 2.6 : 1.45) + this.graph.hillAt(cell.centroid.x, cell.centroid.y);
        this.projectiles.push({
          x: cell.centroid.x, y, z: cell.centroid.y,
          tx: foe.x, ty: 0.5, tz: foe.z,
          t: 0, life: 0.18,
        });
        cd = TOWER_COOLDOWN;
      }
      this.towerCd.set(key, cd);
    }
  }

  private tickProjectiles(dt: number): void {
    for (const p of this.projectiles) p.t += dt;
    this.projectiles = this.projectiles.filter(p => p.t < p.life);
    for (const b of this.lightning) b.t += dt;
    this.lightning = this.lightning.filter(b => b.t < 0.45);
  }

  private followPath(u: SimUnit, goal: CellId, dt: number): void {
    if (u.repathIn <= 0 || u.pathI >= u.path.length) {
      u.path = this.astar(this.cellAt(u.x, u.z)?.id, goal, u);
      u.pathI = 0;
      u.repathIn = 0.45 + Math.random() * 0.25;
    }
    const nextId = u.path[u.pathI];
    const next = nextId ? this.graph.getCell(nextId) : null;
    if (!next) {
      const g = this.graph.getCell(goal);
      if (g) this.steer(u, g.centroid.x, g.centroid.y, dt, 0.9);
      return;
    }
    const arrived = this.steer(u, next.centroid.x, next.centroid.y, dt, 0.28);
    if (arrived) u.pathI++;
  }

  private steer(u: SimUnit, tx: number, tz: number, dt: number, stop: number): boolean {
    const dx = tx - u.x;
    const dz = tz - u.z;
    const dist = Math.hypot(dx, dz);
    if (dist <= stop) return true;
    let speed = UNIT_STATS[u.kind].speed;
    const cell = this.cellAt(u.x, u.z);
    if (cell && this.wetPits.has(cell.id)) speed *= u.kind === 'cavalry' ? 0.5 : 0.28;
    else if (cell?.state.defense === 'ditch') speed *= u.kind === 'cavalry' ? 0.72 : 0.48;
    else if (cell?.state.defense === 'moat') speed *= u.kind === 'cavalry' ? 0.5 : 0.28;
    if (cell?.state.defense === 'spikes') speed *= 0.7;
    if (cell && this.flooded.has(cell.id)) speed *= 0.55;
    const step = Math.min(dist, speed * dt);
    u.x += (dx / dist) * step;
    u.z += (dz / dist) * step;
    return dist - step <= stop;
  }

  private bestBuilding(u: SimUnit): Cell | null {
    let best: Cell | null = null;
    let bestD = Infinity;
    for (const c of this.graph.grid.cells) {
      if (c.state.occupancy !== 'building' || c.state.wound?.ruined) continue;
      let d = Math.hypot(c.centroid.x - u.x, c.centroid.y - u.z);
      if (c.state.isTower) d *= u.kind === 'siege' ? 0.42 : 1.38;
      if (u.kind === 'firebrand' && !c.state.wound?.burnt) d *= 0.82;
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    return best;
  }

  private nearestEnemy(x: number, z: number, range: number): SimUnit | null {
    let best: SimUnit | null = null;
    let bestD = range;
    for (const u of this.units) {
      if (u.team !== 'atk' || u.hp <= 0) continue;
      const d = Math.hypot(u.x - x, u.z - z);
      if (d < bestD) {
        bestD = d;
        best = u;
      }
    }
    return best;
  }

  private hurt(cell: Cell, amount: number, scorch: boolean): void {
    const w = cell.state.wound;
    if (!w || w.ruined) return;
    const wasScar = w.hp < w.maxHp * 0.72;
    const wasLow = w.hp < w.maxHp * 0.5;
    w.hp -= amount;
    if (scorch && amount > 4) {
      if (!w.burnt) this.dirtyCity = true;
      w.burnt = true;
    }
    if (w.hp <= 0) {
      w.hp = 0;
      w.ruined = true;
      w.burning = false;
      this.dirtyCity = true;
    } else if (!wasLow && w.hp < w.maxHp * 0.5) {
      this.dirtyCity = true;
    } else if (!wasScar && w.hp < w.maxHp * 0.72) {
      this.dirtyCity = true;
    }
  }

  private cellAt(x: number, z: number): Cell | null {
    return this.graph.findCellAt({ x, y: z });
  }

  private astar(startId: CellId | undefined, goalId: CellId, unit: SimUnit): CellId[] {
    if (!startId) return [];
    const start = this.graph.getCell(startId);
    const goal = this.graph.getCell(goalId);
    if (!start || !goal) return [];
    const dist = new Map<string, number>();
    const prev = new Map<string, string>();
    const heap: { id: string; d: number }[] = [{ id: startId, d: 0 }];
    dist.set(startId, 0);
    let guard = 0;
    while (heap.length && guard++ < 520) {
      heap.sort((a, b) => a.d - b.d);
      const cur = heap.shift()!;
      if (cur.id === goalId) break;
      if (cur.d > (dist.get(cur.id) ?? Infinity)) continue;
      const cell = this.graph.getCell(cur.id);
      if (!cell) continue;
      for (const nid of cell.neighbors) {
        const n = this.graph.getCell(nid);
        if (!n) continue;
        const step = this.stepCost(n, unit, goalId);
        if (!isFinite(step)) continue;
        const nd = cur.d + step;
        if (nd < (dist.get(nid) ?? Infinity)) {
          dist.set(nid, nd);
          prev.set(nid, cur.id);
          heap.push({ id: nid, d: nd });
        }
      }
    }
    if (!prev.has(goalId) && startId !== goalId) {
      const near = this.openNeighbor(goal);
      if (near && prev.has(near.id)) goalId = near.id;
      else return [];
    }
    const path: CellId[] = [];
    let walk: string | undefined = goalId;
    while (walk && walk !== startId) {
      path.push(walk);
      walk = prev.get(walk);
    }
    path.reverse();
    return path;
  }

  private openNeighbor(goal: Cell): Cell | null {
    let best: Cell | null = null;
    let bestD = Infinity;
    for (const nid of goal.neighbors) {
      const n = this.graph.getCell(nid);
      if (!n || n.state.occupancy === 'water') continue;
      if (n.state.occupancy === 'building' && !n.state.wound?.ruined) continue;
      const d = Math.hypot(n.centroid.x - goal.centroid.x, n.centroid.y - goal.centroid.y);
      if (d < bestD) {
        bestD = d;
        best = n;
      }
    }
    return best;
  }

  private stepCost(n: Cell, unit: SimUnit, goalId: CellId): number {
    if (n.id === goalId) return 1;
    if (n.state.occupancy === 'water') return Infinity;
    if (n.state.occupancy === 'building' && !n.state.wound?.ruined) return Infinity;
    if (n.state.defense === 'tower' && !n.state.wound?.ruined) return 4.5;
    let c = 1 + (n.elevation || 0) * 0.12;
    if (n.state.defense === 'ditch') c += unit.kind === 'cavalry' ? 0.7 : 2.1;
    if (n.state.defense === 'moat') c += unit.kind === 'cavalry' ? 1.8 : 4.4;
    if (n.state.defense === 'spikes') c += 1.4;
    if (this.flooded.has(n.id)) c += 1.6;
    return c;
  }
}
