import { rng } from '../core/rng.js';
import { G } from '../state.js';
import { ITEMS, RECIPES } from '../data/items.js';
import { generateGear, sellValue, salvageYield, upgradeCost, itemName } from './items.js';

// Торговцы, алхимия и кузнечное дело.
const STOCK = {
  mila: { stacks: ['potion_hp', 'potion_mp', 'respec_scroll'], gear: 6, rarity: [0, 2], slots: null },
  ogden: { stacks: ['potion_hp'], gear: 7, rarity: [1, 2], slots: ['weapon', 'head', 'chest', 'hands', 'feet'] },
  lada: { stacks: ['potion_hp', 'potion_mp', 'sunpetal', 'moonmoss', 'aether_crystal'], gear: 2, rarity: [1, 2], slots: ['amulet', 'ring'] },
  durn: { stacks: ['potion_hp', 'potion_mp', 'obsidian'], gear: 7, rarity: [2, 3], slots: null, minLevel: 18 },
};
const BUY_PRICE = { potion_hp: 25, potion_mp: 25, respec_scroll: 400 };

export class Shop {
  constructor() { this.stock = {}; this.rolledAt = {}; }

  buyPrice(entry) {
    if (entry.kind === 'gear') return Math.round(entry.value * 1.1);
    return BUY_PRICE[entry.id] ?? Math.max(2, Math.round((ITEMS[entry.id]?.value || 1) * 1.6));
  }

  stockFor(npc) {
    const P = G.player;
    const s = STOCK[npc]; if (!s) return [];
    const day = Math.floor(G.time / 600);
    if (!this.stock[npc] || this.rolledAt[npc] !== day || this.stock[npc].lvl !== P.level) {
      const lvl = Math.max(P.level, s.minLevel || 1);
      const gear = [];
      for (let i = 0; i < s.gear; i++) gear.push(generateGear(lvl + rng.int(0, 1), rng.int(s.rarity[0], s.rarity[1]), s.slots ? rng.pick(s.slots) : null));
      this.stock[npc] = { lvl: P.level, list: s.stacks.map((id) => ({ kind: 'stack', id, n: 1 })).concat(gear) };
      this.rolledAt[npc] = day;
    }
    return this.stock[npc].list;
  }

  buy(npc, idx) {
    const P = G.player;
    const list = this.stockFor(npc);
    const e = list[idx]; if (!e) return false;
    const price = this.buyPrice(e);
    if (P.gold < price) { G.ui.toast('Недостаточно золота', 'warn'); G.audio.play('error'); return false; }
    const ok = e.kind === 'gear' ? P.inventory.addGear(e) : P.inventory.addStack(e.id, 1) > 0;
    if (!ok) { G.ui.toast('Сумка полна', 'warn'); return false; }
    P.gold -= price;
    if (e.kind === 'gear') list.splice(idx, 1);
    G.audio.play('gold');
    return true;
  }

  sell(invIdx) {
    const P = G.player;
    const s = P.inventory.slots[invIdx]; if (!s) return;
    const def = s.kind === 'stack' ? ITEMS[s.id] : null;
    if (def && (def.type === 'quest' || def.type === 'shard')) { G.ui.toast('Это нельзя продать', 'warn'); return; }
    const v = sellValue(s) * (s.kind === 'stack' ? s.n : 1);
    P.inventory.takeAt(invIdx);
    P.gold += v;
    G.ui.toast(`Продано: ${itemName(s)} (+${v} з.)`, 'loot');
    G.audio.play('gold');
  }

  salvage(invIdx) {
    const P = G.player;
    const s = P.inventory.slots[invIdx];
    if (!s || s.kind !== 'gear') return;
    const n = salvageYield(s);
    P.inventory.takeAt(invIdx);
    P.inventory.addStack('star_ash', n);
    G.ui.toast(`Разобрано: ${itemName(s)} → звёздный пепел ×${n}`, 'loot');
    G.audio.play('open');
  }

  // Улучшение: item — объект предмета (в сумке или надетый)
  upgrade(item) {
    const P = G.player;
    if (!item || item.kind !== 'gear') return false;
    if ((item.up || 0) >= 5) { G.ui.toast('Предмет улучшен до предела', 'warn'); return false; }
    const c = upgradeCost(item);
    if (P.gold < c.gold || !P.inventory.has('star_ash', c.ash)) { G.ui.toast(`Нужно: ${c.gold} з. и звёздный пепел ×${c.ash}`, 'warn'); G.audio.play('error'); return false; }
    P.gold -= c.gold; P.inventory.remove('star_ash', c.ash);
    item.up = (item.up || 0) + 1;
    P.recalc();
    G.ui.toast(`${itemName(item)} — улучшено!`, 'good');
    G.audio.play('levelup');
    return true;
  }

  canCraft(r) {
    const P = G.player;
    if (P.gold < r.gold) return false;
    for (const [id, n] of Object.entries(r.inputs)) if (!P.inventory.has(id, n)) return false;
    return true;
  }
  craft(rid) {
    const r = RECIPES.find((x) => x.id === rid);
    const P = G.player;
    if (!r || !this.canCraft(r)) { G.ui.toast('Не хватает ингредиентов', 'warn'); G.audio.play('error'); return false; }
    for (const [id, n] of Object.entries(r.inputs)) P.inventory.remove(id, n);
    P.gold -= r.gold;
    P.inventory.addStack(r.out, r.n);
    G.ui.toast(`Сварено: ${ITEMS[r.out].name} ×${r.n}`, 'good');
    G.audio.play('heal');
    return true;
  }
}
