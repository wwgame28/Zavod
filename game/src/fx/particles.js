import * as THREE from 'three';

// Пул частиц на одном Points: без аллокаций в кадре, мягкие круглые точки.
const VERT = `
attribute float size; attribute float alpha; attribute vec3 color;
varying float vA; varying vec3 vC;
uniform float uScale;
void main(){
  vA = alpha; vC = color;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * uScale / max(0.1, -mv.z);
  gl_Position = projectionMatrix * mv;
}`;
const FRAG = `
varying float vA; varying vec3 vC;
void main(){
  vec2 p = gl_PointCoord - 0.5; float d = length(p);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d);
  gl_FragColor = vec4(vC * (0.6 + a * 0.8), a * vA);
  #include <colorspace_fragment>
}`;

const _c = new THREE.Color();

export class Particles {
  constructor(scene, max = 5000, additive = true) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.maxLife = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.s0 = new Float32Array(max);
    this.s1 = new Float32Array(max);
    this.a0 = new Float32Array(max);
    this.next = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: { uScale: { value: 400 } },
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this.geo = g;
    this.activeCount = 0;
  }

  setScale(h, fov) { this.mat.uniforms.uScale.value = h / 2 / Math.tan((fov * Math.PI) / 360); }

  emit(o) {
    const n = o.count ?? 1;
    _c.set(o.color ?? 0xffffff);
    const cv = o.colorVar ?? 0;
    for (let k = 0; k < n; k++) {
      const i = this.next; this.next = (this.next + 1) % this.max;
      const sp = o.spread ?? 0.2;
      this.pos[i * 3] = o.x + (Math.random() - 0.5) * sp;
      this.pos[i * 3 + 1] = o.y + (Math.random() - 0.5) * sp;
      this.pos[i * 3 + 2] = o.z + (Math.random() - 0.5) * sp;
      const speed = (o.speed ?? 2) * (0.4 + Math.random() * 0.8);
      let vx, vy, vz;
      if (o.dir) {
        const j = o.jitter ?? 0.3;
        vx = o.dir.x + (Math.random() - 0.5) * j; vy = o.dir.y + (Math.random() - 0.5) * j; vz = o.dir.z + (Math.random() - 0.5) * j;
      } else {
        const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        vx = Math.sin(ph) * Math.cos(th); vy = Math.cos(ph); vz = Math.sin(ph) * Math.sin(th);
      }
      this.vel[i * 3] = vx * speed; this.vel[i * 3 + 1] = vy * speed + (o.up ?? 0); this.vel[i * 3 + 2] = vz * speed;
      const life = (o.life ?? 0.8) * (0.6 + Math.random() * 0.6);
      this.life[i] = life; this.maxLife[i] = life;
      this.grav[i] = o.gravity ?? 0; this.drag[i] = o.drag ?? 1.5;
      this.s0[i] = (o.size ?? 0.4) * (0.7 + Math.random() * 0.6); this.s1[i] = o.sizeEnd ?? 0;
      this.a0[i] = o.alpha ?? 1;
      const vr = 1 + (Math.random() - 0.5) * cv;
      this.col[i * 3] = _c.r * vr; this.col[i * 3 + 1] = _c.g * vr; this.col[i * 3 + 2] = _c.b * vr;
      this.size[i] = this.s0[i]; this.alpha[i] = this.a0[i];
    }
  }

  update(dt) {
    let active = 0;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) { if (this.alpha[i] !== 0) { this.alpha[i] = 0; this.size[i] = 0; } continue; }
      active++;
      this.life[i] -= dt;
      const t = 1 - Math.max(0, this.life[i]) / this.maxLife[i];
      const d = Math.max(0, 1 - this.drag[i] * dt);
      this.vel[i * 3] *= d; this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * d - this.grav[i] * dt; this.vel[i * 3 + 2] *= d;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      this.alpha[i] = this.a0[i] * (t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9);
    }
    this.activeCount = active;
    const a = this.geo.attributes;
    a.position.needsUpdate = true; a.color.needsUpdate = true; a.size.needsUpdate = true; a.alpha.needsUpdate = true;
  }
}

