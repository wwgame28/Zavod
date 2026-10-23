import * as THREE from 'three';
import { SCHOOLS } from '../config.js';
import { rng } from '../core/rng.js';
import { G } from '../state.js';
import { SKILLS, BASIC_ATTACK } from '../data/skills.js';
import { dealDamage, heal } from './combat.js';
import { applyStatus, clearStatus } from './status.js';
import { spellMult } from './stats.js';

const _v = new THREE.Vector3();
const SFX = { fire: 'fire', frost: 'frost', storm: 'storm', life: 'life', shadow: 'shadow' };

// Реализация заклинаний игрока. ctx = { origin, dir, point, target }
export class Spells {
  manaCost(id, rank) {
    const s = SKILLS[id];
    const mast = G.player.mastery[s.school]?.lvl || 0;
    return Math.round(s.mana * (1 + 0.12 * (rank - 1)) * (1 - mast * 0.01));
  }
  cooldown(id, rank) {
    const s = SKILLS[id];
    const base = s.vals(rank).cd ?? s.cd;
    return base * (1 - G.player.stats.cdr / 100);
  }

  basic(ctx) {
    const P = G.player;
    const dmg = (BASIC_ATTACK.dmg + 2.2 * (P.level - 1) + P.stats.weaponDmg) * (1 + P.stats.sp / 100) * (1 + P.stats.phys / 300);
    G.projectiles.spawn({
      pos: ctx.origin, vel: ctx.dir.clone().multiplyScalar(40), team: 'player', src: P, size: 0.2, element: 'arcane', life: 1.6,
      homing: ctx.target, homingStr: 4, hit: { amount: dmg, element: 'arcane' },
    });
    G.audio.play('arcane');
  }

