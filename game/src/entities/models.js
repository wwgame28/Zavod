import * as THREE from 'three';

// Процедурные модели существ из примитивов + процедурная анимация.
// У каждой модели свои материалы, чтобы вспышка при попадании не мигала всем сразу.

const GEO = {};
const geo = (k, fn) => GEO[k] || (GEO[k] = fn());
const box = (w, h, d) => geo(`b${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (rt, rb, h, s = 6) => geo(`c${rt}|${rb}|${h}|${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
const cone = (r, h, s = 6) => geo(`k${r}|${h}|${s}`, () => new THREE.ConeGeometry(r, h, s));
const ico = (r, d = 0) => geo(`i${r}|${d}`, () => new THREE.IcosahedronGeometry(r, d));
const sph = (r, w = 8, h = 6) => geo(`s${r}|${w}|${h}`, () => new THREE.SphereGeometry(r, w, h));
const octa = (r) => geo(`o${r}`, () => new THREE.OctahedronGeometry(r, 0));

class MatBank {
  constructor(opts = {}) { this.mats = new Map(); this.opts = opts; this.all = []; }
  get(hex, extra = null) {
    const key = hex + (extra ? JSON.stringify(extra) : '');
    let m = this.mats.get(key);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color: hex, flatShading: true, ...(this.opts.translucent ? { transparent: true, opacity: 0.62 } : {}), ...(extra || {}) });
      this.mats.set(key, m); this.all.push(m);
    }
    return m;
  }
  glow(hex, opacity = 1) {
    const key = 'g' + hex + '|' + opacity;
    let m = this.mats.get(key);
    if (!m) { m = new THREE.MeshBasicMaterial({ color: hex, transparent: opacity < 1, opacity, toneMapped: false, depthWrite: opacity >= 1 }); this.mats.set(key, m); }
    return m;
  }
  flash(v) { for (const m of this.all) m.emissive.setScalar(v); }
  tint(hex, v) { for (const m of this.all) m.emissive.set(hex).multiplyScalar(v); }
  setOpacity(o) { for (const m of this.all) { m.transparent = true; m.opacity = o; } }
  dispose() { for (const m of this.mats.values()) m.dispose(); }
}

function mesh(g, m, shadow = true) { const x = new THREE.Mesh(g, m); x.castShadow = shadow; return x; }
function at(obj, x = 0, y = 0, z = 0) { obj.position.set(x, y, z); return obj; }
function grp(x = 0, y = 0, z = 0) { const g = new THREE.Group(); g.position.set(x, y, z); return g; }

