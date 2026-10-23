// Эффекты состояния: и на врагах, и на игроке.
export const STATUS = {
  burn:   { name: 'Горение',      dot: 'fire',   tick: 0.5, color: '#ff7a3d', debuff: true },
  poison: { name: 'Яд',           dot: 'nature', tick: 0.5, color: '#9be06a', debuff: true },
  chill:  { name: 'Холод',        slow: 0.35,    color: '#8fd8ff', debuff: true },
  freeze: { name: 'Заморозка',    stun: true,    color: '#cfeeff', debuff: true },
  stun:   { name: 'Оглушение',    stun: true,    color: '#ffe066', debuff: true },
  root:   { name: 'Корни',        root: true,    color: '#7ee081', debuff: true },
  shock:  { name: 'Электризация', vuln: 0.12,    color: '#ffe066', debuff: true },
  curse:  { name: 'Проклятие',    vulnPower: true, color: '#b071ff', debuff: true },
  weaken: { name: 'Слабость',     dmgMul: 0.75,  color: '#b071ff', debuff: true },
  // Баффы игрока
  regrowth:      { name: 'Обновление',       hot: true, color: '#7ee081' },
  ice_armor:     { name: 'Ледяная броня',    color: '#8fd8ff' },
  thunderstorm:  { name: 'Гнев небес',       color: '#ffe066' },
  elixir_power:  { name: 'Эликсир мощи',     color: '#ff9a3d' },
  elixir_ward:   { name: 'Эликсир стойкости', color: '#8fd8ff' },
  elixir_wind:   { name: 'Эликсир ветра',    color: '#ffe066' },
  elixir_wisdom: { name: 'Эликсир мудрости', color: '#c7a6ff' },
  fire_ward:     { name: 'Оберег Дурна',     color: '#ff7a3d' },
};

export function applyStatus(target, id, dur, power = 0, src = null) {
  if (!target.alive) return;
  const def = STATUS[id];
  if (!def) return;
  if (target.boss && (def.stun || def.root)) dur *= 0.35; // боссы устойчивы к контролю
  if (target.immuneCC && (def.stun || def.root)) return;
  const cur = target.statuses[id];
  if (cur) { cur.t = Math.max(cur.t, dur); cur.dur = Math.max(cur.dur, dur); cur.power = Math.max(cur.power, power); cur.src = src || cur.src; }
  else target.statuses[id] = { t: dur, dur, power, src, acc: 0 };
}

export function clearStatus(target, ids) { for (const id of ids) delete target.statuses[id]; }

// Сводка модификаторов движения/урона от статусов.
export function statusMods(target) {
  let slow = 0, stun = false, root = false, vuln = 0, dmgMul = 1;
  for (const id in target.statuses) {
    const def = STATUS[id], s = target.statuses[id];
    if (def.slow) slow = Math.max(slow, def.slow + (s.power || 0));
    if (def.stun) stun = true;
    if (def.root) root = true;
    if (def.vuln) vuln += def.vuln;
    if (def.vulnPower) vuln += s.power;
    if (def.dmgMul) dmgMul *= def.dmgMul;
  }
  return { slow: Math.min(0.8, slow), stun, root, vuln, dmgMul };
}
