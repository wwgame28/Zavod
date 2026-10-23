import * as THREE from 'three';
import { CONFIG, SCHOOLS } from '../config.js';
import { clamp, angleLerp } from '../core/rng.js';
import { bus } from '../core/events.js';
import { G } from '../state.js';
import { DOME, VOLCANO } from '../data/regions.js';
import { SKILLS, ORIGINS, TIER_REQ, SKILL_ORDER } from '../data/skills.js';
import { ITEMS } from '../data/items.js';
import { HumanoidRig } from './models.js';
import { Inventory } from '../systems/inventory.js';
import { computeStats } from '../systems/stats.js';
import { tickStatuses, heal, dealDamage } from '../systems/combat.js';
import { statusMods, applyStatus } from '../systems/status.js';
import { generateGear } from '../systems/items.js';

const _out = { x: 0, z: 0, hit: false };
const _v = new THREE.Vector3();
const _w = new THREE.Vector3();

export class Player {
  constructor() {
    this.isPlayer = true; this.team = 'player';
    this.radius = CONFIG.PLAYER.radius; this.height = CONFIG.PLAYER.height;
    this.obj = new THREE.Group();
    this.pos = this.obj.position;
    this.vel = new THREE.Vector3();
    this.heading = Math.PI;
    this.inventory = new Inventory(40);
    this.inventory.onChange = () => bus.emit('inventory');
    this.light = new THREE.PointLight(0x9fd8ff, 0, 11, 1.8);
    this.light.position.set(0, 2.2, 0);
    this.obj.add(this.light);
    this.reset({ name: 'Осколочник', origin: 'ember', robe: 0x3a4a8a });
  }

  // Новый персонаж
  reset({ name, origin, robe }) {
    const O = ORIGINS.find((o) => o.id === origin) || ORIGINS[0];
    this.name = name; this.origin = O.id; this.robe = robe;
    this.level = 1; this.xp = 0; this.gold = 30;
    const base = CONFIG.PROGRESSION.startAttr;
    this.attrs = { str: base, agi: base, int: base, vit: base, spi: base };
    for (const [k, v] of Object.entries(O.attrs)) this.attrs[k] += v;
    this.baseAttrs = { ...this.attrs };
    this.attrPoints = 0; this.skillPoints = 1; this.bonusSP = 0;
    this.skills = { [O.skill]: 1 };
    this.freeSkill = O.skill;
    this.hotbar = [O.skill, null, null, null, null, null];
    this.mastery = {}; for (const s of Object.keys(SCHOOLS)) this.mastery[s] = { lvl: 0, xp: 0 };
    this.shards = []; this.flags = {};
    this.equipment = { weapon: null, head: null, chest: null, hands: null, feet: null, amulet: null, ring: null };
    this.inventory.load([]);
    this.equipment.weapon = generateGear(1, 0, 'weapon');
    this.equipment.chest = generateGear(1, 0, 'chest');
    this.inventory.addStack('potion_hp', 3);
    this.inventory.addStack('potion_mp', 2);
    this.statuses = {};
    this.cds = {}; this.basicCd = 0; this.potionCd = 0;
    this.alive = true; this.deadT = 0;
    this.iframes = 0; this.dodgeT = 0; this.dodgeDir = new THREE.Vector3();
    this.onGround = true; this.inCombat = 0; this.staDelay = 0; this.stormT = 0;
    this.action = null; this.actionT = 0; this.actionDur = 0.35;
    this.knockV = new THREE.Vector3();
    this.lavaT = 0; this.stats = null;
    this.kills = 0; this.deaths = 0; this.playTime = 0;
    this.lastWaystone = 'ws_vale';
    this.sneak = false;
    this._buildModel();
    this.recalc();
    this.hp = this.stats.maxHp; this.mp = this.stats.maxMp; this.sta = this.stats.maxSta;
  }

