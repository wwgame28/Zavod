import { createNoise2D } from 'simplex-noise';

// Детерминированный ГСЧ: одинаковый сид — одинаковый мир, баги воспроизводимы.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed = 1) { this.next = mulberry32(seed); }
  float(min = 0, max = 1) { return min + (max - min) * this.next(); }
  int(min, max) { return Math.floor(this.float(min, max + 1)); }
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  weighted(weights) {
    let sum = 0; for (const w of weights) sum += w;
    let r = this.next() * sum;
    for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i; }
    return weights.length - 1;
  }
}

// Глобальный «живой» рандом (бой, лут) — не влияет на генерацию мира.
export const rng = new RNG((Date.now() ^ 0x9e3779b9) >>> 0);

export function makeNoise(seed) {
  const n2 = createNoise2D(mulberry32(seed));
  const fbm = (x, z, oct = 4, lac = 2, gain = 0.5) => {
    let a = 1, f = 1, s = 0, norm = 0;
    for (let i = 0; i < oct; i++) { s += a * n2(x * f, z * f); norm += a; a *= gain; f *= lac; }
    return s / norm;
  };
  const ridged = (x, z, oct = 4) => {
    let a = 1, f = 1, s = 0, norm = 0;
    for (let i = 0; i < oct; i++) { const v = 1 - Math.abs(n2(x * f, z * f)); s += a * v * v; norm += a; a *= 0.5; f *= 2.03; }
    return s / norm;
  };
  return { n2, fbm, ridged };
}

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
export const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
export const angleLerp = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; };
export const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
export const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
