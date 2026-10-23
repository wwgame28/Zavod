import * as THREE from 'three';
import { ELEMENTS } from '../config.js';
import { Particles } from './particles.js';

const EL_COLOR = {
  physical: 0xe8e2d0, arcane: 0xc7a6ff, fire: 0xff7a3d, frost: 0x8fd8ff, storm: 0xffe066, nature: 0x7ee081, shadow: 0xb071ff,
};

// Визуальные эффекты: вспышки, взрывы, молнии, кольца-телеграфы.
export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.glow = new Particles(scene, 6000, true);
    this.soft = new Particles(scene, 2500, false);
    this.bolts = [];
    this.rings = [];
    this.boltMat = new THREE.LineBasicMaterial({ color: 0xfff27a, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.ringGeo = new THREE.RingGeometry(0.92, 1, 40);
    this.ringGeo.rotateX(-Math.PI / 2);
    this.discGeo = new THREE.CircleGeometry(1, 40);
    this.discGeo.rotateX(-Math.PI / 2);
  }
  setScale(h, fov) { this.glow.setScale(h, fov); this.soft.setScale(h, fov); }

  color(el) { return EL_COLOR[el] ?? 0xffffff; }

  hit(x, y, z, el = 'physical') {
    this.glow.emit({ x, y, z, count: 10, color: this.color(el), speed: 5, life: 0.35, size: 0.35, drag: 4, spread: 0.3 });
  }
  explode(x, y, z, r, el = 'fire') {
    const c = this.color(el);
    this.glow.emit({ x, y, z, count: Math.round(30 + r * 12), color: c, speed: r * 3.2, life: 0.6, size: 0.9, sizeEnd: 0.1, drag: 3.5, spread: 0.5, colorVar: 0.4 });
    this.glow.emit({ x, y: y + 0.3, z, count: 14, color: 0xffffff, speed: r * 1.5, life: 0.25, size: 1.2, drag: 5 });
    this.soft.emit({ x, y, z, count: 12, color: el === 'fire' ? 0x3a302a : 0x6a6a7a, speed: r * 0.9, up: 2, life: 1.4, size: 1.6, sizeEnd: 2.6, alpha: 0.5, drag: 2, spread: r * 0.5 });
    this.ring(x, y, z, r, c, 0.45);
  }
  ring(x, y, z, r, color, life = 0.5) {
    const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    m.position.set(x, y + 0.15, z);
    m.scale.setScalar(0.2);
    this.scene.add(m);
    this.rings.push({ m, t: 0, life, r });
  }
  lightning(a, b, color = 0xfff27a, life = 0.18) {
    const pts = [];
    const n = 9;
    const d = new THREE.Vector3().subVectors(b, a);
    const len = d.length();
    for (let i = 0; i <= n; i++) {
      const p = new THREE.Vector3().copy(a).addScaledVector(d, i / n);
      if (i > 0 && i < n) p.add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(len * 0.12));
      pts.push(p);
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = this.boltMat.clone(); mat.color.set(color);
    const line = new THREE.Line(g, mat);
    line.frustumCulled = false;
    this.scene.add(line);
    this.bolts.push({ line, t: 0, life });
    this.glow.emit({ x: b.x, y: b.y, z: b.z, count: 12, color, speed: 6, life: 0.3, size: 0.4, drag: 4 });
  }
  pillar(x, y, z, color, h = 6) {
    for (let i = 0; i < 24; i++) this.glow.emit({ x, y: y + Math.random() * h, z, count: 1, color, speed: 0.6, up: 2, life: 0.9, size: 0.5, spread: 0.8 });
  }
  heal(x, y, z) { this.glow.emit({ x, y: y + 0.5, z, count: 24, color: 0x7ee081, speed: 1, up: 2.5, life: 1, size: 0.35, spread: 1.2, drag: 1 }); }
  levelUp(x, y, z) {
    for (let k = 0; k < 3; k++) this.glow.emit({ x, y: y + k, z, count: 30, color: 0xffd27a, speed: 3, up: 3, life: 1.3, size: 0.45, spread: 1, drag: 1.2 });
    this.ring(x, y, z, 6, 0xffd27a, 0.8);
  }
  trail(x, y, z, color, size = 0.35) { this.glow.emit({ x, y, z, count: 1, color, speed: 0.4, life: 0.35, size, sizeEnd: 0.05, drag: 2, spread: 0.12 }); }
  smoke(x, y, z, color = 0x5a5a5a) { this.soft.emit({ x, y, z, count: 1, color, speed: 0.4, up: 1.2, life: 2, size: 1.2, sizeEnd: 2.4, alpha: 0.35, drag: 0.6, spread: 0.6 }); }

  update(dt) {
    this.glow.update(dt); this.soft.update(dt);
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i]; b.t += dt;
      b.line.material.opacity = 1 - b.t / b.life;
      if (b.t >= b.life) { this.scene.remove(b.line); b.line.geometry.dispose(); b.line.material.dispose(); this.bolts.splice(i, 1); }
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i]; r.t += dt;
      const k = r.t / r.life;
      r.m.scale.setScalar(0.2 + r.r * (1 - Math.pow(1 - Math.min(1, k), 3)));
      r.m.material.opacity = 0.9 * (1 - k);
      if (k >= 1) { this.scene.remove(r.m); r.m.material.dispose(); this.rings.splice(i, 1); }
    }
  }
}

export { EL_COLOR };
export const elementCss = (el) => ELEMENTS[el]?.color || '#fff';
