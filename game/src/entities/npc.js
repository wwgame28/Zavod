import * as THREE from 'three';
import { angleLerp } from '../core/rng.js';
import { G } from '../state.js';
import { NPCS } from '../data/npcs.js';
import { HumanoidRig } from './models.js';

class NPC {
  constructor(id, d) {
    this.id = id; this.def = d; this.name = d.name; this.title = d.title;
    this.rig = new HumanoidRig(d.model);
    this.root = this.rig.root;
    this.pos = this.root.position;
    this.ghost = !!d.ghost;
    this.pos.set(d.x, G.terrain.heightAt(d.x, d.z) + (this.ghost ? 0.4 : 0), d.z);
    this.baseYaw = d.yaw || 0; this.yaw = this.baseYaw;
    this.radius = 0.5; this.height = 1.9; this.alive = true;
    this.t = Math.random() * 10;
    this.root.traverse((o) => { if (o.isMesh) o.castShadow = !this.ghost; });
    if (this.ghost) this.rig.bank.setOpacity(0.5);
    G.scene.add(this.root);
    G.world.colliders.addCircle(d.x, d.z, 0.55);
  }
  update(dt, P) {
    this.t += dt;
    const d = Math.hypot(P.pos.x - this.pos.x, P.pos.z - this.pos.z);
    const want = d < 8 ? Math.atan2(P.pos.x - this.pos.x, P.pos.z - this.pos.z) : this.baseYaw;
    this.yaw = angleLerp(this.yaw, want, Math.min(1, dt * 3));
    this.root.rotation.y = this.yaw;
    this.rig.update(dt, { speed: 0, action: this.talking ? 'cast' : null, actionT: this.talking ? 0.3 : 0 });
    if (this.ghost) {
      this.pos.y = G.terrain.heightAt(this.def.x, this.def.z) + 0.5 + Math.sin(this.t * 1.5) * 0.2;
      this.rig.bank.setOpacity(0.4 + Math.sin(this.t * 2.3) * 0.1);
      if (Math.random() < dt * 6) G.fx.trail(this.pos.x + (Math.random() - 0.5), this.pos.y + Math.random() * 1.8, this.pos.z + (Math.random() - 0.5), 0x9fc8ff, 0.3);
    }
    this.root.visible = d < 220;
  }
}

export class NPCManager {
  constructor() { this.list = Object.entries(NPCS).map(([id, d]) => new NPC(id, d)); this.byId = Object.fromEntries(this.list.map((n) => [n.id, n])); }
  get(id) { return this.byId[id]; }
  update(dt, P) { for (const n of this.list) n.update(dt, P); }
}
