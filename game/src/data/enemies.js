// Бестиарий. Статы указаны для 1-го уровня, масштабируются формулами из CONFIG.COMBAT.
// attack.kind: melee | ranged. abilities — особые приёмы элит и боссов (см. entities/enemy.js).

const M = (range, windup, cd) => ({ kind: 'melee', range, windup, cd });
const R = (range, windup, cd, proj) => ({ kind: 'ranged', range, windup, cd, proj });

export const ENEMIES = {
  // ---------- Вересковая Долина ----------
  slime: {
    name: 'Эфирный слизень', family: 'Эфирные твари', hp: 30, dmg: 5, armor: 0, speed: 3.6, element: 'arcane',
    attack: M(1.6, 0.35, 1.4), aggro: 11, xp: 0.8, loot: 'beast',
    model: { body: 'blob', main: 0x6fd6ff, eye: 0x10304a, glow: 0x9ff0ff, scale: 0.9, translucent: true },
    drops: [{ item: 'aether_dust', chance: 0.25 }],
  },
  wolf: {
    name: 'Луговой волк', family: 'Звери', hp: 38, dmg: 7, armor: 2, speed: 7.2, element: 'physical',
    attack: M(1.9, 0.32, 1.3), aggro: 15, xp: 1, loot: 'beast',
    model: { body: 'quad', main: 0x8a8f99, dark: 0x4a4e57, eye: 0xffd27a, scale: 1 },
    drops: [{ item: 'wolf_pelt', chance: 0.45 }],
  },
  bandit: {
    name: 'Разбойник', family: 'Люди', hp: 52, dmg: 8, armor: 5, speed: 5.4, element: 'physical',
    attack: M(2.0, 0.42, 1.5), aggro: 16, xp: 1.2, loot: 'humanoid',
    model: { body: 'humanoid', skin: 0xd9a77c, cloth: 0x6b4a2f, cloth2: 0x3e3226, weapon: 'sword', hood: true, scale: 1 },
  },
  bandit_archer: {
    name: 'Разбойник-лучник', family: 'Люди', hp: 40, dmg: 7, armor: 3, speed: 5.2, element: 'physical',
    attack: R(22, 0.7, 2.2, { speed: 32, color: 0xd8c8a0, size: 0.18, kind: 'arrow' }), aggro: 22, xp: 1.2, loot: 'humanoid', keepDistance: 12,
    model: { body: 'humanoid', skin: 0xd9a77c, cloth: 0x4f5e34, cloth2: 0x3e3226, weapon: 'bow', hood: true, scale: 0.98 },
  },
  // ---------- Шепчущий Лес ----------
  shadow_wolf: {
    name: 'Сумрачный волк', family: 'Искажённые', hp: 46, dmg: 8, armor: 3, speed: 7.6, element: 'shadow',
    attack: M(2.0, 0.3, 1.2), aggro: 16, xp: 1.1, loot: 'beast', res: { shadow: 30 },
    model: { body: 'quad', main: 0x3b3550, dark: 0x1e1a2c, eye: 0xc78cff, scale: 1.08, glow: 0x8a4dff },
    drops: [{ item: 'wolf_pelt', chance: 0.3 }],
  },
  spider: {
    name: 'Лесной паук', family: 'Звери', hp: 40, dmg: 7, armor: 2, speed: 6.4, element: 'nature',
    attack: M(1.8, 0.35, 1.3), aggro: 14, xp: 1, loot: 'beast', onHit: { status: 'poison', chance: 0.4 },
    model: { body: 'spider', main: 0x4a3b2e, dark: 0x2a2018, eye: 0xff4d4d, scale: 1 },
    drops: [{ item: 'spider_silk', chance: 0.5 }],
  },
  spriggan: {
    name: 'Искажённый спригган', family: 'Искажённые', hp: 58, dmg: 9, armor: 6, speed: 4.6, element: 'nature',
    attack: R(20, 0.7, 2.4, { speed: 22, color: 0x9be06a, size: 0.3, kind: 'thorn' }), aggro: 20, xp: 1.3, loot: 'spirit', res: { nature: 40, fire: -30 }, keepDistance: 9,
    model: { body: 'humanoid', skin: 0x6b5235, cloth: 0x4c7a34, cloth2: 0x3a2c1c, weapon: 'claws', horns: true, glowEyes: 0xb8ff7a, scale: 1.15 },
    drops: [{ item: 'moonmoss', chance: 0.3 }],
  },
  // ---------- Гнилые Топи ----------
  drowned: {
    name: 'Утопленник', family: 'Нежить', hp: 64, dmg: 10, armor: 6, speed: 4.4, element: 'nature',
    attack: M(2.0, 0.5, 1.6), aggro: 15, xp: 1.2, loot: 'humanoid', onHit: { status: 'poison', chance: 0.3 }, res: { shadow: 20, fire: -20 },
    model: { body: 'humanoid', skin: 0x7c8f74, cloth: 0x3c4a3a, cloth2: 0x2a3329, weapon: 'claws', glowEyes: 0xd8ff6a, scale: 1.02 },
  },
  toad: {
    name: 'Ядовитая жаба', family: 'Звери', hp: 54, dmg: 9, armor: 4, speed: 4.0, element: 'nature',
    attack: R(16, 0.6, 2.2, { speed: 18, color: 0xa4ff3a, size: 0.35, kind: 'glob', status: 'poison' }), aggro: 16, xp: 1.1, loot: 'beast', keepDistance: 7,
    model: { body: 'blob', main: 0x5f8a3a, eye: 0xffd23a, scale: 1.1, toad: true },
    drops: [{ item: 'swamp_lily', chance: 0.25 }],
  },
  wisp: {
    name: 'Болотный огонёк', family: 'Духи', hp: 36, dmg: 10, armor: 0, speed: 6.6, element: 'shadow',
    attack: R(20, 0.55, 1.9, { speed: 24, color: 0xc0ff9a, size: 0.28, kind: 'orb' }), aggro: 20, xp: 1.1, loot: 'spirit', keepDistance: 10, flying: 2.2,
    model: { body: 'floater', main: 0xc0ff9a, glow: 0xe8ffc8, scale: 0.6, wisp: true },
    drops: [{ item: 'wisp_essence', chance: 0.6 }],
  },
  // ---------- Морозный Хребет ----------
  snow_wolf: {
    name: 'Снежный волк', family: 'Звери', hp: 50, dmg: 9, armor: 4, speed: 7.8, element: 'frost',
    attack: M(2.0, 0.3, 1.2), aggro: 17, xp: 1.1, loot: 'beast', onHit: { status: 'chill', chance: 0.35 }, res: { frost: 40, fire: -20 },
    model: { body: 'quad', main: 0xe9eef5, dark: 0xaab6c4, eye: 0x7fd8ff, scale: 1.12 },
    drops: [{ item: 'snow_pelt', chance: 0.55 }],
  },
  ice_golem: {
    name: 'Ледяной голем', family: 'Конструкты', hp: 110, dmg: 15, armor: 14, speed: 3.6, element: 'frost',
    attack: M(2.6, 0.8, 2.2), aggro: 14, xp: 1.8, loot: 'construct', res: { frost: 60, fire: -35, storm: 10 },
    abilities: ['slam'],
    model: { body: 'humanoid', skin: 0x9fd4f0, cloth: 0x7ab4dc, cloth2: 0x5a8fb8, weapon: 'none', bulky: true, glowEyes: 0xdff6ff, scale: 1.45, crystal: 0xcff0ff },
    drops: [{ item: 'frostgrass', chance: 0.3 }],
  },
  frost_wraith: {
    name: 'Морозный дух', family: 'Духи', hp: 48, dmg: 11, armor: 2, speed: 5.6, element: 'frost',
    attack: R(22, 0.6, 2.0, { speed: 26, color: 0xbfeaff, size: 0.3, kind: 'shard', status: 'chill' }), aggro: 21, xp: 1.2, loot: 'spirit', keepDistance: 11, flying: 1.6,
    res: { frost: 50, fire: -25 },
    model: { body: 'floater', main: 0xcfe8ff, glow: 0x9fdcff, scale: 1.0, robe: true },
  },
  // ---------- Грозовые Утёсы ----------
  harpy: {
    name: 'Грозовая гарпия', family: 'Звери', hp: 52, dmg: 11, armor: 3, speed: 8.4, element: 'storm',
    attack: M(2.2, 0.3, 1.3), aggro: 22, xp: 1.2, loot: 'beast', flying: 3, res: { storm: 40 },
    abilities: ['dive'],
    model: { body: 'floater', main: 0x7a6a8c, glow: 0xffe066, scale: 1.0, wings: true },
    drops: [{ item: 'harpy_feather', chance: 0.55 }],
  },
  storm_elemental: {
    name: 'Грозовой элементаль', family: 'Элементали', hp: 70, dmg: 13, armor: 6, speed: 4.8, element: 'storm',
    attack: R(22, 0.7, 2.2, { speed: 40, color: 0xfff27a, size: 0.32, kind: 'bolt', status: 'shock' }), aggro: 20, xp: 1.4, loot: 'spirit', keepDistance: 10, flying: 1.2,
    res: { storm: 70, nature: -30 },
    model: { body: 'floater', main: 0x8fa6d8, glow: 0xfff27a, scale: 1.25, shards: true },
    drops: [{ item: 'stormbloom', chance: 0.25 }],
  },
  // ---------- Пепельные Пики ----------
  magma_hound: {
    name: 'Магмовый пёс', family: 'Элементали', hp: 70, dmg: 13, armor: 8, speed: 7.6, element: 'fire',
    attack: M(2.0, 0.32, 1.2), aggro: 17, xp: 1.2, loot: 'beast', onHit: { status: 'burn', chance: 0.35 }, res: { fire: 60, frost: -30 },
    model: { body: 'quad', main: 0x2a2220, dark: 0x140f0e, eye: 0xffb03a, scale: 1.15, glow: 0xff5a1a, spikes: true },
  },
  ash_adept: {
    name: 'Адепт Пепельного Ордена', family: 'Люди', hp: 64, dmg: 14, armor: 6, speed: 5.0, element: 'fire',
    attack: R(24, 0.7, 2.1, { speed: 28, color: 0xff7a3d, size: 0.32, kind: 'orb', status: 'burn' }), aggro: 22, xp: 1.4, loot: 'humanoid', keepDistance: 12,
    res: { fire: 30 },
    model: { body: 'humanoid', skin: 0xc79a7a, cloth: 0x2e2626, cloth2: 0x8a2a1a, weapon: 'staff', hood: true, glowEyes: 0xff7a3d, scale: 1, staffGlow: 0xff7a3d },
    drops: [{ item: 'cult_sigil', chance: 0.4 }],
  },
  fire_elemental: {
    name: 'Огненный элементаль', family: 'Элементали', hp: 80, dmg: 15, armor: 6, speed: 4.8, element: 'fire',
    attack: R(22, 0.75, 2.3, { speed: 26, color: 0xff6a2a, size: 0.45, kind: 'fireball', status: 'burn', splash: 2.5 }), aggro: 20, xp: 1.5, loot: 'spirit', keepDistance: 9, flying: 1.0,
    res: { fire: 80, frost: -40 },
    model: { body: 'floater', main: 0xff7a2a, glow: 0xffc46a, scale: 1.35, flame: true },
    drops: [{ item: 'emberbloom', chance: 0.3 }],
  },
  // ---------- Астралис ----------
  aether_guardian: {
    name: 'Эфирный страж', family: 'Конструкты', hp: 130, dmg: 18, armor: 16, speed: 4.4, element: 'arcane',
    attack: M(2.6, 0.7, 2.0), aggro: 16, xp: 1.9, loot: 'construct', res: { fire: 20, frost: 20, storm: 20, nature: 20, shadow: 20 },
    abilities: ['slam'],
    model: { body: 'humanoid', skin: 0xb9b3c9, cloth: 0x6b5fa0, cloth2: 0x4a3f7a, weapon: 'sword', bulky: true, glowEyes: 0xc7a6ff, scale: 1.4, crystal: 0xc7a6ff },
    drops: [{ item: 'stardust', chance: 0.3 }],
  },
  void_mage: {
    name: 'Маг Пустоты', family: 'Люди', hp: 76, dmg: 17, armor: 6, speed: 5.4, element: 'shadow',
    attack: R(24, 0.65, 2.0, { speed: 30, color: 0xb071ff, size: 0.34, kind: 'orb', status: 'weaken' }), aggro: 22, xp: 1.6, loot: 'humanoid', keepDistance: 12,
    abilities: ['blink'], res: { shadow: 50 },
    model: { body: 'humanoid', skin: 0x9a8aa0, cloth: 0x2a1f3a, cloth2: 0x6a3fa0, weapon: 'staff', hood: true, glowEyes: 0xd8a6ff, scale: 1.02, staffGlow: 0xb071ff },
  },
  void_shade: {
    name: 'Тень Пустоты', family: 'Духи', hp: 60, dmg: 15, armor: 2, speed: 8.0, element: 'shadow',
    attack: M(2.0, 0.28, 1.1), aggro: 18, xp: 1.3, loot: 'spirit', flying: 0.8, res: { shadow: 60, nature: -20 },
    model: { body: 'floater', main: 0x2a1f3a, glow: 0xb071ff, scale: 1.1, robe: true },
  },

  // ---------- Союзник ----------
  spirit_wolf: {
    name: 'Дух-страж', family: 'Союзник', hp: 120, dmg: 14, armor: 10, speed: 9, element: 'nature',
    attack: M(2.0, 0.25, 0.9), aggro: 26, xp: 0, loot: null, ally: true,
    model: { body: 'quad', main: 0x8affc0, dark: 0x3fbf80, eye: 0xffffff, scale: 1.2, glow: 0x8affc0, translucent: true },
  },

  // ---------- Боссы ----------
  garm: {
    name: 'Гарм Одноглазый', title: 'Вожак Волчьей Балки', boss: true, hp: 520, dmg: 13, armor: 10, speed: 5.6, element: 'physical',
    attack: M(2.6, 0.5, 1.5), aggro: 26, xp: 12, loot: 'humanoid',
    abilities: ['charge', 'slam', 'summon:bandit'],
    model: { body: 'humanoid', skin: 0xc99a6c, cloth: 0x5a2f20, cloth2: 0x2a201a, weapon: 'axe', bulky: true, scale: 1.4, eyepatch: true },
    drops: [{ item: 'star_fragment', chance: 1 }, { item: 'order_letter', chance: 1 }],
  },
  old_root: {
    name: 'Старый Корень', title: 'Искажённый Хранитель Леса', boss: true, hp: 1300, dmg: 15, armor: 14, speed: 3.6, element: 'nature',
    attack: M(3.6, 0.8, 2.0), aggro: 30, xp: 18, loot: 'spirit', res: { nature: 50, fire: -25 },
    abilities: ['slam', 'rain:thorn', 'summon:spriggan', 'root'],
    model: { body: 'humanoid', skin: 0x5a4430, cloth: 0x3f6b2e, cloth2: 0x2a2014, weapon: 'claws', horns: true, bulky: true, glowEyes: 0xb8ff7a, scale: 3.0, crystal: 0x9be06a },
    drops: [{ item: 'shard_life', chance: 1 }],
  },
  rot_mother: {
    name: 'Мать Гнили', title: 'Сердце Топей', boss: true, hp: 2000, dmg: 18, armor: 10, speed: 3.0, element: 'nature',
    attack: R(24, 0.8, 2.0, { speed: 20, color: 0xa4ff3a, size: 0.6, kind: 'glob', status: 'poison', splash: 3 }), aggro: 30, xp: 22, loot: 'beast',
    abilities: ['nova:nature', 'rain:glob', 'summon:toad'], res: { nature: 60, shadow: 30, fire: -20 },
    model: { body: 'blob', main: 0x4f6b2a, eye: 0xffe23a, scale: 3.4, toad: true, crown: 0x8a6bd8 },
    drops: [{ item: 'shard_shadow', chance: 1 }],
  },
  colossus: {
    name: 'Колосс Вечной Зимы', title: 'Страж Трона Зимы', boss: true, hp: 2900, dmg: 22, armor: 22, speed: 3.4, element: 'frost',
    attack: M(4.0, 0.9, 2.2), aggro: 32, xp: 26, loot: 'construct', res: { frost: 70, fire: -30 },
    abilities: ['slam', 'nova:frost', 'rain:shard', 'charge'],
    model: { body: 'humanoid', skin: 0x9fd4f0, cloth: 0x6aa6d0, cloth2: 0x4a7fa8, weapon: 'none', bulky: true, glowEyes: 0xffffff, scale: 3.4, crystal: 0xe0f6ff, horns: true },
    drops: [{ item: 'shard_frost', chance: 1 }],
  },
  squall: {
    name: 'Вихреглав', title: 'Владыка Шпиля Бурь', boss: true, hp: 3200, dmg: 24, armor: 12, speed: 6.0, element: 'storm',
    attack: R(26, 0.6, 1.6, { speed: 44, color: 0xfff27a, size: 0.5, kind: 'bolt', status: 'shock' }), aggro: 32, xp: 30, loot: 'spirit', flying: 3,
    abilities: ['rain:lightning', 'nova:storm', 'summon:storm_elemental', 'blink'], res: { storm: 70 },
    model: { body: 'floater', main: 0x6a7ab8, glow: 0xfff27a, scale: 3.0, shards: true, wings: true },
    drops: [{ item: 'shard_storm', chance: 1 }],
  },
  ignar: {
    name: 'Игнар', title: 'Сердце Горна', boss: true, hp: 3900, dmg: 27, armor: 16, speed: 4.0, element: 'fire',
    attack: R(26, 0.7, 1.8, { speed: 30, color: 0xff6a2a, size: 0.7, kind: 'fireball', status: 'burn', splash: 3.5 }), aggro: 34, xp: 34, loot: 'spirit', flying: 2,
    abilities: ['rain:meteor', 'nova:fire', 'summon:fire_elemental'], res: { fire: 80, frost: -30 },
    model: { body: 'floater', main: 0xff5a1a, glow: 0xffd06a, scale: 3.6, flame: true, crown: 0x2a1a14 },
    drops: [{ item: 'shard_fire', chance: 1 }],
  },
  morven: {
    name: 'Морвен', title: 'Пепельный Архонт', boss: true, final: true, hp: 6200, dmg: 30, armor: 18, speed: 5.0, element: 'shadow',
    attack: R(28, 0.55, 1.5, { speed: 34, color: 0xb071ff, size: 0.5, kind: 'orb', status: 'weaken' }), aggro: 40, xp: 60, loot: 'humanoid',
    abilities: ['rain:meteor', 'nova:shadow', 'summon:void_shade', 'blink', 'pull'], res: { shadow: 50, fire: 30 },
    model: { body: 'humanoid', skin: 0x5a4a5e, cloth: 0x1a1420, cloth2: 0x6a3fa0, weapon: 'staff', hood: true, glowEyes: 0xffb36a, scale: 2.0, staffGlow: 0xffb36a, crown: 0xffb36a },
    drops: [{ item: 'ashen_crown', chance: 1 }],
  },
};

// Префиксы элитных врагов: бонусы + особые эффекты.
export const ELITE_MODS = [
  { id: 'fierce',   name: 'Свирепый',   hp: 1.6, dmg: 1.45, speed: 1.1 },
  { id: 'armored',  name: 'Бронированный', hp: 2.0, dmg: 1.1, armor: 2.5 },
  { id: 'vampiric', name: 'Вампирский', hp: 1.7, dmg: 1.25, leech: 0.35 },
  { id: 'burning',  name: 'Пылающий',   hp: 1.6, dmg: 1.3, aura: 'burn' },
  { id: 'frozen',   name: 'Леденящий',  hp: 1.7, dmg: 1.25, aura: 'chill' },
  { id: 'swift',    name: 'Стремительный', hp: 1.4, dmg: 1.2, speed: 1.4 },
];
