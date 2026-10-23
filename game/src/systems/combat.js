import { CONFIG, ELEMENTS } from '../config.js';
import { rng } from '../core/rng.js';
import { bus } from '../core/events.js';
import { G } from '../state.js';
import { applyStatus, statusMods, STATUS } from './status.js';

// Формулы урона: крит → модификаторы → броня/сопротивление → уязвимость.
export function dealDamage(src, target, o) {
  if (!target || !target.alive) return 0;
  const P = G.player;
  if (target.isPlayer && target.iframes > 0) {
    G.ui?.floatText(target.pos, 'Уклонение', '#d8d8ff', 0.8);
    return 0;
  }
  if (target.returning) return 0;
  let dmg = o.amount;
  let crit = false;
  if (src && src.statuses) dmg *= statusMods(src).dmgMul;
  if (o.crit !== false) {
    if (src === P) {
      if (rng.chance(P.stats.crit / 100)) { crit = true; dmg *= P.stats.critDmg / 100; }
    } else if (src && rng.chance(0.05)) { crit = true; dmg *= 1.5; }
  }
  if (src === P) {
    const st = target.statuses;
    if ((st.chill || st.freeze) && P.stats.coldDmg) dmg *= 1 + P.stats.coldDmg / 100;
  }
  // Защита
  const el = o.element || 'physical';
  if (el === 'physical') {
    const armor = target.isPlayer ? target.stats.armor : target.armor;
    dmg *= CONFIG.COMBAT.armorK / (CONFIG.COMBAT.armorK + Math.max(0, armor));
  } else if (el !== 'arcane') {
    const res = target.isPlayer ? target.stats.res[el] || 0 : target.res?.[el] || 0;
    dmg *= 1 - Math.min(CONFIG.COMBAT.resCap, res) / 100;
  }
  dmg *= 1 + statusMods(target).vuln;
  if (target.shielded) {
    dmg *= 0.12;
    if (src === P && G.time - (target.shieldMsg || -99) > 6) { target.shieldMsg = G.time; G.ui?.toast('Враг защищён силой Осколка. Выполните задания хранителя региона, чтобы ослабить его.', 'warn'); }
  }
  if (target.isPlayer && G.game?.difficulty) dmg *= G.game.difficulty.taken;
  dmg = Math.max(1, Math.round(dmg));
  target.hp -= dmg;
  target.lastHit = G.time;

  // Обратная связь
  const color = target.isPlayer ? '#ff6a6a' : crit ? '#ffe066' : ELEMENTS[el]?.color || '#ffffff';
  G.ui?.floatText(target.pos, crit ? `${dmg}!` : `${dmg}`, color, crit ? 1.4 : 1, target.height || 1.8);
  target.flash = 0.09;
  if (target.isPlayer) { G.game?.shake(0.25 + Math.min(0.5, dmg / target.stats.maxHp)); G.audio?.play('hurt'); }
  else G.audio?.play(crit ? 'crit' : 'hit', { pos: target.pos, vol: 0.7 });
  if (o.hitFx !== false) G.fx?.hit(target.pos.x, target.pos.y + (target.height || 1.6) * 0.6, target.pos.z, el);
  if (crit && src === P) G.game?.hitStop(0.045);

  // Статусы
  if (o.status && rng.chance(o.statusChance ?? 1)) {
    let dur = o.statusDur ?? 3, power = o.statusPower ?? 0;
    if (STATUS[o.status]?.dot && !power) power = Math.max(1, (o.amount * 0.18));
    if (o.status === 'burn' && src === P) power *= 1 + P.stats.burnBonus / 100;
    if (o.status === 'chill' && src === P) power = P.stats.chillBonus;
    applyStatus(target, o.status, dur, power, src);
  }
  if (o.knock && !target.boss && !target.isPlayer) {
    target.knock = target.knock || { x: 0, z: 0 };
    target.knock.x += o.knock.x; target.knock.z += o.knock.z;
  }

  // Эффекты игрока
  if (src === P) {
    if (P.stats.leech > 0 && !o.noLeech) heal(P, dmg * P.stats.leech / 100, false);
    if (crit && P.stats.critMana) P.mp = Math.min(P.stats.maxMp, P.mp + P.stats.maxMp * 0.01);
    if (o.drain) heal(P, dmg * o.drain, true);
    P.inCombat = CONFIG.PLAYER.combatTimeout;
  }
  if (target.isPlayer) {
    target.inCombat = CONFIG.PLAYER.combatTimeout;
    if (o.melee && target.statuses.ice_armor && src?.alive) applyStatus(src, 'chill', 3, P.stats.chillBonus);
    if (target.stats.ashProc && rng.chance(target.stats.ashProc / 100)) G.spells?.ashBurst();
  } else if (src && src.team !== target.team) {
    target.onDamaged?.(src);
  }
  if (src?.isEnemy && src.elite?.leech) heal(src, dmg * src.elite.leech, false);

  bus.emit('damage', { src, target, dmg, crit, element: el });
  if (target.hp <= 0) {
    target.hp = 0;
    target.die(src);
  }
  return dmg;
}

export function heal(target, amount, show = true) {
  if (!target.alive || amount <= 0) return 0;
  const max = target.isPlayer ? target.stats.maxHp : target.maxHp;
  const before = target.hp;
  target.hp = Math.min(max, target.hp + amount);
  const done = target.hp - before;
  if (show && done >= 1) G.ui?.floatText(target.pos, `+${Math.round(done)}`, '#7ee081', 1, target.height || 1.8);
  return done;
}

// Тик статусов: урон со временем, лечение со временем, истечение.
export function tickStatuses(a, dt) {
  for (const id in a.statuses) {
    const s = a.statuses[id];
    const def = STATUS[id];
    s.t -= dt;
    if (def.dot || def.hot) {
      s.acc += dt;
      const tick = def.tick || 0.5;
      while (s.acc >= tick && s.t > -0.01) {
        s.acc -= tick;
        if (def.dot) {
          dealDamage(s.src && s.src.alive !== false ? s.src : null, a, { amount: s.power, element: def.dot, crit: false, hitFx: false, noLeech: true });
          if (!a.alive) return;
        } else if (def.hot) {
          heal(a, s.power * tick, false);
          if (s.mana && a.isPlayer) a.mp = Math.min(a.stats.maxMp, a.mp + s.mana * tick);
        }
      }
    }
    if (s.t <= 0) delete a.statuses[id];
  }
}
