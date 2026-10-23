// Точки интереса острова: деревня, путевые камни, лагеря врагов, боссы, скрижали, тайники.
// Координаты (x, z); высота берётся из рельефа.

export const PLAYER_START = { x: 0, z: 292, yaw: Math.PI };

export const WAYSTONES = [
  { id: 'ws_vale',      name: 'Вересковье',            x: 11,   z: 286,  region: 'vale' },
  { id: 'ws_cross',     name: 'Перекрёсток Трёх Дорог', x: 24,   z: 40,   region: 'vale' },
  { id: 'ws_south',     name: 'Рыбачья Пристань',      x: 62,   z: 636,  region: 'vale' },
  { id: 'ws_forest',    name: 'Круг Друидов',          x: -392, z: 254,  region: 'forest' },
  { id: 'ws_swamp',     name: 'Хижина Борка',          x: -428, z: -96,  region: 'swamp' },
  { id: 'ws_frost',     name: 'Лагерь охотников',      x: -238, z: -408, region: 'frost' },
  { id: 'ws_storm',     name: 'Маяк Корвина',          x: 540,  z: 92,   region: 'storm' },
  { id: 'ws_ash',       name: 'Кузня Дурна',           x: 298,  z: -316, region: 'ash' },
  { id: 'ws_gate',      name: 'Врата Астралиса',       x: 34,   z: -388, region: 'astral' },
  { id: 'ws_plaza',     name: 'Площадь Совета',        x: 20,   z: -500, region: 'astral', insideDome: true },
];

// Дороги — ломаные; рельеф вдоль них выравнивается и окрашивается.
export const ROADS = [
  [[0, 300], [4, 230], [12, 150], [20, 40]],
  [[20, 40], [26, -120], [30, -260], [34, -385]],
  [[-10, 282], [-120, 280], [-230, 262], [-330, 250], [-392, 248]],
  [[20, 40], [-90, 10], [-220, -40], [-330, -80], [-425, -105]],
  [[-425, -105], [-400, -200], [-350, -300], [-280, -380], [-240, -410]],
  [[20, 40], [140, 50], [280, 60], [420, 80], [535, 95]],
  [[535, 95], [500, -20], [440, -160], [370, -260], [302, -318]],
  [[302, -318], [200, -350], [100, -380], [34, -388]],
  [[-240, -410], [-150, -400], [-60, -392], [34, -388]],
  [[20, -390], [20, -500], [20, -630]],
  [[0, 300], [20, 420], [40, 540], [62, 630]],
  [[20, 420], [-120, 470], [-260, 440]],
]; 

// Зоны выравнивания рельефа (деревни, лагеря, арены).
export const FLATTEN = [
  { x: 0, z: 282, r: 78 },
  { x: -398, z: 246, r: 34 },
  { x: -436, z: -106, r: 26 },
  { x: -246, z: -414, r: 34 },
  { x: 552, z: 98, r: 34 },
  { x: 306, z: -326, r: 30 },
  { x: 30, z: -392, r: 40 },
  { x: 20, z: -540, r: 120 },
  { x: -135, z: 108, r: 34 },
  { x: -575, z: 182, r: 34 },
  { x: -590, z: -238, r: 30 },
  { x: -330, z: -600, r: 36 },
  { x: 610, z: -108, r: 30 },
  { x: 24, z: 40, r: 22 },
  { x: -390, z: -425, r: 40 },
  { x: 20, z: -648, r: 44 },
  { x: 588, z: 112, r: 18 },
  { x: -78, z: -614, r: 26 },
  { x: 424, z: -302, r: 22 },
  { x: -548, z: -60, r: 22 },
  { x: 70, z: 640, r: 30 },
  { x: 130, z: 560, r: 20 },
  { x: -205, z: 455, r: 24 },
];

