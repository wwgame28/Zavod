import * as THREE from 'three';
import { G, merge, MAT, meshOf } from './geo.js';

// Меши интерактивных объектов: путевые камни, скрижали, сундуки, узлы сбора, квестовые предметы.
const cache = {};
const once = (k, fn) => cache[k] || (cache[k] = fn());

export function glowMat(hex, opacity = 1) {
  return new THREE.MeshBasicMaterial({ color: hex, transparent: opacity < 1, opacity, toneMapped: false });
}

export function makeWaystone() {
  const g = new THREE.Group();
  const base = once('ws_base', () => merge([
    G.cyl(1.6, 1.9, 0.5, 8, 0x8a8a96, { y: 0.25 }),
    G.cyl(0.55, 0.75, 3.6, 5, 0x6a6a7a, { y: 2.3 }),
    G.cone(0.55, 0.9, 5, 0x6a6a7a, { y: 4.55 }),
  ]));
  g.add(meshOf(base));
  const runeMat = glowMat(0x5a6a8a);
  const rune = new THREE.Mesh(once('ws_rune', () => merge([
    G.box(0.14, 2.2, 0.08, 0xffffff, { y: 2.4, z: 0.62 }), G.box(0.6, 0.12, 0.08, 0xffffff, { y: 2.9, z: 0.62 }),
    G.box(0.14, 2.2, 0.08, 0xffffff, { y: 2.4, z: -0.62 }), G.box(0.6, 0.12, 0.08, 0xffffff, { y: 1.9, z: -0.62 }),
  ])), runeMat);
  g.add(rune);
  const crystal = new THREE.Mesh(once('ws_crystal', () => new THREE.OctahedronGeometry(0.4, 0)), runeMat);
  crystal.position.y = 5.6; crystal.scale.y = 1.6;
  g.add(crystal);
  return { group: g, runeMat, crystal };
}

export function makeTablet() {
  const g = new THREE.Group();
  g.add(meshOf(once('tab', () => merge([
    G.box(1.4, 0.3, 0.9, 0x6a6a66, { y: 0.15 }),
    G.box(1.2, 1.9, 0.32, 0x8a867e, { y: 1.1, rx: -0.15 }),
  ]))));
  const mat = glowMat(0xffd27a);
  const glyph = new THREE.Mesh(once('tab_glyph', () => merge([
    G.ring(0.22, 0.32, 10, 0xffffff, { y: 1.35, z: 0.25, rx: -0.15 }),
    G.box(0.06, 0.8, 0.02, 0xffffff, { y: 1.1, z: 0.25, rx: -0.15 }),
    G.box(0.5, 0.06, 0.02, 0xffffff, { y: 0.8, z: 0.3, rx: -0.15 }),
  ])), mat);
  g.add(glyph);
  return { group: g, mat };
}

export function makeChest(color = 0x7a5030) {
  const g = new THREE.Group();
  g.add(meshOf(once('chest_body' + color, () => merge([
    G.box(1.3, 0.7, 0.85, color, { y: 0.35 }),
    G.box(1.36, 0.1, 0.9, 0xd8b04a, { y: 0.66 }), G.box(0.1, 0.72, 0.9, 0xd8b04a, { x: -0.5, y: 0.36 }), G.box(0.1, 0.72, 0.9, 0xd8b04a, { x: 0.5, y: 0.36 }),
  ]))));
  const lid = new THREE.Group();
  lid.position.set(0, 0.7, -0.42);
  lid.add(meshOf(once('chest_lid' + color, () => merge([
    G.box(1.3, 0.32, 0.85, color, { y: 0.16, z: 0.42 }), G.box(1.36, 0.08, 0.9, 0xd8b04a, { y: 0.3, z: 0.42 }), G.box(0.2, 0.2, 0.06, 0xffe07a, { y: 0.05, z: 0.86 }),
  ]))));
  g.add(lid);
  return { group: g, lid };
}

const HERB_SHAPE = {
  herb: (c) => merge([
    G.cone(0.08, 0.6, 3, 0x4f8a36, { y: 0.3, rz: 0.3 }), G.cone(0.08, 0.6, 3, 0x4f8a36, { y: 0.3, rz: -0.3 }),
    G.cone(0.08, 0.5, 3, 0x5a9a3c, { y: 0.25, rx: 0.35 }), G.cone(0.08, 0.5, 3, 0x5a9a3c, { y: 0.25, rx: -0.35 }),
  ]),
};

export function makeGatherNode(item) {
  const g = new THREE.Group();
  const color = new THREE.Color(item.color);
  if (item.icon === 'herb') {
    g.add(meshOf(once('herb_leaves', () => HERB_SHAPE.herb()), MAT.lambert, false));
    const m = glowMat(color);
    for (const [x, z, y] of [[0.15, 0.05, 0.62], [-0.12, 0.1, 0.55], [0.02, -0.15, 0.68]]) {
      const f = new THREE.Mesh(once('herb_flower', () => new THREE.IcosahedronGeometry(0.11, 0)), m);
      f.position.set(x, y, z); g.add(f);
    }
  } else if (item.icon === 'ore') {
    g.add(meshOf(once('obs_node', () => merge([G.cone(0.45, 1.6, 5, 0x2a2230, { y: 0.8 }), G.cone(0.3, 1.1, 5, 0x3a2a48, { x: 0.45, y: 0.5, rz: -0.4 }), G.cone(0.3, 1.0, 5, 0x1e1820, { x: -0.4, y: 0.45, rz: 0.4 }), G.dodeca(0.6, 0x4a423e, { y: 0.15, sy: 0.5 })]))));
    const gm = new THREE.Mesh(once('obs_glow', () => new THREE.OctahedronGeometry(0.16, 0)), glowMat(0xc78cff));
    gm.position.set(0.1, 1.2, 0.2); g.add(gm);
  } else {
    const m = glowMat(color);
    for (const [x, z, s, rz] of [[0, 0, 1, 0], [0.35, 0.1, 0.7, -0.4], [-0.3, -0.15, 0.65, 0.4]]) {
      const c = new THREE.Mesh(once('crystal_node', () => new THREE.OctahedronGeometry(0.3, 0)), m);
      c.position.set(x, 0.45 * s, z); c.scale.set(s, s * 2.2, s); c.rotation.z = rz; g.add(c);
    }
    g.add(meshOf(once('crystal_base', () => G.dodeca(0.5, 0x6a6a72, { y: 0.1, sy: 0.4 }))));
  }
  return { group: g };
}

