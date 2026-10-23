// Жители Эйрамора. roles: shop — торговля, craft — алхимия, smith — улучшение экипировки.
export const NPCS = {
  irma: {
    name: 'Ирма', title: 'Старейшина Вересковья', x: -19, z: 272, yaw: 2.6, region: 'vale',
    model: { skin: 0xe0b896, cloth: 0x7a4a5a, cloth2: 0x4a3a3a, hair: 0xd8d8d8, robe: true, scale: 0.94 },
  },
  elian: {
    name: 'Элиан', title: 'Магистр, последний чародей долины', x: 32, z: 298, yaw: -2.4, region: 'vale',
    model: { skin: 0xe8c8a8, cloth: 0x3a4a8a, cloth2: 0xd8c070, hair: 0xf0f0f0, beard: true, robe: true, weapon: 'staff', staffGlow: 0x9fd8ff, scale: 1.04, hat: true },
  },
  mila: {
    name: 'Мила', title: 'Торговка', x: 8, z: 265, yaw: Math.PI, region: 'vale', roles: ['shop'],
    model: { skin: 0xf0c8a0, cloth: 0xc24a3a, cloth2: 0xf0e0b0, hair: 0x8a4a2a, robe: true, scale: 0.92 },
  },
  ogden: {
    name: 'Огден', title: 'Кузнец', x: -24, z: 292, yaw: 2.2, region: 'vale', roles: ['smith', 'shop'],
    model: { skin: 0xc8946a, cloth: 0x4a3a2a, cloth2: 0x2a2a2a, hair: 0x2a1a10, beard: true, bulky: true, weapon: 'hammer', scale: 1.08 },
  },
  lada: {
    name: 'Лада', title: 'Травница', x: 22, z: 260, yaw: -2.8, region: 'vale', roles: ['craft', 'shop'],
    model: { skin: 0xf0d0b0, cloth: 0x5f8a3a, cloth2: 0xe8d8a8, hair: 0xd8a040, robe: true, scale: 0.92 },
  },
  bram: {
    name: 'Брам', title: 'Стражник', x: 6, z: 236, yaw: 0, region: 'vale',
    model: { skin: 0xd8a878, cloth: 0x6a6a72, cloth2: 0x8a2a2a, hair: 0x5a3a20, weapon: 'spear', helmet: true, scale: 1.02 },
  },
  veila: {
    name: 'Вейла', title: 'Друидка Зелёного Круга', x: -402, z: 246, yaw: 0.8, region: 'forest',
    model: { skin: 0xd8b890, cloth: 0x3f6b35, cloth2: 0x8a6a3a, hair: 0x2a4a2a, robe: true, horns: true, weapon: 'staff', staffGlow: 0x9be06a, scale: 1.0 },
  },
  bork: {
    name: 'Борк', title: 'Отшельник, бывший алхимик Совета', x: -436, z: -104, yaw: 2.0, region: 'swamp',
    model: { skin: 0xc8b090, cloth: 0x5a4a3a, cloth2: 0x3a4a2a, hair: 0x9a9a8a, beard: true, robe: true, scale: 0.9 },
  },
  ragna: {
    name: 'Рагна', title: 'Вожак северных охотников', x: -242, z: -418, yaw: 0.6, region: 'frost',
    model: { skin: 0xf0d8c0, cloth: 0x8a6a4a, cloth2: 0xe8e8e8, hair: 0xe8c060, weapon: 'spear', fur: true, scale: 1.04 },
  },
  korvin: {
    name: 'Корвин', title: 'Смотритель маяка', x: 548, z: 100, yaw: -2.0, region: 'storm',
    model: { skin: 0xd8b898, cloth: 0x2a3a5a, cloth2: 0xe8d070, hair: 0xb8b8c8, beard: true, hat: true, scale: 0.98 },
  },
  durn: {
    name: 'Дурн', title: 'Кузнец-изгнанник из Детей Горна', x: 304, z: -324, yaw: 2.6, region: 'ash', roles: ['smith', 'shop'],
    model: { skin: 0xb88660, cloth: 0x3a2a24, cloth2: 0xff7a3d, hair: 0xd85a2a, beard: true, bulky: true, weapon: 'hammer', scale: 0.88 },
  },
  serena: {
    name: 'Серена', title: 'Призрак Круга Астры', x: 26, z: -398, yaw: Math.PI, region: 'astral', ghost: true,
    model: { skin: 0xcfe8ff, cloth: 0x9fc8ff, cloth2: 0xffffff, hair: 0xe8f4ff, robe: true, hat: false, scale: 1.02, ghost: true },
  },
};