  _buildModel() {
    if (this.rig) { this.obj.remove(this.rig.root); this.rig.bank.dispose(); }
    const sc = SCHOOLS[ORIGINS.find((o) => o.id === this.origin)?.school || 'fire'];
    this.rig = new HumanoidRig({
      skin: 0xe8c4a0, cloth: this.robe, cloth2: 0x2a2630, hair: 0x3a2a1a, hood: true, robe: true,
      weapon: 'staff', staffGlow: new THREE.Color(sc.color).getHex(), scale: 1,
    });
    const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), new THREE.MeshBasicMaterial({ color: 0xbfe8ff, toneMapped: false }));
    shard.position.set(0, 0.48, 0.17); shard.scale.y = 1.5;
    this.rig.torso.add(shard); this.chestShard = shard;
    this.rig.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.obj.add(this.rig.root);
    this.light.color.set(sc.color);
  }

  recalc() {
    const old = this.stats;
    this.stats = computeStats(this);
    if (old && this.hp !== undefined) {
      this.hp = Math.min(this.hp, this.stats.maxHp);
      this.mp = Math.min(this.mp, this.stats.maxMp);
    }
    bus.emit('stats');
  }

  // ---------------- прогрессия ----------------
  xpToNext() { return CONFIG.PROGRESSION.xpCurve(this.level); }
  addXp(n) {
    if (this.level >= CONFIG.PROGRESSION.maxLevel) return;
    const amt = Math.round(n * (1 + this.stats.xpBonus / 100));
    this.xp += amt;
    G.ui?.floatText(this.pos, `+${amt} опыта`, '#c7a6ff', 0.9, 2.6);
    while (this.xp >= this.xpToNext() && this.level < CONFIG.PROGRESSION.maxLevel) {
      this.xp -= this.xpToNext();
      this.level++;
      this.attrPoints += CONFIG.PROGRESSION.attrPerLevel;
      this.skillPoints += CONFIG.PROGRESSION.skillPerLevel;
      this.recalc();
      this.hp = this.stats.maxHp; this.mp = this.stats.maxMp;
      G.fx.levelUp(this.pos.x, this.pos.y, this.pos.z);
      G.audio.play('levelup');
      G.ui?.levelUp(this.level);
      bus.emit('levelup', this.level);
    }
    if (this.level >= CONFIG.PROGRESSION.maxLevel) this.xp = 0;
    bus.emit('xp');
  }

  addMastery(school, n) {
    const m = this.mastery[school];
    if (!m || m.lvl >= CONFIG.PROGRESSION.masteryMax) return;
    m.xp += n;
    while (m.lvl < CONFIG.PROGRESSION.masteryMax && m.xp >= CONFIG.PROGRESSION.masteryXp(m.lvl)) {
      m.xp -= CONFIG.PROGRESSION.masteryXp(m.lvl);
      m.lvl++;
      G.ui?.toast(`Мастерство школы «${SCHOOLS[school].name}» — круг ${m.lvl}`, 'good');
    }
  }

  spendAttr(k) { if (this.attrPoints <= 0) return; this.attrs[k]++; this.attrPoints--; this.recalc(); G.audio.play('ui'); }

  schoolPoints(school) { let n = 0; for (const id of SKILL_ORDER[school]) n += this.skills[id] || 0; return n; }

  canLearn(id) {
    const s = SKILLS[id];
    const r = this.skills[id] || 0;
    if (r >= s.max) return { ok: false, why: 'Максимальный ранг' };
    if (this.skillPoints <= 0) return { ok: false, why: 'Нет очков навыков' };
    const req = TIER_REQ[s.tier];
    const needLvl = req.level + r * 2;
    if (this.level < needLvl) return { ok: false, why: `Нужен ${needLvl} уровень` };
    if (r === 0 && this.schoolPoints(s.school) < req.points) return { ok: false, why: `Нужно ${req.points} очк. в школе «${SCHOOLS[s.school].name}»` };
    if (req.shard && !this.shards.includes(s.school)) return { ok: false, why: `Нужен Великий Осколок школы «${SCHOOLS[s.school].name}»` };
    return { ok: true };
  }
  learn(id) {
    const c = this.canLearn(id);
    if (!c.ok) { G.ui?.toast(c.why, 'warn'); G.audio.play('error'); return false; }
    this.skills[id] = (this.skills[id] || 0) + 1;
    this.skillPoints--;
    if (SKILLS[id].type === 'active' && this.skills[id] === 1 && !this.hotbar.includes(id)) {
      const free = this.hotbar.indexOf(null);
      if (free >= 0) this.hotbar[free] = id;
    }
    this.recalc();
    G.audio.play('quest');
    bus.emit('skills');
    return true;
  }

  respec() {
    this.attrs = { ...this.baseAttrs };
    this.attrPoints = (this.level - 1) * CONFIG.PROGRESSION.attrPerLevel;
    this.skills = { [this.freeSkill]: 1 };
    this.skillPoints = this.level - 1 + 1 + this.bonusSP;
    this.hotbar = [this.freeSkill, null, null, null, null, null];
    this.recalc();
    bus.emit('skills');
  }

  // ---------------- экипировка ----------------
  equip(invIdx) {
    const it = this.inventory.slots[invIdx];
    if (!it || it.kind !== 'gear') return;
    if (it.level > this.level + 2) { G.ui?.toast(`Нужен ${it.level - 2} уровень`, 'warn'); G.audio.play('error'); return; }
    const old = this.equipment[it.slot];
    this.equipment[it.slot] = it;
    this.inventory.putAt(invIdx, old || null);
    this.recalc(); G.audio.play('pickup');
  }
  unequip(slot) {
    const it = this.equipment[slot];
    if (!it) return;
    if (!this.inventory.addGear(it)) { G.ui?.toast('Сумка полна', 'warn'); return; }
    this.equipment[slot] = null;
    this.recalc();
  }

  useItem(invIdx) {
    const s = this.inventory.slots[invIdx];
    if (!s) return;
    if (s.kind === 'gear') return this.equip(invIdx);
    const def = ITEMS[s.id];
    if (def.type !== 'consumable') return;
    if (s.id === 'potion_hp' || s.id === 'potion_mp') return this.drink(s.id);
    if (s.id === 'respec_scroll') {
      this.inventory.remove('respec_scroll', 1); this.respec();
      G.ui?.toast('Характеристики и навыки сброшены', 'good'); return;
    }
    if (def.buff) {
      this.inventory.remove(s.id, 1);
      applyStatus(this, def.buff.id, def.buff.dur);
      this.recalc(); G.audio.play('heal');
      G.ui?.toast(`${def.name}: ${def.desc}`, 'good');
    }
  }

  drink(id) {
    if (this.potionCd > 0 || !this.alive) { G.audio.play('error'); return; }
    if (!this.inventory.has(id)) { G.ui?.toast('Нет зелий', 'warn'); G.audio.play('error'); return; }
    this.inventory.remove(id, 1);
    this.potionCd = CONFIG.PLAYER.potionCd;
    if (id === 'potion_hp') { heal(this, this.stats.maxHp * 0.45); G.fx.heal(this.pos.x, this.pos.y, this.pos.z); }
    else { this.mp = Math.min(this.stats.maxMp, this.mp + this.stats.maxMp * 0.45); G.fx.pillar(this.pos.x, this.pos.y, this.pos.z, 0x5aa9ff, 2); }
    G.audio.play('heal');
  }

  // ---------------- физика и ввод ----------------
  canStand(x, z) {
    if (Math.hypot(x, z) > 860) return false;
    if (G.terrain.heightAt(x, z) < CONFIG.OCEAN_LIMIT) return false;
    if (!G.world.domeOpen && Math.hypot(x - DOME.x, z - DOME.z) < DOME.r + 0.5) return false;
    return true;
  }

  knockback(x, z) { this.knockV.x += x; this.knockV.z += z; }

  computeAim() {
    const cam = G.camera;
    const o = cam.cam.position;
    const dir = cam.lookDir.clone().normalize();
    const eh = G.enemies.raycast(o, dir, 90);
    const th = G.terrain.raycast(o, dir, 140);
    let t = 80, target = null;
    if (th !== null) t = th;
    if (eh && eh.t < t) { t = eh.t; target = eh.enemy; }
    const point = o.clone().addScaledVector(dir, t);
    const origin = new THREE.Vector3();
    if (this.rig.orb) this.rig.orb.getWorldPosition(origin); else origin.set(this.pos.x, this.pos.y + 1.5, this.pos.z);
    // снаряд не должен лететь назад, если цель совсем рядом с камерой
    const shoot = point.clone().sub(origin);
    if (shoot.dot(dir) < 0.5) shoot.copy(dir);
    // мягкий захват: если прицел не на враге, берём ближайшего врага в узком конусе
    if (!target) {
      const soft = G.spells.softTarget({ dir }, 38, 0.93);
      if (soft) {
        target = soft;
        const tc = new THREE.Vector3(soft.pos.x, soft.pos.y + soft.height * 0.5, soft.pos.z);
        if (th === null || th < o.distanceTo(tc)) shoot.copy(tc).sub(origin);
      }
    }
    if (target) this.lastTarget = target;
    shoot.normalize();
    const ground = th !== null ? o.clone().addScaledVector(dir, th) : point.clone();
    this.aim = { origin, dir: shoot, point, target, ground, camDir: dir };
    return this.aim;
  }

  tryCast(id) {
    if (!id || !this.alive) return;
    const s = SKILLS[id];
    const r = this.skills[id] || 0;
    if (!r) { G.ui?.toast('Навык не изучен', 'warn'); return; }
    if ((this.cds[id] || 0) > 0) { G.audio.play('error'); return; }
    if (statusMods(this).stun) return;
    const cost = G.spells.manaCost(id, r);
    if (this.mp < cost) { G.ui?.toast('Недостаточно маны', 'warn'); G.audio.play('error'); return; }
    const aim = this.computeAim();
    if (s.ground) {
      const range = s.range || 28;
      const dx = aim.ground.x - this.pos.x, dz = aim.ground.z - this.pos.z, d = Math.hypot(dx, dz);
      if (d > range) { aim.ground.x = this.pos.x + (dx / d) * range; aim.ground.z = this.pos.z + (dz / d) * range; }
      aim.ground.y = G.terrain.heightAt(aim.ground.x, aim.ground.z);
    }
    if (!G.spells.cast(id, r, aim)) return;
    this.mp -= cost;
    this.cds[id] = G.spells.cooldown(id, r);
    this.action = 'cast'; this.actionT = 0; this.actionDur = 0.4;
    if (!s.self) this.heading = Math.atan2(aim.camDir.x, aim.camDir.z);
    this.inCombat = Math.max(this.inCombat, 2);
    this.addMastery(s.school, 3 + r);
    bus.emit('cast', id);
  }

  basic() {
    if (this.basicCd > 0 || statusMods(this).stun || this.dodgeT > 0) return;
    this.basicCd = CONFIG.PLAYER.basicCd;
    const aim = this.computeAim();
    G.spells.basic(aim);
    this.action = 'cast'; this.actionT = 0; this.actionDur = 0.3;
    this.heading = Math.atan2(aim.camDir.x, aim.camDir.z);
  }

  update(dt, input) {
    const PC = CONFIG.PLAYER;
    this.playTime += dt;
    if (!this.alive) {
      this.deadT += dt;
      this.rig.update(dt, { dead: true, deadT: this.deadT });
      return;
    }
    tickStatuses(this, dt);
    if (!this.alive) return;
    if (this._statusKey !== Object.keys(this.statuses).join()) { this._statusKey = Object.keys(this.statuses).join(); this.recalc(); }
    const st = this.stats;
    const mods = statusMods(this);
    // Регенерация
    this.inCombat = Math.max(0, this.inCombat - dt);
    const regenMul = this.inCombat > 0 ? 1 : 3;
    if (this.hp < st.maxHp) this.hp = Math.min(st.maxHp, this.hp + st.hpRegen * regenMul * dt);
    this.mp = Math.min(st.maxMp, this.mp + st.mpRegen * (this.inCombat > 0 ? 1 : 2) * dt);
    this.staDelay -= dt;
    if (this.staDelay <= 0) this.sta = Math.min(st.maxSta, this.sta + PC.staminaRegen * (this.statuses.elixir_wind ? 1.15 : 1) * dt);
    for (const k in this.cds) if (this.cds[k] > 0) this.cds[k] -= dt;
    this.basicCd -= dt; this.potionCd -= dt; this.iframes -= dt;
    if (this.statuses.thunderstorm) { this.stormT -= dt; if (this.stormT <= 0) { this.stormT = 0.4; G.spells.stormTick(this); } }

    const ground = G.terrain.heightAt(this.pos.x, this.pos.z);
    const swimming = ground < CONFIG.DEEP_WATER;
    // Движение
    const ax = input ? input.moveAxis() : { x: 0, y: 0 };
    const yaw = G.camera.yaw;
    const fx = Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = Math.sin(yaw);
    let wx = fx * ax.y + rx * ax.x, wz = fz * ax.y + rz * ax.x;
    const wl = Math.hypot(wx, wz);
    if (wl > 1) { wx /= wl; wz /= wl; }
    const moving = wl > 0.05;
    let sprint = input && input.isDown('sprint') && moving && this.sta > 1 && !swimming;
    if (sprint) { this.sta -= PC.sprintCost * dt; this.staDelay = PC.staminaDelay; }
    let speed = (swimming ? PC.swim : sprint ? PC.run : PC.walk) * st.speed * (1 - mods.slow);
    if (mods.root || mods.stun) speed = 0;
    if (this.action === 'cast' && !swimming) speed *= 0.75;

    // Перекат
    if (input && input.pressed('dodge') && this.dodgeT <= 0 && this.onGround && this.sta >= PC.dodgeCost && !mods.stun && !mods.root) {
      this.sta -= PC.dodgeCost; this.staDelay = PC.staminaDelay;
      this.dodgeT = PC.dodgeTime; this.iframes = PC.iframes;
      if (moving) this.dodgeDir.set(wx, 0, wz).normalize(); else this.dodgeDir.set(Math.sin(this.heading), 0, Math.cos(this.heading));
      this.heading = Math.atan2(this.dodgeDir.x, this.dodgeDir.z);
      G.audio.play('dodge');
    }
    let tvx = wx * speed, tvz = wz * speed;
    if (this.dodgeT > 0) {
      this.dodgeT -= dt;
      const ds = PC.dodgeDist / PC.dodgeTime;
      tvx = this.dodgeDir.x * ds; tvz = this.dodgeDir.z * ds;
      this.vel.x = tvx; this.vel.z = tvz;
    } else {
      const k = Math.min(1, dt * (this.onGround ? PC.accel : PC.accel * 0.35));
      this.vel.x += (tvx - this.vel.x) * k; this.vel.z += (tvz - this.vel.z) * k;
    }
    // Прыжок и гравитация
    if (input && input.pressed('jump') && this.onGround && !mods.root && !mods.stun && !swimming) { this.vel.y = PC.jump; this.onGround = false; G.audio.play('jump'); }
    this.vel.y -= PC.gravity * dt;
    // Отбрасывание
    if (this.knockV.lengthSq() > 0.01) {
      this.vel.x += this.knockV.x; this.vel.z += this.knockV.z; this.knockV.set(0, 0, 0);
    }
    let nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
    G.world.colliders.resolve(nx, nz, this.radius, _out); nx = _out.x; nz = _out.z;
    if (!this.canStand(nx, nz)) {
      // купол или океан
      if (!G.world.domeOpen && Math.hypot(nx - DOME.x, nz - DOME.z) < DOME.r + 0.5 && G.time - (this._domeMsg || -99) > 5) {
        this._domeMsg = G.time;
        G.ui?.toast('Эфирный Купол отталкивает вас. Нужны все пять Великих Осколков.', 'warn');
      }
      nx = this.pos.x; nz = this.pos.z; this.vel.x *= -0.2; this.vel.z *= -0.2;
    }
    this.pos.x = nx; this.pos.z = nz;
    this.pos.y += this.vel.y * dt;
    const g2 = G.terrain.heightAt(nx, nz);
    const floor = swimming ? -1.3 : g2;
    if (this.pos.y <= floor) {
      if (!this.onGround && this.vel.y < -8) G.audio.play('step', { vol: 2 });
      this.pos.y = floor; this.vel.y = 0; this.onGround = true;
    } else if (this.pos.y - floor > 0.25) this.onGround = false;
    else if (this.vel.y <= 0) { this.pos.y = floor; this.vel.y = 0; this.onGround = true; }

    // Поворот модели
    const hs = Math.hypot(this.vel.x, this.vel.z);
    if (this.dodgeT <= 0 && !this.action && hs > 0.5) this.heading = angleLerp(this.heading, Math.atan2(this.vel.x, this.vel.z), Math.min(1, dt * 12));
    this.obj.rotation.y = this.heading;

    // Действия
    if (input && this.dodgeT <= 0) {
      if (input.isDown('attack') && (input.locked || input.lockFailed || input.dragLook || G.ui?.touch || input.down.has('GP7'))) this.basic();
      for (let i = 0; i < 6; i++) if (input.pressed('spell' + (i + 1))) this.tryCast(this.hotbar[i]);
      if (input.pressed('potionHp')) this.drink('potion_hp');
      if (input.pressed('potionMp')) this.drink('potion_mp');
    }
    if (this.action) { this.actionT += dt / this.actionDur; if (this.actionT >= 1) this.action = null; }

    // Опасности: лава, жар кальдеры
    this.lavaT -= dt;
    if (this.lavaT <= 0) {
      this.lavaT = 0.5;
      if (G.world.lavaAt(this.pos.x, this.pos.z, this.pos.y)) dealDamage(null, this, { amount: st.maxHp * 0.07, element: 'fire', crit: false, status: 'burn', statusDur: 2, statusPower: st.maxHp * 0.01 });
      else if (!this.flags.fire_ward && Math.hypot(this.pos.x - VOLCANO.x, this.pos.z - VOLCANO.z) < VOLCANO.crater + 6 && this.pos.y > 40) {
        dealDamage(null, this, { amount: st.maxHp * 0.025, element: 'fire', crit: false, hitFx: false });
        if (G.time - (this._heatMsg || -99) > 8) { this._heatMsg = G.time; G.ui?.toast('Жар Горна обжигает! Без оберега Дурна здесь не выжить.', 'warn'); }
      }
    }

    // Анимация
    const roll = this.dodgeT > 0 ? (1 - this.dodgeT / PC.dodgeTime) * Math.PI * 2 : 0;
    this.rig.root.rotation.x = roll;
    this.rig.root.position.set(0, roll ? 0.9 * (1 - Math.cos(roll)) * 0.5 : 0, roll ? -0.9 * Math.sin(roll) * 0.5 : 0);
    this.rig.update(dt, { speed: hs, air: !this.onGround && !swimming, action: this.action, actionT: this.actionT });
    this.rig.bank.flash(this.flash > 0 ? 0.7 : 0);
    this.flash = Math.max(0, (this.flash || 0) - dt);
    if (swimming) this.rig.root.position.y = -0.2;
    this.chestShard.scale.setScalar(1 + Math.sin(G.time * 3) * 0.2);
    this.chestShard.scale.y *= 1.5;
    this.light.intensity = G.world.night * 7;
    if (moving && this.onGround && !swimming) {
      this.stepT = (this.stepT || 0) - dt * (sprint ? 1.6 : 1);
      if (this.stepT <= 0) { this.stepT = 0.42; G.audio.play('step'); }
    }
  }

  die() {
    if (!this.alive) return;
    this.alive = false; this.deadT = 0; this.deaths++;
    this.action = null; this.dodgeT = 0;
    G.audio.play('death');
    G.game.onPlayerDeath();
  }

  respawn(x, z) {
    this.alive = true; this.deadT = 0;
    this.statuses = {}; this.recalc();
    this.hp = this.stats.maxHp; this.mp = this.stats.maxMp; this.sta = this.stats.maxSta;
    this.pos.set(x, G.terrain.heightAt(x, z), z);
    this.vel.set(0, 0, 0);
    this.rig.body.rotation.set(0, 0, 0); this.rig.body.position.set(0, 0, 0);
  }

  // ---------------- сохранение ----------------
  serialize() {
    return {
      name: this.name, origin: this.origin, robe: this.robe, level: this.level, xp: this.xp, gold: this.gold,
      attrs: this.attrs, baseAttrs: this.baseAttrs, attrPoints: this.attrPoints, skillPoints: this.skillPoints, bonusSP: this.bonusSP,
      skills: this.skills, freeSkill: this.freeSkill, hotbar: this.hotbar, mastery: this.mastery, shards: this.shards, flags: this.flags,
      equipment: this.equipment, inventory: this.inventory.serialize(), hp: this.hp, mp: this.mp,
      pos: [this.pos.x, this.pos.y, this.pos.z], heading: this.heading, kills: this.kills, deaths: this.deaths, playTime: this.playTime,
      lastWaystone: this.lastWaystone,
    };
  }
  load(d) {
    Object.assign(this, {
      name: d.name, origin: d.origin, robe: d.robe, level: d.level, xp: d.xp, gold: d.gold, attrs: d.attrs, baseAttrs: d.baseAttrs || { ...d.attrs },
      attrPoints: d.attrPoints, skillPoints: d.skillPoints, bonusSP: d.bonusSP || 0, skills: d.skills, freeSkill: d.freeSkill, hotbar: d.hotbar,
      mastery: d.mastery, shards: d.shards || [], flags: d.flags || {}, equipment: d.equipment, kills: d.kills || 0, deaths: d.deaths || 0,
      playTime: d.playTime || 0, lastWaystone: d.lastWaystone || 'ws_vale', heading: d.heading || 0,
    });
    for (const s of Object.keys(SCHOOLS)) if (!this.mastery[s]) this.mastery[s] = { lvl: 0, xp: 0 };
    this.inventory.load(d.inventory);
    this.statuses = {}; this.cds = {}; this.alive = true;
    this._buildModel();
    this.recalc();
    this.hp = clamp(d.hp ?? this.stats.maxHp, 1, this.stats.maxHp);
    this.mp = clamp(d.mp ?? this.stats.maxMp, 0, this.stats.maxMp);
    this.sta = this.stats.maxSta;
    this.pos.set(d.pos[0], d.pos[1], d.pos[2]);
  }
}