// ======================= ГУМАНОИД =======================
export class HumanoidRig {
  constructor(o = {}) {
    this.o = o;
    const M = this.bank = new MatBank({ translucent: o.ghost });
    const skin = M.get(o.skin ?? 0xe0b896), cloth = M.get(o.cloth ?? 0x5a4a8a), cloth2 = M.get(o.cloth2 ?? 0x3a3a3a);
    const hair = M.get(o.hair ?? 0x4a3020);
    const bulk = o.bulky ? 1.35 : 1;
    this.root = new THREE.Group();
    this.body = grp(0, 0, 0); this.root.add(this.body);
    this.hips = grp(0, 0.95, 0); this.body.add(this.hips);
    this.torso = grp(0, 0, 0); this.hips.add(this.torso);
    this.torso.add(at(mesh(box(0.56 * bulk, 0.66, 0.32 * bulk), cloth), 0, 0.36, 0));
    this.torso.add(at(mesh(box(0.6 * bulk, 0.12, 0.36 * bulk), cloth2), 0, 0.06, 0));
    if (o.fur) this.torso.add(at(mesh(box(0.7 * bulk, 0.18, 0.42 * bulk), M.get(0xe8e4da)), 0, 0.68, 0));
    if (o.crystal) {
      const cm = M.glow(o.crystal);
      for (const [x, y, z, s] of [[-0.2, 0.75, -0.12, 1], [0.22, 0.8, -0.1, 0.8], [0, 0.6, -0.2, 0.7]]) {
        const c = at(mesh(octa(0.14 * s), cm, false), x * bulk, y, z * bulk); c.scale.y = 2.2; this.torso.add(c);
      }
    }
    // Голова
    this.head = grp(0, 0.78, 0); this.torso.add(this.head);
    this.head.add(at(mesh(box(0.3, 0.32, 0.3), skin), 0, 0.16, 0));
    const eyeM = o.glowEyes ? M.glow(o.glowEyes) : M.get(0x1a1a1a);
    this.head.add(at(mesh(box(0.06, 0.04, 0.02), eyeM, false), -0.07, 0.19, 0.155));
    if (!o.eyepatch) this.head.add(at(mesh(box(0.06, 0.04, 0.02), eyeM, false), 0.07, 0.19, 0.155));
    else this.head.add(at(mesh(box(0.09, 0.07, 0.03), M.get(0x1a1a1a), false), 0.07, 0.19, 0.155));
    if (o.hood) {
      this.head.add(at(mesh(box(0.38, 0.36, 0.36), cloth), 0, 0.2, -0.03));
      this.head.add(at(mesh(cone(0.2, 0.3, 4), cloth), 0, 0.42, -0.1));
    } else if (o.helmet) {
      this.head.add(at(mesh(box(0.34, 0.16, 0.34), M.get(0x8a8a92)), 0, 0.3, 0));
      this.head.add(at(mesh(cone(0.06, 0.2, 4), M.get(0x8a8a92)), 0, 0.46, 0));
    } else if (o.hat) {
      this.head.add(at(mesh(cyl(0.34, 0.34, 0.04, 10), cloth), 0, 0.33, 0));
      this.head.add(at(mesh(cone(0.18, 0.55, 8), cloth), 0, 0.6, -0.03));
    } else if (o.hair !== undefined) {
      this.head.add(at(mesh(box(0.33, 0.12, 0.33), hair), 0, 0.33, 0));
      this.head.add(at(mesh(box(0.33, 0.24, 0.08), hair), 0, 0.2, -0.13));
    }
    if (o.beard) this.head.add(at(mesh(box(0.24, 0.2, 0.08), hair), 0, 0.0, 0.14));
    if (o.horns) {
      const hm = M.get(o.horns === true ? 0x8a7a5a : o.horns);
      const h1 = at(mesh(cone(0.05, 0.3, 4), hm), -0.13, 0.4, 0); h1.rotation.z = 0.5;
      const h2 = at(mesh(cone(0.05, 0.3, 4), hm), 0.13, 0.4, 0); h2.rotation.z = -0.5;
      this.head.add(h1, h2);
    }
    if (o.crown) {
      const cm = M.glow(o.crown);
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; this.head.add(at(mesh(cone(0.035, 0.16, 4), cm, false), Math.cos(a) * 0.17, 0.42, Math.sin(a) * 0.17)); }
    }
    // Руки
    const armW = 0.13 * bulk;
    const makeArm = (side) => {
      const sh = grp(side * 0.34 * bulk, 0.6, 0); this.torso.add(sh);
      sh.add(at(mesh(box(armW, 0.36, armW), cloth), 0, -0.17, 0));
      const fore = grp(0, -0.36, 0); sh.add(fore);
      fore.add(at(mesh(box(armW * 0.9, 0.32, armW * 0.9), o.robe ? cloth : skin), 0, -0.15, 0));
      fore.add(at(mesh(box(0.11, 0.11, 0.11), skin), 0, -0.34, 0));
      return { sh, fore };
    };
    this.armL = makeArm(-1); this.armR = makeArm(1);
    // Ноги
    const makeLeg = (side) => {
      const hip = grp(side * 0.13 * bulk, 0, 0); this.hips.add(hip);
      hip.add(at(mesh(box(0.16 * bulk, 0.46, 0.18 * bulk), cloth2), 0, -0.23, 0));
      const shin = grp(0, -0.46, 0); hip.add(shin);
      shin.add(at(mesh(box(0.14 * bulk, 0.44, 0.15 * bulk), cloth2), 0, -0.22, 0));
      shin.add(at(mesh(box(0.15 * bulk, 0.08, 0.26 * bulk), M.get(0x3a2a1c)), 0, -0.45, 0.05));
      return { hip, shin };
    };
    this.legL = makeLeg(-1); this.legR = makeLeg(1);
    if (o.robe) {
      const robe = at(mesh(cyl(0.3, 0.5, 0.85, 8), cloth), 0, -0.42, 0);
      this.hips.add(robe);
      this.hips.add(at(mesh(cyl(0.505, 0.505, 0.08, 8), cloth2), 0, -0.82, 0));
    }
    // Оружие в правой руке
    this.weaponTip = null;
    const w = o.weapon;
    const hand = this.armR.fore;
    if (w === 'staff') {
      const st = grp(0, -0.34, 0.04); hand.add(st);
      st.add(at(mesh(cyl(0.035, 0.045, 1.9, 5), M.get(0x5a3e26)), 0, 0.25, 0));
      st.add(at(mesh(cyl(0.09, 0.05, 0.16, 5), M.get(0xd8c070)), 0, 1.15, 0));
      const orb = at(mesh(ico(0.11, 0), M.glow(o.staffGlow ?? 0x9fd8ff), false), 0, 1.3, 0);
      st.add(orb); this.weaponTip = orb; this.orb = orb;
      st.rotation.x = 0.15;
    } else if (w === 'sword' || w === 'axe') {
      const sw = grp(0, -0.36, 0.05); hand.add(sw);
      sw.rotation.x = Math.PI / 2;
      sw.add(at(mesh(box(0.05, 0.25, 0.05), M.get(0x4a3220)), 0, 0, 0));
      if (w === 'sword') { sw.add(at(mesh(box(0.25, 0.04, 0.06), M.get(0x8a8a92)), 0, 0.14, 0)); sw.add(at(mesh(box(0.08, 0.85, 0.03), M.get(0xc8ccd4)), 0, 0.58, 0)); }
      else { sw.add(at(mesh(box(0.05, 0.9, 0.05), M.get(0x5a3e26)), 0, 0.45, 0)); sw.add(at(mesh(box(0.36, 0.28, 0.04), M.get(0xa8acb4)), 0.12, 0.8, 0)); }
      this.weaponTip = sw;
    } else if (w === 'bow') {
      const bw = grp(0, -0.34, 0); this.armL.fore.add(bw);
      bw.add(at(mesh(box(0.04, 1.1, 0.06), M.get(0x6a4a2a)), 0, 0, 0.05));
      this.weaponTip = bw;
    } else if (w === 'hammer') {
      const hm = grp(0, -0.36, 0.05); hand.add(hm); hm.rotation.x = Math.PI / 2;
      hm.add(at(mesh(box(0.05, 0.6, 0.05), M.get(0x5a3e26)), 0, 0.2, 0));
      hm.add(at(mesh(box(0.28, 0.16, 0.16), M.get(0x6a6a72)), 0, 0.5, 0));
    } else if (w === 'spear') {
      const sp = grp(0, -0.34, 0.04); hand.add(sp);
      sp.add(at(mesh(cyl(0.03, 0.03, 2.2, 5), M.get(0x6a4a2a)), 0, 0.4, 0));
      sp.add(at(mesh(cone(0.06, 0.25, 4), M.get(0xb8bcc4)), 0, 1.6, 0));
    } else if (w === 'claws') {
      for (const f of [this.armL.fore, this.armR.fore]) for (const x of [-0.04, 0, 0.04]) {
        const c = at(mesh(cone(0.02, 0.18, 3), M.get(0xe8e0c8), false), x, -0.46, 0.03); c.rotation.x = Math.PI; f.add(c);
      }
    }
    this.root.scale.setScalar(o.scale ?? 1);
    this.walk = 0;
    this.t = 0;
  }

  // s: { speed, air, action, actionT, dead, deadT, cast }
  update(dt, s) {
    this.t += dt;
    const sp = Math.min(s.speed || 0, 12);
    this.walk += dt * (2.2 + sp * 1.15);
    const amp = Math.min(1, sp / 6) * 0.75;
    const sw = Math.sin(this.walk) * amp;
    const breath = Math.sin(this.t * 2) * 0.015;
    const lerpR = (o, k, v, r = 14) => { o.rotation[k] += (v - o.rotation[k]) * Math.min(1, dt * r); };
    if (s.dead) {
      const k = Math.min(1, s.deadT * 2.5);
      this.body.rotation.x = -k * 1.45; this.body.position.y = 0.12 * k;
      lerpR(this.armL.sh, 'x', -2.6); lerpR(this.armR.sh, 'x', -2.6);
      return;
    }
    this.body.rotation.x = 0; this.body.position.y = 0;
    this.hips.position.y = 0.95 + Math.abs(Math.cos(this.walk)) * amp * 0.08 + breath;
    lerpR(this.legL.hip, 'x', s.air ? -0.7 : sw);
    lerpR(this.legR.hip, 'x', s.air ? 0.3 : -sw);
    lerpR(this.legL.shin, 'x', s.air ? 1.1 : Math.max(0, -Math.sin(this.walk + 0.6)) * amp * 1.3);
    lerpR(this.legR.shin, 'x', s.air ? 0.5 : Math.max(0, Math.sin(this.walk + 0.6)) * amp * 1.3);
    lerpR(this.torso, 'x', sp > 7 ? 0.16 : 0.03);
    lerpR(this.torso, 'y', 0);
    // Руки: по умолчанию — маятник
    let lx = -sw * 0.8, rx = sw * 0.8, rz = -0.08, lz = 0.08, rfx = -0.25, lfx = -0.25;
    const a = s.action, at = s.actionT ?? 0;
    if (a === 'cast') {
      const k = at < 0.3 ? at / 0.3 : 1 - (at - 0.3) / 0.7;
      rx = -1.5 * k - 0.1; rfx = -0.2; rz = -0.1;
      if (s.twoHand) { lx = -1.4 * k; lz = 0.2; }
      lerpR(this.torso, 'y', -0.25 * k, 20);
    } else if (a === 'channel') {
      rx = -1.3; lx = -1.3; rz = -0.3; lz = 0.3; rfx = -0.3; lfx = -0.3;
    } else if (a === 'attack') {
      const k = at;
      rx = k < 0.35 ? -2.4 * (k / 0.35) : -2.4 + 3.1 * Math.min(1, (k - 0.35) / 0.3);
      rfx = -0.4; lerpR(this.torso, 'y', k < 0.35 ? 0.4 : -0.4, 20);
    } else if (a === 'slam') {
      const k = at;
      rx = lx = k < 0.5 ? -2.8 * (k / 0.5) : -2.8 + 3.2 * Math.min(1, (k - 0.5) / 0.2);
      rz = -0.2; lz = 0.2;
    } else if (a === 'hit') {
      lerpR(this.torso, 'x', -0.35, 30); rx = 0.4; lx = 0.4;
    }
    lerpR(this.armL.sh, 'x', lx, a ? 22 : 12); lerpR(this.armR.sh, 'x', rx, a ? 22 : 12);
    lerpR(this.armL.sh, 'z', lz); lerpR(this.armR.sh, 'z', rz);
    lerpR(this.armL.fore, 'x', lfx); lerpR(this.armR.fore, 'x', rfx);
    if (this.orb) this.orb.scale.setScalar(1 + (a === 'cast' ? 0.6 : 0) + Math.sin(this.t * 5) * 0.08);
  }
}

