import { CONFIG } from '../config.js';

// Растровая карта острова (один раз при старте): цвета рельефа + отмывка + вода.
export function buildMapCanvas(terrain, size = 1024) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const half = CONFIG.WORLD_HALF;
  const col = [0, 0, 0];
  const step = (half * 2) / size;
  const toS = (v) => Math.round(Math.pow(Math.min(1, Math.max(0, v)), 1 / 2.2) * 255);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = -half + (px + 0.5) * step, z = -half + (py + 0.5) * step;
      const h = terrain.colorAt(x, z, col);
      const hx = terrain.heightAt(x + step * 1.5, z), hz = terrain.heightAt(x, z + step * 1.5);
      let shade = 1 + (h - hx) * 0.05 + (h - hz) * 0.05;
      shade = Math.min(1.35, Math.max(0.6, shade));
      let r = col[0] * shade, g = col[1] * shade, b = col[2] * shade;
      if (h < 0) {
        const d = Math.min(1, -h / 10);
        r = r * (1 - d) * 0.4 + 0.05 * d + 0.02; g = g * (1 - d) * 0.5 + 0.18 * d + 0.06; b = b * (1 - d) * 0.5 + 0.32 * d + 0.12;
      }
      const i = (py * size + px) * 4;
      img.data[i] = toS(r); img.data[i + 1] = toS(g); img.data[i + 2] = toS(b); img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

export const MAP_GRID = 64;
export function toMap(x, z, size) {
  const half = CONFIG.WORLD_HALF;
  return { x: ((x + half) / (half * 2)) * size, y: ((z + half) / (half * 2)) * size };
}
export function fromMap(px, py, size) {
  const half = CONFIG.WORLD_HALF;
  return { x: (px / size) * half * 2 - half, z: (py / size) * half * 2 - half };
}
