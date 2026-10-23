// Предметы: базы экипировки по тирам, аффиксы, расходники, материалы, квестовые и уникальные вещи.

export const SLOTS = {
  weapon: 'Оружие', head: 'Голова', chest: 'Тело', hands: 'Руки', feet: 'Ноги', amulet: 'Амулет', ring: 'Кольцо',
};
export const SLOT_ORDER = ['weapon', 'head', 'chest', 'hands', 'feet', 'amulet', 'ring'];

// Базы по тирам (тир = floor((ур.-1)/5)). g — род для согласования прилагательных: m/f/n/p.
export const BASES = {
  weapon: [
    { kind: 'staff', g: 'm', names: ['Ясеневый посох', 'Посох странника', 'Посох из чернодрева', 'Рунный посох', 'Посох звёздного серебра', 'Астральный посох'], implicit: { weaponDmg: 5, sp: 3 } },
    { kind: 'wand', g: 'm', names: ['Ивовый жезл', 'Жезл ученика', 'Костяной жезл', 'Жезл грозы', 'Жезл лунного стекла', 'Жезл Совета'], implicit: { weaponDmg: 3.5, sp: 2, crit: 2 } },
  ],
  head: [
    { kind: 'hood', g: 'm', names: ['Холщовый капюшон', 'Капюшон путника', 'Капюшон мага', 'Венец рун', 'Венец звездочёта', 'Корона эфира'], implicit: { armor: 3, mp: 8 } },
  ],
  chest: [
    { kind: 'robe', g: 'f', names: ['Льняная роба', 'Мантия странника', 'Мантия чародея', 'Рунная мантия', 'Мантия звездопада', 'Мантия Архимага'], implicit: { armor: 6, hp: 12 } },
  ],
  hands: [
    { kind: 'gloves', g: 'p', names: ['Тканевые перчатки', 'Кожаные перчатки', 'Перчатки чародея', 'Рунные наручи', 'Наручи звёздной стали', 'Длани эфира'], implicit: { armor: 2, crit: 0.8 } },
  ],
  feet: [
    { kind: 'boots', g: 'p', names: ['Лапти', 'Сапоги путника', 'Сапоги следопыта', 'Рунные сапоги', 'Сапоги ветра', 'Поступь звёзд'], implicit: { armor: 2, speed: 1.5 } },
  ],
  amulet: [
    { kind: 'amulet', g: 'm', names: ['Медный амулет', 'Серебряный амулет', 'Амулет с янтарём', 'Рунный талисман', 'Амулет звёздного света', 'Талисман Астры'], implicit: { sp: 3 } },
  ],
  ring: [
    { kind: 'ring', g: 'n', names: ['Медное кольцо', 'Серебряное кольцо', 'Кольцо с аметистом', 'Рунное кольцо', 'Кольцо звездопада', 'Кольцо Совета'], implicit: { spi: 1 } },
  ],
};

