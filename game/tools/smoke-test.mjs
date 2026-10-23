// Дымовой тест: запускает игру в headless Chromium, проходит создание персонажа,
// бой, диалог, меню и проверяет, что в консоли нет ошибок. Скриншоты — в tools/out/.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const URL = process.argv[2] || 'http://localhost:5173/';
const OUT = 'tools/out';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(`${e.message}\n${e.stack}`));
const step = async (name, fn) => { process.stdout.write(`• ${name}… `); await fn(); console.log(errors.length ? `ошибок: ${errors.length}` : 'ok'); };
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });
const ev = (fn, arg) => page.evaluate(fn, arg);

await step('загрузка', async () => {
  await page.goto(URL, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction(() => window.__game?.state === 'title', null, { timeout: 120000 });
});
await step('создание персонажа', async () => {
  await page.getByText('Новая игра').click();
  await page.waitForTimeout(400);
  await page.locator('.creator input').fill('Тестовый');
  await page.locator('.origin').nth(1).click();
  await shot('01-creator');
  await page.getByText('Начать путь').click();
  for (let i = 0; i < 8; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(150); }
  await page.waitForFunction(() => window.__game.state === 'play', null, { timeout: 20000 });
  await page.waitForTimeout(2500);
  await shot('02-start');
});
await step('движение и заклинания', async () => {
  await page.keyboard.down('KeyW'); await page.waitForTimeout(1200); await page.keyboard.up('KeyW');
  await page.keyboard.press('Digit1'); await page.waitForTimeout(500);
  await page.keyboard.press('KeyC'); await page.waitForTimeout(600);
  await page.keyboard.press('Space'); await page.waitForTimeout(600);
});
await step('диалог с Ирмой', async () => {
  await ev(() => { const G = window.__G; G.player.pos.set(-17, G.terrain.heightAt(-17, 275), 275); });
  await page.waitForTimeout(500);
  await page.keyboard.press('KeyE');
  await page.waitForTimeout(1200);
  await shot('03-dialogue');
  for (let i = 0; i < 4; i++) { await page.keyboard.press('Space'); await page.keyboard.press('Digit1'); await page.waitForTimeout(500); }
  const st = await ev(() => window.__G.quests.state('mq1') + ':' + window.__G.quests.get('mq1').obj);
  console.log('   mq1 =', st);
});
await step('бой у кратера', async () => {
  await ev(() => { const G = window.__G; G.player.pos.set(62, G.terrain.heightAt(62, 340), 340); });
  await page.waitForTimeout(2000);
  // наводимся на ближайшего слизня и стреляем
  for (let i = 0; i < 40; i++) {
    await ev(() => {
      const G = window.__G, P = G.player;
      const e = G.enemies.nearestHostile(P.pos, 40);
      if (!e) return;
      const dx = e.pos.x - P.pos.x, dz = e.pos.z - P.pos.z;
      G.camera.yaw = Math.atan2(dx, -dz); G.camera.pitch = 0.12;
      P.mp = P.stats.maxMp; P.hp = P.stats.maxHp;
      if (Math.random() < 0.5) P.basic(); else P.tryCast(P.hotbar[0]);
    });
    await page.waitForTimeout(220);
  }
  await shot('04-combat');
  const info = await ev(() => ({ enemies: window.__G.enemies.list.length, kills: window.__G.player.kills, xp: window.__G.player.xp, q: window.__G.quests.objText('mq1'), bags: window.__G.loot.bags.length }));
  console.log('   ', JSON.stringify(info));
  if (!info.kills) throw new Error('ни одного убийства — бой не работает');
});
await step('книга героя', async () => {
  await page.keyboard.press('Tab'); await page.waitForTimeout(600); await shot('05-char');
  await page.keyboard.press('KeyI'); await page.waitForTimeout(600); await shot('06-inv');
  await page.keyboard.press('KeyK'); await page.waitForTimeout(600); await shot('07-skills');
  await page.keyboard.press('KeyJ'); await page.waitForTimeout(600); await shot('08-journal');
  await page.keyboard.press('KeyM'); await page.waitForTimeout(900); await shot('09-map');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
});
await step('торговля и кузня', async () => {
  await ev(() => { const G = window.__G; G.ui.openService('shop', 'mila'); });
  await page.waitForTimeout(500); await shot('10-shop');
  await ev(() => { const G = window.__G; G.ui.closeModal(true); G.ui.openService('smith', 'ogden'); });
  await page.waitForTimeout(500); await shot('11-smith');
  await ev(() => { const G = window.__G; G.ui.closeModal(true); G.player.flags.alchemy = true; G.ui.openService('craft', 'lada'); });
  await page.waitForTimeout(500); await shot('12-craft');
  await ev(() => window.__G.ui.closeModal(true));
});
await step('регионы и босс', async () => {
  const spots = [['forest', -470, 160], ['swamp', -470, -130], ['frost', -250, -440], ['storm', 520, 70], ['ash', 380, -330], ['astral', 30, -380]];
  for (const [n, x, z] of spots) {
    await ev(([x, z]) => { const G = window.__G; G.player.pos.set(x, G.terrain.heightAt(x, z), z); G.player.level = 20; G.player.recalc(); G.player.hp = 99999; }, [x, z]);
    await page.waitForTimeout(2200);
    await shot('13-' + n);
  }
  await ev(() => { const G = window.__G; G.player.pos.set(-130, G.terrain.heightAt(-130, 120), 120); });
  await page.waitForTimeout(2500);
  for (let i = 0; i < 6; i++) { await page.keyboard.press('Digit1'); await page.waitForTimeout(300); }
  await shot('14-boss');
});
await step('сохранение и загрузка', async () => {
  await ev(() => window.__game.save());
  await ev(() => window.__game.toTitle());
  await page.waitForTimeout(500);
  await page.getByText('Продолжить').click();
  await page.waitForTimeout(1500);
  const ok = await ev(() => window.__game.state === 'play' && window.__G.player.name === 'Тестовый');
  console.log('   загрузка сохранения:', ok);
});
await step('смерть и возрождение', async () => {
  await ev(() => { const G = window.__G; G.player.hp = 1; G.player.die(); });
  await page.waitForTimeout(3500);
  await shot('15-death');
  await page.getByText('Возродиться у путевого камня').click();
  await page.waitForTimeout(800);
  const alive = await ev(() => window.__G.player.alive);
  console.log('   жив после возрождения:', alive);
});
const perf = await ev(() => ({ fps: Math.round(window.__game.fps), calls: window.__G.renderer.info.render.calls, tris: window.__G.renderer.info.render.triangles }));
console.log('perf (SwiftShader):', JSON.stringify(perf));
await browser.close();
if (errors.length) { console.log('\nОШИБКИ:\n' + errors.slice(0, 15).join('\n---\n')); process.exit(1); }
console.log('\nДымовой тест пройден.');
