// Прогон всего сюжета через настоящие системы (диалоги, взаимодействие, квесты, боссы).
import { chromium } from 'playwright-core';
const URL = process.argv[2] || 'http://localhost:5173/';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`${e.message}\n${e.stack}`));
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });
await page.goto(URL, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => window.__game?.state === 'title', null, { timeout: 120000 });
await page.evaluate(() => {
  const G = window.__G, game = window.__game;
  game.newGame({ name: 'Тест', origin: 'ember', robe: 0x3a4a8a, diff: 'normal' });
});
for (let i = 0; i < 10; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(100); }
await page.waitForFunction(() => window.__game.state === 'play');
await page.evaluate(() => {
  const G = window.__G;
  window.T = {
    tp(x, z) { G.player.pos.set(x, G.terrain.heightAt(x, z), z); G.player.vel.set(0, 0, 0); },
    talk(npc, pick = 0, steps = 12) {
      G.dialogue.open(npc);
      const log = [];
      for (let i = 0; i < steps && G.dialogue.active; i++) {
        G.ui._finishTyping?.();
        const btns = G.ui.dialogueEl?.querySelectorAll('.opt');
        if (!btns?.length) break;
        log.push(btns[Math.min(pick, btns.length - 1)].textContent);
        btns[Math.min(pick, btns.length - 1)].click();
      }
      if (G.dialogue.active) G.dialogue.close();
      G.ui.closeModal(true);
      return log;
    },
    st(q) { const s = G.quests.get(q); return s ? `${s.state}:${s.obj}` : 'none'; },
    interactAt(id) {
      const o = G.world.interactables.find((x) => x.id === id);
      this.tp(o.x + 1, o.z + 1);
      G.game.interact();
      G.ui.closeModal(true);
    },
  };
});
const ev = (fn, a) => page.evaluate(fn, a);
const wait = (ms) => page.waitForTimeout(ms);
const check = async (label, q, want) => {
  const s = await ev((q) => window.T.st(q), q);
  const ok = want instanceof RegExp ? want.test(s) : s === want;
  const dbg = await ev(() => `t=${window.__G.time.toFixed(1)} fps=${window.__game.fps.toFixed(0)} modal=${window.__G.ui.modal?.name || '-'} blk=${window.__G.ui.blocking}`);
  console.log(`${ok ? '✓' : '✗'} ${label}: ${q} = ${s}${ok ? '' : ` (ожидалось ${want})`}   [${dbg}]`);
  if (!ok) errors.push(`${label}: ${q}=${s}`);
};
async function killBoss(id, x, z) {
  await ev(([x, z]) => window.T.tp(x + 25, z + 25), [x, z]);
  let r = 'нет босса';
  for (let i = 0; i < 12 && r !== 'убит'; i++) {
    await wait(500);
    r = await ev((id) => {
      const G = window.__G;
      const e = G.enemies.list.find((b) => b.bossId === id && b.alive);
      if (!e) return 'нет босса';
      e.die(G.player); return 'убит';
    }, id);
  }
  await wait(600);
  return r;
}
// ждём выполнения цели «дойти до точки» (игровое время в SwiftShader идёт медленнее реального)
async function waitState(q, want, ms = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if ((await ev((q) => window.T.st(q), q)) === want) return; await wait(250); }
}

// АКТ I
console.log('— Акт I —');
await ev(() => window.T.tp(-17, 275));
console.log('  Ирма:', (await ev(() => window.T.talk('irma'))).join(' | '));
await check('после разговора', 'mq1', 'active:1');
await ev(() => window.T.tp(78, 350)); await waitState('mq1', 'active:2');
await check('у кратера', 'mq1', 'active:2');
await ev(() => { for (let i = 0; i < 4; i++) window.__G.quests.onKill('slime'); });
await check('слизни', 'mq1', 'ready:3');
await ev(() => window.T.tp(-17, 275));
await ev(() => window.T.talk('irma'));
await check('сдача', 'mq1', 'done:3');
await check('наставник выдан', 'mq2', 'active:0');
await ev(() => window.T.tp(30, 294));
console.log('  Элиан:', (await ev(() => window.T.talk('elian'))).join(' | '));
await check('после Элиана', 'mq2', 'active:1');
await ev(() => { for (let i = 0; i < 5; i++) window.__G.quests.onKill('wolf'); });
await ev(() => window.T.talk('elian'));
await check('mq2 сдан', 'mq2', 'done:2');
await check('Волчья Балка', 'mq3', 'active:0');
await ev(() => window.T.tp(-130, 112)); await waitState('mq3', 'active:1');
await check('лагерь найден', 'mq3', 'active:1');
console.log('  Гарм:', await killBoss('garm', -142, 100));
await check('Гарм повержен', 'mq3', 'ready:3');
await ev(() => window.T.tp(30, 294));
console.log('  Элиан:', (await ev(() => window.T.talk('elian'))).join(' | '));
await check('mq3 сдан', 'mq3', 'done:3');
await check('Пять Осколков', 'mq4', 'active:0');
await ev(() => window.T.interactAt('ws_cross'));
await check('камень Перекрёстка', 'mq4', 'active:1');
// побочные в деревне
await ev(() => { window.T.tp(6, 238); window.T.talk('bram'); });
await check('Брам выдал', 'sq_wolves', 'active:0');
await ev(() => { window.T.tp(22, 262); window.T.talk('lada'); window.__G.player.inventory.addStack('sunpetal', 5); window.T.talk('lada'); });
await check('травы Лады', 'sq_herbs', 'done:1');