// Аффиксы. v — базовое значение на 1-м уровне предмета; pct — проценты.
// prefix — формы прилагательного по роду (m/f/n/p), suffix — родительный падеж.
export const AFFIXES = [
  { id: 'int', stat: 'int', v: 2, label: 'Интеллект', suffix: 'Мудреца' },
  { id: 'str', stat: 'str', v: 2, label: 'Сила', suffix: 'Медведя' },
  { id: 'agi', stat: 'agi', v: 2, label: 'Ловкость', suffix: 'Рыси' },
  { id: 'vit', stat: 'vit', v: 2, label: 'Живучесть', suffix: 'Дуба' },
  { id: 'spi', stat: 'spi', v: 2, label: 'Дух', suffix: 'Звёзд' },
  { id: 'hp', stat: 'hp', v: 14, label: 'Здоровье', prefix: ['Крепкий', 'Крепкая', 'Крепкое', 'Крепкие'] },
  { id: 'mp', stat: 'mp', v: 12, label: 'Мана', prefix: ['Эфирный', 'Эфирная', 'Эфирное', 'Эфирные'] },
  { id: 'sp', stat: 'sp', v: 4, label: 'Сила магии', prefix: ['Чародейский', 'Чародейская', 'Чародейское', 'Чародейские'] },
  { id: 'crit', stat: 'crit', v: 1.4, pct: true, label: 'Шанс крит. удара', prefix: ['Меткий', 'Меткая', 'Меткое', 'Меткие'], noScale: true },
  { id: 'critDmg', stat: 'critDmg', v: 7, pct: true, label: 'Крит. урон', prefix: ['Жестокий', 'Жестокая', 'Жестокое', 'Жестокие'], noScale: true },
  { id: 'armor', stat: 'armor', v: 5, label: 'Броня', prefix: ['Укреплённый', 'Укреплённая', 'Укреплённое', 'Укреплённые'] },
  { id: 'fireDmg', stat: 'dmg_fire', v: 5, pct: true, label: 'Урон Пламени', prefix: ['Пылающий', 'Пылающая', 'Пылающее', 'Пылающие'], noScale: true },
  { id: 'frostDmg', stat: 'dmg_frost', v: 5, pct: true, label: 'Урон Инея', prefix: ['Ледяной', 'Ледяная', 'Ледяное', 'Ледяные'], noScale: true },
  { id: 'stormDmg', stat: 'dmg_storm', v: 5, pct: true, label: 'Урон Бури', prefix: ['Грозовой', 'Грозовая', 'Грозовое', 'Грозовые'], noScale: true },
  { id: 'lifeDmg', stat: 'dmg_life', v: 5, pct: true, label: 'Сила Жизни', prefix: ['Живительный', 'Живительная', 'Живительное', 'Живительные'], noScale: true },
  { id: 'shadowDmg', stat: 'dmg_shadow', v: 5, pct: true, label: 'Урон Тени', prefix: ['Сумрачный', 'Сумрачная', 'Сумрачное', 'Сумрачные'], noScale: true },
  { id: 'resFire', stat: 'res_fire', v: 5, pct: true, label: 'Сопр. Пламени', suffix: 'Огнеупорства', noScale: true },
  { id: 'resFrost', stat: 'res_frost', v: 5, pct: true, label: 'Сопр. Инею', suffix: 'Тепла', noScale: true },
  { id: 'resStorm', stat: 'res_storm', v: 5, pct: true, label: 'Сопр. Буре', suffix: 'Заземления', noScale: true },
  { id: 'resNature', stat: 'res_nature', v: 5, pct: true, label: 'Сопр. Природе', suffix: 'Противоядия', noScale: true },
  { id: 'resShadow', stat: 'res_shadow', v: 5, pct: true, label: 'Сопр. Тени', suffix: 'Света', noScale: true },
  { id: 'mpRegen', stat: 'mpRegen', v: 0.5, label: 'Восст. маны/с', suffix: 'Родника' },
  { id: 'cdr', stat: 'cdr', v: 2.5, pct: true, label: 'Сокр. перезарядки', suffix: 'Времени', noScale: true },
  { id: 'speed', stat: 'speed', v: 3, pct: true, label: 'Скорость бега', suffix: 'Ветра', slots: ['feet'], noScale: true },
  { id: 'leech', stat: 'leech', v: 1.2, pct: true, label: 'Похищение жизни', prefix: ['Вампирский', 'Вампирская', 'Вампирское', 'Вампирские'], noScale: true },
  { id: 'weaponDmg', stat: 'weaponDmg', v: 2.5, label: 'Урон оружия', prefix: ['Острый', 'Острая', 'Острое', 'Острые'], slots: ['weapon'] },
];

// Названия статов для подсказок
export const STAT_LABELS = {
  int: 'Интеллект', str: 'Сила', agi: 'Ловкость', vit: 'Живучесть', spi: 'Дух',
  hp: 'Здоровье', mp: 'Мана', sp: 'Сила магии', crit: 'Шанс крит. удара', critDmg: 'Крит. урон',
  armor: 'Броня', weaponDmg: 'Урон оружия', speed: 'Скорость бега', mpRegen: 'Восст. маны/с', hpRegen: 'Восст. здоровья/с',
  cdr: 'Сокр. перезарядки', leech: 'Похищение жизни',
  dmg_fire: 'Урон Пламени', dmg_frost: 'Урон Инея', dmg_storm: 'Урон Бури', dmg_life: 'Сила Жизни', dmg_shadow: 'Урон Тени',
  res_fire: 'Сопр. Пламени', res_frost: 'Сопр. Инею', res_storm: 'Сопр. Буре', res_nature: 'Сопр. Природе', res_shadow: 'Сопр. Тени',
  res_all: 'Все сопротивления', xpBonus: 'Бонус опыта',
};
export const PCT_STATS = new Set(['crit', 'critDmg', 'speed', 'cdr', 'leech', 'dmg_fire', 'dmg_frost', 'dmg_storm', 'dmg_life', 'dmg_shadow',
  'res_fire', 'res_frost', 'res_storm', 'res_nature', 'res_shadow', 'res_all', 'xpBonus']);

