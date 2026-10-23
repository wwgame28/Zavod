import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { rng, clamp, angleLerp } from '../core/rng.js';
import { G } from '../state.js';
import { ENEMIES, ELITE_MODS } from '../data/enemies.js';
import { CAMPS, BOSSES } from '../data/locations.js';
import { BOSS_BARKS } from '../data/dialogues.js';
import { buildRig } from './models.js';
import { enemyScale } from '../systems/stats.js';
import { dealDamage, tickStatuses, heal } from '../systems/combat.js';
import { applyStatus, statusMods } from '../systems/status.js';

const HEIGHT = { humanoid: 1.9, quad: 1.15, spider: 0.95, blob: 1.0, floater: 2.0 };
const RADIUS = { humanoid: 0.45, quad: 0.6, spider: 0.75, blob: 0.6, floater: 0.55 };
const NOVA_STATUS = { fire: 'burn', frost: 'freeze', storm: 'shock', nature: 'poison', shadow: 'weaken' };
const RAIN_EL = { meteor: 'fire', lightning: 'storm', thorn: 'nature', glob: 'nature', shard: 'frost' };
const _out = { x: 0, z: 0, hit: false };
const _v = new THREE.Vector3();

export class Enemy {
  constructor(type, level, x, z, opts = {}) {
    const def = ENEMIES[type];
    this.type = type; this.def = def; this.level = level;
    this.isEnemy = true; this.isPlayer = false;
    this.team = def.ally ? 'ally' : 'enemy';
    this.boss = !!def.boss; this.final = !!def.final;
    this.elite = opts.elite || null;
    this.camp = opts.camp || null;
    this.bossId = opts.bossId || null;
    this.owner = opts.owner || null;
    this.name = (this.elite ? this.elite.name + ' ' + def.name.charAt(0).toLowerCase() + def.name.slice(1) : def.name);
    const sc = enemyScale(def, level, this.elite);
    const powerMul = opts.power ?? 1;
    this.maxHp = Math.round(sc.hp * powerMul); this.hp = this.maxHp;
    this.dmg = sc.dmg * powerMul; this.armor = sc.armor;
    this.res = def.res || {};
    this.speed = def.speed * (this.elite?.speed || 1);
    const body = def.model.body || 'humanoid';
    const s = def.model.scale ?? 1;
    this.height = HEIGHT[body] * s; this.radius = RADIUS[body] * s;
    this.flying = def.flying || 0;
    this.rig = buildRig(def.model);
    if (this.elite) this.rig.root.scale.multiplyScalar(1.18);
    this.root = this.rig.root;
    this.pos = this.root.position;
    this.pos.set(x, G.terrain.heightAt(x, z) + this.flying, z);
    this.vel = new THREE.Vector3();
    this.yaw = rng.float(0, Math.PI * 2);
    this.home = { x: opts.homeX ?? x, z: opts.homeZ ?? z };
    this.arena = opts.arena || 0;
    this.state = 'idle';
    this.target = null;
    this.attackCd = rng.float(0.5, 1.5);
    this.abilityCd = {};
    for (const a of def.abilities || []) this.abilityCd[a] = rng.float(3, 7);
    this.abilityGap = 2;
    this.action = null; this.actionT = 0; this.actionDur = 1; this.actionFired = false;
    this.statuses = {}; this.alive = true; this.deadT = 0; this.flash = 0;
    this.wander = { x, z, t: rng.float(1, 4) };
    this.phase = 1; this.adds = 0;
    this.knock = null; this.charge = null;
    this.expireAt = opts.expire ? G.time + opts.expire : 0;
    this.shieldFn = opts.shield || null;
    this.lastHit = -99;
    this.removed = false;
    G.scene.add(this.root);
    // тень отбрасывают только крупные части — мелкие детали лишь нагружают теневой проход
    this.root.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      o.castShadow = o.geometry.boundingSphere.radius * (def.model.scale ?? 1) > 0.22;
    });
  }

  get shielded() { return this.shieldFn ? this.shieldFn() : false; }

  onDamaged(src) {
    if (this.team === 'ally') return;
    if (this.state === 'idle' || this.state === 'wander') {
      this.aggro(src);
      G.enemies.alertNear(this, src);
    }
  }

  aggro(t) {
    if (!t || !t.alive || this.returning) return;
    if (this.state !== 'chase' && this.boss && this.team === 'enemy') {
      const b = BOSS_BARKS[this.type];
      if (b && !this.barked) { this.barked = true; G.ui?.bossSay(this.def.name, b.aggro); G.audio?.play('boss'); }
    }
    this.target = t; this.state = 'chase';
  }

  startAction(name, dur, onFire, fireAt = 0.5) {
    this.action = name; this.actionT = 0; this.actionDur = dur; this.actionFired = false; this.onFire = onFire; this.fireAt = fireAt;
  }

  // ---------------- кадр ----------------
  update(dt) {
    if (!this.alive) {
      this.deadT += dt;
      this.rig.update(dt, { dead: true, deadT: this.deadT });
      if (this.deadT > 2.4) this.root.scale.multiplyScalar(Math.max(0, 1 - dt * 3));
      return;
    }
    if (this.expireAt && G.time > this.expireAt) { this.die(null, true); return; }
    tickStatuses(this, dt);
    if (!this.alive) return;
    const mods = statusMods(this);
    this.flash = Math.max(0, this.flash - dt);
    if (this.shielded) this.rig.bank.tint(0x8a6aff, 0.35 + Math.sin(G.time * 6) * 0.1);
    else this.rig.bank.flash(this.flash > 0 ? 0.8 : (this.statuses.freeze ? 0.35 : 0));

    const P = G.player;
    for (const k in this.abilityCd) this.abilityCd[k] -= dt;
    this.attackCd -= dt; this.abilityGap -= dt;

    // Цель
    if (this.team === 'ally') this._allyTarget();
    else if (this.state === 'idle' || this.state === 'wander') {
      const cands = G.enemies.allies(); if (P.alive) cands.push(P);
      for (const c of cands) {
        const d = Math.hypot(c.pos.x - this.pos.x, c.pos.z - this.pos.z);
        const aggro = (this.def.aggro || 15) * (c.isPlayer && P.sneak ? 0.6 : 1);
        if (d < aggro) { this.aggro(c); G.enemies.alertNear(this, c); break; }
      }
    }
    if (this.target && (!this.target.alive || (this.target.isPlayer && !P.alive))) { this.target = null; this.state = this.team === 'ally' ? 'follow' : 'return'; }

    // Поводок
    const homeD = Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z);
    const leash = this.arena ? this.arena * 1.7 : CONFIG.COMBAT.leashDist;
    if (this.team === 'enemy' && this.state === 'chase' && homeD > leash) { this.state = 'return'; this.target = null; }
    this.returning = this.state === 'return';

    let mx = 0, mz = 0, want = 0;
    const stunned = mods.stun;
    if (this.action) {
      this.actionT += dt / this.actionDur;
      if (!this.actionFired && this.actionT >= this.fireAt) { this.actionFired = true; this.onFire?.(); }
      if (this.actionT >= 1) this.action = null;
      if (this.target) this._face(this.target.pos.x - this.pos.x, this.target.pos.z - this.pos.z, dt, 6);
    } else if (!stunned) {
      if (this.state === 'return') {
        mx = this.home.x - this.pos.x; mz = this.home.z - this.pos.z; want = this.speed * 1.2;
        heal(this, this.maxHp * dt * 0.5, false);
        if (homeD < 2) { this.state = 'idle'; this.hp = this.maxHp; this.statuses = {}; this.barked = false; this.phase = 1; }
      } else if (this.state === 'chase' || this.state === 'follow') {
        const t = this.target || (this.team === 'ally' ? P : null);
        if (t) {
          const dx = t.pos.x - this.pos.x, dz = t.pos.z - this.pos.z;
          const d = Math.hypot(dx, dz);
          if (this.state === 'follow') {
            if (d > 4) { mx = dx; mz = dz; want = this.speed * (d > 10 ? 1.3 : 0.8); }
          } else {
            const atk = this.def.attack;
            const reach = atk.range + (t.radius || 0.5) + this.radius * 0.5;
            if (!this.charge && this.abilityGap <= 0 && this._tryAbility(t, d)) { /* способность начата */ }
            else if (d <= reach && this.attackCd <= 0) this._attack(t);
            else if (atk.kind === 'ranged' && this.def.keepDistance && d < this.def.keepDistance) {
              mx = -dx; mz = -dz; want = this.speed * 0.7;
              const side = Math.sin(G.time * 0.7 + this.pos.x) > 0 ? 1 : -1;
              mx += -dz * side * 0.8; mz += dx * side * 0.8;
            } else if (d > reach * 0.85) { mx = dx; mz = dz; want = this.speed; }
            this._face(dx, dz, dt, 8);
          }
        }
      } else {
        // бродим у дома
        this.wander.t -= dt;
        if (this.wander.t <= 0) {
          this.wander.t = rng.float(3, 7);
          const r = this.camp ? this.camp.def.r : 6;
          this.wander.x = this.home.x + rng.float(-r, r); this.wander.z = this.home.z + rng.float(-r, r);
        }
        const dx = this.wander.x - this.pos.x, dz = this.wander.z - this.pos.z;
        if (Math.hypot(dx, dz) > 1.2) { mx = dx; mz = dz; want = this.speed * 0.3; }
      }
    }
    // Рывок
    if (this.charge) {
      this.charge.t -= dt;
      mx = this.charge.dx; mz = this.charge.dz; want = this.speed * 3.2;
      const t = this.target;
      if (t && !this.charge.hit && Math.hypot(t.pos.x - this.pos.x, t.pos.z - this.pos.z) < this.radius + 1.5) {
        this.charge.hit = true;
        dealDamage(this, t, { amount: this.dmg * 1.3, element: this.def.element, melee: true, knock: { x: this.charge.dx * 8, z: this.charge.dz * 8 } });
        if (t.isPlayer) t.knockback(this.charge.dx * 9, this.charge.dz * 9);
      }
      if (this.charge.t <= 0) this.charge = null;
    }
    if (mods.root || stunned) want = 0;
    want *= 1 - mods.slow;
    const len = Math.hypot(mx, mz);
    const tx = len > 0.01 ? (mx / len) * want : 0, tz = len > 0.01 ? (mz / len) * want : 0;
    const k = Math.min(1, dt * 8);
    this.vel.x += (tx - this.vel.x) * k; this.vel.z += (tz - this.vel.z) * k;
    if (this.knock) {
      this.vel.x += this.knock.x; this.vel.z += this.knock.z; this.knock = null;
    }
    let nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
    if (!this.flying || this.flying < 2) {
      G.world.colliders.resolve(nx, nz, this.radius, _out); nx = _out.x; nz = _out.z;
    }
    const g = G.terrain.heightAt(nx, nz);
    if (g < CONFIG.OCEAN_LIMIT + 2 && !this.flying) { nx = this.pos.x; nz = this.pos.z; }
    this.pos.x = nx; this.pos.z = nz;
    const gy = G.terrain.heightAt(nx, nz);
    const baseY = this.flying ? Math.max(gy, 0) + this.flying : Math.max(gy, -1.4);
    this.pos.y += (baseY - this.pos.y) * Math.min(1, dt * 10);
    const sp = Math.hypot(this.vel.x, this.vel.z);
    if (sp > 0.3 && !this.action) this._face(this.vel.x, this.vel.z, dt, 10);
    this.root.rotation.y = this.yaw;
    const pd = Math.abs(P.pos.x - this.pos.x) + Math.abs(P.pos.z - this.pos.z);
    this.root.visible = pd < 190;
    if (pd < 140 || this.state === 'chase') this.rig.update(dt, { speed: sp, action: this.action, actionT: this.actionT, dead: false });

    // Ауры элит
    if (this.elite?.aura && P.alive && Math.hypot(P.pos.x - this.pos.x, P.pos.z - this.pos.z) < 4.5) {
      applyStatus(P, this.elite.aura, 1.5, this.elite.aura === 'burn' ? this.dmg * 0.12 : 0, this);
    }
    if (this.elite && rng.chance(dt * 4)) G.fx.trail(this.pos.x + rng.float(-0.5, 0.5), this.pos.y + this.height * 0.8, this.pos.z + rng.float(-0.5, 0.5), 0xffb347, 0.3);
    // Фазы босса
    if (this.boss && this.phase === 1 && this.hp < this.maxHp * 0.5) {
      this.phase = 2;
      const b = BOSS_BARKS[this.type];
      if (b) G.ui?.bossSay(this.def.name, b.half);
      this.speed *= 1.15;
      for (const a in this.abilityCd) this.abilityCd[a] = Math.min(this.abilityCd[a], 1.5);
      G.fx.explode(this.pos.x, this.pos.y + 1, this.pos.z, 5, this.def.element);
      G.game.shake(0.6);
    }
  }

  _face(dx, dz, dt, rate) { if (Math.abs(dx) + Math.abs(dz) > 1e-4) this.yaw = angleLerp(this.yaw, Math.atan2(dx, dz), Math.min(1, dt * rate)); }

  _allyTarget() {
    const P = G.player;
    if (!this.target || !this.target.alive) {
      const e = G.enemies.nearestHostile(P.pos, 22);
      if (e) { this.target = e; this.state = 'chase'; } else { this.target = null; this.state = 'follow'; }
    }
    if (Math.hypot(P.pos.x - this.pos.x, P.pos.z - this.pos.z) > 35) { this.pos.set(P.pos.x + 2, P.pos.y, P.pos.z + 2); }
  }

  _attack(t) {
    const atk = this.def.attack;
    this.attackCd = atk.cd * (this.phase === 2 ? 0.8 : 1) * rng.float(0.9, 1.15);
    if (atk.kind === 'melee') {
      this.startAction('attack', atk.windup + 0.35, () => {
        if (!t.alive) return;
        const dx = t.pos.x - this.pos.x, dz = t.pos.z - this.pos.z;
        const d = Math.hypot(dx, dz);
        const facing = (Math.sin(this.yaw) * dx + Math.cos(this.yaw) * dz) / (d || 1);
        if (d < atk.range + (t.radius || 0.5) + this.radius * 0.6 + 0.6 && facing > 0.2) {
          dealDamage(this, t, { amount: this.dmg, element: this.def.element, melee: true, status: this.def.onHit?.status, statusChance: this.def.onHit?.chance, statusDur: 3 });
          G.audio?.play('swing', { pos: this.pos, vol: 0.6 });
        }
      }, atk.windup / (atk.windup + 0.35));
    } else {
      this.startAction('cast', atk.windup + 0.3, () => this._shoot(t, atk.proj), atk.windup / (atk.windup + 0.3));
      G.audio?.play('enemy_cast', { pos: this.pos, vol: 0.5 });
    }
  }

  _shoot(t, pr, mul = 1, spread = 0) {
    if (!t?.alive) return;
    const from = _v.set(this.pos.x, this.pos.y + this.height * 0.65, this.pos.z).clone();
    const tgt = new THREE.Vector3(t.pos.x, t.pos.y + (t.height || 1.6) * 0.5, t.pos.z);
    const dist = from.distanceTo(tgt);
    const lead = dist / pr.speed;
    if (t.vel) tgt.addScaledVector(new THREE.Vector3(t.vel.x, 0, t.vel.z), lead * 0.6);
    const dir = tgt.sub(from).normalize();
    if (spread) dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), spread);
    const el = this.def.element;
    G.projectiles.spawn({
      pos: from, vel: dir.multiplyScalar(pr.speed), team: this.team, src: this, size: pr.size * (this.boss ? 1.2 : 1), kind: pr.kind,
      color: pr.color, element: el, life: 3,
      hit: pr.splash ? null : { amount: this.dmg * mul, element: el, status: pr.status, statusChance: 0.5, statusDur: 3 },
      onHit: pr.splash ? (p) => {
        G.fx.explode(p.pos.x, p.pos.y, p.pos.z, pr.splash, el);
        for (const x of G.projectiles.targetsFor(this.team)) if (Math.hypot(x.pos.x - p.pos.x, x.pos.z - p.pos.z) < pr.splash + 0.4) dealDamage(this, x, { amount: this.dmg * mul, element: el, status: pr.status, statusChance: 0.6, statusDur: 3 });
      } : null,
    });
  }

  // ---------------- способности ----------------
  _tryAbility(t, d) {
    const list = this.def.abilities;
    if (!list || !list.length) return false;
    if (!this.boss && !this.elite && rng.next() > 0.5) return false;
    const ready = list.filter((a) => this.abilityCd[a] <= 0);
    if (!ready.length) return false;
    const a = rng.pick(ready);
    const [name, param] = a.split(':');
    const cdMul = this.phase === 2 ? 0.7 : 1;
    const S = this.def.model.scale ?? 1;
    const el = this.def.element;
    switch (name) {
      case 'slam': {
        if (d > 6 + S) return false;
        const r = Math.max(4, 2.2 * S);
        this.startAction('slam', 1.3, null, 0.7);
        G.projectiles.zone({ x: this.pos.x, z: this.pos.z, radius: r, team: this.team, src: this, delay: 0.95,
          onStart: (z, targets) => {
            G.fx.explode(z.x, z.y + 0.3, z.z, r, el === 'physical' ? 'physical' : el); G.game.shake(0.5); G.audio.play('explode', { pos: this.pos });
            for (const x of targets) { dealDamage(this, x, { amount: this.dmg * 1.5, element: el, status: el === 'frost' ? 'chill' : null, statusDur: 3 }); if (x.isPlayer) x.knockback((x.pos.x - z.x) * 1.5, (x.pos.z - z.z) * 1.5); }
          } });
        this.abilityCd[a] = 7 * cdMul; break;
      }
      case 'charge': case 'dive': {
        if (d < 5 || d > 22) return false;
        const dx = (t.pos.x - this.pos.x) / d, dz = (t.pos.z - this.pos.z) / d;
        this.startAction('attack', 0.55, () => { this.charge = { dx, dz, t: Math.min(0.75, d / (this.speed * 3.2) + 0.1), hit: false }; }, 0.9);
        G.audio.play('swing', { pos: this.pos });
        this.abilityCd[a] = (name === 'dive' ? 6 : 9) * cdMul; break;
      }
      case 'summon': {
        if (this.adds >= (this.boss ? 4 : 2)) return false;
        const n = this.boss ? (this.phase === 2 ? 3 : 2) : 1;
        this.startAction('cast', 1.0, () => {
          for (let i = 0; i < n; i++) {
            const ang = rng.float(0, Math.PI * 2);
            const e = G.enemies.spawnAdd(param, Math.max(1, this.level - 2), this.pos.x + Math.cos(ang) * 5, this.pos.z + Math.sin(ang) * 5, this);
            if (e) { this.adds++; e.summoner = this; e.aggro(t); G.fx.pillar(e.pos.x, e.pos.y, e.pos.z, 0xb071ff, 3); }
          }
        }, 0.6);
        this.abilityCd[a] = 18 * cdMul; break;
      }
      case 'rain': {
        const n = this.boss ? (this.phase === 2 ? 9 : 6) : 4;
        const relem = RAIN_EL[param] || el;
        this.startAction('cast', 1.0, null, 0.5);
        for (let i = 0; i < n; i++) {
          const ang = rng.float(0, Math.PI * 2), rr = i === 0 ? 0 : rng.float(2, 8);
          const x = t.pos.x + Math.cos(ang) * rr, z = t.pos.z + Math.sin(ang) * rr;
          G.projectiles.zone({ x, z, radius: 2.6, team: this.team, src: this, delay: 1.2 + i * 0.12,
            onStart: (zz, targets) => {
              if (param === 'lightning') { G.fx.lightning(new THREE.Vector3(zz.x, zz.y + 30, zz.z), new THREE.Vector3(zz.x, zz.y, zz.z)); G.audio.play('storm', { pos: zz }); }
              else if (param === 'meteor') { G.fx.explode(zz.x, zz.y, zz.z, 2.6, 'fire'); G.audio.play('explode', { pos: zz, vol: 0.6 }); }
              else G.fx.explode(zz.x, zz.y, zz.z, 2.2, relem);
              for (const x2 of targets) dealDamage(this, x2, { amount: this.dmg * 1.1, element: relem, status: relem === 'fire' ? 'burn' : relem === 'frost' ? 'chill' : relem === 'nature' ? 'poison' : relem === 'storm' ? 'shock' : null, statusChance: 0.6, statusDur: 3 });
            } });
        }
        this.abilityCd[a] = 11 * cdMul; break;
      }
      case 'nova': {
        if (d > 10) return false;
        const r = 9;
        this.startAction('slam', 1.5, null, 0.75);
        G.projectiles.zone({ x: this.pos.x, z: this.pos.z, radius: r, team: this.team, src: this, delay: 1.35,
          onStart: (z, targets) => {
            G.fx.explode(z.x, z.y + 0.5, z.z, r, param); G.game.shake(0.6); G.audio.play('explode', { pos: this.pos });
            for (const x of targets) dealDamage(this, x, { amount: this.dmg * 1.4, element: param, status: NOVA_STATUS[param], statusDur: param === 'frost' ? 1.4 : 3, statusChance: 1 });
          } });
        this.abilityCd[a] = 13 * cdMul; break;
      }
      case 'root': {
        this.startAction('cast', 0.9, null, 0.5);
        G.projectiles.zone({ x: t.pos.x, z: t.pos.z, radius: 2.4, team: this.team, src: this, delay: 1.0, color: 0x7ee081,
          onStart: (z, targets) => { G.fx.explode(z.x, z.y, z.z, 2.4, 'nature'); for (const x of targets) { applyStatus(x, 'root', 2); dealDamage(this, x, { amount: this.dmg * 0.6, element: 'nature' }); } } });
        this.abilityCd[a] = 12 * cdMul; break;
      }
      case 'blink': {
        if (d > 16 && !this.boss) return false;
        const ang = rng.float(0, Math.PI * 2), rr = rng.float(8, 13);
        const nx = t.pos.x + Math.cos(ang) * rr, nz = t.pos.z + Math.sin(ang) * rr;
        if (this.arena && Math.hypot(nx - this.home.x, nz - this.home.z) > this.arena) return false;
        G.fx.pillar(this.pos.x, this.pos.y, this.pos.z, 0xb071ff, 3);
        this.pos.x = nx; this.pos.z = nz; this.pos.y = G.terrain.heightAt(nx, nz) + this.flying;
        G.fx.pillar(nx, this.pos.y, nz, 0xb071ff, 3);
        G.audio.play('shadow', { pos: this.pos, vol: 0.6 });
        this.abilityCd[a] = 9 * cdMul; break;
      }
      case 'pull': {
        if (d < 6 || d > 24) return false;
        this.startAction('cast', 1.0, () => {
          if (!t.alive) return;
          if (t.isPlayer) t.knockback((this.pos.x - t.pos.x) * 1.4, (this.pos.z - t.pos.z) * 1.4);
          G.fx.lightning(new THREE.Vector3(this.pos.x, this.pos.y + this.height * 0.6, this.pos.z), new THREE.Vector3(t.pos.x, t.pos.y + 1, t.pos.z), 0xb071ff, 0.4);
          dealDamage(this, t, { amount: this.dmg * 0.8, element: 'shadow', status: 'weaken', statusDur: 4 });
        }, 0.6);
        this.abilityCd[a] = 14 * cdMul; break;
      }
      default: return false;
    }
    this.abilityGap = this.boss ? 2.4 : 4;
    return true;
  }

  die(killer, silent = false) {
    if (!this.alive) return;
    this.alive = false; this.deadT = 0; this.action = null; this.charge = null;
    this.rig.bank.flash(0);
    if (this.summoner) this.summoner.adds = Math.max(0, this.summoner.adds - 1);
    if (silent) { this.deadT = 2.2; return; }
    G.audio?.play('enemy_die', { pos: this.pos });
    G.fx.explode(this.pos.x, this.pos.y + this.height * 0.5, this.pos.z, this.boss ? 6 : 1.2, this.def.element);
    if (this.team === 'enemy') G.game.onEnemyKilled(this, killer);
    if (this.boss) {
      const b = BOSS_BARKS[this.type];
      if (b) G.ui?.bossSay(this.def.name, b.death);
    }
  }

  dispose() { if (!this.removed) { G.scene.remove(this.root); this.rig.bank.dispose(); this.removed = true; } }
}

