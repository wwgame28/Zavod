import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { RNG, smoothstep } from '../core/rng.js';
import { G, merge, jitter, MAT } from './geo.js';
import { DOME } from '../data/regions.js';

// Геометрии декораций — по одной на вид, затем тысячи инстансов.
function buildKinds() {
  const K = {};
  K.oak = merge([
    G.cyl(0.22, 0.34, 2.6, 6, 0x6b4a2e, { y: 1.3 }),
    jitter(G.ico(1.7, 0, 0x5f9a3c, { y: 3.6 }), 0.35, 1),
    jitter(G.ico(1.2, 0, 0x6fae44, { x: 0.9, y: 3.0, z: 0.4 }), 0.25, 2),
    jitter(G.ico(1.1, 0, 0x538a34, { x: -0.8, y: 3.2, z: -0.5 }), 0.25, 3),
  ]);
  K.pine = merge([
    G.cyl(0.18, 0.28, 2.2, 5, 0x5a3e26, { y: 1.1 }),
    G.cone(1.7, 2.6, 7, 0x2f5a32, { y: 2.8 }),
    G.cone(1.35, 2.3, 7, 0x356638, { y: 4.1 }),
    G.cone(0.95, 2.0, 7, 0x3b713e, { y: 5.3 }),
  ]);
  K.pine_snow = merge([
    G.cyl(0.18, 0.28, 2.2, 5, 0x5a3e26, { y: 1.1 }),
    G.cone(1.7, 2.6, 7, 0x2e4f3a, { y: 2.8 }),
    G.cone(1.35, 2.3, 7, 0xe8f0f8, { y: 4.1 }),
    G.cone(0.95, 2.0, 7, 0xf4f8fc, { y: 5.3 }),
    G.cone(1.55, 0.6, 7, 0xe8f0f8, { y: 3.85 }),
  ]);
  K.birch = merge([
    G.cyl(0.14, 0.2, 4.2, 5, 0xe8e4dc, { y: 2.1 }),
    jitter(G.ico(1.25, 0, 0xa7c84a, { y: 4.6 }), 0.3, 4),
    jitter(G.ico(0.9, 0, 0xc0d860, { x: 0.5, y: 5.4, z: 0.3 }), 0.2, 5),
  ]);
  K.dead = merge([
    G.cyl(0.16, 0.32, 3.6, 5, 0x4a4038, { y: 1.8 }),
    G.cyl(0.06, 0.12, 1.8, 4, 0x4a4038, { x: 0.55, y: 3.0, rz: -0.9 }),
    G.cyl(0.06, 0.1, 1.5, 4, 0x4a4038, { x: -0.5, y: 2.5, rz: 0.8 }),
    G.cyl(0.05, 0.08, 1.2, 4, 0x4a4038, { z: 0.4, y: 3.4, rx: 0.7 }),
  ]);
  K.charred = merge([
    G.cyl(0.14, 0.3, 3.2, 5, 0x1e1a18, { y: 1.6 }),
    G.cyl(0.05, 0.1, 1.5, 4, 0x1e1a18, { x: 0.5, y: 2.6, rz: -1.0 }),
    G.cyl(0.05, 0.09, 1.3, 4, 0x2a2220, { x: -0.4, y: 2.2, rz: 0.9 }),
  ]);
  K.mushroom = merge([
    G.cyl(0.25, 0.35, 2.4, 6, 0xd8d0b8, { y: 1.2 }),
    G.sphere(1.5, 7, 4, 0x8a4fc8, { y: 2.4, sy: 0.55 }),
    G.ico(0.22, 0, 0xe8ff9a, { x: 0.7, y: 2.75, z: 0.3 }),
    G.ico(0.18, 0, 0xe8ff9a, { x: -0.5, y: 2.8, z: -0.6 }),
  ]);
  K.bush = merge([jitter(G.ico(0.85, 0, 0x4f8a36, { y: 0.55, sy: 0.75 }), 0.2, 6), jitter(G.ico(0.6, 0, 0x5a9a3c, { x: 0.6, y: 0.4 }), 0.15, 7)]);
  K.berry = merge([jitter(G.ico(0.8, 0, 0x3f7a30, { y: 0.55, sy: 0.75 }), 0.2, 8), G.ico(0.12, 0, 0xc0304a, { x: 0.5, y: 0.9, z: 0.4 }), G.ico(0.12, 0, 0xc0304a, { x: -0.4, y: 0.8, z: 0.5 })]);
  K.rock = jitter(G.dodeca(1, 0xb4b4b4, { y: 0.35, sy: 0.7 }), 0.3, 9);
  K.boulder = jitter(merge([G.dodeca(1.6, 0xa8a8a8, { y: 0.6, sy: 0.75 }), G.dodeca(0.9, 0xb8b8b8, { x: 1.3, y: 0.3, z: 0.3 })]), 0.35, 10);
  K.grass = merge([
    G.cone(0.08, 0.7, 3, 0x6f9e3c, { x: 0, y: 0.35, rz: 0.15 }),
    G.cone(0.08, 0.6, 3, 0x7aac44, { x: 0.15, y: 0.3, z: 0.1, rz: -0.25 }),
    G.cone(0.08, 0.55, 3, 0x649434, { x: -0.12, y: 0.27, z: -0.08, rx: 0.25 }),
  ]);
  K.flower_y = merge([G.cyl(0.02, 0.02, 0.5, 3, 0x4f8a36, { y: 0.25 }), G.ico(0.11, 0, 0xffd84a, { y: 0.52 })]);
  K.flower_p = merge([G.cyl(0.02, 0.02, 0.45, 3, 0x4f8a36, { y: 0.22 }), G.ico(0.1, 0, 0xb87ae8, { y: 0.47 }), G.cyl(0.02, 0.02, 0.35, 3, 0x4f8a36, { x: 0.15, y: 0.17 }), G.ico(0.08, 0, 0xe87aa8, { x: 0.15, y: 0.36 })]);
  K.reed = merge([
    G.cyl(0.03, 0.04, 1.8, 3, 0x7a8a4a, { y: 0.9 }), G.cyl(0.07, 0.07, 0.35, 4, 0x6a4a2a, { y: 1.7 }),
    G.cyl(0.03, 0.04, 1.5, 3, 0x7a8a4a, { x: 0.2, y: 0.75, rz: 0.1 }), G.cyl(0.03, 0.04, 1.3, 3, 0x8a9a5a, { x: -0.15, z: 0.1, y: 0.65, rz: -0.12 }),
  ]);
  K.lily = merge([G.cyl(0.6, 0.6, 0.04, 7, 0x4f8a3a, { y: 0.03 }), G.ico(0.1, 0, 0xf0d0e8, { x: 0.2, y: 0.12 })]);
  K.ice = merge([G.octa(0.8, 0xbfe6ff, { y: 1.1, sy: 2.2 }), G.octa(0.5, 0xdff4ff, { x: 0.6, y: 0.6, sy: 1.8, rz: 0.4 }), G.octa(0.4, 0xa8d8f8, { x: -0.5, y: 0.5, sy: 1.6, rz: -0.3 })]);
  K.obsidian = merge([G.cone(0.6, 2.6, 5, 0x2a2230, { y: 1.3 }), G.cone(0.4, 1.6, 5, 0x3a2a40, { x: 0.6, y: 0.8, rz: -0.3 }), G.cone(0.35, 1.3, 5, 0x1e1820, { x: -0.5, y: 0.6, rz: 0.35 })]);
  K.crystal = merge([G.octa(0.6, 0xb08aff, { y: 1.2, sy: 2.5 }), G.octa(0.4, 0xd0b0ff, { x: 0.5, y: 0.7, sy: 2, rz: 0.35 }), G.octa(0.35, 0x9a6ae8, { x: -0.45, y: 0.6, sy: 1.8, rz: -0.4 })]);
  K.pillar = merge([G.cyl(0.6, 0.7, 4.5, 8, 0xc8c2d6, { y: 2.25 }), G.box(1.7, 0.4, 1.7, 0xb8b2c8, { y: 0.2 }), G.cyl(0.62, 0.6, 0.6, 8, 0xb8b2c8, { y: 4.6, rz: 0.15 })]);
  K.pillar_broken = merge([G.cyl(0.6, 0.7, 2.2, 8, 0xc8c2d6, { y: 1.1, rz: 0.05 }), G.box(1.7, 0.4, 1.7, 0xb8b2c8, { y: 0.2 }), G.cyl(0.6, 0.6, 1.4, 8, 0xc0bad0, { x: 1.4, y: 0.6, rz: 1.5 })]);
  K.spire = jitter(merge([G.cone(1.6, 7, 5, 0x6a6e74, { y: 3.5 }), G.cone(0.9, 4, 5, 0x787c82, { x: 1.2, y: 2, rz: -0.25 })]), 0.4, 11);
  K.log = merge([G.cyl(0.35, 0.4, 4, 7, 0x5a4028, { y: 0.35, rz: Math.PI / 2 }), G.cyl(0.3, 0.3, 0.05, 7, 0xb8945a, { x: 2.01, y: 0.35, rz: Math.PI / 2 })]);
  K.stump = merge([G.cyl(0.5, 0.6, 0.8, 7, 0x5a4028, { y: 0.4 }), G.cyl(0.48, 0.48, 0.04, 7, 0xb8945a, { y: 0.81 })]);
  K.snowdrift = jitter(G.sphere(1.6, 7, 4, 0xf4f8fc, { y: 0, sy: 0.35 }), 0.3, 12);
  K.ashmound = jitter(G.sphere(1.4, 6, 4, 0x4a423e, { y: 0, sy: 0.4 }), 0.3, 13);
  return K;
}

