import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { makeNoise, smoothstep, lerp, clamp } from '../core/rng.js';
import { REGIONS, DOME, VOLCANO } from '../data/regions.js';
import { ROADS, FLATTEN, LAVA } from '../data/locations.js';

const NR = REGIONS.length;
const tmpW = new Float32Array(NR);
const tmpD = new Float32Array(NR);
const C = (hex) => new THREE.Color(hex);

// Процедурный остров: мягкий Вороной по центрам регионов + свой рельеф у каждого биома.
export class Terrain {
  constructor(seed) {
    this.nz = makeNoise(seed);
    this.nz2 = makeNoise(seed + 101);
    this.half = CONFIG.WORLD_HALF;
    this.segs = CONFIG.TERRAIN_SEGS;
    this.n = this.segs + 1;
    this.cell = (this.half * 2) / this.segs;
    this.heights = new Float32Array(this.n * this.n);
    this.regionGrid = new Uint8Array(this.n * this.n);
    this.roadSegs = [];
    for (const road of ROADS) for (let i = 0; i < road.length - 1; i++) this.roadSegs.push([road[i], road[i + 1]]);
    this.flat = FLATTEN.map((f) => ({ ...f, target: Math.max(1.2, this.baseHeight(f.x, f.z)) }));
    this.regionColors = REGIONS.map((r) => ({
      g0: C(r.ground[0]), g1: C(r.ground[1]), high: C(r.high), beach: C(r.beach),
    }));
    this._build();
  }

  weights(x, z, out = tmpW) {
    const n2 = this.nz.n2;
    const px = x + 55 * n2(x * 0.0035, z * 0.0035);
    const pz = z + 55 * n2(x * 0.0035 + 40, z * 0.0035 - 17);
    let dmin = Infinity;
    for (let i = 0; i < NR; i++) {
      const c = REGIONS[i].center;
      const d = Math.hypot(px - c[0], pz - c[1]);
      tmpD[i] = d; if (d < dmin) dmin = d;
    }
    let sum = 0;
    for (let i = 0; i < NR; i++) { const w = Math.exp(-(tmpD[i] - dmin) / 38); out[i] = w; sum += w; }
    for (let i = 0; i < NR; i++) out[i] /= sum;
    return out;
  }

  regionHeight(i, x, z) {
    const { fbm, ridged } = this.nz;
    switch (REGIONS[i].id) {
      case 'vale': return 6 + fbm(x * 0.006, z * 0.006, 4) * 8 + fbm(x * 0.03, z * 0.03, 2) * 1.2;
      case 'forest': return 9 + fbm(x * 0.005, z * 0.005, 4) * 13 + fbm(x * 0.025, z * 0.025, 2) * 2;
      case 'swamp': return 0.7 + fbm(x * 0.012, z * 0.012, 3) * 2.8;
      case 'frost': return 14 + ridged(x * 0.0045, z * 0.0045, 5) * 62 + fbm(x * 0.03, z * 0.03, 2) * 2;
      case 'storm': {
        let h = 20 + fbm(x * 0.007, z * 0.007, 4) * 12 + ridged(x * 0.012, z * 0.012, 3) * 12;
        if (x > 620) h -= (x - 620) * 0.9;
        return h;
      }
      case 'ash': return 16 + fbm(x * 0.006, z * 0.006, 4) * 14 + ridged(x * 0.015, z * 0.015, 3) * 6;
      case 'astral': return 28 + fbm(x * 0.008, z * 0.008, 3) * 6;
      default: return 5;
    }
  }

  // Высота без зон выравнивания — нужна для вычисления их целевой высоты.
  baseHeight(x, z) {
    const w = this.weights(x, z);
    let h = 0;
    for (let i = 0; i < NR; i++) if (w[i] > 0.003) h += w[i] * this.regionHeight(i, x, z);
    // Вулкан Горн с кратером
    const dv = Math.hypot(x - VOLCANO.x, z - VOLCANO.z);
    if (dv < VOLCANO.r) {
      const cone = (d) => VOLCANO.h * Math.pow(1 - d / VOLCANO.r, 1.5);
      if (dv > VOLCANO.crater) h += cone(dv);
      else {
        const rim = cone(VOLCANO.crater);
        h += rim - 18 * smoothstep(VOLCANO.crater, VOLCANO.crater * 0.62, dv);
      }
    }
    // Старый Кратер
    const dc = Math.hypot(x - 78, z - 352);
    if (dc < 26) h += -5 * Math.max(0, 1 - (dc / 16) ** 2) + 1.6 * Math.exp(-(((dc - 18) / 3) ** 2));
    // Остров: береговая линия с шумом
    const r = Math.hypot(x, z);
    const a = Math.atan2(z, x);
    const edge = 785 + 45 * this.nz2.n2(Math.cos(a) * 1.4, Math.sin(a) * 1.4);
    const mask = smoothstep(edge + 30, edge - 85, r);
    h = lerp(-16 + this.nz2.n2(x * 0.01, z * 0.01) * 2, h, mask);
    return h;
  }

