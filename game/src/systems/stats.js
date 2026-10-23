import { CONFIG, SCHOOLS } from '../config.js';
import { SKILLS } from '../data/skills.js';
import { SHARD_BONUS } from '../data/items.js';
import { gearStats } from './items.js';

// Пересчёт производных характеристик игрока: атрибуты + экипировка + пассивки + Осколки + баффы.
export function computeStats(p) {
  const C = CONFIG.COMBAT;
  const add = {};
  const put = (k, v) => { add[k] = (add[k] || 0) + v; };
  for (const it of Object.values(p.equipment)) if (it) for (const [k, v] of Object.entries(gearStats(it))) put(k, v);
  for (const [id, r] of Object.entries(p.skills)) { const s = SKILLS[id]; if (s?.type === 'passive' && r > 0 && s.stats) for (const [k, v] of Object.entries(s.stats(r))) put(k, v); }
  for (const sh of p.shards) for (const [k, v] of Object.entries(SHARD_BONUS[sh] || {})) put(k, v);
  if (p.flags.fire_ward) put('res_fire', 25);
  const st = p.statuses || {};
  if (st.elixir_ward) { put('res_all', 20); put('armor', 30); }
  if (st.elixir_wind) put('speed', 15);
  if (st.elixir_wisdom) put('xpBonus', 25);
  if (st.ice_armor) put('armor', st.ice_armor.power || 0);

  const a = {};
  for (const k of ['str', 'agi', 'int', 'vit', 'spi']) a[k] = (p.attrs[k] || 0) + (add[k] || 0);
  const L = p.level;
  const s = { ...a };
  s.maxHp = Math.round((60 + a.vit * 10 + a.str * 3 + L * 10 + (add.hp || 0)) * (1 + (add.hpPct || 0) / 100));
  s.maxMp = Math.round(40 + a.int * 7 + a.spi * 3 + L * 4 + (add.mp || 0));
  s.maxSta = Math.round(100 + a.agi * 2);
  s.sp = Math.round(a.int * 2 + (add.sp || 0));
  s.phys = Math.round(a.str * 2);
  s.weaponDmg = add.weaponDmg || 2;
  s.crit = Math.min(C.critCap, C.critBase + a.agi * 0.25 + (add.crit || 0));
  s.critDmg = C.critDmgBase + (add.critDmg || 0);
  s.armor = Math.round(a.vit * 1 + a.str * 0.5 + (add.armor || 0));
  s.hpRegen = 0.4 + a.vit * 0.08 + (add.hpRegen || 0);
  s.mpRegen = 1.0 + a.spi * 0.25 + (add.mpRegen || 0);
  s.cdr = Math.min(C.cdrCap, a.spi * 0.3 + (add.cdr || 0));
  s.speed = 1 + (add.speed || 0) / 100 + a.agi * 0.002;
  s.leech = add.leech || 0;
  s.xpBonus = add.xpBonus || 0;
  s.res = {};
  for (const el of ['fire', 'frost', 'storm', 'nature', 'shadow']) s.res[el] = Math.min(C.resCap, (add['res_' + el] || 0) + (add.res_all || 0));
  s.schoolDmg = {};
  for (const sc of Object.keys(SCHOOLS)) s.schoolDmg[sc] = (add['dmg_' + sc] || 0);
  s.burnBonus = add.burnBonus || 0;
  s.chillBonus = (add.chillBonus || 0) / 100;
  s.coldDmg = add.coldDmg || 0;
  s.ashProc = add.ashProc || 0;
  s.critMana = add.critMana || 0;
  return s;
}

// Множитель урона заклинания школы для игрока.
export function spellMult(p, school) {
  const s = p.stats;
  const lvl = 1 + CONFIG.COMBAT.playerSkillPerLevel * (p.level - 1);
  const mastery = 1 + (p.mastery[school]?.lvl || 0) * CONFIG.PROGRESSION.masteryBonus;
  const schoolBonus = 1 + (s.schoolDmg[school] || 0) / 100;
  const elixir = p.statuses.elixir_power ? 1.2 : 1;
  return lvl * (1 + s.sp / 100) * mastery * schoolBonus * elixir;
}

// Уровневое масштабирование врагов
export function enemyScale(def, level, elite) {
  const C = CONFIG.COMBAT;
  return {
    hp: Math.round(def.hp * (1 + C.enemyHpPerLevel * (level - 1)) * (elite?.hp || 1)),
    dmg: def.dmg * (1 + C.enemyDmgPerLevel * (level - 1)) * (elite?.dmg || 1),
    armor: Math.round((def.armor + C.enemyArmorPerLevel * (level - 1)) * (elite?.armor || 1)),
  };
}
