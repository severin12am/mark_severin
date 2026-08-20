import * as THREE from 'three';
import type { GridGraph } from '../grid/GridGraph';
import type { CombatSim } from '../game/CombatSim';
import { makePaperLambert } from './paperLook';
import { makeUnitVisual } from './figures';

const floodMat = makePaperLambert('#3aa0b0', 'trim');
floodMat.transparent = true;
floodMat.opacity = 0.62;
floodMat.side = THREE.DoubleSide;
floodMat.depthWrite = false;

const geoBox = new THREE.BoxGeometry(1, 1, 1);
const geoCircle = new THREE.CircleGeometry(0.7, 12);
const fxMats = new Map<string, THREE.MeshLambertMaterial>();

function fxMat(hex: string): THREE.MeshLambertMaterial {
  let m = fxMats.get(hex);
  if (!m) {
    m = makePaperLambert(hex, 'trim');
    fxMats.set(hex, m);
  }
  return m;
}

function meshBox(w: number, h: number, d: number, hex: string): THREE.Mesh {
  const mesh = new THREE.Mesh(geoBox, fxMat(hex));
  mesh.scale.set(w, h, d);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export class BattleLayer {
  readonly group = new THREE.Group();
  private units = new Map<string, THREE.Group>();
  private fx: THREE.Object3D[] = [];

  constructor(private graph: GridGraph) {}

  setGraph(graph: GridGraph): void {
    this.graph = graph;
    this.clearUnits();
  }

  private clearUnits(): void {
    for (const g of this.units.values()) this.group.remove(g);
    this.units.clear();
  }

  sync(sim: CombatSim, now: number): void {
    const live = new Set<string>();
    for (const u of sim.units) {
      live.add(u.id);
      let g = this.units.get(u.id);
      if (!g) {
        g = makeUnitVisual(u.kind, u.team);
        this.units.set(u.id, g);
        this.group.add(g);
      }
      const y = this.graph.hillAt(u.x, u.z) + 0.04;
      g.position.set(u.x, y, u.z);
      g.visible = true;
      const lx = g.userData.lx as number | undefined;
      const lz = g.userData.lz as number | undefined;
      const dx = u.x - (lx ?? u.x);
      const dz = u.z - (lz ?? u.z);
      if (Math.hypot(dx, dz) > 0.012) g.rotation.y = Math.atan2(dx, dz);
      g.userData.lx = u.x;
      g.userData.lz = u.z;
      const hurt = Math.max(0, u.hp / u.maxHp);
      const bar = g.userData.hp as THREE.Mesh;
      const w = (g.userData.hpW as number) || 0.38;
      bar.scale.x = Math.max(0.05, w * hurt);
      bar.position.x = (hurt - 1) * w * 0.5;
      (bar.material as THREE.MeshLambertMaterial).color.set(hurt > 0.42 ? '#5a9a48' : '#c45c4a');
    }
    for (const [id, g] of this.units) {
      if (!live.has(id)) {
        this.group.remove(g);
        this.units.delete(id);
      }
    }

    for (const o of this.fx) this.group.remove(o);
    this.fx = [];

    for (const p of sim.projectiles) {
      const t = Math.min(1, p.t / p.life);
      const mesh = meshBox(0.1, 0.1, 0.36, '#f0d48a');
      mesh.position.set(
        p.x + (p.tx - p.x) * t,
        p.y + (p.ty - p.y) * t,
        p.z + (p.tz - p.z) * t,
      );
      mesh.lookAt(p.tx, p.ty, p.tz);
      this.group.add(mesh);
      this.fx.push(mesh);
    }

    for (const b of sim.lightning) {
      const boltMat = makePaperLambert('#f7f2d4', 'trim');
      boltMat.emissive = new THREE.Color('#fff4c8');
      boltMat.emissiveIntensity = 1.4;
      const bolt = new THREE.Mesh(geoBox, boltMat);
      bolt.scale.set(0.12, 5.2, 0.12);
      bolt.position.set(b.x, 2.6 + this.graph.hillAt(b.x, b.z), b.z);
      this.group.add(bolt);
      this.fx.push(bolt);
      const flash = new THREE.Mesh(geoCircle, boltMat);
      flash.rotation.x = -Math.PI / 2;
      flash.position.set(b.x, 0.12 + this.graph.hillAt(b.x, b.z), b.z);
      flash.scale.setScalar(1.4);
      this.group.add(flash);
      this.fx.push(flash);
    }

    for (const cell of this.graph.grid.cells) {
      if (!cell.state.wound?.burning || cell.state.wound.ruined) continue;
      const flicker = 0.85 + Math.sin(now * 7 + cell.centroid.x) * 0.15;
      const baseY = this.graph.hillAt(cell.centroid.x, cell.centroid.y);
      const flame = meshBox(0.62, 1.55 * flicker, 0.5, '#e07030');
      flame.position.set(cell.centroid.x, baseY + 1.05 * flicker, cell.centroid.y);
      this.group.add(flame);
      this.fx.push(flame);
      const flame2 = meshBox(0.38, 1.15 * flicker, 0.3, '#ff9030');
      flame2.position.set(cell.centroid.x + 0.18, baseY + 0.85 * flicker, cell.centroid.y - 0.1);
      this.group.add(flame2);
      this.fx.push(flame2);
      const core = meshBox(0.22, 0.85 * flicker, 0.22, '#f4d48a');
      core.position.copy(flame.position);
      core.position.y += 0.18;
      this.group.add(core);
      this.fx.push(core);
      const smoke = meshBox(0.55, 0.85, 0.55, '#4a4844');
      smoke.position.copy(flame.position);
      smoke.position.y += 0.85;
      smoke.scale.setScalar(0.85 + flicker * 0.3);
      this.group.add(smoke);
      this.fx.push(smoke);
    }

    for (const id of sim.flooded) {
      const cell = this.graph.getCell(id);
      if (!cell || cell.state.occupancy === 'water') continue;
      const sheet = new THREE.Mesh(geoCircle, floodMat);
      sheet.rotation.x = -Math.PI / 2;
      sheet.position.set(
        cell.centroid.x,
        0.1 + this.graph.hillAt(cell.centroid.x, cell.centroid.y),
        cell.centroid.y,
      );
      sheet.scale.setScalar(1.25);
      this.group.add(sheet);
      this.fx.push(sheet);
    }
  }
}