// Правила расстановки: вероятность вида в ячейке сетки для каждого региона.
const RULES = {
  vale:   { oak: 0.035, birch: 0.015, bush: 0.04, berry: 0.012, rock: 0.02, boulder: 0.006, grass: 0.26, flower_y: 0.09, flower_p: 0.06, stump: 0.004 },
  forest: { pine: 0.2, oak: 0.11, birch: 0.03, bush: 0.07, mushroom: 0.008, rock: 0.025, boulder: 0.008, grass: 0.12, log: 0.015, stump: 0.012, flower_p: 0.02 },
  swamp:  { dead: 0.05, mushroom: 0.02, reed: 0.14, lily: 0.12, bush: 0.03, rock: 0.012, log: 0.02, grass: 0.06 },
  frost:  { pine_snow: 0.09, rock: 0.05, boulder: 0.025, ice: 0.025, snowdrift: 0.05, dead: 0.006 },
  storm:  { spire: 0.03, rock: 0.06, boulder: 0.03, grass: 0.12, bush: 0.025, pine: 0.02, dead: 0.01 },
  ash:    { charred: 0.05, obsidian: 0.035, rock: 0.05, boulder: 0.02, ashmound: 0.04 },
  astral: { crystal: 0.03, pillar_broken: 0.018, pillar: 0.006, rock: 0.025, grass: 0.1, flower_p: 0.04, bush: 0.015 },
};
// Кроны и крупные объекты, которые не должны перекрывать камеру: [низ, верх, радиус кроны]
const OCCLUDE = { oak: [1.9, 5.4, 1.8], pine: [1.4, 6.4, 1.7], pine_snow: [1.4, 6.4, 1.7], birch: [3.3, 6.1, 1.3], dead: [1.2, 4.2, 1.0], charred: [1.0, 3.4, 0.9], mushroom: [1.4, 3.2, 1.5], spire: [0, 7, 1.6], boulder: [0, 1.8, 1.8], pillar: [0, 4.8, 0.8] };
const COLLIDE = { oak: 0.45, pine: 0.4, pine_snow: 0.4, birch: 0.3, dead: 0.35, charred: 0.35, mushroom: 0.4, rock: 0.85, boulder: 1.8, ice: 0.8, obsidian: 0.7, crystal: 0.6, pillar: 0.75, pillar_broken: 0.8, spire: 1.4, stump: 0.5 };
const SHADOW = new Set(['oak', 'pine', 'pine_snow', 'birch', 'dead', 'charred', 'mushroom', 'boulder', 'pillar', 'pillar_broken', 'spire', 'ice', 'obsidian', 'crystal']);
const BIG = new Set(['oak', 'pine', 'pine_snow', 'birch', 'dead', 'charred', 'mushroom', 'pillar', 'spire']);
const ROCK_TINT = { vale: 0x9a968a, forest: 0x7a7e70, swamp: 0x6a6a58, frost: 0x9aa6b4, storm: 0x80848a, ash: 0x3a3432, astral: 0xb0a8c8 };
const WATER_KINDS = new Set(['lily']);
const SHORE_KINDS = new Set(['reed']);

