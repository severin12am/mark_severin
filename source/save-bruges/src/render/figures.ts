import * as THREE from 'three';
import type { UnitKind } from '../game/catalog';
import { makePaperLambert } from './paperLook';

const mats = new Map<string, THREE.MeshLambertMaterial>();
const box = new THREE.BoxGeometry(1, 1, 1);

function mat(hex: string): THREE.MeshLambertMaterial {
  let m = mats.get(hex);
  if (!m) {
    m = makePaperLambert(hex, 'trim');
    mats.set(hex, m);
  }
  return m;
}

function part(
  g: THREE.Group,
  w: number,
  h: number,
  d: number,
  hex: string,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(box, mat(hex));
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  g.add(mesh);
  return mesh;
}

const SKIN = '#e6c9a4';
const BOOT = '#2e2218';

export function person(
  g: THREE.Group,
  tunic: string,
  pants: string,
  weapon: 'pike' | 'bow' | 'bill' | 'torch' | 'axe' | 'none',
  ox: number,
  oz: number,
  scale = 1,
  helm = '#3a3430',
): void {
  const p = new THREE.Group();
  p.position.set(ox, 0, oz);
  p.scale.setScalar(scale);

  part(p, 0.13, 0.16, 0.16, BOOT, -0.09, 0.08, 0.05);
  part(p, 0.13, 0.16, 0.16, BOOT, 0.09, 0.08, -0.03);
  part(p, 0.14, 0.34, 0.14, pants, -0.09, 0.32, 0.03);
  part(p, 0.14, 0.34, 0.14, pants, 0.09, 0.32, -0.03);
  part(p, 0.28, 0.12, 0.16, pants, 0, 0.52, 0);
  part(p, 0.32, 0.4, 0.2, tunic, 0, 0.76, 0);
  part(p, 0.42, 0.12, 0.16, tunic, 0, 0.96, 0);
  part(p, 0.1, 0.36, 0.1, tunic, -0.26, 0.74, 0.04);
  part(p, 0.1, 0.36, 0.1, tunic, 0.26, 0.74, -0.04);
  part(p, 0.1, 0.1, 0.1, SKIN, 0, 1.04, 0);
  part(p, 0.18, 0.18, 0.18, SKIN, 0, 1.18, 0);
  part(p, 0.22, 0.12, 0.2, helm, 0, 1.3, 0);
  part(p, 0.08, 0.08, 0.08, helm, 0, 1.38, 0);

  if (weapon === 'pike') {
    const pike = part(p, 0.045, 1.55, 0.045, '#6a5340', 0.28, 0.95, 0);
    pike.rotation.z = -0.12;
    part(p, 0.07, 0.22, 0.05, '#c4c8cc', 0.42, 1.68, 0);
  } else if (weapon === 'bow') {
    part(p, 0.05, 0.7, 0.05, '#5a3a28', 0.28, 0.82, 0);
    part(p, 0.04, 0.08, 0.38, '#5a3a28', 0.28, 1.14, 0);
    part(p, 0.04, 0.08, 0.38, '#5a3a28', 0.28, 0.5, 0);
    part(p, 0.03, 0.02, 0.42, '#d8c8a8', 0.3, 0.82, 0);
  } else if (weapon === 'bill') {
    const bill = part(p, 0.055, 1.35, 0.055, '#5a4636', 0.28, 0.9, 0);
    bill.rotation.z = -0.16;
    part(p, 0.26, 0.12, 0.06, '#8a9098', 0.42, 1.5, 0);
    const shield = part(p, 0.26, 0.38, 0.06, '#6a3030', -0.32, 0.7, 0.1);
    shield.rotation.y = 0.35;
  } else if (weapon === 'torch') {
    part(p, 0.06, 0.55, 0.06, '#5a3a28', 0.26, 0.7, 0);
    part(p, 0.14, 0.22, 0.14, '#e07030', 0.26, 1.02, 0);
  } else if (weapon === 'axe') {
    part(p, 0.06, 0.82, 0.06, '#5a3a28', 0.26, 0.68, 0);
    part(p, 0.28, 0.16, 0.08, '#8a9098', 0.38, 1.05, 0);
    const shield = part(p, 0.22, 0.32, 0.06, '#5a4030', -0.3, 0.68, 0.08);
    shield.rotation.y = 0.3;
  }

  g.add(p);
}

function horse(g: THREE.Group, coat: string, ox = 0, oz = 0, scale = 1): void {
  const h = new THREE.Group();
  h.position.set(ox, 0, oz);
  h.scale.setScalar(scale);
  part(h, 0.98, 0.36, 0.34, coat, 0.02, 0.52, 0);
  part(h, 0.2, 0.3, 0.18, coat, 0.46, 0.68, 0);
  part(h, 0.24, 0.18, 0.18, coat, 0.6, 0.74, 0);
  part(h, 0.14, 0.24, 0.1, coat, -0.5, 0.56, 0);
  part(h, 0.11, 0.42, 0.11, BOOT, 0.3, 0.22, 0.12);
  part(h, 0.11, 0.42, 0.11, BOOT, 0.3, 0.22, -0.12);
  part(h, 0.11, 0.42, 0.11, BOOT, -0.3, 0.22, 0.12);
  part(h, 0.11, 0.42, 0.11, BOOT, -0.3, 0.22, -0.12);
  g.add(h);
}

