import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Вспомогательные функции low-poly геометрии с «запечёнными» цветами вершин.
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _c = new THREE.Color();

export const MAT = {
  lambert: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
  glowAdd: new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
};

// Приводит геометрию к неиндексированной, убирает UV и красит в один цвет.
export function paint(geo, hex) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  if (g.attributes.uv) g.deleteAttribute('uv');
  if (g.attributes.uv1) g.deleteAttribute('uv1');
  _c.set(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = _c.r; arr[i * 3 + 1] = _c.g; arr[i * 3 + 2] = _c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

// Трансформация: позиция, поворот (радианы), масштаб.
export function xf(geo, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, sx = s, sy = s, sz = s } = {}) {
  _e.set(rx, ry, rz);
  _q.setFromEuler(_e);
  _m.compose(new THREE.Vector3(x, y, z), _q, new THREE.Vector3(sx, sy, sz));
  geo.applyMatrix4(_m);
  return geo;
}

// Детерминированное «дрожание» вершин по их координатам — швы не расходятся.
export function jitter(geo, amt = 0.15, seed = 1) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + seed) * 43758.5453;
    const h2 = Math.sin(x * 93.989 + y * 17.233 + z * 61.719 + seed) * 23421.631;
    const h3 = Math.sin(x * 33.17 + y * 51.71 + z * 11.3 + seed) * 12345.678;
    p.setXYZ(i, x + (h - Math.floor(h) - 0.5) * amt, y + (h2 - Math.floor(h2) - 0.5) * amt, z + (h3 - Math.floor(h3) - 0.5) * amt);
  }
  geo.computeVertexNormals();
  return geo;
}

export function merge(list) {
  const valid = list.filter(Boolean);
  if (!valid.length) return null;
  const g = mergeGeometries(valid, false);
  g.computeBoundingSphere();
  return g;
}

// Короткие конструкторы примитивов
export const G = {
  box: (w, h, d, col, t) => xf(paint(new THREE.BoxGeometry(w, h, d), col), t),
  cyl: (rt, rb, h, seg, col, t) => xf(paint(new THREE.CylinderGeometry(rt, rb, h, seg), col), t),
  cone: (r, h, seg, col, t) => xf(paint(new THREE.ConeGeometry(r, h, seg), col), t),
  ico: (r, det, col, t) => xf(paint(new THREE.IcosahedronGeometry(r, det), col), t),
  dodeca: (r, col, t) => xf(paint(new THREE.DodecahedronGeometry(r, 0), col), t),
  octa: (r, col, t) => xf(paint(new THREE.OctahedronGeometry(r, 0), col), t),
  sphere: (r, ws, hs, col, t) => xf(paint(new THREE.SphereGeometry(r, ws, hs), col), t),
  torus: (r, tube, rs, ts, col, t) => xf(paint(new THREE.TorusGeometry(r, tube, rs, ts), col), t),
  ring: (ri, ro, seg, col, t) => xf(paint(new THREE.RingGeometry(ri, ro, seg), col), t),
};

export function meshOf(geo, mat = MAT.lambert, shadows = true) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = shadows; m.receiveShadow = shadows;
  return m;
}