// ======================= Менеджер врагов и лагерей =======================
export class EnemyManager {
  constructor() {
    this.list = [];
    this.camps = CAMPS.map((def) => ({ def, slots: new Array(def.count).fill(null).map(() => ({ enemy: null, respawnAt: 0 })), active: false }));
    this.bosses = BOSSES.map((def) => ({ def, enemy: null }));
    this.deadBosses = new Set();
    this.timer = 0;
  }

  hostiles() { return this.list.filter((e) => e.alive && e.team === 'enemy'); }
  allies() { return this.list.filter((e) => e.alive && e.team === 'ally'); }

  nearestHostile(pos, maxD, filter = null) {
    let best = null, bd = maxD;
    for (const e of this.list) {
      if (!e.alive || e.team !== 'enemy' || (filter && !filter(e))) continue;
      const d = Math.hypot(e.pos.x - pos.x, e.pos.z - pos.z);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // Луч по сферам врагов → ближайший {enemy, t}
  raycast(o, dir, maxD) {
    let best = null, bt = maxD;
    for (const e of this.list) {
      if (!e.alive || e.team !== 'enemy') continue;
      const r = Math.max(e.radius * 1.4, 0.9);
      const cx = e.pos.x - o.x, cy = e.pos.y + e.height * 0.5 - o.y, cz = e.pos.z - o.z;
      const tc = cx * dir.x + cy * dir.y + cz * dir.z;
      if (tc < 0) continue;
      const d2 = cx * cx + cy * cy + cz * cz - tc * tc;
      const rr = Math.max(r, e.height * 0.5) ** 2;
      if (d2 > rr) continue;
      const t = tc - Math.sqrt(rr - d2);
      if (t < bt) { bt = t; best = e; }
    }
    return best ? { enemy: best, t: bt } : null;
  }

  alertNear(src, target) {
    for (const e of this.list) {
      if (e === src || !e.alive || e.team !== 'enemy' || e.state === 'chase' || e.returning) continue;
      if (Math.hypot(e.pos.x - src.pos.x, e.pos.z - src.pos.z) < 14) e.aggro(target);
    }
  }

  inCombat() {
    return this.list.some((e) => e.alive && e.team === 'enemy' && e.state === 'chase' && e.target?.isPlayer);
  }
  engagedBoss() {
    return this.list.find((e) => e.alive && e.boss && e.state === 'chase') || null;
  }

  spawn(type, level, x, z, opts) { const e = new Enemy(type, level, x, z, opts); this.list.push(e); return e; }
  spawnAdd(type, level, x, z, owner) { if (!ENEMIES[type]) return null; return this.spawn(type, level, x, z, { homeX: owner.home.x, homeZ: owner.home.z, arena: owner.arena || 30 }); }
  summonAlly(type, level, dur, power) {
    const P = G.player;
    for (const e of this.allies()) e.die(null, true);
    const e = this.spawn(type, level, P.pos.x + 2, P.pos.z + 2, { expire: dur, power });
    e.state = 'follow';
    return e;
  }

  _shieldFor(id) {
    const Q = G.quests;
    const need = { old_root: ['mq5_life', 2], rot_mother: ['mq5_shadow', 2], squall: ['mq5_storm', 2], ignar: ['mq5_fire', 3] }[id];
    if (!need) return null;
    return () => { const st = Q.get(need[0]); return !(st && (st.state === 'done' || st.state === 'ready' || (st.state === 'active' && st.obj >= need[1]))); };
  }

  update(dt) {
    const P = G.player;
    this.timer -= dt;
    if (this.timer <= 0) { this.timer = 0.5; this._spawner(); }
    for (const e of this.list) e.update(dt);
    // Расталкивание
    const L = this.list;
    for (let i = 0; i < L.length; i++) {
      const a = L[i]; if (!a.alive) continue;
      for (let j = i + 1; j < L.length; j++) {
        const b = L[j]; if (!b.alive) continue;
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, min = a.radius + b.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 < min * min && d2 > 1e-6) {
          const d = Math.sqrt(d2), push = (min - d) * 0.5;
          a.pos.x -= (dx / d) * push; a.pos.z -= (dz / d) * push; b.pos.x += (dx / d) * push; b.pos.z += (dz / d) * push;
        }
      }
    }
    // Удаление
    for (let i = L.length - 1; i >= 0; i--) {
      const e = L[i];
      const far = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z) > CONFIG.SPAWN.despawn + 20;
      if ((!e.alive && e.deadT > 3) || (far && !e.boss && e.team === 'enemy' && !e.camp)) { e.dispose(); L.splice(i, 1); }
    }
  }