export function makeQuestObject(kind) {
  const g = new THREE.Group();
  const parts = {};
  switch (kind) {
    case 'crate':
      g.add(meshOf(once('crate', () => merge([G.box(1.1, 1.0, 1.1, 0x9a7040, { y: 0.5 }), G.box(1.14, 0.12, 0.2, 0x6a4a28, { y: 0.5 }), G.box(0.2, 0.12, 1.14, 0x6a4a28, { y: 0.98 }), G.box(0.3, 0.25, 0.06, 0xc24a3a, { y: 0.6, z: 0.57 })]))));
      break;
    case 'chest': { const c = makeChest(0x5a3a22); g.add(c.group); parts.lid = c.lid; break; }
    case 'tear': {
      g.add(meshOf(once('roots', () => merge([G.cyl(0.15, 0.3, 1.6, 5, 0x4a3a28, { x: 0.4, y: 0.4, rz: -0.8 }), G.cyl(0.15, 0.3, 1.6, 5, 0x4a3a28, { x: -0.4, y: 0.4, rz: 0.8 }), G.cyl(0.12, 0.25, 1.4, 5, 0x4a3a28, { z: 0.4, y: 0.35, rx: 0.8 })]))));
      const orb = new THREE.Mesh(once('tear_orb', () => new THREE.IcosahedronGeometry(0.35, 1)), glowMat(0x9be06a));
      orb.position.y = 1.4; g.add(orb); parts.orb = orb; break;
    }
    case 'totem': {
      g.add(meshOf(once('totem', () => merge([G.cyl(0.25, 0.32, 3.2, 6, 0x5a4a32, { y: 1.6 }), G.box(0.9, 0.7, 0.6, 0xd8d0b8, { y: 3.4 }), G.box(1.6, 0.15, 0.15, 0x5a4a32, { y: 2.6 }), G.box(0.2, 0.15, 0.1, 0x1a1a1a, { x: -0.2, y: 3.45, z: 0.31 }), G.box(0.2, 0.15, 0.1, 0x1a1a1a, { x: 0.2, y: 3.45, z: 0.31 })]))));
      const flame = new THREE.Mesh(once('totem_flame', () => new THREE.ConeGeometry(0.4, 1.1, 6)), glowMat(0xb8ff6a));
      flame.position.y = 4.3; flame.visible = false; g.add(flame); parts.flame = flame; break;
    }
    case 'hunter': {
      g.add(meshOf(once('hunter', () => merge([G.box(0.5, 0.35, 1.5, 0x8a6a4a, { y: 0.2 }), G.box(0.35, 0.35, 0.35, 0xe0c0a0, { y: 0.22, z: 0.95 }), G.box(0.18, 0.18, 1.0, 0x6a5038, { x: 0.38, y: 0.15, z: -0.9 }), G.box(0.18, 0.18, 1.0, 0x6a5038, { x: -0.38, y: 0.15, z: -0.9 })]))));
      const ice = new THREE.Mesh(once('hunter_ice', () => merge([G.box(1.6, 1.0, 2.8, 0xffffff, { y: 0.4 })])), new THREE.MeshLambertMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.45, flatShading: true }));
      g.add(ice); parts.ice = ice; break;
    }
    case 'rod': {
      const pole = meshOf(once('rod', () => merge([G.cyl(0.12, 0.16, 6, 6, 0x6a6a72, { y: 3 }), G.box(0.8, 0.2, 0.2, 0x8a8a92, { y: 5.2 }), G.cyl(0.5, 0.7, 0.4, 6, 0x4a4a52, { y: 0.2 })])));
      g.add(pole); pole.rotation.z = 0.55; parts.pole = pole;
      const tip = new THREE.Mesh(once('rod_tip', () => new THREE.OctahedronGeometry(0.3, 0)), glowMat(0xfff27a));
      tip.position.y = 6.3; tip.visible = false; pole.add(tip); parts.tip = tip; break;
    }
    case 'heart': break;
    default: break;
  }
  return { group: g, parts };
}

export function makeLootBag(color) {
  const g = new THREE.Group();
  g.add(meshOf(once('bag', () => merge([G.sphere(0.4, 6, 4, 0x8a6a40, { y: 0.35, sy: 0.85 }), G.cyl(0.12, 0.2, 0.25, 6, 0x6a4a28, { y: 0.75 })])), MAT.lambert, false));
  const beam = new THREE.Mesh(once('loot_beam', () => new THREE.CylinderGeometry(0.08, 0.25, 3, 6, 1, true)), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
  beam.position.y = 1.6; g.add(beam);
  return { group: g, beam };
}