// Постройки и декорации (типы см. world/structures.js).
export const STRUCTURES = [
  // --- Вересковье ---
  { type: 'well', x: 0, z: 282 },
  { type: 'house', x: -24, z: 266, rot: 0.25, color: 0xc9b08a, roof: 0x8c3b2e },
  { type: 'tower', x: 36, z: 304, rot: 0 },
  { type: 'stall', x: 8, z: 260, rot: 0, color: 0xc24a3a },
  { type: 'smithy', x: -30, z: 298, rot: -0.4 },
  { type: 'hut', x: 26, z: 254, rot: 0.6, roof: 0x5f7a3a },
  { type: 'tavern', x: -4, z: 322, rot: 0 },
  { type: 'house', x: -44, z: 280, rot: 1.4, color: 0xd2c3a2, roof: 0x6d4a8a },
  { type: 'house', x: -18, z: 246, rot: -0.2, color: 0xbfa680, roof: 0x8c3b2e },
  { type: 'house', x: 44, z: 272, rot: -1.2, color: 0xd8c8a8, roof: 0x3b5c8c },
  { type: 'house', x: 16, z: 334, rot: 3.0, color: 0xc4ad85, roof: 0x7a5530 },
  { type: 'house', x: -40, z: 322, rot: 2.6, color: 0xcbb994, roof: 0x8c3b2e },
  { type: 'windmill', x: -64, z: 250, rot: 0.5 },
  { type: 'fence', x: 56, z: 236, rot: 0, len: 30 },
  { type: 'fence', x: 56, z: 218, rot: 0, len: 30 },
  { type: 'fence', x: 41, z: 227, rot: Math.PI / 2, len: 18 },
  { type: 'fence', x: 71, z: 227, rot: Math.PI / 2, len: 18 },
  { type: 'gate', x: 2, z: 232, rot: 0 },
  { type: 'crater', x: 78, z: 352 },
  // --- Волчья Балка ---
  { type: 'tent', x: -128, z: 116, rot: 0.4, color: 0x7a5a3a },
  { type: 'tent', x: -146, z: 108, rot: 1.6, color: 0x6a4a2a },
  { type: 'tent', x: -120, z: 96, rot: -0.8, color: 0x7a5a3a },
  { type: 'campfire', x: -134, z: 106 },
  { type: 'palisade', x: -135, z: 108, r: 26 },
  // --- Шепчущий Лес ---
  { type: 'stonecircle', x: -398, z: 240, r: 11 },
  { type: 'ruinhut', x: -340, z: 330, rot: 0.8 },
  { type: 'heartwood', x: -585, z: 178 },
  { type: 'webs', x: -520, z: 310 },
  // --- Гнилые Топи ---
  { type: 'stilthut', x: -444, z: -114, rot: 0.3 },
  { type: 'sunkentemple', x: -548, z: -60, rot: 0.2 },
  { type: 'rotlair', x: -596, z: -244 },
  // --- Морозный Хребет ---
  { type: 'tent', x: -252, z: -424, rot: 0.2, color: 0x8a6a4a, snow: true },
  { type: 'tent', x: -262, z: -408, rot: 2.2, color: 0x7a5a3a, snow: true },
  { type: 'campfire', x: -246, z: -416 },
  { type: 'icethrone', x: -334, z: -612 },
  { type: 'frozenlake', x: -390, z: -425, r: 34 },
  // --- Грозовые Утёсы ---
  { type: 'lighthouse', x: 588, z: 112 },
  { type: 'hut', x: 556, z: 108, rot: -0.6, roof: 0x4a5a6a },
  { type: 'stormspire', x: 640, z: -126 },
  { type: 'nests', x: 600, z: -20 },
  // --- Пепельные Пики ---
  { type: 'forge', x: 310, z: -332, rot: 0.6 },
  { type: 'tent', x: 420, z: -296, rot: 0.3, color: 0x3a2a2a },
  { type: 'tent', x: 432, z: -310, rot: 1.9, color: 0x3a2a2a },
  { type: 'obelisk', x: 426, z: -302 },
  // --- Астралис ---
  { type: 'gatearch', x: 22, z: -406, rot: 0 },
  { type: 'ruins', x: -70, z: -412, r: 26 },
  { type: 'ruins', x: 110, z: -422, r: 26 },
  { type: 'plaza', x: 20, z: -520, r: 34 },
  { type: 'observatory', x: -78, z: -614 },
  { type: 'sanctum', x: 20, z: -648 },
  { type: 'ruins', x: 90, z: -590, r: 22 },
  { type: 'ruins', x: -60, z: -510, r: 18 },
  // --- Юг долины ---
  { type: 'hut', x: 76, z: 650, rot: 2.6, roof: 0x4a6a8a },
  { type: 'hut', x: 50, z: 656, rot: -2.4, roof: 0x6a5a3a },
  { type: 'campfire', x: 64, z: 648 },
  { type: 'fence', x: 64, z: 668, rot: 0, len: 24 },
  { type: 'tower_ruin', x: 130, z: 560, rot: 0.3 },
  { type: 'tent', x: -200, z: 448, rot: 0.9, color: 0x6a4a2a },
  { type: 'tent', x: -214, z: 462, rot: 2.4, color: 0x7a5a3a },
  { type: 'campfire', x: -205, z: 455 },
  { type: 'ruins', x: 320, z: 200, r: 16 },
];