// Расходники, материалы, квестовые предметы. stack — максимум в одной ячейке.
export const ITEMS = {
  potion_hp: { name: 'Зелье здоровья', type: 'consumable', icon: 'potion', color: '#ff5a5a', stack: 20, value: 20, desc: 'Мгновенно восстанавливает 45% здоровья.' },
  potion_mp: { name: 'Зелье маны', type: 'consumable', icon: 'potion', color: '#5aa9ff', stack: 20, value: 20, desc: 'Мгновенно восстанавливает 45% маны.' },
  elixir_power: { name: 'Эликсир мощи', type: 'consumable', icon: 'flask', color: '#ff9a3d', stack: 10, value: 60, desc: '+20% к урону заклинаний на 3 минуты.', buff: { id: 'elixir_power', dur: 180 } },
  elixir_ward: { name: 'Эликсир стойкости', type: 'consumable', icon: 'flask', color: '#8fd8ff', stack: 10, value: 60, desc: '+20% ко всем сопротивлениям и +30 брони на 3 минуты.', buff: { id: 'elixir_ward', dur: 180 } },
  elixir_wind: { name: 'Эликсир ветра', type: 'consumable', icon: 'flask', color: '#ffe066', stack: 10, value: 50, desc: '+15% к скорости бега и восстановлению выносливости на 3 минуты.', buff: { id: 'elixir_wind', dur: 180 } },
  elixir_wisdom: { name: 'Эликсир мудрости', type: 'consumable', icon: 'flask', color: '#c7a6ff', stack: 10, value: 90, desc: '+25% получаемого опыта на 5 минут.', buff: { id: 'elixir_wisdom', dur: 300 } },
  respec_scroll: { name: 'Свиток забвения', type: 'consumable', icon: 'scroll', color: '#e8d9a8', stack: 5, value: 400, desc: 'Сбрасывает характеристики и навыки — очки возвращаются.' },

  sunpetal: { name: 'Солнечник', type: 'material', icon: 'herb', color: '#ffd84a', stack: 50, value: 4, desc: 'Цветок долин. Основа целебных зелий.' },
  moonmoss: { name: 'Лунный мох', type: 'material', icon: 'herb', color: '#9fd0ff', stack: 50, value: 5, desc: 'Светится в темноте. Восстанавливает ману.' },
  swamp_lily: { name: 'Болотная лилия', type: 'material', icon: 'herb', color: '#d0ff9a', stack: 50, value: 7, desc: 'Растёт там, где Скверна слабее.' },
  frostgrass: { name: 'Иней-трава', type: 'material', icon: 'herb', color: '#dff6ff', stack: 50, value: 8, desc: 'Холодная на ощупь даже в огне.' },
  stormbloom: { name: 'Грозоцвет', type: 'material', icon: 'herb', color: '#fff27a', stack: 50, value: 9, desc: 'Цветёт только после удара молнии.' },
  emberbloom: { name: 'Огнецвет', type: 'material', icon: 'herb', color: '#ff7a3d', stack: 50, value: 10, desc: 'Тлеющие лепестки, тёплые как угли.' },
  aether_crystal: { name: 'Эфирный кристалл', type: 'material', icon: 'crystal', color: '#c7a6ff', stack: 50, value: 15, desc: 'Застывший эфир из Жил мира.' },
  aether_dust: { name: 'Эфирная пыль', type: 'material', icon: 'dust', color: '#9ff0ff', stack: 99, value: 2, desc: 'Остаётся от эфирных тварей.' },
  star_ash: { name: 'Звёздный пепел', type: 'material', icon: 'dust', color: '#ffe0a0', stack: 999, value: 3, desc: 'Получается при разборе экипировки. Нужен кузнецу для улучшений.' },
  stardust: { name: 'Звёздная пыль', type: 'material', icon: 'dust', color: '#ffffff', stack: 50, value: 25, desc: 'Пыль самой Астры. Редкая и драгоценная.' },
  obsidian: { name: 'Обсидиан', type: 'material', icon: 'ore', color: '#3a3040', stack: 50, value: 12, desc: 'Вулканическое стекло Пепельных Пиков.' },

  wolf_pelt: { name: 'Волчья шкура', type: 'material', icon: 'pelt', color: '#9a9aa5', stack: 50, value: 5, desc: 'Тёплая шкура лугового волка.' },
  spider_silk: { name: 'Паучий шёлк', type: 'material', icon: 'silk', color: '#e8e8e8', stack: 50, value: 6, desc: 'Прочный, как струна.' },
  wisp_essence: { name: 'Эссенция огонька', type: 'material', icon: 'orb', color: '#c0ff9a', stack: 50, value: 9, desc: 'Пульсирующий сгусток болотного света.' },
  harpy_feather: { name: 'Перо гарпии', type: 'material', icon: 'feather', color: '#b8a6d8', stack: 50, value: 10, desc: 'Потрескивает от статического электричества.' },
  snow_pelt: { name: 'Шкура снежного волка', type: 'material', icon: 'pelt', color: '#f0f4f8', stack: 50, value: 11, desc: 'Белая, как северный снег.' },
  cult_sigil: { name: 'Знак Пепельного Ордена', type: 'material', icon: 'sigil', color: '#ff7a3d', stack: 50, value: 14, desc: 'Опалённый медальон культиста.' },

  star_fragment: { name: 'Звёздный фрагмент', type: 'quest', icon: 'shard', color: '#bfe8ff', stack: 1, value: 0, desc: 'Осколок упавшей звезды. Тёплый и тихо поёт.' },
  order_letter: { name: 'Письмо с пепельной печатью', type: 'quest', icon: 'scroll', color: '#c9a36a', stack: 1, value: 0, desc: '«Осколочник пробудился. Доставить живым. — М.»' },
  forest_tear: { name: 'Слеза Леса', type: 'quest', icon: 'orb', color: '#9be06a', stack: 3, value: 0, desc: 'Капля чистого эфира из корней Шепчущего Леса.' },
  irma_amulet: { name: 'Амулет Ирмы', type: 'quest', icon: 'amulet', color: '#ffd27a', stack: 1, value: 0, desc: 'Потемневший медальон с портретом юноши.' },
  mila_cargo: { name: 'Груз Милы', type: 'quest', icon: 'crate', color: '#c9a36a', stack: 3, value: 0, desc: 'Тюки с тканями и специями.' },
  hunter_token: { name: 'Жетон охотника', type: 'quest', icon: 'sigil', color: '#c9b08a', stack: 3, value: 0, desc: 'Костяной жетон северного охотника.' },

  shard_life: { name: 'Великий Осколок Жизни', type: 'shard', school: 'life', icon: 'shard', color: '#7ee081', stack: 1, value: 0, desc: 'Пульсирует, как живое сердце. Открывает высший круг школы Жизни.' },
  shard_shadow: { name: 'Великий Осколок Тени', type: 'shard', school: 'shadow', icon: 'shard', color: '#b071ff', stack: 1, value: 0, desc: 'Поглощает свет вокруг себя. Открывает высший круг школы Тени.' },
  shard_frost: { name: 'Великий Осколок Инея', type: 'shard', school: 'frost', icon: 'shard', color: '#8fd8ff', stack: 1, value: 0, desc: 'Покрыт вечным инеем. Открывает высший круг школы Инея.' },
  shard_storm: { name: 'Великий Осколок Бури', type: 'shard', school: 'storm', icon: 'shard', color: '#ffe066', stack: 1, value: 0, desc: 'Внутри мечутся молнии. Открывает высший круг школы Бури.' },
  shard_fire: { name: 'Великий Осколок Пламени', type: 'shard', school: 'fire', icon: 'shard', color: '#ff7a3d', stack: 1, value: 0, desc: 'Горит, не сгорая. Открывает высший круг школы Пламени.' },
  ashen_crown: { name: 'Пепельный венец', type: 'quest', icon: 'crown', color: '#ffb36a', stack: 1, value: 0, desc: 'Венец Морвена. Холодный, как пепел.' },
};

