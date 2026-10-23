import { CONFIG, RARITY } from '../config.js';
import { rng } from '../core/rng.js';
import { G } from '../state.js';
import { ITEMS, BOSS_UNIQUES, UNIQUES } from '../data/items.js';
import { generateGear, rollRarity, makeUnique, itemName } from './items.js';
import { makeLootBag } from '../world/objects.js';

// Добыча: золото, материалы, экипировка в мешках на земле.
export class Loot {
  constructor() { this.bags = []; }

  drop(x, z, item) {
    const color = item.kind === 'gear' ? RARITY[item.rarity].color : '#ffd27a';
    const m = makeLootBag(color);
    const y = G.terrain.heightAt(x, z);
    m.group.position.set(x, Math.max(y, 0.1), z);
    G.scene.add(m.group);
    this.bags.push({ x, z, y, item, mesh: m, t: 0 });
    G.fx.pillar(x, y, z, parseInt(color.slice(1), 16), 2);
  }

  onKill(e) {
    const P = G.player;
    const def = e.def;
    // Золото
    let gold = Math.round(e.level * rng.float(1.2, 2.6) * (e.elite ? 3 : 1) * (e.boss ? 15 : 1));
    if (rng.chance(0.65) || e.boss || e.elite) { P.gold += gold; G.ui?.floatText(e.pos, `+${gold} з.`, '#ffd27a', 0.9, e.height + 0.6); G.audio.play('gold', { pos: e.pos, vol: 0.5 }); }
    // Особые трофеи
    for (const d of def.drops || []) {
      if (!rng.chance(d.chance)) continue;
      const it = ITEMS[d.item];
      if (it.type === 'shard') { G.game.grantShard(it.school); continue; }
      const n = P.inventory.addStack(d.item, 1);
      if (n) G.ui?.toast(`Получено: ${it.name}`, it.type === 'quest' ? 'quest' : 'loot');
    }
    // Экипировка
    let count = 0, boost = 0;
    if (e.boss) { count = CONFIG.LOOT.bossItems; boost = 1.5; }
    else if (e.elite) { count = CONFIG.LOOT.eliteItems; boost = 0.6; }
    else if (rng.chance(CONFIG.LOOT.itemChance)) count = 1;
    for (let i = 0; i < count; i++) {
      const rarity = e.boss && i === 0 ? Math.max(3, rollRarity(boost)) : rollRarity(boost);
      const ang = rng.float(0, Math.PI * 2), r = rng.float(0.8, 2.2);
      this.drop(e.pos.x + Math.cos(ang) * r, e.pos.z + Math.sin(ang) * r, generateGear(e.level + (e.boss ? 1 : 0), rarity));
    }
    if (e.boss) {
      const pool = BOSS_UNIQUES[e.type] || [];
      if (pool.length && rng.chance(0.75)) this.drop(e.pos.x, e.pos.z + 1.5, makeUnique(rng.pick(pool), e.level));
      if (e.final) this.drop(e.pos.x + 1.5, e.pos.z, makeUnique(rng.pick(Object.keys(UNIQUES)), e.level + 2));
    }
    if (rng.chance(e.boss ? 1 : 0.12)) P.inventory.addStack(rng.chance(0.5) ? 'potion_hp' : 'potion_mp', e.boss ? 3 : 1);
  }

  openChest(ch) {
    const lvl = ch.data.level;
    const P = G.player;
    const gold = Math.round(lvl * rng.float(8, 14));
    P.gold += gold;
    G.ui?.toast(`Сундук: ${gold} золота`, 'loot');
    const n = rng.int(1, 3);
    for (let i = 0; i < n; i++) this.drop(ch.x + rng.float(-1.5, 1.5), ch.z + rng.float(1, 2), generateGear(lvl + 1, rollRarity(0.9)));
    P.inventory.addStack(rng.pick(['potion_hp', 'potion_mp', 'aether_crystal']), rng.int(1, 3));
  }

  update(dt) {
    const P = G.player;
    for (let i = this.bags.length - 1; i >= 0; i--) {
      const b = this.bags[i];
      b.t += dt;
      b.mesh.beam.rotation.y += dt;
      b.mesh.group.position.y = b.y + Math.sin(b.t * 2.5) * 0.08;
      const d = Math.hypot(P.pos.x - b.x, P.pos.z - b.z);
      if (P.alive && d < CONFIG.LOOT.pickupRange) {
        if (P.inventory.add(b.item)) {
          G.ui?.toast(`Добыча: ${itemName(b.item)}`, 'loot', b.item);
          G.audio.play('pickup');
          this._remove(i); continue;
        } else if (!b.fullMsg) { b.fullMsg = true; G.ui?.toast('Сумка полна! Продайте или разберите вещи.', 'warn'); }
      }
      if (b.t > 360) this._remove(i);
    }
  }
  _remove(i) { const b = this.bags[i]; G.scene.remove(b.mesh.group); this.bags.splice(i, 1); }
  clear() { for (let i = this.bags.length - 1; i >= 0; i--) this._remove(i); }
}