// Лагеря врагов. levels — диапазон уровней, types — состав, count — сколько одновременно.
export const CAMPS = [
  // Вересковая Долина
  { id: 'c_crater', x: 80, z: 352, r: 16, levels: [1, 2], types: ['slime'], count: 5 },
  { id: 'c_wolf1', x: 64, z: 196, r: 20, levels: [1, 3], types: ['wolf'], count: 4 },
  { id: 'c_wolf2', x: -74, z: 362, r: 20, levels: [2, 3], types: ['wolf'], count: 4 },
  { id: 'c_wolf3', x: 136, z: 272, r: 22, levels: [2, 4], types: ['wolf', 'wolf', 'slime'], count: 5 },
  { id: 'c_wolf4', x: -110, z: 210, r: 20, levels: [3, 4], types: ['wolf'], count: 4 },
  { id: 'c_bandit', x: -130, z: 112, r: 22, levels: [3, 5], types: ['bandit', 'bandit', 'bandit_archer'], count: 6 },
  { id: 'c_vale_n', x: 60, z: 90, r: 24, levels: [3, 5], types: ['wolf', 'bandit'], count: 4 },
  { id: 'c_south1', x: 10, z: 500, r: 26, levels: [2, 4], types: ['wolf', 'slime'], count: 5 },
  { id: 'c_south2', x: -205, z: 455, r: 22, levels: [4, 6], types: ['bandit', 'bandit_archer'], count: 5 },
  { id: 'c_south3', x: 140, z: 570, r: 22, levels: [3, 5], types: ['slime', 'wolf', 'bandit'], count: 5 },
  { id: 'c_east_plain', x: 300, z: 210, r: 26, levels: [6, 8], types: ['bandit_archer', 'wolf', 'bandit'], count: 5 },
  { id: 'c_forest_far', x: -360, z: 500, r: 24, levels: [5, 7], types: ['shadow_wolf', 'spider'], count: 5 },
  // Шепчущий Лес
  { id: 'c_swolf', x: -320, z: 160, r: 24, levels: [4, 6], types: ['shadow_wolf'], count: 5 },
  { id: 'c_spider', x: -520, z: 308, r: 22, levels: [5, 7], types: ['spider'], count: 6 },
  { id: 'c_spriggan1', x: -472, z: 150, r: 22, levels: [6, 8], types: ['spriggan', 'shadow_wolf'], count: 5 },
  { id: 'c_spriggan2', x: -506, z: 232, r: 22, levels: [7, 9], types: ['spriggan', 'spider'], count: 5 },
  { id: 'c_forest_s', x: -300, z: 330, r: 24, levels: [4, 6], types: ['spider', 'shadow_wolf'], count: 4 },
  // Гнилые Топи
  { id: 'c_drowned', x: -545, z: -62, r: 24, levels: [8, 10], types: ['drowned'], count: 6 },
  { id: 'c_toad', x: -400, z: -200, r: 24, levels: [9, 11], types: ['toad', 'drowned'], count: 5 },
  { id: 'c_wisp', x: -520, z: -210, r: 24, levels: [10, 12], types: ['wisp'], count: 6 },
  { id: 'c_swamp_e', x: -340, z: -130, r: 24, levels: [8, 10], types: ['toad', 'wisp'], count: 4 },
  // Морозный Хребет
  { id: 'c_snowwolf', x: -172, z: -480, r: 26, levels: [12, 14], types: ['snow_wolf'], count: 5 },
  { id: 'c_golem', x: -332, z: -518, r: 24, levels: [14, 16], types: ['ice_golem', 'frost_wraith'], count: 4 },
  { id: 'c_wraith', x: -272, z: -560, r: 24, levels: [15, 17], types: ['frost_wraith', 'snow_wolf'], count: 5 },
  { id: 'c_frost_w', x: -420, z: -360, r: 24, levels: [12, 14], types: ['snow_wolf', 'ice_golem'], count: 4 },
  // Грозовые Утёсы
  { id: 'c_harpy', x: 600, z: -22, r: 24, levels: [15, 17], types: ['harpy'], count: 5 },
  { id: 'c_selem', x: 470, z: -30, r: 24, levels: [16, 18], types: ['storm_elemental', 'harpy'], count: 5 },
  { id: 'c_storm_n', x: 520, z: -150, r: 24, levels: [17, 19], types: ['storm_elemental'], count: 4 },
  { id: 'c_storm_w', x: 420, z: 130, r: 24, levels: [15, 16], types: ['harpy', 'bandit_archer'], count: 4 },
  // Пепельные Пики
  { id: 'c_hound', x: 268, z: -430, r: 24, levels: [18, 20], types: ['magma_hound'], count: 5 },
  { id: 'c_adept', x: 422, z: -302, r: 22, levels: [19, 21], types: ['ash_adept', 'ash_adept', 'magma_hound'], count: 6 },
  { id: 'c_felem', x: 486, z: -420, r: 24, levels: [20, 22], types: ['fire_elemental', 'ash_adept'], count: 5 },
  { id: 'c_ash_s', x: 230, z: -270, r: 24, levels: [18, 19], types: ['ash_adept', 'magma_hound'], count: 4 },
  // Астралис (снаружи и под Куполом)
  { id: 'c_out1', x: -70, z: -412, r: 22, levels: [21, 22], types: ['aether_guardian', 'void_shade'], count: 4 },
  { id: 'c_out2', x: 110, z: -422, r: 22, levels: [21, 23], types: ['aether_guardian', 'void_mage'], count: 4 },
  { id: 'c_in1', x: -56, z: -590, r: 24, levels: [23, 25], types: ['void_mage', 'void_shade'], count: 6, insideDome: true },
  { id: 'c_in2', x: 90, z: -585, r: 22, levels: [24, 25], types: ['aether_guardian', 'void_shade'], count: 5, insideDome: true },
  { id: 'c_in3', x: -40, z: -520, r: 22, levels: [23, 24], types: ['void_shade', 'aether_guardian'], count: 4, insideDome: true },
];

