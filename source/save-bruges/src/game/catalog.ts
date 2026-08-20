import type { DefenseKind } from '../core/types';

export type EnemyKind = 'raider' | 'cavalry' | 'siege' | 'firebrand';
export type AllyKind = 'militia' | 'archers' | 'pikemen';
export type UnitKind = EnemyKind | AllyKind;
export type HazardKind = 'flood' | 'fire' | 'storm';
export type SpawnEdge = 'west' | 'south' | 'east';

export interface DefenseInfo {
  kind: DefenseKind;
  name: string;
  hint: string;
  cost: number;
  color: string;
}

export const DEFENSES: DefenseInfo[] = [
  { kind: 'ditch', name: 'Dry ditch', hint: 'Slows anyone crossing.', cost: 30, color: '#8a6a48' },
  { kind: 'moat', name: 'Water ditch', hint: 'Slows hard. Stops fire. Wets the bank.', cost: 48, color: '#3d8a9a' },
  { kind: 'spikes', name: 'Spikes', hint: 'Tears at boots and hooves.', cost: 40, color: '#6a5340' },
  { kind: 'tower', name: 'Watchtower', hint: 'Arrows in a wide ring.', cost: 88, color: '#c4b08a' },
  { kind: 'militia', name: 'Militia', hint: 'Townsfolk with bills. Hold the line.', cost: 52, color: '#6d8fa8' },
  { kind: 'archers', name: 'Archers', hint: 'Shortbows from a palisade.', cost: 70, color: '#5e8a52' },
  { kind: 'pikemen', name: 'Pikemen', hint: 'Brutal against riders.', cost: 64, color: '#8a7348' },
];

export const DEFENSE_MAP = Object.fromEntries(DEFENSES.map(d => [d.kind, d])) as Record<DefenseKind, DefenseInfo>;

export interface UnitStats {
  hp: number;
  speed: number;
  dmg: number;
  range: number;
  cooldown: number;
  color: string;
  label: string;
}

export const UNIT_STATS: Record<UnitKind, UnitStats> = {
  raider: { hp: 20, speed: 1.55, dmg: 3.2, range: 0.92, cooldown: 0.58, color: '#a33a32', label: 'Raider' },
  firebrand: { hp: 18, speed: 1.42, dmg: 2.6, range: 0.92, cooldown: 0.62, color: '#e06028', label: 'Firebrand' },
  cavalry: { hp: 26, speed: 2.28, dmg: 3.6, range: 0.98, cooldown: 0.58, color: '#4a3024', label: 'Rider' },
  siege: { hp: 52, speed: 0.88, dmg: 9.2, range: 1.35, cooldown: 1.1, color: '#2e2e2c', label: 'Siege' },
  militia: { hp: 42, speed: 1.38, dmg: 6.2, range: 1.02, cooldown: 0.46, color: '#5a8ab8', label: 'Militia' },
  archers: { hp: 24, speed: 1.18, dmg: 7.0, range: 3.6, cooldown: 0.68, color: '#3f8a3a', label: 'Archer' },
  pikemen: { hp: 48, speed: 1.08, dmg: 7.6, range: 1.28, cooldown: 0.54, color: '#d2c090', label: 'Pikeman' },
};

export interface SpawnSpec {
  kind: EnemyKind;
  count: number;
  edge: SpawnEdge;
  interval: number;
  delay: number;
}

export interface WaveSpec {
  name: string;
  blurb: string;
  spawns: SpawnSpec[];
  flood?: boolean;
  storm?: boolean;
}

export const ROUND_ONE: WaveSpec[] = [
  {
    name: 'From the fields',
    blurb: 'Footmen coming up the near slope, heading for the keep.',
    spawns: [{ kind: 'raider', count: 8, edge: 'south', interval: 0.55, delay: 0.15 }],
  },
  {
    name: 'Riders and fire',
    blurb: 'Horsemen from the south. Firebrands in the dust.',
    spawns: [
      { kind: 'cavalry', count: 4, edge: 'south', interval: 0.85, delay: 0.2 },
      { kind: 'firebrand', count: 3, edge: 'south', interval: 0.9, delay: 1.4 },
      { kind: 'raider', count: 3, edge: 'south', interval: 0.6, delay: 2.6 },
    ],
  },
  {
    name: 'Water and stone',
    blurb: 'The canal rises. A ram follows the drowned road.',
    flood: true,
    storm: true,
    spawns: [
      { kind: 'siege', count: 1, edge: 'south', interval: 1.6, delay: 2.2 },
      { kind: 'siege', count: 1, edge: 'west', interval: 1.6, delay: 3.4 },
      { kind: 'raider', count: 5, edge: 'east', interval: 0.55, delay: 0.8 },
      { kind: 'cavalry', count: 2, edge: 'south', interval: 1.0, delay: 4.0 },
    ],
  },
];

export const STARTING_GOLD = 400;
export const WAVE_CLEAR_GOLD = 80;
export const NEXT_WAVE_DELAY = 16;
export const TOWER_RANGE = 4.85;
export const TOWER_DAMAGE = 8.5;
export const TOWER_COOLDOWN = 0.62;
export const TOWER_HP = 48;
export const SPIKE_DPS = 9;
export const MOAT_DPS = 5.5;
export const FIRE_DPS = 1.7;
export const FIRE_SPREAD = 0.11;
