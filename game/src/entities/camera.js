import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { clamp } from '../core/rng.js';
import { G } from '../state.js';

// Камера от третьего лица: орбита за плечом, зум колесом, не уходит под землю.
export class ThirdPersonCamera {
  constructor(aspect) {
    const C = CONFIG.CAMERA;
    this.cam = new THREE.PerspectiveCamera(C.fov, aspect, C.near, C.far);
    this.yaw = Math.PI; this.pitch = 0.28; this.dist = C.dist; this.wantDist = C.dist;
    this.pivot = new THREE.Vector3();
    this.lookDir = new THREE.Vector3();
    this.shakeT = 0; this.shakeA = 0;
    this.cinematic = null;
  }

  shake(a) { if (G.settings?.reduceMotion) return; this.shakeA = Math.max(this.shakeA, a); this.shakeT = 0.25; }

  update(dt, player, input, settings) {
    const C = CONFIG.CAMERA;
    if (input) {
      const look = input.consumeLook();
      const sens = C.sens * (settings.sens ?? 1);
      this.yaw += look.x * sens;
      this.pitch += look.y * sens * (settings.invertY ? -1 : 1);
      this.pitch = clamp(this.pitch, C.minPitch, C.maxPitch);
      const w = input.consumeWheel();
      if (w) this.wantDist = clamp(this.wantDist + w * 1.2, C.minDist, C.maxDist);
    }
    this.dist += (this.wantDist - this.dist) * Math.min(1, dt * 8);
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    this.lookDir.set(Math.sin(this.yaw) * cp, -sp, -Math.cos(this.yaw) * cp);
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, Math.sin(this.yaw));
    const target = new THREE.Vector3(player.pos.x, player.pos.y + C.height, player.pos.z).addScaledVector(right, C.shoulder * Math.min(1, this.dist / 6));
    this.pivot.lerp(target, Math.min(1, dt * C.follow));
    if (this.pivot.distanceTo(target) > 12) this.pivot.copy(target);
    // не прячемся за кронами и стенами: сокращаем дистанцию до первого препятствия
    let dist = this.dist;
    const occ = G.world.occluders;
    for (let i = 1; i <= 14; i++) {
      const d = (this.dist * i) / 14;
      const x = this.pivot.x - this.lookDir.x * d, y = this.pivot.y - this.lookDir.y * d, z = this.pivot.z - this.lookDir.z * d;
      if (occ.pointIn(x, y, z)) { dist = Math.max(C.minDist * 0.5, d - 0.6); break; }
    }
    this.occDist = this.occDist === undefined ? dist : dist < this.occDist ? dist : this.occDist + (dist - this.occDist) * Math.min(1, dt * 3);
    const pos = this.pivot.clone().addScaledVector(this.lookDir, -this.occDist);
    // не под землёй и не под водой
    const gh = Math.max(G.terrain.heightAt(pos.x, pos.z), CONFIG.WATER_LEVEL - 0.3) + 0.45;
    if (pos.y < gh) pos.y = gh;
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = this.shakeA * (this.shakeT / 0.25) * 0.35;
      pos.x += (Math.random() - 0.5) * a; pos.y += (Math.random() - 0.5) * a; pos.z += (Math.random() - 0.5) * a;
      if (this.shakeT <= 0) this.shakeA = 0;
    }
    this.cam.position.copy(pos);
    this.cam.lookAt(this.pivot.clone().addScaledVector(this.lookDir, 30));
  }

  snapBehind(player) {
    this.yaw = player.heading + Math.PI;
    this.yaw = Math.atan2(Math.sin(player.heading), -Math.cos(player.heading));
    this.pivot.set(player.pos.x, player.pos.y + CONFIG.CAMERA.height, player.pos.z);
  }
}
