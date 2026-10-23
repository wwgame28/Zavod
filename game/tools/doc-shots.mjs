// Скриншоты для документации: node tools/doc-shots.mjs [url]
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(process.argv[2] || 'http://localhost:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.state === 'title', null, { timeout: 120000 });
await page.screenshot({ path: 'docs/screens/title.jpg', quality: 84 });
await page.evaluate(() => window.__game.newGame({ name: 'Айла', origin: 'ember', robe: 0x3a4a8a, diff: 'normal' }));
for (let i = 0; i < 10; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(100); }
await page.waitForFunction(() => window.__game.state === 'play');
const spots = [
  // имя, x, z, yaw камеры, уровень, время суток
  ['village', 6, 300, Math.PI * 0.95, 1, 0.42],
  ['forest', -395, 262, Math.PI * 1.35, 7, 0.36],
  ['swamp', -452, -96, Math.PI * 1.55, 10, 0.55],
  ['frost', -232, -400, Math.PI * 1.7, 14, 0.4],
  ['storm', 532, 120, Math.PI * 0.2, 17, 0.47],
  ['volcano', 300, -312, Math.PI * 0.62, 20, 0.73],
  ['astral', 36, -370, Math.PI * 0.02, 22, 0.8],
  ['night', -4, 300, Math.PI * 0.95, 3, 0.02],
];
for (const [n, x, z, yaw, lvl, tod] of spots) {
  await page.evaluate(([x, z, yaw, lvl, tod]) => {
    const G = window.__G, P = G.player;
    P.level = lvl; P.recalc(); P.hp = P.stats.maxHp; P.mp = P.stats.maxMp;
    P.pos.set(x, G.terrain.heightAt(x, z), z); P.heading = Math.PI - yaw;
    G.camera.yaw = yaw; G.camera.pitch = 0.18; G.world.tod = tod;
    G.ui.hud.banner.className = 'banner';
  }, [x, z, yaw, lvl, tod]);
  await page.waitForTimeout(3500);
  await page.evaluate(() => { window.__G.ui.hud.banner.className = 'banner'; document.querySelector('.toasts').innerHTML = ''; });
  await page.screenshot({ path: `docs/screens/${n}.jpg`, quality: 84 });
}
await page.evaluate(() => { const G = window.__G; G.player.pos.set(-17, G.terrain.heightAt(-17, 276), 276); G.world.tod = 0.45; });
await page.waitForTimeout(1500);
await page.keyboard.press('KeyE');
await page.waitForTimeout(2000);
await page.screenshot({ path: 'docs/screens/dialogue.jpg', quality: 84 });
await page.keyboard.press('Digit1'); await page.waitForTimeout(400); await page.keyboard.press('Digit1'); await page.waitForTimeout(400);
await page.evaluate(() => { const G = window.__G, P = G.player; P.level = 12; P.skillPoints = 8; P.learn('fireball'); P.learn('flame_wave'); P.learn('heal'); P.learn('chain_lightning'); P.recalc(); G.ui.closeModal(true); G.ui.showBook('skills'); });
await page.waitForTimeout(800);
await page.screenshot({ path: 'docs/screens/skills.jpg', quality: 84 });
await page.evaluate(async () => { const G = window.__G; const { generateGear } = await import('/src/systems/items.js'); for (let i = 0; i < 9; i++) G.player.inventory.addGear(generateGear(12, i % 5)); G.ui.closeModal(true); G.ui.showBook('inv'); });
await page.waitForTimeout(800);
const cell = page.locator('.cell').nth(2); await cell.hover(); await page.waitForTimeout(300);
await page.screenshot({ path: 'docs/screens/inventory.jpg', quality: 84 });
await browser.close();
console.log('готово');