  _spawner() {
    const P = G.player;
    const S = CONFIG.SPAWN;
    for (const c of this.camps) {
      const d = Math.hypot(c.def.x - P.pos.x, c.def.z - P.pos.z);
      const allowed = !c.def.insideDome || G.world.domeOpen;
      if (d < S.activate && allowed) {
        c.active = true;
        for (const s of c.slots) {
          if (s.enemy && !s.enemy.alive) { s.enemy = null; s.respawnAt = G.time + S.respawn; }
          if (s.enemy || G.time < s.respawnAt) continue;
          if (s.respawnAt > 0 && d < 40) continue; // возрождение — только когда игрок ушёл от лагеря
          const type = rng.pick(c.def.types);
          const lvl = rng.int(c.def.levels[0], c.def.levels[1]);
          const ang = rng.float(0, Math.PI * 2), rr = Math.sqrt(rng.next()) * c.def.r;
          const elite = lvl >= 3 && rng.chance(CONFIG.COMBAT.eliteChance) ? rng.pick(ELITE_MODS) : null;
          s.enemy = this.spawn(type, lvl, c.def.x + Math.cos(ang) * rr, c.def.z + Math.sin(ang) * rr, { camp: c, elite, homeX: c.def.x, homeZ: c.def.z });
        }
      } else if (d > S.despawn && c.active) {
        c.active = false;
        for (const s of c.slots) {
          if (!s.enemy) continue;
          if (!s.enemy.alive) s.respawnAt = G.time + S.respawn;
          const i = this.list.indexOf(s.enemy); if (i >= 0) this.list.splice(i, 1);
          s.enemy.dispose(); s.enemy = null;
        }
      }
    }
    for (const b of this.bosses) {
      if (this.deadBosses.has(b.def.id)) continue;
      const d = Math.hypot(b.def.x - P.pos.x, b.def.z - P.pos.z);
      const allowed = !b.def.insideDome || G.world.domeOpen;
      if (!b.enemy && d < S.bossActivate + 30 && allowed) {
        b.enemy = this.spawn(b.def.type, b.def.level, b.def.x, b.def.z, { bossId: b.def.id, arena: b.def.arena, shield: this._shieldFor(b.def.id) });
      } else if (b.enemy && d > S.despawn) {
        if (b.enemy.alive) { const i = this.list.indexOf(b.enemy); if (i >= 0) this.list.splice(i, 1); b.enemy.dispose(); }
        b.enemy = null;
      } else if (b.enemy && !b.enemy.alive) b.enemy = null;
    }
  }

  clearAll() {
    for (const e of this.list) e.dispose();
    this.list.length = 0;
    for (const c of this.camps) { c.active = false; for (const s of c.slots) { s.enemy = null; s.respawnAt = 0; } }
    for (const b of this.bosses) b.enemy = null;
  }
}
