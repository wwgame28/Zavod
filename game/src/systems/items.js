import { CONFIG, RARITY } from '../config.js';
import { rng, clamp } from '../core/rng.js';
import { BASES, AFFIXES, ITEMS, UNIQUES, SLOTS, STAT_LABELS, PCT_STATS } from '../data/items.js';

// Генерация экипировки: база по тиру + случайные аффиксы по редкости.
let uidCounter = Date.now() % 100000;
export const newUid = () => 'i' + (uidCounter++).toString(36) + Math.floor(Math.random() * 1e4).toString(36);

const GENDER_IDX = { m: 0, f: 1, n: 2, p: 3 };
const scaleFor = (ilvl) => 1 + 0.13 * (ilvl - 1);

export function rollRarity(boost = 0) {
  const w = CONFIG.LOOT.rarityWeights.map((v, i) => v * (1 + boost * i * 0.6));
  return rng.weighted(w);
}

export function generateGear(ilvl, rarity = null, slot = null) {
  ilvl = clamp(Math.round(ilvl), 1, CONFIG.PROGRESSION.maxLevel + 2);
  if (rarity == null) rarity = rollRarity();
  const slots = Object.keys(SLOTS);
  slot = slot || rng.pick(slots);
  const base = rng.pick(BASES[slot]);
  const tier = clamp(Math.floor((ilvl - 1) / 5), 0, base.names.length - 1);
  const R = RARITY[rarity];
  const sc = scaleFor(ilvl);
  const stats = {};
  for (const [k, v] of Object.entries(base.implicit)) {
    const noScale = k === 'crit' || k === 'speed';
    stats[k] = round(v * (noScale ? 1 + tier * 0.25 : sc) * R.mult * rng.float(0.92, 1.08), k);
  }
  // Аффиксы
  const pool = AFFIXES.filter((a) => !a.slots || a.slots.includes(slot));
  const picked = [];
  let prefix = null, suffix = null;
  for (let i = 0; i < R.affixes && pool.length; i++) {
    const idx = Math.floor(rng.next() * pool.length);
    const a = pool.splice(idx, 1)[0];
    const val = round(a.v * (a.noScale ? 1 + (ilvl - 1) * 0.045 : sc) * rng.float(0.8, 1.25), a.stat);
    stats[a.stat] = round((stats[a.stat] || 0) + val, a.stat);
    picked.push(a);
    if (a.prefix && !prefix) prefix = a.prefix[GENDER_IDX[base.g]];
    else if (a.suffix && !suffix) suffix = a.suffix;
  }
  let name = base.names[tier];
  if (prefix) name = prefix + ' ' + name.charAt(0).toLowerCase() + name.slice(1);
  if (suffix) name += ' ' + suffix;
  const value = Math.round((8 + ilvl * 4) * (1 + rarity * 0.9) * (1 + picked.length * 0.15));
  return { uid: newUid(), kind: 'gear', slot, base: base.kind, name, rarity, level: ilvl, stats, value, up: 0 };
}

export function makeUnique(id, ilvl) {
  const u = UNIQUES[id];
  const sc = scaleFor(Math.max(ilvl, 10)) / scaleFor(10);
  const stats = {};
  for (const [k, v] of Object.entries(u.stats)) stats[k] = round(PCT_STATS.has(k) ? v : v * sc, k);
  return { uid: newUid(), kind: 'gear', slot: u.slot, base: u.kind, name: u.name, rarity: 4, level: ilvl, stats, value: 600 + ilvl * 30, up: 0, unique: id, lore: u.lore };
}

function round(v, stat) {
  if (PCT_STATS.has(stat) || stat === 'mpRegen' || stat === 'hpRegen') return Math.round(v * 10) / 10;
  return Math.max(1, Math.round(v));
}

// Итоговые статы предмета с учётом улучшения кузнеца (+10% за уровень)
export function gearStats(item) {
  if (!item.up) return item.stats;
  const m = 1 + item.up * 0.1;
  const out = {};
  for (const [k, v] of Object.entries(item.stats)) out[k] = round(v * m, k);
  return out;
}

export function itemName(it) {
  if (!it) return '';
  if (it.kind === 'gear') return it.name + (it.up ? ` +${it.up}` : '');
  return ITEMS[it.id]?.name || it.id;
}

export function itemColor(it) {
  if (it.kind === 'gear') return RARITY[it.rarity].color;
  const d = ITEMS[it.id];
  if (d?.type === 'shard') return '#ffb347';
  if (d?.type === 'quest') return '#ffd27a';
  return '#d6d2c4';
}

export function formatStat(k, v) {
  const lbl = STAT_LABELS[k] || k;
  if (PCT_STATS.has(k)) return `+${v}% ${lbl}`;
  return `+${v} ${lbl}`;
}

export function sellValue(it) {
  if (it.kind === 'gear') return Math.max(1, Math.round(it.value * 0.35 * (1 + (it.up || 0) * 0.2)));
  return Math.max(1, Math.round((ITEMS[it.id]?.value || 1) * 0.5));
}

export function salvageYield(it) {
  if (it.kind !== 'gear') return 0;
  return Math.round((1 + it.rarity * 2) * (1 + it.level / 8));
}

export function upgradeCost(it) {
  const u = it.up || 0;
  return { gold: Math.round((20 + it.level * 6) * (u + 1) * (1 + it.rarity * 0.3)), ash: Math.round((3 + it.level * 0.6) * (u + 1)) };
}