const BAND = [
  [-0.58, 0.08], [-0.35, 0.3], [-0.12, 0.08],
  [0.12, 0.3], [0.35, 0.08], [0.58, 0.3],
] as const;

export function makeUnitVisual(kind: UnitKind, team: 'atk' | 'def'): THREE.Group {
  const g = new THREE.Group();
  const infantry = kind !== 'siege' && kind !== 'cavalry';
  g.scale.setScalar(kind === 'siege' ? 0.62 : kind === 'cavalry' ? 0.7 : 0.72);
  g.renderOrder = 3;
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(infantry ? 0.38 : 0.32, 10),
    mat(team === 'atk' ? '#5a2420' : '#2a3a28'),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  shadow.scale.setScalar(kind === 'cavalry' ? 1.15 : kind === 'siege' ? 1.2 : 1);
  (shadow.material as THREE.MeshLambertMaterial).transparent = true;
  (shadow.material as THREE.MeshLambertMaterial).opacity = 0.32;
  g.add(shadow);

  const man = 0.58;

  if (kind === 'cavalry') {
    horse(g, team === 'atk' ? '#4a3024' : '#5a4638', -0.22, 0.08, 0.82);
    person(g, team === 'atk' ? '#8a3830' : '#6d8fa8', '#3a2a20', 'axe', -0.18, 0.08, 0.5);
    g.children[g.children.length - 1].position.y = 0.34;
    horse(g, team === 'atk' ? '#3a241c' : '#4a3a30', 0.24, -0.1, 0.82);
    person(g, team === 'atk' ? '#7a3028' : '#5a7a98', '#3a2a20', 'axe', 0.28, -0.1, 0.5);
    g.children[g.children.length - 1].position.y = 0.34;
  } else if (kind === 'siege') {
    part(g, 1.05, 0.4, 0.5, '#4a4034', 0, 0.42, 0);
    part(g, 1.28, 0.12, 0.12, '#2a241c', 0.18, 0.48, 0);
    part(g, 0.16, 0.3, 0.3, '#3a3228', -0.32, 0.18, 0.2);
    part(g, 0.16, 0.3, 0.3, '#3a3228', -0.32, 0.18, -0.2);
    part(g, 0.16, 0.3, 0.3, '#3a3228', 0.32, 0.18, 0.2);
    part(g, 0.16, 0.3, 0.3, '#3a3228', 0.32, 0.18, -0.2);
    person(g, '#7a4038', '#3a2a20', 'none', -0.22, 0.38, 0.52);
    person(g, '#6a3830', '#3a2a20', 'none', -0.16, -0.38, 0.52);
  } else if (kind === 'pikemen') {
    const tunics = team === 'atk'
      ? ['#8a5a38', '#7a4a30', '#8a5034']
      : ['#d2c090', '#e0d0a0', '#c8b888'];
    BAND.forEach(([x, z], i) => {
      person(g, tunics[i % 3], i % 2 ? '#2e261c' : '#3a2e24', 'pike', x, z, man * (i % 2 ? 0.94 : 1));
    });
  } else if (kind === 'archers') {
    const tunics = team === 'atk'
      ? ['#5a6a38', '#4a5a30', '#526434']
      : ['#3f8a3a', '#5e9a48', '#4a8a40'];
    BAND.forEach(([x, z], i) => {
      person(g, tunics[i % 3], '#3a3228', 'bow', x, z, man * (i % 2 ? 0.94 : 1));
    });
  } else if (kind === 'militia') {
    const tunics = team === 'atk'
      ? ['#6a5050', '#5a4040', '#604848']
      : ['#5a8ab8', '#6e9cc4', '#4a7aa0'];
    BAND.forEach(([x, z], i) => {
      person(g, tunics[i % 3], i % 2 ? '#2e2a24' : '#3a342c', i % 3 === 2 ? 'axe' : 'bill', x, z, man * (i % 2 ? 0.94 : 1));
    });
  } else if (kind === 'firebrand') {
    const tunics = ['#c05028', '#b04824', '#a04020'];
    BAND.forEach(([x, z], i) => {
      person(g, tunics[i % 3], '#3a2a20', 'torch', x, z, man * (i % 2 ? 0.94 : 1));
    });
  } else {
    const tunics = ['#a33a32', '#8a322c', '#b24438'];
    BAND.forEach(([x, z], i) => {
      person(g, tunics[i % 3], '#3a2a20', 'axe', x, z, man * (i % 2 ? 0.94 : 1));
    });
  }

  const hpY = kind === 'cavalry' ? 1.35 : kind === 'siege' ? 1.15 : 1.05;
  const hpBg = part(g, 0.42, 0.055, 0.07, '#2a2218', 0, hpY, 0);
  const hpFill = part(g, 0.38, 0.04, 0.06, '#5a9a48', 0, hpBg.position.y + 0.01, 0);
  g.userData.hp = hpFill;
  g.userData.hpW = 0.38;
  return g;
}