export const BOSSES = [
  { id: 'garm',      type: 'garm',      x: -142, z: 100,  level: 5,  arena: 24 },
  { id: 'old_root',  type: 'old_root',  x: -575, z: 182,  level: 9,  arena: 30, shard: 'life' },
  { id: 'rot_mother',type: 'rot_mother',x: -590, z: -238, level: 13, arena: 28, shard: 'shadow' },
  { id: 'colossus',  type: 'colossus',  x: -330, z: -604, level: 17, arena: 32, shard: 'frost' },
  { id: 'squall',    type: 'squall',    x: 610,  z: -108, level: 20, arena: 30, shard: 'storm' },
  { id: 'ignar',     type: 'ignar',     x: 400,  z: -440, level: 23, arena: 34, shard: 'fire' },
  { id: 'morven',    type: 'morven',    x: 20,   z: -640, level: 27, arena: 38, final: true, insideDome: true },
];

// Скрижали Раскола — коллекционный лор (тексты в data/lore.js).
export const TABLETS = [
  { id: 'tab_1', x: 88, z: 340 },
  { id: 'tab_2', x: -556, z: 196 },
  { id: 'tab_3', x: -534, z: -76 },
  { id: 'tab_4', x: -318, z: -586 },
  { id: 'tab_5', x: 596, z: -88 },
  { id: 'tab_6', x: 352, z: -404 },
  { id: 'tab_7', x: 52, z: -396 },
];