// ======================= ЧЕТВЕРОНОГИЙ =======================
export class QuadRig {
  constructor(o = {}) {
    this.o = o;
    const M = this.bank = new MatBank({ translucent: o.translucent });
    const main = M.get(o.main ?? 0x8a8f99), dark = M.get(o.dark ?? 0x4a4e57);
    this.root = new THREE.Group();
    this.body = grp(0, 0.78, 0); this.root.add(this.body);
    this.body.add(at(mesh(box(0.5, 0.46, 1.15), main), 0, 0, 0));
    this.body.add(at(mesh(box(0.56, 0.5, 0.5), main), 0, 0.04, 0.35));
    this.body.add(at(mesh(box(0.42, 0.12, 1.0), dark), 0, 0.26, -0.05));
    if (o.spikes) for (let i = 0; i < 4; i++) this.body.add(at(mesh(cone(0.07, 0.3, 4), M.glow(o.glow ?? 0xff5a1a), false), 0, 0.38, -0.4 + i * 0.25));
    this.head = grp(0, 0.18, 0.62); this.body.add(this.head);
    this.head.add(at(mesh(box(0.34, 0.3, 0.36), main), 0, 0, 0.1));
    this.head.add(at(mesh(box(0.2, 0.16, 0.3), dark), 0, -0.06, 0.38));
    this.jaw = grp(0, -0.12, 0.3); this.head.add(this.jaw);
    this.jaw.add(at(mesh(box(0.17, 0.06, 0.26), dark), 0, 0, 0.08));
    const eyeM = M.glow(o.eye ?? 0xffd27a);
    this.head.add(at(mesh(box(0.05, 0.05, 0.02), eyeM, false), -0.1, 0.06, 0.29), at(mesh(box(0.05, 0.05, 0.02), eyeM, false), 0.1, 0.06, 0.29));
    this.head.add(at(mesh(cone(0.07, 0.18, 4), dark), -0.11, 0.22, 0.02), at(mesh(cone(0.07, 0.18, 4), dark), 0.11, 0.22, 0.02));
    this.tail = grp(0, 0.12, -0.58); this.body.add(this.tail);
    const tm = at(mesh(cyl(0.04, 0.09, 0.55, 5), o.glow ? M.glow(o.glow) : dark), 0, -0.2, -0.1); tm.rotation.x = -0.6; this.tail.add(tm);
    this.legs = [];
    for (const [x, z] of [[-0.2, 0.42], [0.2, 0.42], [-0.2, -0.42], [0.2, -0.42]]) {
      const hip = grp(x, -0.14, z); this.body.add(hip);
      hip.add(at(mesh(box(0.12, 0.36, 0.14), main), 0, -0.18, 0));
      const knee = grp(0, -0.36, 0); hip.add(knee);
      knee.add(at(mesh(box(0.09, 0.3, 0.1), dark), 0, -0.14, 0));
      this.legs.push({ hip, knee, front: z > 0 });
    }
    this.root.scale.setScalar(o.scale ?? 1);
    this.walk = 0; this.t = 0;
  }
  update(dt, s) {
    this.t += dt;
    const sp = Math.min(s.speed || 0, 14);
    this.walk += dt * (2 + sp * 1.3);
    const amp = Math.min(1, sp / 5) * 0.8;
    const L = (o, k, v, r = 14) => { o.rotation[k] += (v - o.rotation[k]) * Math.min(1, dt * r); };
    if (s.dead) {
      const k = Math.min(1, s.deadT * 3);
      this.body.rotation.z = k * 1.5; this.body.position.y = 0.78 - 0.5 * k;
      return;
    }
    this.body.rotation.z = 0;
    this.body.position.y = 0.78 + Math.abs(Math.sin(this.walk)) * amp * 0.08;
    this.legs.forEach((l, i) => {
      const ph = this.walk + (i === 0 || i === 3 ? 0 : Math.PI);
      L(l.hip, 'x', Math.sin(ph) * amp);
      L(l.knee, 'x', (l.front ? -1 : 1) * Math.max(0, Math.sin(ph + 1)) * amp * 0.9);
    });
    const a = s.action, at = s.actionT ?? 0;
    let headX = Math.sin(this.t * 2) * 0.04, jaw = 0.05, bodyX = 0;
    if (a === 'attack') { const k = Math.sin(Math.min(1, at) * Math.PI); headX = -0.4 * k + 0.2; jaw = 0.6 * k; bodyX = -0.15 * k; this.body.position.z = k * 0.4; }
    else this.body.position.z = 0;
    if (a === 'hit') bodyX = 0.2;
    L(this.head, 'x', headX, 20); L(this.jaw, 'x', jaw, 20); L(this.body, 'x', bodyX, 18);
    this.tail.rotation.y = Math.sin(this.t * 6) * 0.3;
  }
}

