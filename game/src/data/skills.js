// Древо навыков: 5 школ магии × 5 навыков, у каждого до 5 рангов.
// Круги (tier): 1 — сразу; 2 — ур. 6 и 3 очка в школе; 3 — ур. 12, 6 очков в школе и Великий Осколок школы.
// vals(r) — базовые числа ранга; урон/лечение затем умножаются на силу магии, уровень и мастерство.

export const TIER_REQ = {
  1: { level: 1, points: 0 },
  2: { level: 6, points: 3 },
  3: { level: 12, points: 6, shard: true },
};

const lin = (a, b) => (r) => a + b * (r - 1);

export const SKILLS = {
  // ================= ПЛАМЯ =================
  fireball: {
    school: 'fire', tier: 1, type: 'active', name: 'Огненный шар', icon: 'fireball', max: 5, mana: 14, cd: 1.2,
    vals: (r) => ({ dmg: lin(26, 9)(r), radius: 2.6, burn: 30 + 5 * r }),
    desc: (v) => `Шар пламени взрывается при попадании: ${v.dmg} урона Пламенем в радиусе ${v.radius} м. Шанс поджечь — ${v.burn}%.`,
  },
  embers: {
    school: 'fire', tier: 1, type: 'passive', name: 'Тлеющие угли', icon: 'embers', max: 5,
    vals: (r) => ({ burn: 20 * r, fire: 3 * r }),
    desc: (v) => `Горение наносит на ${v.burn}% больше урона. Урон Пламени +${v.fire}%.`,
    stats: (r) => ({ dmg_fire: 3 * r, burnBonus: 20 * r }),
  },
  flame_wave: {
    school: 'fire', tier: 2, type: 'active', name: 'Огненная волна', icon: 'wave', max: 5, mana: 24, cd: 6,
    vals: (r) => ({ dmg: lin(38, 12)(r), range: 9 + r * 0.4, angle: 75 }),
    desc: (v) => `Конус пламени перед вами (${v.range.toFixed(1)} м): ${v.dmg} урона, отбрасывание и гарантированное горение.`,
  },
  ash_cloak: {
    school: 'fire', tier: 2, type: 'passive', name: 'Пепельный покров', icon: 'cloak', max: 5,
    vals: (r) => ({ sp: 4 * r, res: 5 * r, proc: 4 * r }),
    desc: (v) => `+${v.sp} к силе магии, +${v.res}% сопр. Пламени. При получении урона ${v.proc}% шанс выпустить огненный всполох.`,
    stats: (r) => ({ sp: 4 * r, res_fire: 5 * r, ashProc: 4 * r }),
  },
  meteor: {
    school: 'fire', tier: 3, type: 'active', name: 'Метеор', icon: 'meteor', max: 5, mana: 45, cd: 14, ground: true, range: 32,
    vals: (r) => ({ dmg: lin(130, 40)(r), radius: 6 + r * 0.3, delay: 1.0 }),
    desc: (v) => `Через ${v.delay} с в указанную точку падает метеор: ${v.dmg} урона в радиусе ${v.radius.toFixed(1)} м и пылающая земля.`,
  },

  // ================= ИНЕЙ =================
  ice_shard: {
    school: 'frost', tier: 1, type: 'active', name: 'Ледяной осколок', icon: 'shard', max: 5, mana: 10, cd: 0.8,
    vals: (r) => ({ dmg: lin(20, 7)(r), pierce: Math.floor(r / 3) }),
    desc: (v) => `Быстрый осколок льда: ${v.dmg} урона Инеем и охлаждение.${v.pierce ? ` Пробивает ${v.pierce} цел.` : ''}`,
  },
  frost_nova: {
    school: 'frost', tier: 1, type: 'active', name: 'Кольцо холода', icon: 'nova', max: 5, mana: 20, cd: 10,
    vals: (r) => ({ dmg: lin(18, 6)(r), radius: 6.5, freeze: +(1.2 + 0.15 * r).toFixed(2) }),
    desc: (v) => `Волна холода вокруг вас: ${v.dmg} урона и заморозка на ${v.freeze} с в радиусе ${v.radius} м.`,
  },
  ice_armor: {
    school: 'frost', tier: 2, type: 'active', name: 'Ледяная броня', icon: 'armor', max: 5, mana: 22, cd: 26, self: true,
    vals: (r) => ({ armor: 20 + 12 * r, dur: 20 }),
    desc: (v) => `На ${v.dur} с: +${v.armor} брони, атакующие вас в ближнем бою охлаждаются.`,
  },
  deep_cold: {
    school: 'frost', tier: 2, type: 'passive', name: 'Глубокий холод', icon: 'snow', max: 5,
    vals: (r) => ({ slow: 6 * r, bonus: 5 * r }),
    desc: (v) => `Охлаждение замедляет ещё на ${v.slow}%. Урон по охлаждённым и замороженным целям +${v.bonus}%.`,
    stats: (r) => ({ chillBonus: 6 * r, coldDmg: 5 * r }),
  },
  blizzard: {
    school: 'frost', tier: 3, type: 'active', name: 'Вьюга', icon: 'blizzard', max: 5, mana: 45, cd: 16, ground: true, range: 30,
    vals: (r) => ({ dmg: lin(14, 4)(r), radius: 7, dur: 6 }),
    desc: (v) => `Буран в указанной области на ${v.dur} с: ${v.dmg} урона каждые 0,5 с и сильное охлаждение.`,
  },

  // ================= БУРЯ =================
  chain_lightning: {
    school: 'storm', tier: 1, type: 'active', name: 'Цепная молния', icon: 'chain', max: 5, mana: 16, cd: 1.6,
    vals: (r) => ({ dmg: lin(22, 8)(r), jumps: 2 + Math.floor(r / 2), range: 24 }),
    desc: (v) => `Молния бьёт в цель и перескакивает ещё на ${v.jumps} врагов: ${v.dmg} урона Бурей, может оглушить.`,
  },
  blink: {
    school: 'storm', tier: 1, type: 'active', name: 'Рывок молнии', icon: 'blink', max: 5, mana: 15, cd: 7, self: true,
    vals: (r) => ({ dist: 10 + r, dmg: lin(15, 5)(r), cd: 7 - 0.5 * r }),
    desc: (v) => `Мгновенный рывок на ${v.dist} м вперёд. Враги на пути получают ${v.dmg} урона. Перезарядка ${v.cd} с.`,
  },
  overload: {
    school: 'storm', tier: 2, type: 'passive', name: 'Перегрузка', icon: 'spark', max: 5,
    vals: (r) => ({ crit: 2 * r, critDmg: 6 * r }),
    desc: (v) => `+${v.crit}% к шансу крит. удара и +${v.critDmg}% к крит. урону. Криты восстанавливают 1% маны.`,
    stats: (r) => ({ crit: 2 * r, critDmg: 6 * r, critMana: 1 }),
  },
  ball_lightning: {
    school: 'storm', tier: 2, type: 'active', name: 'Шаровая молния', icon: 'ball', max: 5, mana: 26, cd: 8,
    vals: (r) => ({ dmg: lin(9, 3)(r), radius: 4.5, dist: 26 }),
    desc: (v) => `Медленный шар летит ${v.dist} м и бьёт всех рядом (${v.radius} м) на ${v.dmg} урона каждые 0,3 с.`,
  },
  thunderstorm: {
    school: 'storm', tier: 3, type: 'active', name: 'Гнев небес', icon: 'storm', max: 5, mana: 50, cd: 20, self: true,
    vals: (r) => ({ dmg: lin(42, 13)(r), dur: 6, radius: 15 }),
    desc: (v) => `${v.dur} с молнии бьют врагов вокруг вас (${v.radius} м): ${v.dmg} урона каждым ударом, оглушение.`,
  },

  // ================= ЖИЗНЬ =================
  heal: {
    school: 'life', tier: 1, type: 'active', name: 'Исцеление', icon: 'heal', max: 5, mana: 18, cd: 6, self: true,
    vals: (r) => ({ heal: lin(40, 16)(r) }),
    desc: (v) => `Мгновенно восстанавливает ${v.heal} здоровья и снимает яд и горение.`,
  },
  entangle: {
    school: 'life', tier: 1, type: 'active', name: 'Оплетающие корни', icon: 'roots', max: 5, mana: 18, cd: 9, ground: true, range: 26,
    vals: (r) => ({ dmg: lin(16, 6)(r), radius: 4.5, root: +(2 + 0.3 * r).toFixed(1) }),
    desc: (v) => `Корни опутывают врагов в области (${v.radius} м): обездвиживание на ${v.root} с и ${v.dmg} урона Природой.`,
  },
  regrowth: {
    school: 'life', tier: 2, type: 'active', name: 'Обновление', icon: 'leaf', max: 5, mana: 20, cd: 14, self: true,
    vals: (r) => ({ heal: lin(70, 28)(r), dur: 8, mana: 2 + r }),
    desc: (v) => `За ${v.dur} с восстанавливает ${v.heal} здоровья и ${v.mana} маны в секунду.`,
  },
  vitality: {
    school: 'life', tier: 2, type: 'passive', name: 'Живучесть леса', icon: 'tree', max: 5,
    vals: (r) => ({ hp: 5 * r, regen: 0.6 * r }),
    desc: (v) => `+${v.hp}% к максимальному здоровью, +${v.regen.toFixed(1)} здоровья в секунду.`,
    stats: (r) => ({ hpPct: 5 * r, hpRegen: 0.6 * r }),
  },
  spirit_guardian: {
    school: 'life', tier: 3, type: 'active', name: 'Дух-страж', icon: 'wolf', max: 5, mana: 50, cd: 40, self: true,
    vals: (r) => ({ dur: 25 + 5 * r, power: 100 + 20 * (r - 1) }),
    desc: (v) => `Призывает светящегося волка-духа на ${v.dur} с. Сила духа — ${v.power}% от базовой.`,
  },

  // ================= ТЕНЬ =================
  shadow_bolt: {
    school: 'shadow', tier: 1, type: 'active', name: 'Стрела Тьмы', icon: 'bolt', max: 5, mana: 13, cd: 1.0,
    vals: (r) => ({ dmg: lin(24, 8)(r), weaken: 30 }),
    desc: (v) => `Сгусток тьмы: ${v.dmg} урона Тенью. Шанс ${v.weaken}% ослабить цель (−25% её урона).`,
  },
  life_drain: {
    school: 'shadow', tier: 1, type: 'active', name: 'Похищение жизни', icon: 'drain', max: 5, mana: 16, cd: 4,
    vals: (r) => ({ dmg: lin(18, 6)(r), heal: 50 + 5 * r }),
    desc: (v) => `Наносит ${v.dmg} урона Тенью и возвращает вам ${v.heal}% нанесённого урона.`,
  },
  curse: {
    school: 'shadow', tier: 2, type: 'active', name: 'Проклятие', icon: 'curse', max: 5, mana: 20, cd: 12, ground: true, range: 28,
    vals: (r) => ({ vuln: 20 + 3 * r, radius: 5.5, dur: 8 }),
    desc: (v) => `Враги в области (${v.radius} м) на ${v.dur} с получают на ${v.vuln}% больше урона.`,
  },
  void_hunger: {
    school: 'shadow', tier: 2, type: 'passive', name: 'Голод Бездны', icon: 'eye', max: 5,
    vals: (r) => ({ leech: r, shadow: 3 * r }),
    desc: (v) => `+${v.leech}% похищения жизни, +${v.shadow}% к урону Тени.`,
    stats: (r) => ({ leech: r, dmg_shadow: 3 * r }),
  },
  void_rift: {
    school: 'shadow', tier: 3, type: 'active', name: 'Разлом Пустоты', icon: 'rift', max: 5, mana: 50, cd: 18, ground: true, range: 28,
    vals: (r) => ({ dmg: lin(12, 4)(r), burst: lin(64, 22)(r), radius: 7, dur: 4 }),
    desc: (v) => `Разлом затягивает врагов ${v.dur} с (${v.dmg} урона каждые 0,4 с), затем взрывается на ${v.burst}.`,
  },
};