  cast(id, rank, ctx) {
    const P = G.player;
    const s = SKILLS[id];
    const v = s.vals(rank);
    const m = spellMult(P, s.school);
    const team = 'player';
    const hostilesNear = (x, z, r) => G.enemies.hostiles().filter((e) => Math.hypot(e.pos.x - x, e.pos.z - z) <= r + e.radius * 0.5);
    G.audio.play(SFX[s.school]);
    switch (id) {
      // ---------------- Пламя ----------------
      case 'fireball':
        G.projectiles.spawn({
          pos: ctx.origin, vel: ctx.dir.clone().multiplyScalar(30), team, src: P, size: 0.38, element: 'fire', life: 2,
          homing: ctx.target, homingStr: 3,
          onHit: (p) => {
            G.fx.explode(p.pos.x, p.pos.y, p.pos.z, v.radius, 'fire');
            G.audio.play('explode', { pos: p.pos, vol: 0.7 });
            for (const e of hostilesNear(p.pos.x, p.pos.z, v.radius)) dealDamage(P, e, { amount: v.dmg * m, element: 'fire', status: 'burn', statusChance: v.burn / 100, statusDur: 4 });
          },
        });
        break;
      case 'flame_wave': {
        const fx = ctx.dir.x, fz = ctx.dir.z, fl = Math.hypot(fx, fz) || 1;
        const cosA = Math.cos((v.angle / 2) * Math.PI / 180);
        for (const e of hostilesNear(P.pos.x, P.pos.z, v.range)) {
          const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz) || 1;
          if ((dx * fx + dz * fz) / (d * fl) >= cosA) dealDamage(P, e, { amount: v.dmg * m, element: 'fire', status: 'burn', statusDur: 4, knock: { x: (dx / d) * 9, z: (dz / d) * 9 } });
        }
        for (let i = 0; i < 70; i++) {
          const a = (rng.float(-0.5, 0.5) * v.angle * Math.PI) / 180;
          const ca = Math.cos(a), sa = Math.sin(a);
          const dir = _v.set((fx * ca - fz * sa) / fl, rng.float(0, 0.2), (fx * sa + fz * ca) / fl);
          G.fx.glow.emit({ x: P.pos.x + dir.x, y: P.pos.y + 1.1, z: P.pos.z + dir.z, dir: dir.clone().multiplyScalar(v.range * 1.6), jitter: 0.5, speed: 1, color: rng.chance(0.5) ? 0xff7a3d : 0xffc46a, life: 0.55, size: 0.9, sizeEnd: 0.2, drag: 1.2 });
        }
        G.game.shake(0.25);
        break;
      }
      case 'meteor': {
        const pt = ctx.ground;
        const sky = new THREE.Vector3(pt.x - 8, pt.y + 34, pt.z - 8);
        G.projectiles.spawn({ pos: sky, vel: new THREE.Vector3(8, -34, 8).multiplyScalar(1 / v.delay), team, src: P, size: 1.2, element: 'fire', life: v.delay * 0.98 });
        G.projectiles.zone({
          x: pt.x, z: pt.z, radius: v.radius, team, src: P, delay: v.delay, dur: 3, tick: 0.5, color: 0xff7a3d,
          onStart: (z, targets) => {
            G.fx.explode(z.x, z.y + 0.5, z.z, v.radius, 'fire'); G.game.shake(0.7); G.audio.play('explode', { pos: z, vol: 1.2 });
            for (const e of targets) dealDamage(P, e, { amount: v.dmg * m, element: 'fire', status: 'burn', statusDur: 5, knock: { x: (e.pos.x - z.x) * 2, z: (e.pos.z - z.z) * 2 } });
          },
          onTick: (z, targets) => { for (const e of targets) dealDamage(P, e, { amount: v.dmg * m * 0.06, element: 'fire', crit: false, hitFx: false }); },
          onFrame: (z) => { if (rng.chance(0.6)) G.fx.glow.emit({ x: z.x + rng.float(-v.radius, v.radius) * 0.7, y: z.y + 0.3, z: z.z + rng.float(-v.radius, v.radius) * 0.7, count: 1, color: 0xff7a3d, speed: 0.5, up: 2.5, life: 0.8, size: 0.5 }); },
        });
        break;
      }
      // ---------------- Иней ----------------
      case 'ice_shard':
        G.projectiles.spawn({
          pos: ctx.origin, vel: ctx.dir.clone().multiplyScalar(46), team, src: P, size: 0.2, kind: 'shard', element: 'frost', life: 1.4,
          homing: ctx.target, homingStr: 2.5, pierce: v.pierce,
          hit: { amount: v.dmg * m, element: 'frost', status: 'chill', statusDur: 3 },
        });
        break;
      case 'frost_nova':
        G.fx.explode(P.pos.x, P.pos.y + 0.5, P.pos.z, v.radius, 'frost');
        for (const e of hostilesNear(P.pos.x, P.pos.z, v.radius)) dealDamage(P, e, { amount: v.dmg * m, element: 'frost', status: 'freeze', statusDur: v.freeze });
        G.game.shake(0.3);
        break;
      case 'ice_armor':
        applyStatus(P, 'ice_armor', v.dur, v.armor);
        P.recalc();
        G.fx.pillar(P.pos.x, P.pos.y, P.pos.z, 0x8fd8ff, 2.2);
        break;
      case 'blizzard': {
        const pt = ctx.ground;
        G.projectiles.zone({
          x: pt.x, z: pt.z, radius: v.radius, team, src: P, delay: 0.2, dur: v.dur, tick: 0.5, color: 0x8fd8ff,
          onTick: (z, targets) => { for (const e of targets) dealDamage(P, e, { amount: v.dmg * m, element: 'frost', status: 'chill', statusDur: 2, hitFx: false, crit: true }); },
          onFrame: (z) => {
            for (let i = 0; i < 4; i++) G.fx.glow.emit({ x: z.x + rng.float(-1, 1) * v.radius * 0.8, y: z.y + rng.float(5, 9), z: z.z + rng.float(-1, 1) * v.radius * 0.8, count: 1, color: 0xdff4ff, dir: { x: 2, y: -14, z: 1 }, jitter: 2, speed: 1, life: 0.6, size: 0.35, drag: 0 });
          },
        });
        break;
      }
      // ---------------- Буря ----------------
      case 'chain_lightning': {
        let t = ctx.target && Math.hypot(ctx.target.pos.x - P.pos.x, ctx.target.pos.z - P.pos.z) <= v.range ? ctx.target : this.softTarget(ctx, v.range);
        let from = ctx.origin.clone();
        if (!t) { G.fx.lightning(from, ctx.origin.clone().addScaledVector(ctx.dir, 14)); break; }
        const struck = new Set();
        let dmg = v.dmg * m;
        for (let j = 0; j <= v.jumps && t; j++) {
          struck.add(t);
          const to = new THREE.Vector3(t.pos.x, t.pos.y + t.height * 0.55, t.pos.z);
          G.fx.lightning(from, to);
          dealDamage(P, t, { amount: dmg, element: 'storm', status: rng.chance(0.15) ? 'stun' : 'shock', statusDur: rng.chance(0.15) ? 0.7 : 3 });
          from = to; dmg *= 0.85;
          const cur = t;
          t = G.enemies.nearestHostile(cur.pos, 10, (e) => !struck.has(e));
        }
        break;
      }
      case 'blink': {
        const fwd = _v.set(Math.sin(G.camera.yaw), 0, -Math.cos(G.camera.yaw));
        const start = P.pos.clone();
        let dist = v.dist;
        const out = { x: 0, z: 0 };
        let end = null;
        for (let d = dist; d > 1; d -= 1) {
          const x = start.x + fwd.x * d, z = start.z + fwd.z * d;
          if (!P.canStand(x, z)) continue;
          G.world.colliders.resolve(x, z, P.radius, out);
          end = { x: out.x, z: out.z }; dist = d; break;
        }
        if (!end) break;
        G.fx.pillar(start.x, start.y, start.z, 0xffe066, 2.5);
        for (const e of G.enemies.hostiles()) {
          // расстояние до отрезка пути
          const ax = e.pos.x - start.x, az = e.pos.z - start.z;
          const tt = Math.max(0, Math.min(dist, ax * fwd.x + az * fwd.z));
          if (Math.hypot(ax - fwd.x * tt, az - fwd.z * tt) < 2 + e.radius) dealDamage(P, e, { amount: v.dmg * m, element: 'storm', status: 'shock', statusDur: 3 });
        }
        P.pos.x = end.x; P.pos.z = end.z; P.pos.y = Math.max(P.pos.y, G.terrain.heightAt(end.x, end.z));
        P.iframes = 0.3;
        G.fx.lightning(new THREE.Vector3(start.x, start.y + 1, start.z), new THREE.Vector3(end.x, P.pos.y + 1, end.z));
        G.fx.pillar(end.x, P.pos.y, end.z, 0xffe066, 2.5);
        break;
      }
      case 'ball_lightning':
        G.projectiles.spawn({
          pos: ctx.origin, vel: new THREE.Vector3(ctx.dir.x, 0, ctx.dir.z).normalize().multiplyScalar(7), team, src: P, size: 0.55, element: 'storm', life: v.dist / 7,
          onTick: (p, dt) => {
            p.zap = (p.zap || 0) - dt;
            const g = G.terrain.heightAt(p.pos.x, p.pos.z);
            p.pos.y = Math.max(g + 1.2, p.pos.y);
            if (p.zap <= 0) {
              p.zap = 0.3;
              for (const e of hostilesNear(p.pos.x, p.pos.z, v.radius)) {
                G.fx.lightning(p.pos.clone(), new THREE.Vector3(e.pos.x, e.pos.y + e.height * 0.5, e.pos.z), 0xfff27a, 0.1);
                dealDamage(P, e, { amount: v.dmg * m, element: 'storm', status: 'shock', statusDur: 2, hitFx: false });
              }
            }
          },
        });
        break;
      case 'thunderstorm':
        applyStatus(P, 'thunderstorm', v.dur, v.dmg * m);
        P.stormRadius = v.radius;
        G.audio.play('thunder');
        break;
      // ---------------- Жизнь ----------------
      case 'heal':
        heal(P, v.heal * m);
        clearStatus(P, ['poison', 'burn']);
        G.fx.heal(P.pos.x, P.pos.y, P.pos.z);
        G.audio.play('heal');
        break;
      case 'entangle': {
        const pt = ctx.ground;
        G.projectiles.zone({
          x: pt.x, z: pt.z, radius: v.radius, team, src: P, delay: 0.25, dur: v.root, tick: 0.5, color: 0x7ee081,
          onStart: (z, targets) => { G.fx.explode(z.x, z.y, z.z, v.radius, 'nature'); for (const e of targets) { applyStatus(e, 'root', v.root); dealDamage(P, e, { amount: v.dmg * m * 0.4, element: 'nature' }); } },
          onTick: (z, targets) => { for (const e of targets) dealDamage(P, e, { amount: v.dmg * m * 0.15, element: 'nature', hitFx: false }); },
          onFrame: (z) => { if (rng.chance(0.5)) G.fx.glow.emit({ x: z.x + rng.float(-1, 1) * v.radius, y: z.y + 0.2, z: z.z + rng.float(-1, 1) * v.radius, count: 1, color: 0x7ee081, speed: 0.2, up: 1.5, life: 0.7, size: 0.3 }); },
        });
        break;
      }
      case 'regrowth':
        applyStatus(P, 'regrowth', v.dur, (v.heal * m) / v.dur);
        P.statuses.regrowth.mana = v.mana;
        G.fx.heal(P.pos.x, P.pos.y, P.pos.z);
        break;
      case 'spirit_guardian':
        G.enemies.summonAlly('spirit_wolf', P.level, v.dur, v.power / 100);
        G.fx.pillar(P.pos.x + 2, P.pos.y, P.pos.z + 2, 0x8affc0, 3);
        break;
      // ---------------- Тень ----------------
      case 'shadow_bolt':
        G.projectiles.spawn({
          pos: ctx.origin, vel: ctx.dir.clone().multiplyScalar(34), team, src: P, size: 0.32, element: 'shadow', life: 1.8,
          homing: ctx.target, homingStr: 3.5, hit: { amount: v.dmg * m, element: 'shadow', status: 'weaken', statusChance: v.weaken / 100, statusDur: 4 },
        });
        break;
      case 'life_drain':
        G.projectiles.spawn({
          pos: ctx.origin, vel: ctx.dir.clone().multiplyScalar(30), team, src: P, size: 0.28, element: 'shadow', color: 0xd04a8a, life: 1.8,
          homing: ctx.target, homingStr: 4, hit: { amount: v.dmg * m, element: 'shadow', drain: v.heal / 100 },
          onHit: (p, t) => { if (t) G.fx.lightning(new THREE.Vector3(t.pos.x, t.pos.y + 1, t.pos.z), new THREE.Vector3(P.pos.x, P.pos.y + 1.2, P.pos.z), 0xd04a8a, 0.25); },
        });
        break;
      case 'curse': {
        const pt = ctx.ground;
        G.projectiles.zone({
          x: pt.x, z: pt.z, radius: v.radius, team, src: P, delay: 0.2, color: 0xb071ff,
          onStart: (z, targets) => { G.fx.explode(z.x, z.y, z.z, v.radius, 'shadow'); for (const e of targets) applyStatus(e, 'curse', v.dur, v.vuln / 100, P); },
        });
        break;
      }
      case 'void_rift': {
        const pt = ctx.ground;
        G.projectiles.zone({
          x: pt.x, z: pt.z, radius: v.radius, team, src: P, delay: 0.2, dur: v.dur, tick: 0.4, color: 0xb071ff,
          onTick: (z, targets) => { for (const e of targets) dealDamage(P, e, { amount: v.dmg * m, element: 'shadow', hitFx: false }); },
          onFrame: (z, dt) => {
            for (const e of G.enemies.hostiles()) {
              const dx = z.x - e.pos.x, dz = z.z - e.pos.z, d = Math.hypot(dx, dz);
              if (d < v.radius * 1.6 && d > 0.6 && !e.boss) { e.pos.x += (dx / d) * dt * 5; e.pos.z += (dz / d) * dt * 5; }
            }
            for (let i = 0; i < 3; i++) {
              const a = rng.float(0, Math.PI * 2), r = v.radius * rng.float(0.6, 1.2);
              G.fx.glow.emit({ x: z.x + Math.cos(a) * r, y: z.y + rng.float(0.2, 2), z: z.z + Math.sin(a) * r, count: 1, color: rng.chance(0.5) ? 0xb071ff : 0x2a1f3a, dir: { x: -Math.cos(a) * r * 1.5, y: 0.5, z: -Math.sin(a) * r * 1.5 }, jitter: 0.3, speed: 1, life: 0.6, size: 0.45, drag: 0 });
            }
          },
          onEnd: (z, targets) => { G.fx.explode(z.x, z.y + 1, z.z, v.radius, 'shadow'); G.game.shake(0.5); G.audio.play('explode', { pos: z }); for (const e of targets) dealDamage(P, e, { amount: v.burst * m, element: 'shadow' }); },
        });
        break;
      }
      default: return false;
    }
    return true;
  }

  // Ближайший к прицелу враг в конусе
  softTarget(ctx, range, minDot = 0.75) {
    const P = G.player;
    let best = null, bs = -1;
    for (const e of G.enemies.hostiles()) {
      const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z, d = Math.hypot(dx, dz);
      if (d > range) continue;
      const dl = Math.hypot(ctx.dir.x, ctx.dir.z) || 1;
      const dot = (dx * ctx.dir.x + dz * ctx.dir.z) / (d * dl);
      if (dot > minDot && dot - d * 0.004 > bs) { bs = dot - d * 0.004; best = e; }
    }
    return best;
  }

  // Пассивка «Пепельный покров»
  ashBurst() {
    const P = G.player;
    const r = 4;
    G.fx.explode(P.pos.x, P.pos.y + 1, P.pos.z, r, 'fire');
    const dmg = (20 + P.level * 4) * spellMult(P, 'fire');
    for (const e of G.enemies.hostiles()) if (Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z) < r) dealDamage(P, e, { amount: dmg, element: 'fire', status: 'burn', statusDur: 3 });
  }

  // Тик бафа «Гнев небес»
  stormTick(P) {
    const s = P.statuses.thunderstorm;
    const near = G.enemies.hostiles().filter((e) => Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z) < (P.stormRadius || 15));
    if (!near.length) return;
    const e = rng.pick(near);
    const to = new THREE.Vector3(e.pos.x, e.pos.y + e.height * 0.5, e.pos.z);
    G.fx.lightning(new THREE.Vector3(e.pos.x + rng.float(-3, 3), e.pos.y + 28, e.pos.z + rng.float(-3, 3)), to);
    G.audio.play('storm', { pos: e.pos, vol: 0.7 });
    dealDamage(P, e, { amount: s.power, element: 'storm', status: rng.chance(0.3) ? 'stun' : 'shock', statusDur: rng.chance(0.3) ? 0.8 : 3 });
  }
}

export function schoolColor(sc) { return SCHOOLS[sc]?.color || '#fff'; }