// ======================= ПАУК =======================
export class SpiderRig {
  constructor(o = {}) {
    const M = this.bank = new MatBank();
    const main = M.get(o.main ?? 0x4a3b2e), dark = M.get(o.dark ?? 0x2a2018);
    this.root = new THREE.Group();
    this.body = grp(0, 0.6, 0); this.root.add(this.body);
    this.body.add(at(mesh(sph(0.32, 7, 5), main), 0, 0, 0.25));
    const abd = at(mesh(sph(0.5, 8, 6), dark), 0, 0.12, -0.45); abd.scale.set(1, 0.85, 1.2); this.body.add(abd);
    this.body.add(at(mesh(box(0.36, 0.05, 0.1), M.get(0xb83a2e), false), 0, 0.52, -0.45));
    const eye = M.glow(o.eye ?? 0xff4d4d);
    for (const [x, y] of [[-0.08, 0.1], [0.08, 0.1], [-0.15, 0.05], [0.15, 0.05]]) this.body.add(at(mesh(box(0.05, 0.05, 0.03), eye, false), x, y, 0.55));
    this.legs = [];
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1, k = i % 4;
      const hip = grp(side * 0.2, 0, 0.42 - k * 0.2); this.body.add(hip);
      hip.rotation.y = side * (0.4 + k * 0.35) * -1 + (side < 0 ? Math.PI : 0);
      const up = grp(0, 0, 0); hip.add(up);
      up.add(at(mesh(box(0.07, 0.07, 0.55), main), 0, 0.15, 0.25)); up.children[0].rotation.x = -0.6;
      const low = grp(0, 0.32, 0.48); up.add(low);
      low.add(at(mesh(box(0.05, 0.05, 0.7), dark), 0, -0.25, 0.18)); low.children[0].rotation.x = 1.0;
      this.legs.push({ up, ph: (k % 2 === 0 ? 0 : Math.PI) + (side < 0 ? Math.PI : 0) });
    }
    this.root.scale.setScalar(o.scale ?? 1);
    this.walk = 0;
  }
  update(dt, s) {
    const sp = Math.min(s.speed || 0, 12);
    this.walk += dt * (3 + sp * 1.6);
    if (s.dead) { const k = Math.min(1, s.deadT * 3); this.body.position.y = 0.6 - 0.45 * k; this.legs.forEach((l) => { l.up.rotation.x = 0.8 * k; }); return; }
    const amp = Math.min(1, sp / 4) * 0.35;
    this.body.position.y = 0.6 + Math.sin(this.walk * 2) * 0.03;
    this.legs.forEach((l) => { l.up.rotation.x = Math.sin(this.walk + l.ph) * amp; l.up.rotation.y = Math.cos(this.walk + l.ph) * amp * 0.6; });
    const a = s.action;
    this.body.rotation.x = a === 'attack' ? -0.3 * Math.sin(Math.min(1, s.actionT) * Math.PI) : 0;
  }
}

