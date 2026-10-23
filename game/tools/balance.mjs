// Таблицы баланса из настоящих формул игры: node tools/balance.mjs [--md]
import { CONFIG } from '../src/config.js';
import { ENEMIES } from '../src/data/enemies.js';
import { QUESTS } from '../src/data/quests.js';
import { enemyScale } from '../src/systems/stats.js';

const md = process.argv.includes('--md');
const P = CONFIG.PROGRESSION;
const row = (cells) => (md ? `| ${cells.join(' | ')} |` : cells.map((c) => String(c).padStart(9)).join(''));

console.log(md ? '### Опыт по уровням' : '== Опыт по уровням ==');
console.log(row(['Уровень', 'До след.', 'Всего', 'XP врага', 'Убийств']));
if (md) console.log(row(['---', '---', '---', '---', '---']));
let total = 0;
for (let l = 1; l < P.maxLevel; l++) {
  const need = P.xpCurve(l); total += need;
  const ex = P.enemyXp(l);
  if (l <= 5 || l % 5 === 0 || l === P.maxLevel - 1) console.log(row([l, need, total, ex, Math.ceil(need / ex)]));
}
const questXp = Object.values(QUESTS).reduce((a, q) => a + (q.rewards?.xp || 0), 0);
console.log(`\nОпыт за все квесты: ${questXp}; до ${P.maxLevel} ур. всего нужно ${total}.`);

console.log(md ? '\n### Враги по уровням (обычный, без элиты)' : '\n== Враги по уровням ==');
console.log(row(['Враг', 'Ур.', 'HP', 'Урон', 'Броня']));
if (md) console.log(row(['---', '---', '---', '---', '---']));
const sample = [['wolf', 3], ['spriggan', 7], ['drowned', 10], ['ice_golem', 15], ['storm_elemental', 18], ['fire_elemental', 21], ['aether_guardian', 24]];
for (const [t, l] of sample) { const s = enemyScale(ENEMIES[t], l); console.log(row([ENEMIES[t].name, l, s.hp, s.dmg.toFixed(1), s.armor])); }
console.log(md ? '\n### Хранители' : '\n== Хранители ==');
console.log(row(['Босс', 'Ур.', 'HP', 'Урон']));
if (md) console.log(row(['---', '---', '---', '---']));
for (const [t, l] of [['garm', 5], ['old_root', 9], ['rot_mother', 13], ['colossus', 17], ['squall', 20], ['ignar', 23], ['morven', 27]]) {
  const s = enemyScale(ENEMIES[t], l); console.log(row([ENEMIES[t].name, l, s.hp, s.dmg.toFixed(1)]));
}