export const SKILL_ORDER = {
  fire: ['fireball', 'embers', 'flame_wave', 'ash_cloak', 'meteor'],
  frost: ['ice_shard', 'frost_nova', 'ice_armor', 'deep_cold', 'blizzard'],
  storm: ['chain_lightning', 'blink', 'overload', 'ball_lightning', 'thunderstorm'],
  life: ['heal', 'entangle', 'regrowth', 'vitality', 'spirit_guardian'],
  shadow: ['shadow_bolt', 'life_drain', 'curse', 'void_hunger', 'void_rift'],
};

// Базовая атака (ЛКМ) — всегда доступна.
export const BASIC_ATTACK = { name: 'Тайный снаряд', cd: 0.5, dmg: 9 };

// Предыстории персонажа (выбор при создании).
export const ORIGINS = [
  { id: 'ember', name: 'Ученик Пламени', school: 'fire', skill: 'fireball', attrs: { int: 3, spi: 0, vit: 0, agi: 0, str: 0 }, desc: 'Вырос у кузнечного горна. Огонь всегда слушался вас.' },
  { id: 'frost', name: 'Дитя Севера', school: 'frost', skill: 'ice_shard', attrs: { vit: 2, int: 1 }, desc: 'Пришли с северных стоянок. Холод — ваш старый друг.' },
  { id: 'storm', name: 'Странник Бурь', school: 'storm', skill: 'chain_lightning', attrs: { agi: 2, int: 1 }, desc: 'Бродяга побережья. Молнии ищут вас сами.' },
  { id: 'life', name: 'Дитя Леса', school: 'life', skill: 'heal', attrs: { vit: 2, spi: 1 }, desc: 'Найдены друидами в корнях древа. Жизнь течёт сквозь вас.' },
  { id: 'shadow', name: 'Подкидыш Тени', school: 'shadow', skill: 'shadow_bolt', attrs: { spi: 2, int: 1 }, desc: 'Никто не знает, откуда вы. Тьма шепчет вам по ночам.' },
];
