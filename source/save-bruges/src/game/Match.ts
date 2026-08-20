import type { Cell, CellId, DefenseKind } from '../core/types';
import type { GridGraph } from '../grid/GridGraph';
import { DEFENSE_MAP, NEXT_WAVE_DELAY, ROUND_ONE, STARTING_GOLD, TOWER_HP, WAVE_CLEAR_GOLD, type WaveSpec } from './catalog';
import { CombatSim } from './CombatSim';

export type Phase = 'prepare' | 'wave' | 'between' | 'won' | 'lost';

export class Match {
  gold = STARTING_GOLD;
  phase: Phase = 'prepare';
  waveIndex = 0;
  nextWaveIn = 0;
  selected: DefenseKind = 'spikes';
  banner = 'Place defenses on the three rings around the town. The siege comes from the fields.';
  readonly waves: WaveSpec[] = ROUND_ONE;
  readonly sim: CombatSim;
  readonly history: { id: CellId; kind: DefenseKind; cost: number }[] = [];
  onCityDirty: (() => void) | null = null;
  onUi: (() => void) | null = null;
  private lullShown = -1;

  constructor(readonly graph: GridGraph) {
    this.sim = new CombatSim(graph);
  }

  get currentWave(): WaveSpec | null {
    if (this.waveIndex <= 0 || this.waveIndex > this.waves.length) return null;
    return this.waves[this.waveIndex - 1];
  }

  canPlace(cell: Cell | null | undefined): boolean {
    if (this.phase === 'wave' || this.phase === 'won' || this.phase === 'lost') return false;
    if (!cell || cell.state.occupancy === 'water') return false;
    if (cell.state.occupancy === 'building') return false;
    if (!cell.state.defenseLine) return false;
    if (cell.state.defense) return false;
    const info = DEFENSE_MAP[this.selected];
    return this.gold >= info.cost;
  }

  place(cell: Cell): boolean {
    if (!this.canPlace(cell)) return false;
    const info = DEFENSE_MAP[this.selected];
    this.gold -= info.cost;
    cell.state.defense = this.selected;
    if (this.selected === 'tower' || this.selected === 'spikes') {
      const hp = this.selected === 'tower' ? TOWER_HP : 22;
      cell.state.wound = { hp, maxHp: hp, wet: false, burnt: false, burning: false, ruined: false };
    }
    this.history.push({ id: cell.id, kind: this.selected, cost: info.cost });
    this.sim.syncGarrisons();
    this.onCityDirty?.();
    this.onUi?.();
    return true;
  }

  refund(cell: Cell): boolean {
    if (this.phase === 'wave' || this.phase === 'won' || this.phase === 'lost') return false;
    if (!cell.state.defense) return false;
    const info = DEFENSE_MAP[cell.state.defense];
    this.gold += Math.round(info.cost * 0.7);
    delete cell.state.defense;
    delete cell.state.wound;
    this.sim.syncGarrisons();
    this.onCityDirty?.();
    this.onUi?.();
    return true;
  }

  undo(): boolean {
    const last = this.history.pop();
    if (!last || this.phase === 'wave') return false;
    const cell = this.graph.getCell(last.id);
    if (cell?.state.defense === last.kind) {
      delete cell.state.defense;
      delete cell.state.wound;
      this.gold += last.cost;
      this.sim.syncGarrisons();
      this.onCityDirty?.();
      this.onUi?.();
      return true;
    }
    return false;
  }

  beginSiege(): boolean {
    if (this.phase !== 'prepare') return false;
    this.waveIndex = 1;
    this.phase = 'wave';
    const wave = this.waves[0];
    this.banner = `Wave ${this.waveIndex} — ${wave.name}`;
    this.sim.scan();
    this.sim.syncGarrisons();
    this.sim.startWave(wave);
    this.onUi?.();
    return true;
  }

  callNextWave(): boolean {
    if (this.phase !== 'between') return false;
    this.startNext();
    return true;
  }

  tick(dt: number): void {
    if (this.phase === 'wave') {
      this.sim.tick(dt);
      const inbound = this.sim.enemiesLeft;
      const line = `Wave ${this.waveIndex} — ${this.currentWave?.name ?? ''} · ${inbound} inbound`;
      if (line !== this.banner) {
        this.banner = line;
        this.onUi?.();
      }
      if (this.sim.dirtyCity) {
        this.sim.dirtyCity = false;
        this.onCityDirty?.();
        this.onUi?.();
      }
      if (this.sim.keepRuined()) {
        this.phase = 'lost';
        this.banner = 'The keep is down. Bruges is lost.';
        this.onUi?.();
        return;
      }
      if (!this.sim.waveAlive) {
        if (this.waveIndex >= this.waves.length) {
          this.phase = 'won';
          this.banner = 'The town holds. First night survived.';
          this.onUi?.();
          return;
        }
        this.phase = 'between';
        this.nextWaveIn = NEXT_WAVE_DELAY;
        this.gold += WAVE_CLEAR_GOLD;
        const nxt = this.waves[this.waveIndex];
        this.banner = `Lull. +${WAVE_CLEAR_GOLD} gold. ${nxt.name} in ${Math.ceil(this.nextWaveIn)}s — or call them now.`;
        this.onUi?.();
      }
      return;
    }
    if (this.phase === 'between') {
      this.nextWaveIn -= dt;
      if (this.nextWaveIn <= 0) this.startNext();
      else {
        const n = Math.ceil(this.nextWaveIn);
        if (n !== this.lullShown) {
          this.lullShown = n;
          this.banner = `Lull. +${WAVE_CLEAR_GOLD} gold. ${this.waves[this.waveIndex].name} in ${n}s — or call them now.`;
          this.onUi?.();
        }
      }
    }
  }

  private startNext(): void {
    this.waveIndex += 1;
    this.phase = 'wave';
    const wave = this.waves[this.waveIndex - 1];
    this.banner = `Wave ${this.waveIndex} — ${wave.name}`;
    this.sim.startWave(wave);
    this.onUi?.();
  }

  standingHouses(): number {
    return this.graph.grid.cells.filter(c => c.state.occupancy === 'building' && !c.state.wound?.ruined).length;
  }
}
