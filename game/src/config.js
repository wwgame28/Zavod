/*
 * Эйрамор: Пепел Звёзд — балансные и технические константы.
 * Арт-направление: стилизованный low-poly, плоское затенение, атмосферный туман,
 * светящийся эфир. Настроение: меланхоличная мистика. Ключевые слова: эфир, пепел, свет.
 * Все «магические числа» игры живут здесь.
 */
export const CONFIG = {
  SEED: 20261022,
  WORLD_HALF: 820,          // мир от -820 до 820 по X и Z
  TERRAIN_SEGS: 328,        // ~5 м на ячейку
  WATER_LEVEL: 0,
  DEEP_WATER: -2.2,         // глубже — плывём
  OCEAN_LIMIT: -7,          // глубже — дальше не пускаем

  TIME: {
    dayLength: 960,         // секунд реального времени на сутки
    start: 0.34,            // 0 — полночь, 0.5 — полдень
  },

  PLAYER: {
    walk: 6.2,
    run: 10.5,
    swim: 3.4,
    accel: 14,
    jump: 9.5,
    gravity: 28,
    radius: 0.45,
    height: 1.8,
    dodgeDist: 7.5,
    dodgeTime: 0.42,
    dodgeCost: 25,
    iframes: 0.38,
    sprintCost: 11,
    staminaRegen: 24,
    staminaDelay: 0.8,
    basicCd: 0.5,
    interactRange: 3.6,
    combatTimeout: 6,
    potionCd: 10,
  },

  CAMERA: {
    dist: 7.5, minDist: 2.8, maxDist: 16,
    height: 1.55, shoulder: 0.75,
    fov: 62, near: 0.1, far: 900,
    sens: 0.0023, minPitch: -1.05, maxPitch: 1.25,
    follow: 14,
  },

  COMBAT: {
    critBase: 5,
    critDmgBase: 150,
    critCap: 60,
    armorK: 110,            // урон * K/(K+броня)
    resCap: 75,
    cdrCap: 40,
    enemyHpPerLevel: 0.30,
    enemyDmgPerLevel: 0.17,
    enemyArmorPerLevel: 2.2,
    playerSkillPerLevel: 0.075,
    leashDist: 55,
    eliteChance: 0.08,
  },

  PROGRESSION: {
    maxLevel: 30,
    attrPerLevel: 3,
    skillPerLevel: 1,
    startAttr: 5,
    xpCurve: (lvl) => Math.round(60 * Math.pow(lvl, 1.45) + 40),
    enemyXp: (lvl) => Math.round(8 * Math.pow(lvl, 1.15) + 6),
    masteryXp: (lvl) => Math.round(20 + lvl * lvl * 8),
    masteryMax: 10,
    masteryBonus: 0.03,     // +3% урона школы за уровень мастерства
    deathGoldLoss: 0.1,
  },

  LOOT: {
    itemChance: 0.32,
    eliteItems: 2,
    bossItems: 3,
    rarityWeights: [55, 28, 12, 4.5, 0.6],
    pickupRange: 2.6,
    goldMagnet: 4,
  },

  SPAWN: {
    activate: 150,
    despawn: 230,
    respawn: 110,
    bossActivate: 70,
  },

  RENDER: {
    viewDist: 560,
    propViewDist: 380,
    fogNear: 80,
    fogFar: 520,
    shadowRange: 70,
    chunk: 160,
  },
};

export const ELEMENTS = {
  physical: { name: 'Физический', color: '#e8e2d0' },
  arcane:   { name: 'Тайный',     color: '#c7a6ff' },
  fire:     { name: 'Пламя',      color: '#ff7a3d' },
  frost:    { name: 'Иней',       color: '#8fd8ff' },
  storm:    { name: 'Буря',       color: '#ffe066' },
  nature:   { name: 'Природа',    color: '#7ee081' },
  shadow:   { name: 'Тень',       color: '#b071ff' },
};

export const SCHOOLS = {
  fire:   { name: 'Пламя', element: 'fire',   color: '#ff7a3d', glyph: '🜂', desc: 'Страсть и разрушение. Урон по площади и горение.' },
  frost:  { name: 'Иней',  element: 'frost',  color: '#8fd8ff', glyph: '🜄', desc: 'Покой и память. Замедление, заморозка, защита.' },
  storm:  { name: 'Буря',  element: 'storm',  color: '#ffe066', glyph: '🜁', desc: 'Воля и перемена. Скорость, цепные удары, криты.' },
  life:   { name: 'Жизнь', element: 'nature', color: '#7ee081', glyph: '🜃', desc: 'Рост и связь. Исцеление, корни, призыв духа.' },
  shadow: { name: 'Тень',  element: 'shadow', color: '#b071ff', glyph: '☾', desc: 'Голод и тайна. Проклятия, похищение жизни, Пустота.' },
};

export const RARITY = [
  { id: 'common',    name: 'Обычный',    color: '#d6d2c4', affixes: 0, mult: 1.0 },
  { id: 'uncommon',  name: 'Необычный',  color: '#6fdc7a', affixes: 1, mult: 1.1 },
  { id: 'rare',      name: 'Редкий',     color: '#5aa9ff', affixes: 2, mult: 1.22 },
  { id: 'epic',      name: 'Эпический',  color: '#c178ff', affixes: 3, mult: 1.36 },
  { id: 'legendary', name: 'Легендарный',color: '#ffb347', affixes: 4, mult: 1.55 },
];