// Квестовые объекты, с которыми взаимодействует игрок.
export const QUEST_OBJECTS = [
  { id: 'crate_1', kind: 'crate', x: -122, z: 124, label: 'Ящик с грузом Милы' },
  { id: 'crate_2', kind: 'crate', x: -150, z: 122, label: 'Ящик с грузом Милы' },
  { id: 'crate_3', kind: 'crate', x: -118, z: 100, label: 'Ящик с грузом Милы' },
  { id: 'tear_1', kind: 'tear', x: -482, z: 166, label: 'Слеза Леса' },
  { id: 'tear_2', kind: 'tear', x: -530, z: 262, label: 'Слеза Леса' },
  { id: 'tear_3', kind: 'tear', x: -452, z: 300, label: 'Слеза Леса' },
  { id: 'amulet_chest', kind: 'chest', x: -338, z: 326, label: 'Старый сундук' },
  { id: 'totem_1', kind: 'totem', x: -500, z: -82, label: 'Потухший тотем' },
  { id: 'totem_2', kind: 'totem', x: -410, z: -236, label: 'Потухший тотем' },
  { id: 'totem_3', kind: 'totem', x: -566, z: -170, label: 'Потухший тотем' },
  { id: 'hunter_1', kind: 'hunter', x: -200, z: -520, label: 'Замёрзший охотник' },
  { id: 'hunter_2', kind: 'hunter', x: -352, z: -468, label: 'Замёрзший охотник' },
  { id: 'hunter_3', kind: 'hunter', x: -296, z: -548, label: 'Замёрзший охотник' },
  { id: 'rod_1', kind: 'rod', x: 452, z: 122, label: 'Сломанный громоотвод' },
  { id: 'rod_2', kind: 'rod', x: 588, z: 30, label: 'Сломанный громоотвод' },
  { id: 'rod_3', kind: 'rod', x: 508, z: -92, label: 'Сломанный громоотвод' },
  { id: 'heart', kind: 'heart', x: 20, z: -668, label: 'Сердце Астры' },
];

export const CHESTS = [
  { id: 'ch_1', x: -60, z: 372, level: 3 },
  { id: 'ch_2', x: -140, z: 92, level: 5 },
  { id: 'ch_3', x: -540, z: 320, level: 8 },
  { id: 'ch_4', x: -600, z: -110, level: 12 },
  { id: 'ch_5', x: -150, z: -540, level: 16 },
  { id: 'ch_6', x: 640, z: 40, level: 18 },
  { id: 'ch_7', x: 470, z: -360, level: 22 },
  { id: 'ch_8', x: -90, z: -630, level: 25, insideDome: true },
  { id: 'ch_9', x: 150, z: 330, level: 4 },
  { id: 'ch_10', x: -460, z: 380, level: 7 },
  { id: 'ch_11', x: 136, z: 556, level: 5 },
  { id: 'ch_12', x: -212, z: 470, level: 6 },
  { id: 'ch_13', x: 326, z: 196, level: 8 },
  { id: 'ch_14', x: 90, z: 700, level: 4 },
];

// Лава наносит урон (жерло вулкана и озёра на склонах).
export const LAVA = [
  { x: 400, z: -470, r: 19 },
];