// Погода и атмосферные частицы вокруг камеры (снег, дождь, пепел, светлячки...).
const WEATHER = {
  pollen:    { n: 260, color: 0xfff3b0, size: 0.12, fall: -0.1, sway: 0.6, add: true, alpha: 0.6 },
  fireflies: { n: 220, color: 0xd8ff6a, size: 0.2, fall: 0, sway: 1.0, add: true, alpha: 0.9, nightOnly: true },
  spores:    { n: 420, color: 0xb8e07a, size: 0.16, fall: -0.2, sway: 0.5, add: true, alpha: 0.55 },
  snow:      { n: 1400, color: 0xffffff, size: 0.2, fall: 2.2, sway: 0.8, add: false, alpha: 0.9 },
  rain:      { n: 1800, color: 0xa8b8d8, size: 0.09, fall: 22, sway: 0.1, add: false, alpha: 0.55, streak: true },
  embers:    { n: 700, color: 0xff7a3a, size: 0.16, fall: -1.4, sway: 0.9, add: true, alpha: 0.9, alt: 0x6a625c },
  motes:     { n: 500, color: 0xc7a6ff, size: 0.18, fall: -0.4, sway: 0.7, add: true, alpha: 0.75 },
};

export class Weather {
  constructor(scene) {
    this.max = 1800;
    this.systems = {};
    this.box = 48;
    this.cur = null;
    for (const [id, w] of Object.entries(WEATHER)) {
      const n = w.n;
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n), alpha = new Float32Array(n);
      const c = new THREE.Color(w.color), c2 = new THREE.Color(w.alt ?? w.color);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (Math.random() - 0.5) * this.box * 2;
        pos[i * 3 + 1] = Math.random() * 30;
        pos[i * 3 + 2] = (Math.random() - 0.5) * this.box * 2;
        const cc = Math.random() < 0.6 ? c : c2;
        col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
        size[i] = w.size * (0.6 + Math.random() * 0.8) * (w.streak ? 3 : 1);
        alpha[i] = w.alpha * (0.5 + Math.random() * 0.5);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setAttribute('size', new THREE.BufferAttribute(size, 1));
      g.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
      const mat = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
        blending: w.add ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { uScale: { value: 400 } },
      });
      const pts = new THREE.Points(g, mat);
      pts.frustumCulled = false; pts.visible = false; pts.renderOrder = 4;
      scene.add(pts);
      this.systems[id] = { pts, pos, alpha, base: alpha.slice(), cfg: w, phase: new Float32Array(n).map(() => Math.random() * 10), fade: 0 };
    }
  }

  setScale(h, fov) { for (const s of Object.values(this.systems)) s.pts.material.uniforms.uScale.value = h / 2 / Math.tan((fov * Math.PI) / 360); }

  update(dt, cam, kind, night, time) {
    for (const [id, s] of Object.entries(this.systems)) {
      const want = id === kind && (!s.cfg.nightOnly || night > 0.4) ? 1 : 0;
      s.fade += (want - s.fade) * Math.min(1, dt * 0.8);
      s.pts.visible = s.fade > 0.02;
      if (!s.pts.visible) continue;
      const { pos, cfg, phase } = s;
      const n = cfg.n, B = this.box;
      for (let i = 0; i < n; i++) {
        let x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
        const ph = phase[i];
        y -= cfg.fall * dt;
        x += Math.sin(time * 0.7 + ph) * cfg.sway * dt;
        z += Math.cos(time * 0.6 + ph * 1.3) * cfg.sway * dt;
        // заворачиваем вокруг камеры
        let dx = x - cam.x, dz = z - cam.z;
        if (dx > B) x -= 2 * B; else if (dx < -B) x += 2 * B;
        if (dz > B) z -= 2 * B; else if (dz < -B) z += 2 * B;
        if (y < cam.y - 12) y += 34; else if (y > cam.y + 22) y -= 34;
        pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
        s.alpha[i] = s.base[i] * s.fade;
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
      s.pts.geometry.attributes.alpha.needsUpdate = true;
    }
  }
}