// ======================= СЛИЗЕНЬ / ЖАБА =======================
export class BlobRig {
  constructor(o = {}) {
    const M = this.bank = new MatBank({ translucent: o.translucent });
    this.o = o;
    this.root = new THREE.Group();
    this.body = grp(0, 0, 0); this.root.add(this.body);
    const main = M.get(o.main ?? 0x6fd6ff);
    if (o.toad) {
      const b = at(mesh(sph(0.6, 9, 6), main), 0, 0.5, 0); b.scale.set(1.15, 0.75, 1.25); this.body.add(b);
      this.body.add(at(mesh(sph(0.48, 8, 5), M.get(0xd8d0a0)), 0, 0.38, 0.12));
      for (const x of [-0.28, 0.28]) {
        this.body.add(at(mesh(sph(0.16, 6, 5), main), x, 0.88, 0.42));
        this.body.add(at(mesh(sph(0.08, 5, 4), M.glow(o.eye ?? 0xffd23a), false), x, 0.92, 0.55));
      }
      for (const x of [-0.55, 0.55]) { const l = at(mesh(box(0.28, 0.16, 0.5), main), x, 0.12, -0.2); this.body.add(l); }
      if (o.crown) for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; this.body.add(at(mesh(cone(0.08, 0.3, 4), M.glow(o.crown), false), Math.cos(a) * 0.3, 1.0, Math.sin(a) * 0.3 - 0.05)); }
    } else {
      const b = at(mesh(sph(0.55, 10, 7), main), 0, 0.5, 0); this.body.add(b);
      this.core = at(mesh(ico(0.18, 0), M.glow(o.glow ?? 0x9ff0ff), false), 0, 0.5, 0); this.body.add(this.core);
      for (const x of [-0.16, 0.16]) this.body.add(at(mesh(box(0.09, 0.12, 0.04), M.get(o.eye ?? 0x10304a), false), x, 0.66, 0.5));
    }
    this.root.scale.setScalar(o.scale ?? 1);
    this.t = 0; this.hop = 0;
  }
  update(dt, s) {
    this.t += dt;
    const sp = Math.min(s.speed || 0, 10);
    if (s.dead) { const k = Math.min(1, s.deadT * 3); this.body.scale.set(1 + k * 0.6, 1 - k * 0.85, 1 + k * 0.6); return; }
    if (sp > 0.5) this.hop += dt * (4 + sp);
    const h = sp > 0.5 ? Math.abs(Math.sin(this.hop)) : 0;
    const sq = sp > 0.5 ? Math.cos(this.hop * 2) * 0.12 : Math.sin(this.t * 3) * 0.04;
    let ax = 0;
    if (s.action === 'attack' || s.action === 'cast') ax = Math.sin(Math.min(1, s.actionT) * Math.PI) * 0.3;
    this.body.scale.set(1 - sq + ax, 1 + sq - ax * 0.5, 1 - sq + ax);
    this.body.position.y = h * 0.5;
    if (this.core) this.core.rotation.y += dt * 2;
  }
}

