// Статические коллайдеры (окружности и повёрнутые прямоугольники) в пространственной сетке.
const CELL = 16;

export class Colliders {
  constructor() { this.grid = new Map(); this.all = []; }
  _key(cx, cz) { return cx * 73856093 ^ cz * 19349663; }
  _insert(c, minx, minz, maxx, maxz) {
    const x0 = Math.floor(minx / CELL), x1 = Math.floor(maxx / CELL);
    const z0 = Math.floor(minz / CELL), z1 = Math.floor(maxz / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
      const k = this._key(cx, cz);
      let arr = this.grid.get(k); if (!arr) { arr = []; this.grid.set(k, arr); }
      arr.push(c);
    }
    this.all.push(c);
  }
  addCircle(x, z, r, tag = null) {
    const c = { t: 0, x, z, r, tag };
    this._insert(c, x - r, z - r, x + r, z + r);
    return c;
  }
  // Прямоугольник с полуразмерами hw × hd, повёрнутый на rot вокруг Y (как rotation.y у меша).
  addBox(x, z, hw, hd, rot = 0, tag = null) {
    const c = { t: 1, x, z, hw, hd, cos: Math.cos(rot), sin: Math.sin(rot), tag };
    const R = Math.hypot(hw, hd);
    this._insert(c, x - R, z - R, x + R, z + R);
    return c;
  }
  remove(tag) {
    for (const arr of this.grid.values()) for (let i = arr.length - 1; i >= 0; i--) if (arr[i].tag === tag) arr.splice(i, 1);
    this.all = this.all.filter((c) => c.tag !== tag);
  }

  // Попадает ли точка (x, y, z) внутрь какого-либо препятствия (для камеры)
  pointIn(x, y, z, pad = 0.3) {
    const arr = this.grid.get(this._key(Math.floor(x / CELL), Math.floor(z / CELL)));
    if (!arr) return false;
    for (const c of arr) {
      if (c.y0 !== undefined && (y < c.y0 - pad || y > c.y1 + pad)) continue;
      if (c.t === 0) { if (Math.hypot(x - c.x, z - c.z) < c.r + pad) return true; }
      else {
        const dx = x - c.x, dz = z - c.z;
        const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
        if (Math.abs(lx) < c.hw + pad && Math.abs(lz) < c.hd + pad && (c.y1 === undefined || y < c.y1)) return true;
      }
    }
    return false;
  }

  // Выталкивает окружность (x, z, r) из коллайдеров. Возвращает исправленную позицию в out.
  resolve(x, z, r, out) {
    out.x = x; out.z = z; out.hit = false;
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let ox = -1; ox <= 1; ox++) for (let oz = -1; oz <= 1; oz++) {
      const arr = this.grid.get(this._key(cx + ox, cz + oz));
      if (!arr) continue;
      for (const c of arr) {
        if (c.t === 0) {
          const dx = out.x - c.x, dz = out.z - c.z;
          const d = Math.hypot(dx, dz), min = c.r + r;
          if (d < min && d > 1e-5) { out.x = c.x + (dx / d) * min; out.z = c.z + (dz / d) * min; out.hit = true; }
        } else {
          // в локальные координаты прямоугольника
          const dx = out.x - c.x, dz = out.z - c.z;
          const lx = dx * c.cos - dz * c.sin, lz = dx * c.sin + dz * c.cos;
          const px = Math.max(-c.hw, Math.min(c.hw, lx)), pz = Math.max(-c.hd, Math.min(c.hd, lz));
          let ex = lx - px, ez = lz - pz;
          let d = Math.hypot(ex, ez);
          if (d < r) {
            let nx, nz, push;
            if (d > 1e-5) { nx = ex / d; nz = ez / d; push = r - d; }
            else {
              // центр внутри — выталкиваем к ближайшей стороне
              const ax = c.hw - Math.abs(lx), az = c.hd - Math.abs(lz);
              if (ax < az) { nx = Math.sign(lx) || 1; nz = 0; push = ax + r; } else { nx = 0; nz = Math.sign(lz) || 1; push = az + r; }
            }
            const nlx = lx + nx * push, nlz = lz + nz * push;
            out.x = c.x + nlx * c.cos + nlz * c.sin;
            out.z = c.z - nlx * c.sin + nlz * c.cos;
            out.hit = true;
          }
        }
      }
    }
    return out;
  }
}
