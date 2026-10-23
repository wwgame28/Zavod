import * as THREE from 'three';
import { G, merge, jitter } from './geo.js';
import { RNG } from '../core/rng.js';

// Строители построек. Каждый возвращает { solid: [геометрии], glow: [светящиеся], col: [коллайдеры], anim?, lights? }
// в локальных координатах (начало — центр основания). Коллайдеры: {c:[x,z,r]} или {b:[x,z,hw,hd,rot]}.

const WOOD = 0x6b4a2e, WOOD_D = 0x4a3220, STONE = 0x8a8680, STONE_L = 0xa8a49c, PALE = 0xc8c2d6, WARM = 0xffc46a;

function gableRoof(w, d, h, y, color) {
  const slope = Math.atan2(h, w / 2);
  const len = Math.hypot(w / 2, h) + 0.35;
  return [
    G.box(len, 0.28, d + 0.6, color, { x: -w / 4, y: y + h / 2, rz: slope }),
    G.box(len, 0.28, d + 0.6, color, { x: w / 4, y: y + h / 2, rz: -slope }),
    G.box(0.3, 0.3, d + 0.7, 0x3a2a1c, { y: y + h + 0.05 }),
  ];
}

function gableEnds(w, h, y, z, color) {
  // треугольные фронтоны — из сплющенного конуса с 3 гранями
  const g = [];
  for (const sz of [z, -z]) g.push(G.cone(w / 2 * 1.15, h, 3, color, { y: y + h / 2, z: sz, sz: 0.08, ry: Math.PI / 6 }));
  return g;
}

