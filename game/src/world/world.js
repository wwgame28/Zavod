import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { RNG, smoothstep, lerp, clamp } from '../core/rng.js';
import { REGIONS, DOME, VOLCANO } from '../data/regions.js';
import { STRUCTURES, WAYSTONES, TABLETS, CHESTS, QUEST_OBJECTS, BOSSES, FLATTEN, LAVA } from '../data/locations.js';
import { NPCS } from '../data/npcs.js';
import { ITEMS, GATHER } from '../data/items.js';
import { Colliders } from './collision.js';
import { Props } from './props.js';
import { BUILD } from './structures.js';
import { merge, MAT, meshOf } from './geo.js';
import { makeWaystone, makeTablet, makeChest, makeGatherNode, makeQuestObject } from './objects.js';

const SKY_VERT = `
varying vec3 vDir;
void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }`;
const SKY_FRAG = `
uniform vec3 uTop, uHorizon, uBottom, uSunDir, uSunColor, uMoonDir; uniform float uNight, uTime;
varying vec3 vDir;
float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
void main(){
  vec3 d = normalize(vDir); float h = d.y;
  vec3 col = mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55));
  col = mix(col, uBottom, smoothstep(0.0, -0.3, h));
  float sd = max(dot(d, uSunDir), 0.0);
  col += uSunColor * (pow(sd, 900.0) * 4.0 + pow(sd, 10.0) * 0.22) * (1.0 - uNight * 0.85);
  float md = max(dot(d, uMoonDir), 0.0);
  col += vec3(0.85, 0.9, 1.0) * (smoothstep(0.9990, 0.9994, md) * 1.1 + pow(md, 80.0) * 0.12) * uNight;
  vec3 sp = floor(d * 260.0);
  float st = step(0.9972, hash(sp)) * smoothstep(0.02, 0.3, h) * uNight;
  col += vec3(st * (0.55 + 0.45 * sin(uTime * 2.5 + hash(sp + 1.0) * 40.0)));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

const DOME_VERT = `
varying vec3 vW; varying vec3 vN;
void main(){ vW = (modelMatrix * vec4(position, 1.0)).xyz; vN = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * viewMatrix * vec4(vW, 1.0); }`;
const DOME_FRAG = `
uniform float uTime, uOpacity; uniform vec3 uColor;
varying vec3 vW; varying vec3 vN;
void main(){
  vec3 V = normalize(cameraPosition - vW);
  float f = pow(1.0 - abs(dot(normalize(vN), V)), 2.2);
  float bands = 0.5 + 0.5 * sin(vW.y * 0.5 - uTime * 1.4 + sin(vW.x * 0.04 + uTime * 0.6) * 3.0);
  float hex = step(0.92, fract(vW.x * 0.08 + sin(vW.z * 0.05)) ) * 0.25;
  float dist = length(cameraPosition - vW);
  float fade = mix(0.35, 1.0, smoothstep(700.0, 200.0, dist));
  float a = (0.025 + f * 0.32 + bands * 0.035 + hex * f * 0.5) * uOpacity * fade;
  gl_FragColor = vec4(uColor * (0.6 + bands * 0.4), a);
  #include <colorspace_fragment>
}`;

const DAY = { top: new THREE.Color(0x3f7fd0), horizon: new THREE.Color(0xc4dcec) };
const NIGHT = { top: new THREE.Color(0x050914), horizon: new THREE.Color(0x18203a) };
const DUSK = new THREE.Color(0xff9a5a);

export class World {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.colliders = new Colliders();
    this.occluders = new Colliders();
    this.anims = [];
    this.fires = [];
    this.interactables = [];
    this.gatherNodes = [];
    this.tod = CONFIG.TIME.start;
    this.time = 0;
    this.domeOpen = false;
    this.used = new Set();     // использованные объекты (сундуки, квестовые)
    this.activated = new Set(); // пробуждённые путевые камни
    this.readTablets = new Set();
    this.flash = 0;
    this.nextFlash = 5;
    this._c = new THREE.Color();
    this._c2 = new THREE.Color();

    scene.add(terrain.mesh);
    this._sky();
    this._lights();
    this._water();
    this._dome();
    this._lava();
    const exclusions = this._structures();
    this._objects(exclusions);
    this.props = new Props(scene, terrain, this.colliders, exclusions, this.occluders);
  }

  // ---------------- небо ----------------
  _sky() {
    this.skyU = {
      uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uBottom: { value: new THREE.Color(0x101418) },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunColor: { value: new THREE.Color(0xfff0d0) },
      uMoonDir: { value: new THREE.Vector3(0, -1, 0) }, uNight: { value: 0 }, uTime: { value: 0 },
    };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(800, 32, 16),
      new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: this.skyU, side: THREE.BackSide, depthWrite: false }));
    this.sky.renderOrder = -10;
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
    // Осколки Астры — разбитое кольцо в северном небе
    const rng = new RNG(99);
    this.astraMat = new THREE.MeshBasicMaterial({ color: 0x9fc8ff, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false });
    const parts = [];
    for (let i = 0; i < 46; i++) {
      const a = rng.float(0, Math.PI * 2), r = rng.float(14, 34) * (rng.chance(0.2) ? 1.6 : 1);
      const g = new THREE.OctahedronGeometry(rng.float(1.2, 4.5), 0);
      g.rotateZ(rng.float(0, 3)); g.rotateX(rng.float(0, 3));
      g.translate(Math.cos(a) * r, Math.sin(a) * r * 0.8, rng.float(-4, 4));
      parts.push(g);
    }
    const core = new THREE.IcosahedronGeometry(9, 0); parts.push(core);
    this.astra = new THREE.Mesh(merge(parts.map((g) => { g.deleteAttribute('uv'); return g.index ? g.toNonIndexed() : g; })), this.astraMat);
    this.astra.renderOrder = -9;
    this.astra.frustumCulled = false;
    this.scene.add(this.astra);
  }

  _lights() {
    this.hemi = new THREE.HemisphereLight(0xcfe4ff, 0x4a5a3a, 1.4);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff2dc, 2.4);
    this.sun.castShadow = true;
    const S = CONFIG.RENDER.shadowRange;
    Object.assign(this.sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 400 });
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.6;
    this.scene.add(this.sun, this.sun.target);
    this.fireLights = [];
    for (let i = 0; i < 4; i++) {
      const l = new THREE.PointLight(0xff8a3a, 0, 22, 1.6);
      this.scene.add(l); this.fireLights.push(l);
    }
    this.scene.fog = new THREE.Fog(0xc4dcec, CONFIG.RENDER.fogNear, CONFIG.RENDER.fogFar);
  }

  _water() {
    const geo = new THREE.PlaneGeometry(2400, 2400, 120, 120);
    const pos = geo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const tint = { vale: 0x2f7a96, forest: 0x2a6a6a, swamp: 0x4a5a2a, frost: 0x7aaed0, storm: 0x2a4a6a, ash: 0x3a3a40, astral: 0x6a5aa8 };
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = -pos.getY(i);
      const r = Math.hypot(x, z);
      if (r > 830) c.set(0x1e5a7a); else c.set(tint[this.terrain.regionAt(x, z).id] || 0x2f7a96);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.waterU = { value: 0 };
    const mat = new THREE.MeshPhongMaterial({ vertexColors: true, transparent: true, opacity: 0.84, shininess: 90, specular: 0x8899aa, flatShading: true });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = this.waterU;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
        '#include <begin_vertex>\n transformed.z += sin(position.x * 0.07 + uTime * 1.1) * 0.16 + cos(position.y * 0.09 + uTime * 0.8) * 0.12;');
    };
    this.water = new THREE.Mesh(geo, mat);
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = CONFIG.WATER_LEVEL;
    this.water.receiveShadow = true;
    this.scene.add(this.water);
  }

  _dome() {
    this.domeU = { uTime: { value: 0 }, uOpacity: { value: 1 }, uColor: { value: new THREE.Color(0xb08aff) } };
    const geo = new THREE.SphereGeometry(DOME.r, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    this.dome = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      vertexShader: DOME_VERT, fragmentShader: DOME_FRAG, uniforms: this.domeU,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    }));
    this.dome.position.set(DOME.x, this.terrain.heightAt(DOME.x, DOME.z) - 20, DOME.z);
    this.dome.scale.y = 0.85;
    this.dome.renderOrder = 3;
    this.scene.add(this.dome);
  }

  _lava() {
    this.lavaMat = new THREE.MeshBasicMaterial({ color: 0xff5a1a, toneMapped: false });
    this.lavaPools = [];
    for (const l of LAVA) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(l.r + 1.5, 24), this.lavaMat);
      m.rotation.x = -Math.PI / 2;
      const y = this.terrain.heightAt(l.x, l.z) + 0.6;
      m.position.set(l.x, y, l.z);
      this.scene.add(m);
      this.lavaPools.push({ ...l, y });
      this.fires.push({ x: l.x, y: y + 2, z: l.z, color: 0xff5a1a, big: true });
    }
  }

  // ---------------- постройки ----------------
  _place(type, d) {
    const fn = BUILD[type];
    if (!fn) return null;
    const res = fn(d);
    const rot = d.rot || 0;
    const y = this.terrain.heightAt(d.x, d.z);
    const grp = new THREE.Group();
    grp.position.set(d.x, y, d.z);
    grp.rotation.y = rot;
    if (res.solid.length) grp.add(meshOf(merge(res.solid)));
    if (res.glow.length) {
      const gm = new THREE.Mesh(merge(res.glow), res.glowMat === 'add' ? MAT.glowAdd : MAT.glow);
      grp.add(gm);
    }
    if (res.float?.length) {
      const fm = new THREE.Mesh(merge(res.float), MAT.glow);
      grp.add(fm);
      this.anims.push({ type: 'bob', obj: fm, speed: 1.2 });
    }
    if (res.rotor) {
      const mat = res.rotor.mat === 'add'
        ? new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: res.rotor.opacity ?? 0.3, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide })
        : MAT.lambert;
      const rm = new THREE.Mesh(res.rotor.geo, mat);
      const pivot = new THREE.Group();
      pivot.position.set(0, res.rotor.y, res.rotor.z);
      pivot.add(rm);
      if (res.rotor.axis === 'y') rm.position.y = res.light?.y ?? 0;
      grp.add(pivot);
      this.anims.push({ type: 'rotor', obj: pivot, axis: res.rotor.axis, speed: res.rotor.speed });
    }
    if (res.heart) {
      const hm = new THREE.Mesh(res.heart.geo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }));
      hm.position.set(0, res.heart.y, res.heart.z);
      grp.add(hm);
      this.heartMesh = hm;
      this.anims.push({ type: 'heart', obj: hm, base: res.heart.y });
    }
    this.scene.add(grp);
    const cos = Math.cos(rot), sin = Math.sin(rot);
    for (const c of res.col) {
      if (c.c) {
        const [lx, lz, r] = c.c;
        this.colliders.addCircle(d.x + lx * cos + lz * sin, d.z - lx * sin + lz * cos, r);
        if (r > 2.2) { const o = this.occluders.addCircle(d.x + lx * cos + lz * sin, d.z - lx * sin + lz * cos, r); o.y0 = y - 1; o.y1 = y + 30; }
      } else if (c.b) {
        const [lx, lz, hw, hd, r2] = c.b;
        this.colliders.addBox(d.x + lx * cos + lz * sin, d.z - lx * sin + lz * cos, hw, hd, rot + r2);
        if (hw > 1.5 || hd > 1.5) { const o = this.occluders.addBox(d.x + lx * cos + lz * sin, d.z - lx * sin + lz * cos, hw, hd, rot + r2); o.y0 = y - 1; o.y1 = y + 7; }
      }
    }
    if (res.fire) {
      const lx = res.fire.x, lz = res.fire.z;
      this.fires.push({ x: d.x + lx * cos + lz * sin, y: y + res.fire.y, z: d.z - lx * sin + lz * cos, color: res.fire.color });
    }
    if (res.light) this.fires.push({ x: d.x, y: y + res.light.y, z: d.z, color: res.light.color, steady: true });
    if (res.aura) this.auras = (this.auras || []).concat([{ x: d.x, y: y + res.aura.y, z: d.z, color: res.aura.color }]);
    return grp;
  }

  _structures() {
    const ex = [];
    const R = { house: 6, tavern: 8, tower: 5, stall: 4, smithy: 6, hut: 5, well: 3, windmill: 5, fence: 3, gate: 5, crater: 22, tent: 4, campfire: 3,
      palisade: 4, stonecircle: 14, ruinhut: 6, heartwood: 16, webs: 0, stilthut: 8, sunkentemple: 12, rotlair: 30, icethrone: 12, frozenlake: 36,
      lighthouse: 7, stormspire: 10, nests: 16, forge: 8, obelisk: 3, gatearch: 12, ruins: 10, plaza: 36, observatory: 10, sanctum: 34, tower_ruin: 7 };
    for (const s of STRUCTURES) {
      this._place(s.type, s);
      if (R[s.type]) ex.push({ x: s.x, z: s.z, r: s.type === 'palisade' ? s.r * 0.5 : R[s.type] });
    }
    for (const b of BOSSES) ex.push({ x: b.x, z: b.z, r: b.arena * 0.7 });
    for (const f of FLATTEN) ex.push({ x: f.x, z: f.z, r: f.r * 0.55 });
    for (const n of Object.values(NPCS)) ex.push({ x: n.x, z: n.z, r: 4 });
    for (const w of WAYSTONES) ex.push({ x: w.x, z: w.z, r: 6 });
    for (const t of TABLETS) ex.push({ x: t.x, z: t.z, r: 4 });
    for (const c of CHESTS) ex.push({ x: c.x, z: c.z, r: 3 });
    for (const q of QUEST_OBJECTS) ex.push({ x: q.x, z: q.z, r: 4 });
    ex.push({ x: VOLCANO.x, z: VOLCANO.z, r: VOLCANO.crater + 6 });
    return ex;
  }

  // ---------------- интерактивные объекты ----------------
  _addInteract(o) { this.interactables.push(o); return o; }

  _objects(exclusions) {
    const T = this.terrain;
    for (const w of WAYSTONES) {
      const m = makeWaystone();
      const y = T.heightAt(w.x, w.z);
      m.group.position.set(w.x, y, w.z);
      this.scene.add(m.group);
      this.colliders.addCircle(w.x, w.z, 1.2);
      this._addInteract({ kind: 'waystone', id: w.id, name: w.name, x: w.x, y, z: w.z, r: 3.5, data: w, mesh: m });
    }
    for (const t of TABLETS) {
      const m = makeTablet();
      const y = T.heightAt(t.x, t.z);
      m.group.position.set(t.x, y, t.z);
      m.group.rotation.y = Math.atan2(-t.x, -t.z) + Math.PI;
      this.scene.add(m.group);
      this.colliders.addCircle(t.x, t.z, 0.7);
      this._addInteract({ kind: 'tablet', id: t.id, x: t.x, y, z: t.z, r: 3, mesh: m });
    }
    for (const c of CHESTS) {
      const m = makeChest();
      const y = T.heightAt(c.x, c.z);
      m.group.position.set(c.x, y, c.z);
      m.group.rotation.y = (c.x * 7 + c.z) % 6;
      this.scene.add(m.group);
      this.colliders.addCircle(c.x, c.z, 0.8);
      this._addInteract({ kind: 'chest', id: c.id, x: c.x, y, z: c.z, r: 2.8, data: c, mesh: m, insideDome: c.insideDome });
    }
    for (const q of QUEST_OBJECTS) {
      const m = makeQuestObject(q.kind);
      const y = q.kind === 'heart' ? T.heightAt(q.x, q.z) : T.heightAt(q.x, q.z);
      m.group.position.set(q.x, y, q.z);
      m.group.rotation.y = (q.x * 3 + q.z * 5) % 6;
      this.scene.add(m.group);
      if (q.kind === 'crate' || q.kind === 'totem' || q.kind === 'rod') this.colliders.addCircle(q.x, q.z, 0.7);
      this._addInteract({ kind: 'quest', sub: q.kind, id: q.id, label: q.label, x: q.x, y, z: q.z, r: q.kind === 'heart' ? 9 : 2.8, mesh: m });
    }
    // Узлы сбора
    const rng = new RNG(CONFIG.SEED + 77);
    for (const reg of REGIONS) {
      const list = GATHER[reg.id] || [];
      for (const g of list) {
        let placed = 0, tries = 0;
        while (placed < g.n && tries < g.n * 60) {
          tries++;
          const ang = rng.float(0, Math.PI * 2), rad = Math.sqrt(rng.next()) * 330;
          const x = reg.center[0] + Math.cos(ang) * rad, z = reg.center[1] + Math.sin(ang) * rad;
          if (Math.hypot(x, z) > 760) continue;
          if (T.regionAt(x, z).id !== reg.id) continue;
          const h = T.heightAt(x, z);
          if (h < 0.8) continue;
          if (T.normalAt(x, z).y < 0.82) continue;
          if (T.roadDist(x, z) < 3) continue;
          const dd = Math.hypot(x - DOME.x, z - DOME.z);
          if (reg.id === 'astral' && Math.abs(dd - DOME.r) < 6) continue;
          let bad = false;
          for (const e of exclusions) if (Math.hypot(x - e.x, z - e.z) < e.r * 0.6) { bad = true; break; }
          if (bad) continue;
          const item = ITEMS[g.item];
          const m = makeGatherNode(item);
          m.group.traverse((x) => { if (x.isMesh) x.castShadow = false; });
          m.group.position.set(x, h, z);
          m.group.rotation.y = rng.float(0, 6.28);
          this.scene.add(m.group);
          const node = this._addInteract({ kind: 'gather', id: `g_${reg.id}_${g.item}_${placed}`, item: g.item, x, y: h, z, r: 2.4, mesh: m, ready: true, respawn: 0, insideDome: dd < DOME.r });
          this.gatherNodes.push(node);
          placed++;
        }
      }
    }
  }

  // Применение сохранённого состояния
  applyState(st) {
    if (!st) return;
    this.used = new Set(st.used || []);
    this.activated = new Set(st.activated || []);
    this.readTablets = new Set(st.tablets || []);
    this.tod = st.tod ?? this.tod;
    this.setDome(!!st.domeOpen, true);
    for (const o of this.interactables) this.refreshObject(o);
  }
  saveState() {
    return { used: [...this.used], activated: [...this.activated], tablets: [...this.readTablets], tod: this.tod, domeOpen: this.domeOpen };
  }

  refreshObject(o) {
    if (o.kind === 'waystone') {
      const on = this.activated.has(o.id);
      o.mesh.runeMat.color.set(on ? 0x7fe8ff : 0x5a6a8a);
    } else if (o.kind === 'tablet') {
      o.mesh.mat.color.set(this.readTablets.has(o.id) ? 0x6a5a40 : 0xffd27a);
    } else if (o.kind === 'chest') {
      o.mesh.lid.rotation.x = this.used.has(o.id) ? -1.9 : 0;
    } else if (o.kind === 'quest') {
      const used = this.used.has(o.id);
      const p = o.mesh.parts;
      if (o.sub === 'crate' || o.sub === 'tear') o.mesh.group.visible = !used;
      if (o.sub === 'chest' && p.lid) p.lid.rotation.x = used ? -1.9 : 0;
      if (o.sub === 'totem' && p.flame) p.flame.visible = used;
      if (o.sub === 'hunter' && p.ice) p.ice.visible = !used;
      if (o.sub === 'rod' && p.pole) { p.pole.rotation.z = used ? 0 : 0.55; p.tip.visible = used; }
    }
  }

  setDome(open, instant = false) {
    this.domeOpen = open;
    this.domeTarget = open ? 0 : 1;
    if (instant) { this.domeU.uOpacity.value = this.domeTarget; this.dome.visible = !open; }
  }

  // ---------------- кадр ----------------
  update(dt, cam, player, region, settings) {
    this.time += dt;
    this.tod = (this.tod + dt / CONFIG.TIME.dayLength) % 1;
    const t = this.tod;
    const el = Math.sin((t - 0.25) * Math.PI * 2);
    const az = t * Math.PI * 2;
    const sunDir = this.skyU.uSunDir.value.set(Math.cos(az) * Math.cos(el * 1.2), el, Math.sin(az) * 0.4 + 0.3).normalize();
    this.skyU.uMoonDir.value.copy(sunDir).negate();
    const day = smoothstep(-0.12, 0.28, el);
    const night = 1 - day;
    const dusk = Math.max(0, 1 - Math.abs(el) / 0.28) * 0.9;
    this.night = night;

    const reg = region || REGIONS[0];
    const fogReg = this._c2.set(reg.fog);
    const top = this._c.copy(NIGHT.top).lerp(DAY.top, day);
    this.skyU.uTop.value.copy(top);
    const hor = this.skyU.uHorizon.value.copy(NIGHT.horizon).lerp(fogReg, day).lerp(DUSK, dusk * 0.45);
    this.skyU.uNight.value = night;
    this.skyU.uTime.value = this.time;
    this.skyU.uSunColor.value.set(0xfff0d0).lerp(DUSK, dusk);
    this.sky.position.copy(cam.position);
    // Астра
    this.astra.position.set(cam.position.x + 60, cam.position.y + 420, cam.position.z - 620);
    this.astra.lookAt(cam.position);
    this.astra.rotation.z += 0;
    this.astraMat.opacity = 0.12 + 0.6 * night;

    // Туман по региону
    const fogFar = { vale: 520, forest: 330, swamp: 260, frost: 380, storm: 300, ash: 290, astral: 420 }[reg.id] || 500;
    const fogMul = settings.quality === 'low' ? 0.75 : 1;
    const f = this.scene.fog;
    f.color.lerp(hor, Math.min(1, dt * 2));
    f.far = lerp(f.far, fogFar * fogMul, Math.min(1, dt * 0.8));
    f.near = lerp(f.near, Math.min(CONFIG.RENDER.fogNear, fogFar * 0.2), Math.min(1, dt * 0.8));

    // Свет
    const p = player.pos;
    const S = 120;
    this.sun.position.set(p.x + sunDir.x * S, p.y + Math.max(0.15, Math.abs(sunDir.y)) * S, p.z + sunDir.z * S);
    if (el < 0) { const md = this.skyU.uMoonDir.value; this.sun.position.set(p.x + md.x * S, p.y + Math.abs(md.y) * S + 20, p.z + md.z * S); }
    this.sun.target.position.set(p.x, p.y, p.z);
    this.sun.color.set(0xfff2dc).lerp(DUSK, dusk * 0.8).lerp(this._c.set(0x8aa4ff), night);
    this.sun.intensity = lerp(0.55, 2.5, day) * (reg.id === 'storm' || reg.id === 'swamp' ? 0.75 : 1);
    this.hemi.intensity = lerp(0.55, 1.35, day) + this.flash * 3;
    this.hemi.color.set(0xcfe4ff).lerp(this._c.set(0x4a5a9a), night);
    this.hemi.groundColor.set(reg.id === 'ash' ? 0x5a3020 : reg.id === 'frost' ? 0x8a9aaa : 0x4a5a3a).multiplyScalar(lerp(0.5, 1, day));
    this.sun.castShadow = settings.quality !== 'low';

    // Молнии над Грозовыми Утёсами
    this.flash = Math.max(0, this.flash - dt * 4);
    if (reg.id === 'storm') {
      this.nextFlash -= dt;
      if (this.nextFlash <= 0) { this.flash = 1; this.nextFlash = 6 + Math.random() * 10; this.onThunder?.(); }
    }

    // Анимации
    for (const a of this.anims) {
      if (a.type === 'rotor') a.obj.rotation[a.axis] += a.speed * dt;
      else if (a.type === 'bob') a.obj.position.y = Math.sin(this.time * a.speed) * 0.3;
      else if (a.type === 'heart') { a.obj.rotation.y += dt * 0.3; a.obj.position.y = a.base + Math.sin(this.time * 0.8) * 0.6; }
    }
    for (const o of this.interactables) {
      if (o.kind === 'waystone') o.mesh.crystal.rotation.y += dt * (this.activated.has(o.id) ? 2 : 0.4);
      if (o.kind === 'quest' && o.sub === 'tear' && o.mesh.parts.orb) o.mesh.parts.orb.position.y = 1.4 + Math.sin(this.time * 2 + o.x) * 0.15;
    }
    this.waterU.value = this.time;
    this.domeU.uTime.value = this.time;
    if (this.domeTarget !== undefined) {
      const u = this.domeU.uOpacity;
      u.value += (this.domeTarget - u.value) * Math.min(1, dt * 0.6);
      this.dome.visible = u.value > 0.01;
    }
    const lp = 0.5 + 0.5 * Math.sin(this.time * 2.2);
    this.lavaMat.color.setRGB(1, 0.32 + lp * 0.12, 0.06);

    // Огни: 4 ближайших источника получают точечный свет
    const fires = this.fires;
    const near = fires.map((fi) => ({ fi, d: Math.hypot(fi.x - p.x, fi.z - p.z) })).sort((a, b) => a.d - b.d);
    for (let i = 0; i < this.fireLights.length; i++) {
      const L = this.fireLights[i], n = near[i];
      if (n && n.d < 70) {
        L.position.set(n.fi.x, n.fi.y, n.fi.z);
        L.color.set(n.fi.color);
        const flick = n.fi.steady ? 1 : 0.8 + Math.sin(this.time * 13 + i * 7) * 0.1 + Math.sin(this.time * 7.3 + i) * 0.1;
        L.intensity = (n.fi.big ? 120 : 26) * flick * (0.45 + night * 0.9);
        L.distance = n.fi.big ? 60 : 20;
      } else L.intensity = 0;
    }

    // Респаун узлов сбора и отсечение по дальности
    for (const n of this.gatherNodes) {
      if (!n.ready && this.time >= n.respawn) { n.ready = true; }
      const d = Math.abs(n.x - p.x) + Math.abs(n.z - p.z);
      n.mesh.group.visible = n.ready && d < 170;
    }
    this.props.update(p.x, p.z, settings.quality);
  }

  lavaAt(x, z, y) {
    for (const l of this.lavaPools) if (Math.hypot(x - l.x, z - l.z) < l.r && y < l.y + 1.2) return true;
    return false;
  }

  groundY(x, z) { return this.terrain.heightAt(x, z); }
}