// АКТ II
console.log('— Акт II —');
const region = async (q, npc, npcPos, kind, objs, boss, extra) => {
  await ev(([x, z]) => window.T.tp(x, z), npcPos);
  await wait(300);
  console.log(`  ${npc}:`, (await ev((n) => window.T.talk(n), npc)).slice(0, 3).join(' | '));
  await check(`${npc} — задание`, q, 'active:1');
  if (kind === 'collect') await ev(() => window.__G.player.inventory.addStack('obsidian', 4));
  else for (const id of objs) await ev((id) => window.T.interactAt(id), id);
  if (extra) await extra();
  console.log(`  босс ${boss[0]}:`, await killBoss(...boss));
  await check(`${boss[0]} повержен`, q, /ready/);
  await ev(([x, z]) => window.T.tp(x, z), npcPos);
  await ev((n) => window.T.talk(n), npc);
  await check(`${q} сдан`, q, /done/);
};
await region('mq5_life', 'veila', [-402, 248], 'interact', ['tear_1', 'tear_2', 'tear_3'], ['old_root', -575, 182]);
await region('mq5_shadow', 'bork', [-436, -102], 'interact', ['totem_1', 'totem_2', 'totem_3'], ['rot_mother', -590, -238]);
await region('mq5_frost', 'ragna', [-242, -416], 'interact', ['hunter_1', 'hunter_2', 'hunter_3'], ['colossus', -330, -604]);
await region('mq5_storm', 'korvin', [548, 102], 'interact', ['rod_1', 'rod_2', 'rod_3'], ['squall', 610, -108]);
await region('mq5_fire', 'durn', [304, -322], 'collect', [], ['ignar', 400, -440], async () => {
  await check('обсидиан собран', 'mq5_fire', 'active:2');
  await ev(() => window.T.tp(304, -322));
  console.log('  Дурн (оберег):', (await ev(() => window.T.talk('durn'))).join(' | '));
  await check('оберег', 'mq5_fire', 'active:3');
});
const shards = await ev(() => window.__G.player.shards.join(','));
console.log('  Осколки:', shards);
await check('все осколки', 'mq4', 'ready:2');
await ev(() => window.T.tp(30, 294));
console.log('  Элиан:', (await ev(() => window.T.talk('elian'))).join(' | '));
await check('mq4 сдан', 'mq4', 'done:2');

// АКТ III
console.log('— Акт III —');
await check('Купол', 'mq6', 'active:0');
await ev(() => window.T.tp(30, -390)); await waitState('mq6', 'active:1');
await check('у Врат', 'mq6', 'active:1');
await ev(() => window.T.tp(26, -394));
console.log('  Серена:', (await ev(() => window.T.talk('serena'))).join(' | '));
const dome = await ev(() => window.__G.world.domeOpen);
console.log('  Купол открыт:', dome);
await ev(() => window.T.tp(20, -508)); await waitState('mq6', 'done:3');
console.log('  отладка:', JSON.stringify(await ev(() => ({ st: window.__game.state, modal: window.__G.ui.modal?.name, dlg: !!window.__G.ui.dialogueEl, trav: window.__game.traveling, pos: [Math.round(window.__G.player.pos.x), Math.round(window.__G.player.pos.z)], t: window.__G.time.toFixed(1) }))));
await check('mq6 завершён', 'mq6', 'done:3');
await check('Пепел Звёзд', 'mq7', 'active:0');
await ev(() => window.T.tp(20, -630)); await waitState('mq7', 'active:1');
await check('в Святилище', 'mq7', 'active:1');
console.log('  Морвен:', await killBoss('morven', 20, -640));
await check('Морвен повержен', 'mq7', 'active:2');
await ev(() => window.T.tp(20, -660));
console.log('  Сердце:', (await ev(() => window.T.talk('heart', 0))).join(' | '));
await check('финал', 'mq7', 'done:3');
await wait(2000);
const end = await ev(() => ({ ending: window.__game.endingDone, level: window.__G.player.level, modal: window.__G.ui.modal?.name }));
console.log('  Итог:', JSON.stringify(end));
await page.screenshot({ path: 'tools/out/16-ending.png' });
await browser.close();
if (errors.length) { console.log('\nОШИБКИ:\n' + errors.join('\n---\n')); process.exit(1); }
console.log('\nСюжет пройден целиком.');
