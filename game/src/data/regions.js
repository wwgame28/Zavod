// Семь регионов острова Эйрамор. Координаты: X — восток, Z — юг (−Z = север).
export const REGIONS = [
  {
    id: 'vale', name: 'Вересковая Долина', center: [0, 250], levels: [1, 5],
    desc: 'Тихие холмы, вересковые пустоши и деревня Вересковье. Здесь ночью упала звезда.',
    fog: 0xbfd6e6, tint: 0xffffff, ambient: 'pollen',
    ground: [0x7fa650, 0x95b25c], high: 0x8f8a6f, beach: 0xd9c690,
  },
  {
    id: 'forest', name: 'Шепчущий Лес', center: [-420, 210], levels: [4, 9],
    desc: 'Древний лес друидов. Деревья помнят Раскол и шепчутся о нём во сне.',
    fog: 0x8fb39a, tint: 0xe8ffe8, ambient: 'fireflies',
    ground: [0x3f6b35, 0x4e7d3c], high: 0x5c6b4a, beach: 0x8a8a5a,
  },
  {
    id: 'swamp', name: 'Гнилые Топи', center: [-470, -150], levels: [8, 13],
    desc: 'Болота, где Скверна гниёт под водой. Утопленники не знают покоя.',
    fog: 0x7d8a63, tint: 0xd8f0c0, ambient: 'spores',
    ground: [0x55643a, 0x4a4532], high: 0x5a5a40, beach: 0x4f4a36,
  },
  {
    id: 'frost', name: 'Морозный Хребет', center: [-280, -470], levels: [12, 17],
    desc: 'Вечные снега и ледяные пики. Здесь зима не кончилась с самого Раскола.',
    fog: 0xdfe8f2, tint: 0xeef6ff, ambient: 'snow',
    ground: [0xe8eef5, 0xd5e0ec], high: 0x8a96a3, beach: 0xc6d2dd,
  },
  {
    id: 'storm', name: 'Грозовые Утёсы', center: [500, 60], levels: [15, 20],
    desc: 'Восточные скалы, где не стихает гроза. Маяк Корвина — последний огонь побережья.',
    fog: 0x8c96a4, tint: 0xdde6ff, ambient: 'rain',
    ground: [0x6f8a6a, 0x5e7562], high: 0x777b80, beach: 0x9a9888,
  },
  {
    id: 'ash', name: 'Пепельные Пики', center: [360, -380], levels: [18, 23],
    desc: 'Вулкан Горн и чёрные склоны. Пепел падает здесь вместо снега.',
    fog: 0x8a6f62, tint: 0xffe0cc, ambient: 'embers',
    ground: [0x4e443e, 0x5e524a], high: 0x332b29, beach: 0x463d38,
  },
  {
    id: 'astral', name: 'Руины Астралиса', center: [20, -560], levels: [22, 27],
    desc: 'Город магов под Эфирным Куполом. В его сердце спит то, что осталось от Астры.',
    fog: 0x9d93c2, tint: 0xece0ff, ambient: 'motes',
    ground: [0x7a6c9a, 0x8b7fae], high: 0xb9b3c9, beach: 0x9a92b0,
  },
];

export const REGION_BY_ID = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

// Эфирный Купол над Астралисом
export const DOME = { x: 20, z: -560, r: 150 };
// Вулкан Горн
export const VOLCANO = { x: 400, z: -470, r: 175, h: 105, crater: 42, lava: 20 };