export const BUILD = {
  house({ color = 0xc9b08a, roof = 0x8c3b2e }) {
    const solid = [
      G.box(6.4, 0.4, 5.4, STONE, { y: 0.2 }),
      G.box(6, 3.2, 5, color, { y: 1.8 }),
      G.box(0.3, 3.4, 0.3, WOOD_D, { x: -3, y: 1.9, z: 2.5 }), G.box(0.3, 3.4, 0.3, WOOD_D, { x: 3, y: 1.9, z: 2.5 }),
      G.box(0.3, 3.4, 0.3, WOOD_D, { x: -3, y: 1.9, z: -2.5 }), G.box(0.3, 3.4, 0.3, WOOD_D, { x: 3, y: 1.9, z: -2.5 }),
      G.box(6.1, 0.25, 0.25, WOOD_D, { y: 3.4, z: 2.52 }),
      G.box(1.1, 2.0, 0.15, WOOD_D, { y: 1.4, z: 2.53 }),
      G.box(0.8, 1.6, 0.8, STONE, { x: 1.8, y: 5.4, z: -1 }),
      ...gableRoof(6.2, 5, 2.4, 3.4, roof),
      ...gableEnds(6, 2.3, 3.4, 2.45, color),
    ];
    const glow = [G.box(0.9, 0.8, 0.1, WARM, { x: -1.8, y: 2.1, z: 2.53 }), G.box(0.9, 0.8, 0.1, WARM, { x: 1.8, y: 2.1, z: 2.53 }), G.box(0.1, 0.8, 0.9, WARM, { x: 3.03, y: 2.1 })];
    return { solid, glow, col: [{ b: [0, 0, 3.2, 2.7, 0] }] };
  },

  tavern() {
    const c = 0xb89a70;
    const solid = [
      G.box(10.4, 0.5, 8.4, STONE, { y: 0.25 }),
      G.box(10, 3.4, 8, STONE_L, { y: 2.0 }),
      G.box(10.6, 3.2, 8.6, c, { y: 5.2 }),
      G.box(10.8, 0.3, 8.8, WOOD_D, { y: 3.7 }),
      ...gableRoof(10.6, 8.6, 3.4, 6.8, 0x6a3a28),
      ...gableEnds(10.6, 3.3, 6.8, 4.25, c),
      G.box(1.6, 2.4, 0.2, WOOD_D, { y: 1.5, z: 4.02 }),
      G.box(0.15, 1.6, 0.15, WOOD_D, { x: 2.5, y: 3.6, z: 4.6 }),
      G.box(1.6, 1.0, 0.12, 0x8a5a2a, { x: 2.5, y: 2.6, z: 4.6 }),
      G.cyl(0.5, 0.5, 1, 8, WOOD, { x: -4, y: 0.5, z: 5 }), G.cyl(0.5, 0.5, 1, 8, WOOD, { x: -3, y: 0.5, z: 5.2 }),
    ];
    const glow = [];
    for (const x of [-3.2, 0, 3.2]) glow.push(G.box(1.0, 0.9, 0.1, WARM, { x, y: 5.3, z: 4.32 }));
    for (const x of [-3, 3]) glow.push(G.box(1.0, 1.0, 0.1, WARM, { x: x * 1.1, y: 2.0, z: 4.02 }));
    return { solid, glow, col: [{ b: [0, 0, 5.3, 4.3, 0] }] };
  },

  tower() {
    const solid = [
      G.cyl(3.6, 3.9, 1, 10, STONE, { y: 0.5 }),
      G.cyl(2.9, 3.3, 13, 10, 0x8a8aa0, { y: 7 }),
      G.cyl(3.4, 3.4, 0.5, 10, 0x6a6a80, { y: 13.6 }),
      G.cone(3.8, 5.5, 10, 0x3a4a8a, { y: 16.6 }),
      G.box(1.3, 2.4, 0.4, WOOD_D, { y: 1.9, z: 3.1 }),
      G.cyl(0.08, 0.08, 3, 4, 0xd8c070, { y: 20.6 }),
    ];
    const float = [G.octa(0.8, 0x9fd8ff, { y: 22.6, sy: 1.5 })];
    const glow = [
      G.box(0.6, 1.0, 0.2, 0x9fd8ff, { x: 0, y: 7, z: 3.05 }), G.box(0.6, 1.0, 0.2, 0x9fd8ff, { x: 0, y: 10.5, z: -3.0 }),
      G.box(0.2, 1.0, 0.6, 0x9fd8ff, { x: 3.0, y: 9, z: 0 }), G.box(0.2, 1.0, 0.6, 0x9fd8ff, { x: -3.0, y: 5, z: 0 }),
    ];
    return { solid, glow, float, col: [{ c: [0, 0, 3.6] }] };
  },

  stall({ color = 0xc24a3a }) {
    const solid = [
      G.box(4, 1.1, 1.4, WOOD, { y: 0.55, z: 0.6 }),
      ...[[-1.9, 1.2], [1.9, 1.2], [-1.9, -1.0], [1.9, -1.0]].map(([x, z]) => G.box(0.18, 2.8, 0.18, WOOD_D, { x, y: 1.4, z })),
      G.box(4.6, 0.12, 3.0, color, { y: 2.9, rx: -0.18 }),
      G.box(4.6, 0.5, 0.06, 0xf0e0b0, { y: 2.6, z: 1.55 }),
      G.box(0.5, 0.4, 0.4, 0xd8a040, { x: -1.2, y: 1.3, z: 0.6 }), G.box(0.4, 0.5, 0.4, 0x8a4a8a, { x: -0.4, y: 1.35, z: 0.5 }),
      G.cyl(0.18, 0.2, 0.5, 6, 0x5aa9ff, { x: 0.5, y: 1.35, z: 0.6 }), G.cyl(0.18, 0.2, 0.5, 6, 0xff5a5a, { x: 1.0, y: 1.35, z: 0.6 }),
      G.box(0.6, 0.3, 0.5, 0xc9a36a, { x: 1.5, y: 1.25, z: 0.5 }),
    ];
    return { solid, glow: [], col: [{ b: [0, 0.4, 2.1, 1.0, 0] }] };
  },

  smithy() {
    const solid = [
      G.box(7, 0.3, 5.5, STONE, { y: 0.15 }),
      ...[[-3.2, 2.5], [3.2, 2.5], [-3.2, -2.5], [3.2, -2.5]].map(([x, z]) => G.box(0.3, 3.4, 0.3, WOOD_D, { x, y: 1.7, z })),
      ...gableRoof(7, 5.4, 1.8, 3.3, 0x5a4a3a),
      G.box(2.2, 1.6, 1.8, STONE, { x: -2, y: 0.8, z: -1.6 }),
      G.box(1.0, 4.5, 1.0, STONE, { x: -2.4, y: 3.2, z: -2.0 }),
      G.box(1.1, 0.5, 0.5, 0x2a2a2e, { x: 1.2, y: 0.95, z: 0.6 }), G.box(0.5, 0.7, 0.4, 0x2a2a2e, { x: 1.2, y: 0.4, z: 0.6 }),
      G.cyl(0.5, 0.45, 0.9, 8, WOOD, { x: 2.4, y: 0.45, z: -1.6 }),
      G.box(0.1, 1.4, 1.2, WOOD, { x: 3.1, y: 1.6, z: 0 }),
    ];
    const glow = [G.box(1.6, 0.25, 1.2, 0xff7a2a, { x: -2, y: 1.62, z: -1.6 })];
    return { solid, glow, col: [{ b: [-2, -1.6, 1.2, 1.0, 0] }, { c: [1.2, 0.6, 0.6] }], fire: { x: -2, y: 1.9, z: -1.6, color: 0xff7a2a } };
  },

  hut({ roof = 0x8a7a3a }) {
    const solid = [
      G.cyl(2.7, 2.8, 2.6, 9, 0xa08a62, { y: 1.3 }),
      G.cone(3.5, 3.0, 9, roof, { y: 4.0 }),
      G.box(1.0, 1.8, 0.3, WOOD_D, { y: 0.9, z: 2.7 }),
    ];
    const glow = [G.box(0.7, 0.6, 0.1, WARM, { x: 1.6, y: 1.6, z: 2.15, ry: 0.6 })];
    return { solid, glow, col: [{ c: [0, 0, 2.9] }] };
  },

  well() {
    const solid = [
      G.cyl(1.3, 1.4, 1.0, 10, STONE_L, { y: 0.5 }),
      G.cyl(1.0, 1.0, 1.02, 10, 0x2a3a4a, { y: 0.52 }),
      G.box(0.2, 2.6, 0.2, WOOD_D, { x: -1.1, y: 1.3 }), G.box(0.2, 2.6, 0.2, WOOD_D, { x: 1.1, y: 1.3 }),
      G.cyl(0.12, 0.12, 2.4, 6, WOOD, { y: 2.2, rz: Math.PI / 2 }),
      ...gableRoof(2.8, 1.6, 0.8, 2.6, 0x8c3b2e),
    ];
    return { solid, glow: [], col: [{ c: [0, 0, 1.5] }] };
  },

  windmill() {
    const solid = [
      G.cyl(1.6, 2.5, 8.5, 8, 0xd8ccb0, { y: 4.25 }),
      G.cone(2.2, 2.4, 8, 0x8c3b2e, { y: 9.7 }),
      G.box(1, 2, 0.3, WOOD_D, { y: 1, z: 2.3 }),
      G.cyl(0.3, 0.3, 1.2, 6, WOOD_D, { y: 8, z: 1.9, rx: Math.PI / 2 }),
    ];
    const blades = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      blades.push(G.box(0.3, 5.2, 0.08, WOOD, { x: Math.sin(a) * 2.6, y: Math.cos(a) * 2.6, rz: -a }));
      blades.push(G.box(1.1, 4.0, 0.04, 0xf0e8d8, { x: Math.sin(a) * 3.0 + Math.cos(a) * 0.6, y: Math.cos(a) * 3.0 - Math.sin(a) * 0.6, rz: -a }));
    }
    return { solid, glow: [], col: [{ c: [0, 0, 2.5] }], rotor: { geo: merge(blades), y: 8, z: 2.5, axis: 'z', speed: 0.6 } };
  },

  fence({ len = 20 }) {
    const solid = [];
    const n = Math.max(2, Math.round(len / 2.5));
    for (let i = 0; i <= n; i++) solid.push(G.box(0.2, 1.3, 0.2, WOOD_D, { x: -len / 2 + (i * len) / n, y: 0.65 }));
    solid.push(G.box(len, 0.12, 0.1, WOOD, { y: 0.9 }), G.box(len, 0.12, 0.1, WOOD, { y: 0.45 }));
    return { solid, glow: [], col: [{ b: [0, 0, len / 2, 0.2, 0] }] };
  },

  gate() {
    const solid = [
      G.box(0.6, 4.4, 0.6, WOOD_D, { x: -3.2, y: 2.2 }), G.box(0.6, 4.4, 0.6, WOOD_D, { x: 3.2, y: 2.2 }),
      G.box(7.4, 0.5, 0.6, WOOD, { y: 4.4 }),
      G.box(2.6, 0.8, 0.12, 0x8a5a2a, { y: 3.7, z: 0.35 }),
    ];
    const glow = [G.ico(0.25, 0, WARM, { x: -3.2, y: 4.9 }), G.ico(0.25, 0, WARM, { x: 3.2, y: 4.9 })];
    return { solid, glow, col: [{ c: [-3.2, 0, 0.5] }, { c: [3.2, 0, 0.5] }] };
  },

  crater() {
    const rng = new RNG(7);
    const solid = [], glow = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2 + rng.float(-0.1, 0.1), r = rng.float(15, 19);
      solid.push(jitter(G.dodeca(rng.float(0.6, 1.3), 0x3a342c, { x: Math.cos(a) * r, y: 0.2, z: Math.sin(a) * r }), 0.3, i));
    }
    for (let i = 0; i < 9; i++) {
      const a = rng.float(0, Math.PI * 2), r = rng.float(0, 6);
      glow.push(G.octa(rng.float(0.3, 0.8), 0x7fd8ff, { x: Math.cos(a) * r, y: rng.float(0.3, 1.2), z: Math.sin(a) * r, sy: 2, rz: rng.float(-0.5, 0.5) }));
    }
    return { solid, glow, col: [], aura: { color: 0x7fd8ff, y: 1 } };
  },

  tent({ color = 0x7a5a3a, snow = false }) {
    const solid = [G.cone(2.4, 2.8, 4, color, { y: 1.4, ry: Math.PI / 4 }), G.box(0.9, 1.4, 0.1, 0x2a1a10, { y: 0.7, z: 1.25 })];
    if (snow) solid.push(G.cone(1.1, 1.3, 4, 0xf0f4f8, { y: 2.2, ry: Math.PI / 4 }));
    return { solid, glow: [], col: [{ c: [0, 0, 1.9] }] };
  },

  campfire() {
    const solid = [];
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; solid.push(G.dodeca(0.3, 0x6a6660, { x: Math.cos(a) * 0.9, y: 0.15, z: Math.sin(a) * 0.9 })); }
    solid.push(G.cyl(0.12, 0.12, 1.4, 5, WOOD_D, { y: 0.2, rz: Math.PI / 2, ry: 0.5 }), G.cyl(0.12, 0.12, 1.4, 5, WOOD_D, { y: 0.25, rz: Math.PI / 2, ry: -0.7 }));
    const glow = [G.cone(0.45, 1.0, 5, 0xff9a3a, { y: 0.7 }), G.cone(0.25, 0.7, 5, 0xffe07a, { y: 0.6 })];
    return { solid, glow, col: [{ c: [0, 0, 1.0] }], fire: { x: 0, y: 1, z: 0, color: 0xff8a3a } };
  },

  palisade({ r = 24 }) {
    const solid = [], col = [];
    const n = Math.round((Math.PI * 2 * r) / 1.1);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (a > 0.95 * Math.PI && a < 1.2 * Math.PI) continue; // проход на запад
      if (a > 1.85 * Math.PI || a < 0.1 * Math.PI) continue; // проход на восток
      const x = Math.cos(a) * r, z = Math.sin(a) * r, h = 2.6 + (i % 3) * 0.3;
      solid.push(G.cyl(0.22, 0.26, h, 5, WOOD_D, { x, y: h / 2, z }), G.cone(0.24, 0.5, 5, WOOD, { x, y: h + 0.25, z }));
      if (i % 2 === 0) col.push({ c: [x, z, 0.75] });
    }
    return { solid, glow: [], col };
  },

  stonecircle({ r = 11 }) {
    const rng = new RNG(3);
    const solid = [], glow = [], col = [];
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, x = Math.cos(a) * r, z = Math.sin(a) * r, h = rng.float(3.4, 4.6);
      solid.push(jitter(G.box(1.2, h, 0.8, 0x7a7e72, { x, y: h / 2, z, ry: -a }), 0.15, i));
      glow.push(G.box(0.3, 0.9, 0.05, 0x9be06a, { x: Math.cos(a) * (r - 0.42), y: h * 0.6, z: Math.sin(a) * (r - 0.42), ry: -a + Math.PI / 2 }));
      col.push({ c: [x, z, 0.9] });
    }
    solid.push(jitter(G.cyl(1.8, 2.0, 0.8, 8, 0x8a8a7e, { y: 0.4 }), 0.1, 20));
    glow.push(G.ring(0.6, 1.4, 12, 0x9be06a, { y: 0.83, rx: -Math.PI / 2 }));
    col.push({ c: [0, 0, 2.0] });
    return { solid, glow, col };
  },

  ruinhut() {
    const solid = [
      G.box(5, 2.2, 0.4, 0x8a7a5a, { y: 1.1, z: -2.2 }), G.box(0.4, 1.6, 4.6, 0x8a7a5a, { x: -2.4, y: 0.8 }),
      G.box(0.4, 2.6, 2.0, 0x8a7a5a, { x: 2.4, y: 1.3, z: -1.2 }), G.box(2.0, 0.9, 0.4, 0x8a7a5a, { x: 1.4, y: 0.45, z: 2.2 }),
      G.box(5.4, 0.25, 3.2, 0x5a4a2a, { y: 1.4, z: -0.6, rx: 0.5, rz: 0.2 }),
      G.cyl(0.35, 0.4, 3.5, 6, WOOD_D, { x: 1, y: 0.35, z: 1.2, rz: Math.PI / 2, ry: 0.4 }),
    ];
    return { solid, glow: [], col: [{ b: [0, -2.2, 2.5, 0.3, 0] }, { b: [-2.4, 0, 0.3, 2.3, 0] }, { b: [2.4, -1.2, 0.3, 1.0, 0] }] };
  },

  tower_ruin() {
    const solid = [
      jitter(G.cyl(3.2, 3.6, 7, 9, 0x8a867e, { y: 3.5 }), 0.25, 1),
      jitter(G.box(2.6, 4, 1, 0x8a867e, { x: 1.6, y: 8.5, z: 1.8, ry: 0.6 }), 0.2, 2),
      jitter(G.box(2.2, 2.6, 1, 0x7a766e, { x: -1.8, y: 7.8, z: -1.4, ry: 2.2 }), 0.2, 3),
      jitter(G.dodeca(1.2, 0x7a766e, { x: 4.5, y: 0.4, z: 2 }), 0.3, 4),
      jitter(G.dodeca(0.9, 0x8a867e, { x: -4, y: 0.3, z: 3.2 }), 0.3, 5),
      G.box(1.4, 2.2, 0.4, 0x2a2018, { y: 1.1, z: 3.4 }),
    ];
    return { solid, glow: [], col: [{ c: [0, 0, 3.5] }] };
  },

  heartwood() {
    const solid = [
      jitter(G.cyl(3.6, 6, 20, 9, 0x3a2c22, { y: 10 }), 0.5, 1),
      jitter(G.cyl(1.0, 2.0, 9, 6, 0x3a2c22, { x: 4, y: 3, z: 2, rz: -1.1 }), 0.3, 2),
      jitter(G.cyl(1.0, 2.0, 9, 6, 0x3a2c22, { x: -4, y: 3, z: -2, rz: 1.1, ry: 0.6 }), 0.3, 3),
      jitter(G.cyl(0.9, 1.8, 8, 6, 0x3a2c22, { x: 1, y: 3, z: -4.5, rx: -1.1 }), 0.3, 4),
      jitter(G.ico(9, 1, 0x2f4a2a, { y: 25 }), 1.4, 5),
      jitter(G.ico(6, 1, 0x3a5a34, { x: 6, y: 21, z: 3 }), 1, 6),
      jitter(G.ico(6, 1, 0x2a4228, { x: -6, y: 22, z: -3 }), 1, 7),
    ];
    const glow = [];
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; glow.push(G.box(0.25, 6, 0.25, 0x9be06a, { x: Math.cos(a) * 4.3, y: 6, z: Math.sin(a) * 4.3, rz: Math.cos(a) * 0.2, rx: Math.sin(a) * 0.2 })); }
    return { solid, glow, col: [{ c: [0, 0, 5.4] }] };
  },

  webs() {
    const rng = new RNG(11);
    const glow = [];
    for (let i = 0; i < 10; i++) glow.push(G.cyl(rng.float(1.5, 3), rng.float(1.5, 3), 0.02, 8, 0xd8d8e0, { x: rng.float(-15, 15), y: rng.float(1, 5), z: rng.float(-15, 15), rx: rng.float(-1.2, 1.2), rz: rng.float(-1.2, 1.2) }));
    return { solid: [], glow, glowMat: 'add', col: [] };
  },

  stilthut() {
    const solid = [G.box(7, 0.3, 6, WOOD, { y: 2.4 })];
    for (const [x, z] of [[-3.2, -2.7], [3.2, -2.7], [-3.2, 2.7], [3.2, 2.7], [0, 0]]) solid.push(G.cyl(0.2, 0.25, 3, 5, WOOD_D, { x, y: 1.2, z }));
    solid.push(G.box(5, 2.6, 4.2, 0x6a5a40, { y: 3.85 }), ...gableRoof(5.4, 4.4, 1.8, 5.15, 0x4a5a3a), ...gableEnds(5.2, 1.7, 5.15, 2.15, 0x6a5a40));
    solid.push(G.box(1, 0.1, 3.2, WOOD, { x: 0, y: 1.2, z: 4.3, rx: 0.75 }));
    solid.push(G.cyl(0.5, 0.4, 0.8, 7, 0x3a3a3a, { x: 2.6, y: 2.95, z: 2.0 }));
    const glow = [G.box(0.8, 0.7, 0.1, 0xb8ff7a, { x: 1.2, y: 4.0, z: 2.12 }), G.cyl(0.42, 0.42, 0.05, 7, 0x8aff4a, { x: 2.6, y: 3.37, z: 2.0 })];
    return { solid, glow, col: [{ c: [-3.2, -2.7, 0.4] }, { c: [3.2, -2.7, 0.4] }, { c: [-3.2, 2.7, 0.4] }, { c: [3.2, 2.7, 0.4] }, { c: [0, 0, 0.4] }] };
  },

  sunkentemple() {
    const solid = [], col = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, x = Math.cos(a) * 9, z = Math.sin(a) * 6;
      const h = i % 3 === 0 ? 2.5 : 6;
      solid.push(G.cyl(0.7, 0.8, h, 8, 0x6a7a62, { x, y: h / 2 - 0.5, z }));
      col.push({ c: [x, z, 0.9] });
    }
    solid.push(G.box(20, 0.8, 1.4, 0x5a6a52, { y: 5.8, z: -6, rz: 0.08 }), G.box(10, 0.8, 1.4, 0x5a6a52, { x: -4, y: 5.4, z: 6, rz: -0.12 }));
    solid.push(jitter(G.box(4, 3, 2, 0x5a6a52, { z: -1, y: 1, ry: 0.3 }), 0.2, 3));
    const glow = [G.ring(2, 2.6, 16, 0xc0ff9a, { y: 0.1, rx: -Math.PI / 2, z: 3 })];
    return { solid, glow, col: [...col, { b: [0, -1, 2, 1, 0.3] }] };
  },

  rotlair() {
    const rng = new RNG(19);
    const solid = [], glow = [], col = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2, r = rng.float(25, 30), x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (i % 2) {
        solid.push(G.cyl(0.5, 0.7, 4, 6, 0xd8d0b8, { x, y: 2, z }), G.sphere(2.4, 7, 4, 0x6a8a3a, { x, y: 4, z, sy: 0.5 }));
        glow.push(G.ico(0.3, 0, 0xd8ff6a, { x: x + 1, y: 4.6, z }));
      } else solid.push(G.cyl(0.15, 0.3, 5, 5, 0xe8e0c8, { x, y: 2, z, rz: rng.float(-0.6, 0.6), rx: rng.float(-0.6, 0.6) }));
      col.push({ c: [x, z, 0.8] });
    }
    return { solid, glow, col };
  },

  icethrone() {
    const solid = [
      jitter(G.box(10, 3, 6, 0x9fd4f0, { y: 1.5 }), 0.4, 1),
      jitter(G.box(9, 12, 2.5, 0xbfe6ff, { y: 6, z: -2.5 }), 0.5, 2),
      jitter(G.box(2.5, 5, 6, 0xaadcf8, { x: -5, y: 3.5 }), 0.3, 3),
      jitter(G.box(2.5, 5, 6, 0xaadcf8, { x: 5, y: 3.5 }), 0.3, 4),
      G.octa(2, 0xdff4ff, { x: -4, y: 13, z: -2.5, sy: 2.5 }), G.octa(2, 0xdff4ff, { x: 4, y: 13, z: -2.5, sy: 2.5 }), G.octa(2.5, 0xeaf8ff, { y: 14.5, z: -2.5, sy: 2.8 }),
    ];
    const glow = [G.octa(0.8, 0x9fdcff, { y: 9, z: -1.1, sy: 1.6 })];
    return { solid, glow, col: [{ b: [0, -1, 6.3, 4.2, 0] }] };
  },

  frozenlake({ r = 34 }) {
    const rng = new RNG(23);
    const solid = [], col = [];
    for (let i = 0; i < 10; i++) {
      const a = rng.float(0, Math.PI * 2), d = rng.float(r * 0.85, r * 1.1), x = Math.cos(a) * d, z = Math.sin(a) * d;
      solid.push(G.octa(rng.float(0.8, 1.6), 0xbfe6ff, { x, y: 1, z, sy: 2.2, rz: rng.float(-0.4, 0.4) }));
      col.push({ c: [x, z, 1] });
    }
    return { solid, glow: [], col };
  },

  lighthouse() {
    const solid = [G.cyl(4, 4.4, 1.2, 10, STONE, { y: 0.6 })];
    for (let i = 0; i < 5; i++) {
      const y0 = 1.2 + i * 4, r0 = 3.3 - i * 0.28, r1 = 3.3 - (i + 1) * 0.28;
      solid.push(G.cyl(r1, r0, 4, 10, i % 2 ? 0xb83a2e : 0xf0ece4, { y: y0 + 2 }));
    }
    solid.push(G.cyl(2.4, 2.4, 0.4, 10, 0x3a3a3a, { y: 21.4 }));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; solid.push(G.box(0.15, 2.6, 0.15, 0x2a2a2a, { x: Math.cos(a) * 1.8, y: 22.9, z: Math.sin(a) * 1.8 })); }
    solid.push(G.cone(2.4, 1.8, 10, 0x2a2a2a, { y: 25.1 }), G.box(1.2, 2.2, 0.3, WOOD_D, { y: 2.3, z: 3.2 }));
    const glow = [G.ico(1.1, 1, 0xfff0a0, { y: 22.8 })];
    const beam = G.cone(4, 30, 10, 0xfff0a0, { x: 15, rz: Math.PI / 2 });
    return { solid, glow, col: [{ c: [0, 0, 4.2] }], rotor: { geo: beam, y: 0, z: 0, axis: 'y', speed: 0.7, mat: 'add', opacity: 0.18 }, light: { y: 22.8, color: 0xfff0a0 } };
  },

  stormspire() {
    const solid = [
      jitter(G.cone(7, 34, 7, 0x5a5e66, { y: 17 }), 1.2, 1),
      jitter(G.cone(3.5, 18, 6, 0x6a6e74, { x: 5, y: 9, z: 3, rz: -0.25 }), 0.8, 2),
      jitter(G.cone(3, 14, 6, 0x4a4e56, { x: -4, y: 7, z: -4, rz: 0.3 }), 0.8, 3),
    ];
    const glow = [G.octa(1.2, 0xfff27a, { x: 2.2, y: 22, z: 1.4, sy: 2 }), G.octa(1.0, 0xfff27a, { x: -1.6, y: 14, z: 2.4, sy: 2 }), G.octa(0.9, 0xfff27a, { x: 4.5, y: 8, z: 4.2, sy: 2 })];
    return { solid, glow, col: [{ c: [0, 0, 6.2] }] };
  },

  nests() {
    const rng = new RNG(31);
    const solid = [];
    for (let i = 0; i < 6; i++) {
      const x = rng.float(-14, 14), z = rng.float(-14, 14);
      solid.push(jitter(G.dodeca(1.8, 0x6a6e74, { x, y: 0.6, z, sy: 0.8 }), 0.4, i));
      solid.push(G.torus(1.1, 0.4, 5, 10, 0x6a5030, { x, y: 1.9, z, rx: Math.PI / 2 }));
    }
    return { solid, glow: [], col: [] };
  },

  forge() {
    const solid = [
      G.box(9, 0.5, 7, 0x3a3230, { y: 0.25 }),
      G.box(8, 4, 1.2, 0x4a3e38, { y: 2.2, z: -2.9 }),
      G.box(1.2, 4, 5, 0x4a3e38, { x: -3.9, y: 2.2, z: -0.8 }),
      ...gableRoof(8.4, 6.6, 1.8, 4.2, 0x2a2220),
      G.box(3, 2.4, 2.4, 0x5a4a42, { x: 1.8, y: 1.2, z: -1.6 }),
      G.box(1.4, 7, 1.4, 0x3a3230, { x: 2.4, y: 5, z: -2.4 }),
      G.box(1.2, 0.5, 0.6, 0x1e1e22, { x: -1, y: 1.0, z: 1 }), G.box(0.5, 0.75, 0.45, 0x1e1e22, { x: -1, y: 0.45, z: 1 }),
    ];
    const glow = [G.box(2.4, 0.4, 0.2, 0xff6a1a, { x: 1.8, y: 1.6, z: -0.38 }), G.box(1.0, 0.3, 1.0, 0xff8a2a, { x: 2.4, y: 8.6, z: -2.4 })];
    return { solid, glow, col: [{ b: [0, -2.9, 4, 0.7, 0] }, { b: [-3.9, -0.8, 0.7, 2.5, 0] }, { b: [1.8, -1.6, 1.5, 1.2, 0] }], fire: { x: 1.8, y: 2, z: -0.4, color: 0xff6a1a } };
  },

  obelisk() {
    const solid = [G.box(1.4, 0.6, 1.4, 0x1e1a1e, { y: 0.3 }), G.cyl(0.4, 0.7, 6, 4, 0x1e1a1e, { y: 3.6, ry: Math.PI / 4 })];
    const glow = [G.box(0.12, 3.5, 0.12, 0xff7a3d, { y: 3.5, z: 0.52 }), G.ico(0.4, 0, 0xff7a3d, { y: 7 })];
    return { solid, glow, col: [{ c: [0, 0, 1] }] };
  },

  gatearch() {
    const solid = [
      G.box(3.6, 1, 3.6, PALE, { x: -9, y: 0.5 }), G.box(3.6, 1, 3.6, PALE, { x: 9, y: 0.5 }),
      G.cyl(1.4, 1.6, 15, 8, PALE, { x: -9, y: 8.5 }), G.cyl(1.4, 1.6, 15, 8, PALE, { x: 9, y: 8.5 }),
      G.box(22, 2, 3, 0xb8b2c8, { y: 16.8 }), G.box(14, 1.2, 2.4, 0xb8b2c8, { y: 18.4 }),
      G.cone(1.4, 3, 6, PALE, { x: -9, y: 19.4 }), G.cone(1.4, 3, 6, PALE, { x: 9, y: 19.4 }),
    ];
    const float = [G.octa(1.4, 0xc7a6ff, { y: 21, sy: 1.6 })];
    const glow = [G.box(0.3, 10, 0.1, 0xc7a6ff, { x: -9, y: 8, z: 1.5 }), G.box(0.3, 10, 0.1, 0xc7a6ff, { x: 9, y: 8, z: 1.5 })];
    return { solid, glow, float, col: [{ c: [-9, 0, 1.9] }, { c: [9, 0, 1.9] }] };
  },

  ruins({ r = 24 }) {
    const rng = new RNG(Math.round(r * 13));
    const solid = [], col = [];
    for (let i = 0; i < 9; i++) {
      const a = rng.float(0, Math.PI * 2), d = rng.float(4, r), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (rng.chance(0.5)) {
        const h = rng.float(1.2, 5), w = rng.float(3, 7), rot = rng.float(0, Math.PI);
        solid.push(jitter(G.box(w, h, 0.9, PALE, { x, y: h / 2, z, ry: rot }), 0.2, i));
        col.push({ b: [x, z, w / 2, 0.5, rot] });
      } else {
        const h = rng.float(2, 7);
        solid.push(G.cyl(0.7, 0.8, h, 8, 0xbab4cc, { x, y: h / 2, z, rz: rng.float(-0.08, 0.08) }));
        col.push({ c: [x, z, 0.9] });
      }
    }
    return { solid, glow: [], col };
  },

  plaza({ r = 34 }) {
    const solid = [G.cyl(r, r, 0.4, 32, 0xbab4cc, { y: -0.1 }), G.cyl(r * 0.6, r * 0.6, 0.42, 24, 0xa8a2bc, { y: -0.08 })];
    solid.push(G.cyl(3, 3.4, 1.2, 10, PALE, { y: 0.6 }), jitter(G.box(1.4, 5, 1.2, 0xd8d2e6, { y: 3.6, rz: 0.12 }), 0.2, 4));
    const glow = [G.ring(r * 0.6 - 0.5, r * 0.6, 32, 0xc7a6ff, { y: 0.15, rx: -Math.PI / 2 })];
    return { solid, glow, col: [{ c: [0, 0, 3.4] }] };
  },

  observatory() {
    const solid = [
      G.cyl(7, 7.4, 6, 12, PALE, { y: 3 }),
      G.sphere(7, 12, 6, 0x8a7fae, { y: 6, sy: 0.75 }),
      G.cyl(0.8, 1.1, 9, 8, 0x5a5070, { x: 2, y: 10, rz: -0.7 }),
      G.box(2, 3, 0.3, 0x3a3048, { y: 1.5, z: 7.2 }),
    ];
    const glow = [G.ring(4, 4.6, 16, 0xc7a6ff, { y: 9.5, rx: -Math.PI / 2 })];
    return { solid, glow, col: [{ c: [0, 0, 7.4] }] };
  },

  sanctum() {
    const solid = [G.cyl(32, 33, 0.3, 32, 0xa8a2bc, { y: 0 }), G.cyl(24, 24, 0.32, 32, 0x8a84a0, { y: 0.02 })];
    const col = [];
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2, x = Math.cos(a) * 29, z = Math.sin(a) * 29;
      const h = i % 4 === 1 ? 4 : 11;
      solid.push(G.cyl(1.1, 1.3, h, 8, PALE, { x, y: h / 2, z }));
      col.push({ c: [x, z, 1.4] });
    }
    solid.push(G.cyl(4, 5, 2, 8, 0x6a6080, { z: -20, y: 1 }), G.cyl(2.5, 3, 1, 8, 0x7a7090, { z: -20, y: 2.5 }));
    col.push({ c: [0, -20, 5] });
    const glow = [G.ring(23.5, 24.2, 48, 0xc7a6ff, { y: 0.2, rx: -Math.PI / 2 })];
    const heart = merge([G.octa(4.5, 0x9ad8ff, { sy: 1.4 }), G.octa(2.6, 0xffffff, { sy: 1.4, ry: 0.8 })]);
    return { solid, glow, col, heart: { geo: heart, y: 10, z: -20 } };
  },
};
