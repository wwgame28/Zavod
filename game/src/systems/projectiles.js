import * as THREE from 'three';
import { G } from '../state.js';
import { dealDamage } from './combat.js';
import { EL_COLOR } from '../fx/effects.js';

const geoCache = {};
const projGeo = (kind) => geoCache[kind] || (geoCache[kind] = (
  kind === 'arrow' ? new THREE.CylinderGeometry(0.03, 0.03, 0.8, 4).rotateX(Math.PI / 2)
    : kind === 'shard' || kind === 'thorn' ? new THREE.ConeGeometry(0.12, 0.7, 4).rotateX(Math.PI / 2)
      : new THREE.IcosahedronGeometry(1, 0)));
const matCache = {};
const projMat = (color) => matCache[color] || (matCache[color] = new THREE.MeshBasicMaterial({ color, toneMapped: false }));
const haloMat = (color) => matCache['h' + color] || (matCache['h' + color] = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));

const _v = new THREE.Vector3();

// Снаряды и области (AoE с телеграфом).
export class Projectiles {
  constructor(scene) { this.scene = scene; this.list = []; this.zones = []; }

  spawn(o) {
    const color = o.color ?? EL_COLOR[o.element] ?? 0xffffff;
    const g = new THREE.Group();
    const size = o.size ?? 0.3;
    const core = new THREE.Mesh(projGeo(o.kind || 'orb'), projMat(color));
    if (o.kind === 'arrow' || o.kind === 'shard' || o.kind === 'thorn') core.scale.setScalar(o.kind === 'arrow' ? 1 : size * 3);
    else core.scale.setScalar(size);
    g.add(core);
    if (o.kind !== 'arrow') {
      const halo = new THREE.Mesh(projGeo('orb'), haloMat(color));
      halo.scale.setScalar(size * 2.2);
      g.add(halo);
    }
    g.position.copy(o.pos);
    this.scene.add(g);
    const p = {
      pos: g.position, vel: o.vel.clone(), team: o.team, src: o.src, radius: o.radius ?? size + 0.35, life: o.life ?? 2.5,
      hit: o.hit, onHit: o.onHit, homing: o.homing || null, homingStr: o.homingStr ?? 0, pierce: o.pierce ?? 0, struck: new Set(),
      mesh: g, color, trail: o.trail ?? true, gravity: o.gravity ?? 0, kind: o.kind, spin: o.kind === 'orb' || !o.kind, onTick: o.onTick, t: 0,
    };
    if (o.kind === 'arrow' || o.kind === 'shard' || o.kind === 'thorn') g.lookAt(_v.copy(o.pos).add(o.vel));
    this.list.push(p);
    return p;
  }

  targetsFor(team) {
    if (team === 'enemy') return G.enemies.allies().concat(G.player.alive ? [G.player] : []);
    return G.enemies.hostiles();
  }

  update(dt) {
    const T = G.terrain;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.t += dt; p.life -= dt;
      if (p.homing && p.homing.alive) {
        _v.set(p.homing.pos.x, p.homing.pos.y + (p.homing.height || 1.6) * 0.55, p.homing.pos.z).sub(p.pos);
        const sp = p.vel.length();
        _v.normalize().multiplyScalar(sp);
        p.vel.lerp(_v, Math.min(1, p.homingStr * dt)).setLength(sp);
      }
      p.vel.y -= p.gravity * dt;
      p.pos.addScaledVector(p.vel, dt);
      if (p.spin) p.mesh.rotation.y += dt * 8;
      else if (p.kind) p.mesh.lookAt(_v.copy(p.pos).add(p.vel));
      if (p.trail) G.fx.trail(p.pos.x, p.pos.y, p.pos.z, p.color, p.kind === 'arrow' ? 0.15 : 0.4);
      p.onTick?.(p, dt);
      let dead = p.life <= 0;
      const ground = T.heightAt(p.pos.x, p.pos.z);
      if (!dead && p.pos.y < ground + 0.05) { dead = true; p.onHit?.(p, null); }
      if (!dead) {
        for (const t of this.targetsFor(p.team)) {
          if (p.struck.has(t)) continue;
          const cy = t.pos.y + (t.height || 1.6) * 0.5;
          const dx = t.pos.x - p.pos.x, dy = cy - p.pos.y, dz = t.pos.z - p.pos.z;
          const rr = p.radius + (t.radius || 0.5);
          const hh = (t.height || 1.6) * 0.5 + p.radius;
          if (dx * dx + dz * dz < rr * rr && Math.abs(dy) < hh) {
            p.struck.add(t);
            if (p.hit) dealDamage(p.src, t, p.hit);
            p.onHit?.(p, t);
            if (p.pierce-- <= 0) { dead = true; break; }
          }
        }
      }
      if (dead) { this.scene.remove(p.mesh); this.list.splice(i, 1); }
    }
    this._updateZones(dt);
  }

  // ---------- Области ----------
  // o: { x, z, radius, team, src, delay, dur, tick, onStart(z, targets), onTick(z, targets), onEnd, color, telegraph }
  zone(o) {
    const y = G.terrain.heightAt(o.x, o.z);
    const z = { ...o, y, t: 0, acc: 0, started: false, meshes: [] };
    if (o.telegraph !== false) {
      const color = o.color ?? (o.team === 'enemy' ? 0xff3b3b : 0x9fd8ff);
      const ringM = new THREE.Mesh(G.fx.ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
      ringM.position.set(o.x, y + 0.2, o.z); ringM.scale.setScalar(o.radius);
      const disc = new THREE.Mesh(G.fx.discGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
      disc.position.set(o.x, y + 0.18, o.z); disc.scale.setScalar(o.delay ? 0.05 : o.radius);
      this.scene.add(ringM, disc);
      z.meshes.push(ringM, disc); z.ring = ringM; z.disc = disc;
    }
    this.zones.push(z);
    return z;
  }

  inZone(z) {
    const out = [];
    for (const t of this.targetsFor(z.team)) {
      if (Math.hypot(t.pos.x - z.x, t.pos.z - z.z) <= z.radius + (t.radius || 0.5) * 0.5) out.push(t);
    }
    return out;
  }

  _updateZones(dt) {
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.t += dt;
      const delay = z.delay || 0;
      if (!z.started) {
        if (z.disc) z.disc.scale.setScalar(Math.max(0.05, z.radius * Math.min(1, z.t / Math.max(0.01, delay))));
        if (z.ring) z.ring.material.opacity = 0.5 + 0.4 * Math.sin(z.t * 18);
        if (z.t >= delay) {
          z.started = true;
          z.onStart?.(z, this.inZone(z));
          if (!z.dur) { this._killZone(i); continue; }
          if (z.disc && z.team !== 'enemy') z.disc.material.opacity = 0.12;
        }
      } else {
        z.acc += dt;
        const tick = z.tick || 0.5;
        while (z.acc >= tick) { z.acc -= tick; z.onTick?.(z, this.inZone(z)); }
        z.onFrame?.(z, dt);
        if (z.t >= delay + z.dur) { z.onEnd?.(z, this.inZone(z)); this._killZone(i); continue; }
      }
    }
  }
  _killZone(i) {
    const z = this.zones[i];
    for (const m of z.meshes) { this.scene.remove(m); m.material.dispose(); }
    this.zones.splice(i, 1);
  }

  clear() {
    for (const p of this.list) this.scene.remove(p.mesh);
    this.list.length = 0;
    for (let i = this.zones.length - 1; i >= 0; i--) this._killZone(i);
  }
}