// Бонусы Великих Осколков (постоянные).
export const SHARD_BONUS = {
  life:   { hp: 60, hpRegen: 1.5 },
  shadow: { leech: 3, dmg_shadow: 10 },
  frost:  { armor: 25, res_all: 5 },
  storm:  { crit: 5, speed: 5 },
  fire:   { sp: 20, dmg_fire: 10 },
};

// Уникальные легендарные предметы: фиксированное имя и особые статы.
export const UNIQUES = {
  u_ashwhisper: { slot: 'weapon', kind: 'staff', name: 'Пепельный Шёпот', lore: 'Посох, выточенный из ветви, пережившей Раскол.', stats: { weaponDmg: 9, sp: 22, dmg_fire: 15, crit: 4 } },
  u_frostmemory: { slot: 'chest', kind: 'robe', name: 'Память Зимы', lore: 'Мантия, сотканная из инея и тишины.', stats: { armor: 30, hp: 80, res_frost: 25, dmg_frost: 15 } },
  u_rootcrown: { slot: 'head', kind: 'hood', name: 'Венец Старого Корня', lore: 'Корни ещё шевелятся, если прислушаться.', stats: { hp: 90, hpRegen: 2, dmg_life: 18, vit: 8 } },
  u_stormstep: { slot: 'feet', kind: 'boots', name: 'Поступь Вихря', lore: 'Носящий их не касается земли во время бега.', stats: { speed: 14, agi: 10, dmg_storm: 12, crit: 3 } },
  u_voidgrasp: { slot: 'hands', kind: 'gloves', name: 'Хватка Пустоты', lore: 'Из пальцев сочится тьма.', stats: { leech: 5, dmg_shadow: 18, int: 8, critDmg: 20 } },
  u_astramemory: { slot: 'amulet', kind: 'amulet', name: 'Память Астры', lore: 'Внутри — крошечная звезда, что помнит небо.', stats: { sp: 30, mp: 80, spi: 10, cdr: 8, xpBonus: 10 } },
  u_wanderer: { slot: 'feet', kind: 'boots', name: 'Сапоги Странника', lore: 'Они прошли каждую дорогу Эйрамора.', stats: { speed: 18, vit: 6, agi: 6, mpRegen: 2 } },
  u_emberheart: { slot: 'ring', kind: 'ring', name: 'Угольное Сердце', lore: 'Перстень тёплый, как ладонь друга.', stats: { sp: 18, dmg_fire: 20, res_fire: 20, int: 6 } },
  u_rotring: { slot: 'ring', kind: 'ring', name: 'Кольцо Гнили', lore: 'Пахнет болотом. Но силы в нём — с избытком.', stats: { res_nature: 30, leech: 4, dmg_shadow: 12, vit: 6 } },
};