  rawHeight(x, z) {
    let h = this.baseHeight(x, z);
    for (const f of this.flat) {
      const d = Math.hypot(x - f.x, z - f.z);
      if (d < f.r) h = lerp(h, f.target, smoothstep(f.r, f.r * 0.55, d));
    }
    return h;
  }

  roadDist(x, z) {
    let best = Infinity;
    for (const [a, b] of this.roadSegs) {
      const minx = Math.min(a[0], b[0]) - 8, maxx = Math.max(a[0], b[0]) + 8;
      const minz = Math.min(a[1], b[1]) - 8, maxz = Math.max(a[1], b[1]) + 8;
      if (x < minx || x > maxx || z < minz || z > maxz) continue;
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz), 0, 1);
      const d = Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t));
      if (d < best) best = d;
    }
    return best;
  }

  _build() {
    const { n, cell, half, heights } = this;
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const x = -half + ix * cell, z = -half + iz * cell;
        heights[iz * n + ix] = this.rawHeight(x, z);
      }
    }
    const pos = new Float32Array(n * n * 3);
    const col = new Float32Array(n * n * 3);
    const c = new THREE.Color(), tmp = new THREE.Color();
    const dirt = C(0x9a7f55), snowPath = C(0xb8b2ad), ashPath = C(0x5a4a40), stone = C(0xcac4d8);
    const lavaC = C(0xff5a1a), crack = C(0x6a2a1a), ice = C(0xcfe6f5), scorch = C(0x4a4438), domeStone = C(0xa79fbf);
    const under = C(0x3a5a5a);
    const w = new Float32Array(NR);
    for (let iz = 0; iz < n; iz++) {
      for (let ix = 0; ix < n; ix++) {
        const i = iz * n + ix;
        const x = -half + ix * cell, z = -half + iz * cell;
        const h = heights[i];
        pos[i * 3] = x; pos[i * 3 + 1] = h; pos[i * 3 + 2] = z;
        const hx = heights[iz * n + Math.min(ix + 1, n - 1)] - heights[iz * n + Math.max(ix - 1, 0)];
        const hz = heights[Math.min(iz + 1, n - 1) * n + ix] - heights[Math.max(iz - 1, 0) * n + ix];
        const slope = Math.hypot(hx, hz) / (2 * cell);
        this.weights(x, z, w);
        let best = 0;
        c.setRGB(0, 0, 0);
        const nv = this.nz.n2(x * 0.05, z * 0.05) * 0.5 + 0.5;
        for (let r = 0; r < NR; r++) {
          if (w[r] > w[best]) best = r;
          if (w[r] < 0.01) continue;
          const pal = this.regionColors[r];
          tmp.copy(pal.g0).lerp(pal.g1, nv);
          const rock = smoothstep(0.55, 1.0, slope);
          tmp.lerp(pal.high, rock);
          if (REGIONS[r].id === 'frost' && h > 55) tmp.lerp(C(0xffffff), 0.5);
          if (h < 1.8) tmp.lerp(pal.beach, smoothstep(1.8, 0.6, h));
          c.r += tmp.r * w[r]; c.g += tmp.g * w[r]; c.b += tmp.b * w[r];
        }
        this.regionGrid[i] = best;
        if (h < 0) c.lerp(under, smoothstep(0, -6, h) * 0.7);
        const rd = this.roadDist(x, z);
        if (rd < 4.2) {
          const id = REGIONS[best].id;
          const pc = id === 'frost' ? snowPath : id === 'ash' ? ashPath : id === 'astral' ? stone : dirt;
          c.lerp(pc, smoothstep(4.2, 1.8, rd) * 0.85);
        }
        // Особые зоны
        const dv = Math.hypot(x - VOLCANO.x, z - VOLCANO.z);
        if (dv < VOLCANO.r && this.nz2.ridged(x * 0.03, z * 0.03, 2) > 0.82) c.lerp(crack, 0.7);
        for (const l of LAVA) { const d = Math.hypot(x - l.x, z - l.z); if (d < l.r + 3) c.lerp(lavaC, smoothstep(l.r + 3, l.r - 1, d)); }
        const dl = Math.hypot(x + 390, z + 425);
        if (dl < 34) c.lerp(ice, smoothstep(34, 26, dl));
        const dc = Math.hypot(x - 78, z - 352);
        if (dc < 20) c.lerp(scorch, smoothstep(20, 8, dc) * 0.8);
        const dd = Math.hypot(x - DOME.x, z - DOME.z);
        if (dd < DOME.r - 10 && rd > 4 && this.nz.n2(x * 0.08, z * 0.08) > 0.35) c.lerp(domeStone, 0.6);
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
    }
    const idx = new Uint32Array(this.segs * this.segs * 6);
    let k = 0;
    for (let iz = 0; iz < this.segs; iz++) {
      for (let ix = 0; ix < this.segs; ix++) {
        const a = iz * n + ix, b = (iz + 1) * n + ix, cc = (iz + 1) * n + ix + 1, d = iz * n + ix + 1;
        idx[k++] = a; idx[k++] = b; idx[k++] = d;
        idx[k++] = b; idx[k++] = cc; idx[k++] = d;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    this.colors = col;
    const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = true;
    this.mesh.name = 'terrain';
  }

  // Точная высота поверхности (с той же триангуляцией, что и меш).
  heightAt(x, z) {
    const { n, cell, half, heights } = this;
    let gx = (x + half) / cell, gz = (z + half) / cell;
    gx = clamp(gx, 0, this.segs - 0.0001); gz = clamp(gz, 0, this.segs - 0.0001);
    const ix = Math.floor(gx), iz = Math.floor(gz);
    const u = gx - ix, v = gz - iz;
    const ha = heights[iz * n + ix], hb = heights[(iz + 1) * n + ix];
    const hc = heights[(iz + 1) * n + ix + 1], hd = heights[iz * n + ix + 1];
    if (u + v <= 1) return ha + (hd - ha) * u + (hb - ha) * v;
    return hc + (hb - hc) * (1 - u) + (hd - hc) * (1 - v);
  }

  normalAt(x, z, out = new THREE.Vector3()) {
    const e = 1.2;
    const hx = this.heightAt(x + e, z) - this.heightAt(x - e, z);
    const hz = this.heightAt(x, z + e) - this.heightAt(x, z - e);
    return out.set(-hx, 2 * e, -hz).normalize();
  }

  regionAt(x, z) {
    const { n, cell, half } = this;
    const ix = clamp(Math.round((x + half) / cell), 0, this.segs);
    const iz = clamp(Math.round((z + half) / cell), 0, this.segs);
    return REGIONS[this.regionGrid[iz * n + ix]];
  }

  // Цвет поверхности (для карты)
  colorAt(x, z, out) {
    const { n, cell, half } = this;
    const ix = clamp(Math.round((x + half) / cell), 0, this.segs);
    const iz = clamp(Math.round((z + half) / cell), 0, this.segs);
    const i = (iz * n + ix) * 3;
    out[0] = this.colors[i]; out[1] = this.colors[i + 1]; out[2] = this.colors[i + 2];
    return this.heights[iz * n + ix];
  }

  // Марш луча по рельефу: точка попадания или null.
  raycast(origin, dir, maxDist = 120, step = 0.6) {
    let prevT = 0;
    for (let t = step; t <= maxDist; t += step) {
      const x = origin.x + dir.x * t, y = origin.y + dir.y * t, z = origin.z + dir.z * t;
      if (y < this.heightAt(x, z)) {
        let lo = prevT, hi = t;
        for (let i = 0; i < 6; i++) {
          const m = (lo + hi) / 2;
          const mx = origin.x + dir.x * m, my = origin.y + dir.y * m, mz = origin.z + dir.z * m;
          if (my < this.heightAt(mx, mz)) hi = m; else lo = m;
        }
        return hi;
      }
      prevT = t;
      if (t > 20) step = 1.2;
    }
    return null;
  }
}