export class Props {
  constructor(scene, terrain, colliders, exclusions, occluders) {
    this.scene = scene;
    this.kinds = buildKinds();
    this.chunks = [];
    const rng = new RNG(CONFIG.SEED + 55);
    const half = CONFIG.WORLD_HALF, step = 4.6, CH = CONFIG.RENDER.chunk;
    const nCh = Math.ceil((half * 2) / CH);
    const buckets = new Map(); // ключ: chunk|kind → массив матриц
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const tint = new THREE.Color();
    for (let z = -half; z < half; z += step) {
      for (let x = -half; x < half; x += step) {
        const px = x + rng.float(0, step), pz = z + rng.float(0, step);
        const h = terrain.heightAt(px, pz);
        const region = terrain.regionAt(px, pz);
        const rules = RULES[region.id];
        if (!rules) { rng.next(); continue; }
        let roll = rng.next();
        let kind = null;
        for (const k in rules) { roll -= rules[k]; if (roll <= 0) { kind = k; break; } }
        if (!kind) continue;
        // Условия места
        if (WATER_KINDS.has(kind)) { if (h > -0.2 || h < -2.5) continue; }
        else if (SHORE_KINDS.has(kind)) { if (h > 1.2 || h < -1.0) continue; }
        else if (h < 0.4) continue;
        const nrm = terrain.normalAt(px, pz);
        if (BIG.has(kind) && nrm.y < 0.8) continue;
        if (terrain.roadDist(px, pz) < (BIG.has(kind) || COLLIDE[kind] ? 5.5 : 3)) continue;
        const exR = COLLIDE[kind] ? 1 : 0.25;
        let blocked = false;
        for (const e of exclusions) { const d = Math.hypot(px - e.x, pz - e.z); if (d < e.r * exR) { blocked = true; break; } }
        if (blocked) continue;
        const dd = Math.hypot(px - DOME.x, pz - DOME.z);
        if (Math.abs(dd - DOME.r) < 4) continue;
        const sc = kind === 'grass' || kind.startsWith('flower') ? rng.float(0.7, 1.4)
          : BIG.has(kind) ? rng.float(0.8, 1.5) : rng.float(0.6, 1.4);
        const yaw = rng.float(0, Math.PI * 2);
        const tiltAxis = new THREE.Vector3().crossVectors(up, nrm);
        q.setFromAxisAngle(up, yaw);
        if (!BIG.has(kind) && tiltAxis.lengthSq() > 1e-6) {
          const tq = new THREE.Quaternion().setFromUnitVectors(up, nrm);
          q.premultiply(tq);
        }
        s.set(sc, sc * (BIG.has(kind) ? rng.float(0.85, 1.25) : 1), sc);
        p.set(px, WATER_KINDS.has(kind) ? 0 : h - 0.05, pz);
        m.compose(p, q, s);
        const cx = Math.floor((px + half) / CH), cz = Math.floor((pz + half) / CH);
        const key = (cz * nCh + cx) + '|' + kind;
        let b = buckets.get(key); if (!b) { b = { cx, cz, kind, mats: [], cols: [] }; buckets.set(key, b); }
        b.mats.push(m.clone());
        if (kind === 'rock' || kind === 'boulder') tint.set(ROCK_TINT[region.id]).multiplyScalar(rng.float(1.05, 1.35));
        else tint.setRGB(1, 1, 1).multiplyScalar(rng.float(0.85, 1.12));
        b.cols.push(tint.clone());
        if (COLLIDE[kind]) colliders.addCircle(px, pz, COLLIDE[kind] * sc);
        const oc = OCCLUDE[kind];
        if (oc && occluders) { const c = occluders.addCircle(px, pz, oc[2] * sc); c.y0 = h + oc[0] * s.y; c.y1 = h + oc[1] * s.y; }
      }
    }
    // Чанки
    const chunkMap = new Map();
    for (const b of buckets.values()) {
      const key = b.cz * nCh + b.cx;
      let ch = chunkMap.get(key);
      if (!ch) {
        ch = { group: new THREE.Group(), x: -half + (b.cx + 0.5) * CH, z: -half + (b.cz + 0.5) * CH, small: [] };
        chunkMap.set(key, ch); this.chunks.push(ch); scene.add(ch.group);
      }
      const im = new THREE.InstancedMesh(this.kinds[b.kind], MAT.lambert, b.mats.length);
      for (let i = 0; i < b.mats.length; i++) { im.setMatrixAt(i, b.mats[i]); im.setColorAt(i, b.cols[i]); }
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
      im.computeBoundingSphere();
      im.castShadow = SHADOW.has(b.kind);
      im.receiveShadow = true;
      if (!SHADOW.has(b.kind) && b.kind !== 'rock') ch.small.push(im);
      ch.group.add(im);
    }
    this.count = [...buckets.values()].reduce((a, b) => a + b.mats.length, 0);
  }

  update(px, pz, quality) {
    const far = CONFIG.RENDER.propViewDist * (quality === 'low' ? 0.6 : 1);
    const smallFar = quality === 'low' ? 90 : 170;
    for (const ch of this.chunks) {
      const d = Math.hypot(ch.x - px, ch.z - pz) - CONFIG.RENDER.chunk * 0.7;
      ch.group.visible = d < far;
      for (const im of ch.small) im.visible = d < smallFar;
    }
  }
}