// Какие уникальные предметы могут выпасть с какого босса.
export const BOSS_UNIQUES = {
  garm: [], old_root: ['u_rootcrown'], rot_mother: ['u_rotring', 'u_voidgrasp'], colossus: ['u_frostmemory'],
  squall: ['u_stormstep'], ignar: ['u_ashwhisper', 'u_emberheart'], morven: ['u_voidgrasp', 'u_ashwhisper'],
};

// Рецепты травницы Лады
export const RECIPES = [
  { id: 'r_hp', out: 'potion_hp', n: 2, inputs: { sunpetal: 2 }, gold: 0 },
  { id: 'r_mp', out: 'potion_mp', n: 2, inputs: { moonmoss: 2 }, gold: 0 },
  { id: 'r_power', out: 'elixir_power', n: 1, inputs: { emberbloom: 2, aether_crystal: 1 }, gold: 10 },
  { id: 'r_ward', out: 'elixir_ward', n: 1, inputs: { frostgrass: 2, swamp_lily: 1 }, gold: 10 },
  { id: 'r_wind', out: 'elixir_wind', n: 1, inputs: { stormbloom: 2, harpy_feather: 1 }, gold: 10 },
  { id: 'r_wisdom', out: 'elixir_wisdom', n: 1, inputs: { stardust: 1, aether_crystal: 1, moonmoss: 1 }, gold: 25 },
  { id: 'r_crystal', out: 'aether_crystal', n: 1, inputs: { aether_dust: 6 }, gold: 5 },
];

// Узлы сбора по регионам (ставятся процедурно).
export const GATHER = {
  vale: [{ item: 'sunpetal', n: 90 }, { item: 'aether_crystal', n: 8 }],
  forest: [{ item: 'moonmoss', n: 80 }, { item: 'sunpetal', n: 20 }, { item: 'aether_crystal', n: 10 }],
  swamp: [{ item: 'swamp_lily', n: 70 }, { item: 'moonmoss', n: 20 }, { item: 'aether_crystal', n: 10 }],
  frost: [{ item: 'frostgrass', n: 70 }, { item: 'aether_crystal', n: 12 }],
  storm: [{ item: 'stormbloom', n: 70 }, { item: 'aether_crystal', n: 12 }],
  ash: [{ item: 'emberbloom', n: 60 }, { item: 'obsidian', n: 40 }, { item: 'aether_crystal', n: 12 }],
  astral: [{ item: 'stardust', n: 25 }, { item: 'aether_crystal', n: 25 }],
};
