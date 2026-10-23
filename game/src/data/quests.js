// Квесты. Цели выполняются по порядку. Типы целей:
//   talk {target: npc}            — закрывается действием в диалоге (g.advance)
//   reach {x, z, r}               — дойти до точки
//   kill {target: тип врага, count}
//   boss {target: id босса}
//   collect {target: предмет, count, consume?} — считается по инвентарю
//   interact {target: вид объекта, count}       — квестовые объекты (data/locations.js)
//   waystone {target: id | count}  shards {count}  tablets {count}
// turnIn — NPC, которому сдавать; если null, квест закрывается сам.

export const QUESTS = {
  // ======================= АКТ I. ПРОБУЖДЕНИЕ =======================
  mq1: {
    kind: 'main', act: 1, name: 'Звездопад', giver: 'irma', level: 1,
    summary: 'Ночью над Вересковьем упала звезда, а вы очнулись с сияющим осколком в груди. Старейшина Ирма хочет поговорить.',
    objectives: [
      { type: 'talk', target: 'irma', text: 'Поговорить со старейшиной Ирмой' },
      { type: 'reach', x: 78, z: 352, r: 20, text: 'Осмотреть Старый Кратер к юго-востоку от деревни' },
      { type: 'kill', target: 'slime', count: 4, text: 'Уничтожить эфирных слизней у кратера' },
    ],
    turnIn: 'irma',
    rewards: { xp: 120, gold: 25, items: [{ id: 'potion_hp', n: 3 }] },
    next: ['mq2'],
  },
  mq2: {
    kind: 'main', act: 1, name: 'Наставник', giver: 'elian', level: 2,
    summary: 'Ирма отправила вас к магистру Элиану — последнему чародею долины. Он знает, что за свет горит у вас в груди.',
    objectives: [
      { type: 'talk', target: 'elian', text: 'Поговорить с магистром Элианом в его башне' },
      { type: 'kill', target: 'wolf', count: 5, text: 'Испытание: одолеть луговых волков магией' },
    ],
    turnIn: 'elian',
    rewards: { xp: 260, gold: 40, gen: [{ slot: 'weapon', rarity: 1 }], skillPoints: 1 },
    next: ['mq3'],
  },
  mq3: {
    kind: 'main', act: 1, name: 'Волчья Балка', giver: 'elian', level: 4,
    summary: 'Разбойники Гарма Одноглазого унесли звёздный фрагмент из кратера. Кто-то заплатил им за это.',
    objectives: [
      { type: 'reach', x: -130, z: 112, r: 28, text: 'Найти лагерь разбойников в Волчьей Балке (к северо-западу)' },
      { type: 'boss', target: 'garm', text: 'Победить Гарма Одноглазого' },
      { type: 'collect', target: 'star_fragment', count: 1, text: 'Забрать звёздный фрагмент' },
    ],
    turnIn: 'elian',
    rewards: { xp: 450, gold: 90, gen: [{ slot: 'chest', rarity: 2 }] },
    next: ['mq4'],
  },

  // ======================= АКТ II. ВЕЛИКИЕ ОСКОЛКИ =======================
  mq4: {
    kind: 'main', act: 2, name: 'Пять Осколков', giver: 'elian', level: 5,
    summary: 'Пять Великих Осколков Астры держат печати Эфирного Купола над Астралисом. Пепельный Орден ищет их. Вы должны успеть первым.',
    objectives: [
      { type: 'waystone', target: 'ws_cross', text: 'Пробудить путевой камень на Перекрёстке Трёх Дорог (север)' },
      { type: 'shards', count: 5, text: 'Собрать Великие Осколки' },
    ],
    turnIn: 'elian',
    rewards: { xp: 2500, gold: 300 },
    start: ['mq5_life', 'mq5_shadow', 'mq5_frost', 'mq5_storm', 'mq5_fire'],
    next: ['mq6'],
  },
  mq5_life: {
    kind: 'main', act: 2, name: 'Шёпот Леса', giver: 'veila', level: 6, region: 'forest',
    summary: 'Шепчущий Лес болен: Старый Корень, древний хранитель, впитал Осколок Жизни и обезумел.',
    objectives: [
      { type: 'talk', target: 'veila', text: 'Найти друидку Вейлу у Круга Друидов (запад)' },
      { type: 'interact', target: 'tear', count: 3, text: 'Собрать Слёзы Леса' },
      { type: 'boss', target: 'old_root', text: 'Освободить Старого Корня у Сердце-Древа' },
    ],
    turnIn: 'veila',
    rewards: { xp: 1000, gold: 150, gen: [{ slot: 'amulet', rarity: 2 }] },
  },
  mq5_shadow: {
    kind: 'main', act: 2, name: 'Гниль Топей', giver: 'bork', level: 10, region: 'swamp',
    summary: 'В Гнилых Топях Мать Гнили стережёт Осколок Тени. Отшельник Борк знает, как её ослабить.',
    objectives: [
      { type: 'talk', target: 'bork', text: 'Найти отшельника Борка в Гнилых Топях (северо-запад)' },
      { type: 'interact', target: 'totem', count: 3, text: 'Зажечь болотные тотемы' },
      { type: 'boss', target: 'rot_mother', text: 'Уничтожить Мать Гнили' },
    ],
    turnIn: 'bork',
    rewards: { xp: 1700, gold: 220, gen: [{ slot: 'ring', rarity: 2 }] },
  },
  mq5_frost: {
    kind: 'main', act: 2, name: 'Вечная Зима', giver: 'ragna', level: 13, region: 'frost',
    summary: 'На Морозном Хребте пропадают охотники. Их вожак Рагна уверена: это Колосс Вечной Зимы проснулся.',
    objectives: [
      { type: 'talk', target: 'ragna', text: 'Найти охотницу Рагну в лагере на Морозном Хребте' },
      { type: 'interact', target: 'hunter', count: 3, text: 'Найти пропавших охотников' },
      { type: 'boss', target: 'colossus', text: 'Сразить Колосса Вечной Зимы у Трона Зимы' },
    ],
    turnIn: 'ragna',
    rewards: { xp: 2400, gold: 300, gen: [{ slot: 'head', rarity: 3 }] },
  },
  mq5_storm: {
    kind: 'main', act: 2, name: 'Голос Бури', giver: 'korvin', level: 16, region: 'storm',
    summary: 'Над Грозовыми Утёсами не стихает буря: Вихреглав пьёт силу Осколка Бури. Смотритель Корвин просит помощи.',
    objectives: [
      { type: 'talk', target: 'korvin', text: 'Найти смотрителя Корвина у маяка (восток)' },
      { type: 'interact', target: 'rod', count: 3, text: 'Починить громоотводы' },
      { type: 'boss', target: 'squall', text: 'Низвергнуть Вихреглава со Шпиля Бурь' },
    ],
    turnIn: 'korvin',
    rewards: { xp: 3000, gold: 360, gen: [{ slot: 'hands', rarity: 3 }] },
  },
  mq5_fire: {
    kind: 'main', act: 2, name: 'Сердце Горна', giver: 'durn', level: 19, region: 'ash',
    summary: 'Пепельный Орден разбудил Игнара в жерле вулкана Горн. Кузнец-изгнанник Дурн выкует вам защиту от его огня.',
    objectives: [
      { type: 'talk', target: 'durn', text: 'Найти кузнеца Дурна в Пепельных Пиках (северо-восток)' },
      { type: 'collect', target: 'obsidian', count: 4, consume: true, text: 'Добыть обсидиан на склонах' },
      { type: 'talk', target: 'durn', text: 'Отнести обсидиан Дурну' },
      { type: 'boss', target: 'ignar', text: 'Погасить Игнара в кальдере Горна' },
    ],
    turnIn: 'durn',
    rewards: { xp: 3600, gold: 420, gen: [{ slot: 'chest', rarity: 3 }] },
  },

  // ======================= АКТ III. ПЕПЕЛ ЗВЁЗД =======================
  mq6: {
    kind: 'main', act: 3, name: 'Купол Астралиса', giver: 'elian', level: 21,
    summary: 'Все пять Осколков с вами. Пора идти к Вратам Астралиса — туда, где триста лет назад погасла Астра.',
    objectives: [
      { type: 'reach', x: 30, z: -392, r: 22, text: 'Прийти к Вратам Астралиса (крайний север)' },
      { type: 'talk', target: 'serena', text: 'Поговорить с призраком у Врат' },
      { type: 'reach', x: 20, z: -510, r: 26, text: 'Войти на Площадь Совета под Куполом' },
    ],
    turnIn: null,
    rewards: { xp: 3500 },
    next: ['mq7'],
  },
  mq7: {
    kind: 'main', act: 3, name: 'Пепел Звёзд', giver: 'serena', level: 24,
    summary: 'В Святилище Сердца ждёт Морвен, Пепельный Архонт. Там же решится судьба Астры — и ваша.',
    objectives: [
      { type: 'reach', x: 20, z: -630, r: 30, text: 'Подняться в Святилище Сердца' },
      { type: 'boss', target: 'morven', text: 'Победить Морвена, Пепельного Архонта' },
      { type: 'interact', target: 'heart', count: 1, text: 'Коснуться Сердца Астры' },
    ],
    turnIn: null,
    rewards: { xp: 12000 },
  },

  // ======================= ПОБОЧНЫЕ =======================
  sq_wolves: {
    kind: 'side', name: 'Волчья напасть', giver: 'bram', level: 2,
    summary: 'Стражник Брам жалуется: волки режут овец прямо у ограды.',
    objectives: [{ type: 'kill', target: 'wolf', count: 8, text: 'Перебить луговых волков' }],
    turnIn: 'bram', rewards: { xp: 180, gold: 50, gen: [{ slot: 'feet', rarity: 1 }] },
  },
  sq_herbs: {
    kind: 'side', name: 'Травы для Лады', giver: 'lada', level: 1,
    summary: 'Травнице Ладе нужен солнечник для зелий. Он растёт по всей долине — ищите жёлтые цветы.',
    objectives: [{ type: 'collect', target: 'sunpetal', count: 5, consume: true, text: 'Собрать солнечник' }],
    turnIn: 'lada', rewards: { xp: 130, items: [{ id: 'potion_hp', n: 2 }, { id: 'potion_mp', n: 2 }], flag: 'alchemy' },
  },
  sq_smith: {
    kind: 'side', name: 'Звёздный пепел', giver: 'ogden', level: 2,
    summary: 'Кузнец Огден научит улучшать снаряжение. Для этого нужен звёздный пепел — его дают разобранные вещи.',
    objectives: [{ type: 'collect', target: 'star_ash', count: 8, consume: true, text: 'Разобрать ненужные вещи на звёздный пепел (у Огдена или в сумке)' }],
    turnIn: 'ogden', rewards: { xp: 160, gold: 60, gen: [{ slot: 'hands', rarity: 1 }] },
  },
  sq_cargo: {
    kind: 'side', name: 'Пропавший груз', giver: 'mila', level: 4,
    summary: 'Разбойники ограбили обоз торговки Милы. Ящики, говорят, свалены прямо в их лагере.',
    objectives: [{ type: 'interact', target: 'crate', count: 3, text: 'Вернуть ящики Милы из Волчьей Балки' }],
    turnIn: 'mila', rewards: { xp: 300, gold: 150 },
  },
  sq_amulet: {
    kind: 'side', name: 'Амулет матери', giver: 'irma', level: 6, req: { quest: 'mq2' },
    summary: 'Двадцать лет назад сын Ирмы ушёл в лес учеником друидов и не вернулся. Его хижина всё ещё стоит в Шепчущем Лесу.',
    objectives: [
      { type: 'reach', x: -340, z: 330, r: 16, text: 'Найти заброшенную хижину в Шепчущем Лесу' },
      { type: 'interact', target: 'chest', count: 1, text: 'Обыскать старый сундук' },
    ],
    turnIn: 'irma', rewards: { xp: 600, gold: 80, gen: [{ slot: 'ring', rarity: 2 }] },
  },
  sq_spiders: {
    kind: 'side', name: 'Паучья Лощина', giver: 'veila', level: 6, req: { quest: 'mq5_life', state: 'active+' },
    summary: 'Пауки из Лощины плетут сети, пропитанные Скверной. Лес задыхается.',
    objectives: [{ type: 'kill', target: 'spider', count: 8, text: 'Истребить лесных пауков' }],
    turnIn: 'veila', rewards: { xp: 700, gold: 110, gen: [{ slot: 'hands', rarity: 2 }] },
  },
  sq_wisps: {
    kind: 'side', name: 'Огоньки во тьме', giver: 'bork', level: 10, req: { quest: 'mq5_shadow', state: 'active+' },
    summary: 'Борку нужна эссенция болотных огоньков для «одного очень важного опыта».',
    objectives: [{ type: 'collect', target: 'wisp_essence', count: 5, consume: true, text: 'Собрать эссенцию огоньков' }],
    turnIn: 'bork', rewards: { xp: 1100, gold: 160, items: [{ id: 'elixir_power', n: 2 }] },
  },
  sq_pelts: {
    kind: 'side', name: 'Шкуры для зимы', giver: 'ragna', level: 13, req: { quest: 'mq5_frost', state: 'active+' },
    summary: 'Лагерю не пережить ночей без тёплых шкур.',
    objectives: [{ type: 'collect', target: 'snow_pelt', count: 6, consume: true, text: 'Добыть шкуры снежных волков' }],
    turnIn: 'ragna', rewards: { xp: 1600, gold: 210, gen: [{ slot: 'head', rarity: 2 }] },
  },
  sq_feathers: {
    kind: 'side', name: 'Перья бури', giver: 'korvin', level: 16, req: { quest: 'mq5_storm', state: 'active+' },
    summary: 'Корвин делает из перьев гарпий «ловцы молний». Звучит безумно, но работает.',
    objectives: [{ type: 'collect', target: 'harpy_feather', count: 5, consume: true, text: 'Собрать перья грозовых гарпий' }],
    turnIn: 'korvin', rewards: { xp: 2100, gold: 260, items: [{ id: 'elixir_wind', n: 2 }] },
  },
  sq_heresy: {
    kind: 'side', name: 'Ересь Пепла', giver: 'durn', level: 19, req: { quest: 'mq5_fire', state: 'active+' },
    summary: 'Культисты Пепельного Ордена оскверняют древние кузни Детей Горна.',
    objectives: [{ type: 'kill', target: 'ash_adept', count: 8, text: 'Разогнать адептов Пепельного Ордена' }],
    turnIn: 'durn', rewards: { xp: 2700, gold: 330, gen: [{ slot: 'weapon', rarity: 3 }] },
  },
  sq_tablets: {
    kind: 'side', name: 'Скрижали Раскола', giver: 'elian', level: 5, req: { quest: 'mq2' },
    summary: 'Семь каменных скрижалей хранят правду о Расколе. Элиан хочет, чтобы вы прочли их все.',
    objectives: [{ type: 'tablets', count: 7, text: 'Найти Скрижали Раскола' }],
    turnIn: 'elian', rewards: { xp: 3000, unique: 'u_astramemory' },
  },
  sq_wanderer: {
    kind: 'side', name: 'Все дороги Эйрамора', giver: 'mila', level: 5, req: { quest: 'mq3' },
    summary: 'Мила мечтает о карте всех путевых камней острова — «для торговли, конечно».',
    objectives: [{ type: 'waystone', count: 8, text: 'Пробудить путевые камни острова' }],
    turnIn: 'mila', rewards: { xp: 1800, unique: 'u_wanderer' },
  },
};

export const QUEST_ORDER = Object.keys(QUESTS);