// ======================= ПАРЯЩИЙ (духи, элементали, гарпии) =======================
export class FloaterRig {
  constructor(o = {}) {
    const M = this.bank = new MatBank();
    this.o = o;
    this.root = new THREE.Group();
    this.body = grp(0, 1.4, 0); this.root.add(this.body);
    const main = M.get(o.main ?? 0xcfe8ff), glow = M.glow(o.glow ?? 0x9fdcff);
    this.parts = [];
    if (o.wisp) {
      this.body.add(at(mesh(ico(0.35, 1), glow, false), 0, 0, 0));
      this.body.add(at(mesh(ico(0.55, 1), M.glow(o.main, 0.35), false), 0, 0, 0));
    } else if (o.flame) {
      this.body.add(at(mesh(ico(0.5, 0), glow, false), 0, 0.1, 0));
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const f = at(mesh(cone(0.25, 1.0, 5), M.glow(i % 2 ? o.main : o.glow, 0.85), false), Math.cos(a) * 0.35, 0.3, Math.sin(a) * 0.35);
        f.rotation.z = Math.cos(a) * -0.3; f.rotation.x = Math.sin(a) * 0.3; this.body.add(f); this.parts.push(f);
      }
      const tail = at(mesh(cone(0.4, 1.2, 6), M.glow(o.main, 0.8), false), 0, -0.8, 0); tail.rotation.x = Math.PI; this.body.add(tail);
      if (o.crown) for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; this.body.add(at(mesh(cone(0.07, 0.4, 4), M.get(o.crown), false), Math.cos(a) * 0.3, 0.75, Math.sin(a) * 0.3)); }
    } else {
      // фигура в балахоне / с кристаллами
      if (o.robe) {
        this.body.add(at(mesh(cone(0.55, 1.6, 7), main), 0, -0.4, 0));
        this.body.children[0].rotation.x = Math.PI;
        this.body.add(at(mesh(box(0.34, 0.36, 0.34), main), 0, 0.55, 0));
        this.body.add(at(mesh(box(0.06, 0.05, 0.02), glow, false), -0.08, 0.58, 0.17), at(mesh(box(0.06, 0.05, 0.02), glow, false), 0.08, 0.58, 0.17));
        this.arms = [];
        for (const side of [-1, 1]) {
          const a = grp(side * 0.32, 0.3, 0); this.body.add(a);
          const m = at(mesh(cone(0.12, 0.7, 5), main), 0, -0.3, 0.1); m.rotation.x = Math.PI + 0.4; a.add(m); this.arms.push(a);
        }
      } else {
        this.body.add(at(mesh(ico(0.5, 0), main), 0, 0, 0));
        this.body.add(at(mesh(ico(0.25, 0), glow, false), 0, 0, 0.32));
      }
      if (o.shards) for (let i = 0; i < 5; i++) {
        const s = mesh(octa(0.18), glow, false); s.scale.y = 2; this.body.add(s); this.parts.push(s);
      }
      if (o.wings) {
        this.wings = [];
        for (const side of [-1, 1]) {
          const w = grp(side * 0.3, 0.3, -0.1); this.body.add(w);
          const wm = at(mesh(box(1.2, 0.05, 0.6), M.get(o.main)), side * 0.6, 0, 0); w.add(wm);
          w.add(at(mesh(box(0.9, 0.04, 0.4), M.glow(o.glow, 0.8), false), side * 0.7, 0.03, -0.1));
          this.wings.push({ w, side });
        }
        if (!o.robe) { this.body.add(at(mesh(cone(0.08, 0.3, 4), M.get(0xe8d070)), 0, 0, 0.55)); this.body.children.at(-1).rotation.x = Math.PI / 2; }
      }
    }
    this.root.scale.setScalar(o.scale ?? 1);
    this.t = Math.random() * 10;
  }
  update(dt, s) {
    this.t += dt;
    if (s.dead) { const k = Math.min(1, s.deadT * 2); this.body.position.y = 1.4 - k * 1.2; this.body.scale.setScalar(1 - k * 0.7); return; }
    this.body.position.y = 1.4 + Math.sin(this.t * 2.2) * 0.15;
    this.body.rotation.x = Math.min(0.4, (s.speed || 0) * 0.04);
    this.parts.forEach((p, i) => {
      if (this.o.shards) { const a = this.t * 1.6 + (i / this.parts.length) * Math.PI * 2; p.position.set(Math.cos(a) * 0.95, Math.sin(this.t * 3 + i) * 0.25, Math.sin(a) * 0.95); p.rotation.y += dt * 3; }
      else p.scale.y = 1 + Math.sin(this.t * 10 + i * 1.7) * 0.25;
    });
    if (this.wings) this.wings.forEach(({ w, side }) => { w.rotation.z = side * Math.sin(this.t * (s.speed > 1 ? 14 : 7)) * 0.6; });
    if (this.arms) {
      const k = s.action === 'cast' || s.action === 'attack' ? Math.sin(Math.min(1, s.actionT) * Math.PI) : 0;
      this.arms.forEach((a) => { a.rotation.x = -k * 1.4 + Math.sin(this.t * 2) * 0.1; });
    }
    if (s.action === 'attack' && !this.arms) this.body.position.z = Math.sin(Math.min(1, s.actionT) * Math.PI) * 0.6; else this.body.position.z = 0;
  }
}

export function buildRig(model) {
  switch (model.body) {
    case 'quad': return new QuadRig(model);
    case 'spider': return new SpiderRig(model);
    case 'blob': return new BlobRig(model);
    case 'floater': return new FloaterRig(model);
    default: return new HumanoidRig(model);
  }
}
