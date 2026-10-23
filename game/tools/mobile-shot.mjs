// Проверка мобильной раскладки (сенсорное управление, альбомная ориентация)
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(process.argv[2] || 'http://localhost:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.state === 'title', null, { timeout: 120000 });
await page.screenshot({ path: 'tools/out/m1-title.png' });
await page.evaluate(() => window.__game.newGame({ name: 'Моб', origin: 'storm', robe: 0x8a2a3a, diff: 'story' }));
for (let i = 0; i < 10; i++) { await page.keyboard.press('Space'); await page.waitForTimeout(100); }
await page.waitForTimeout(2500);
await page.screenshot({ path: 'tools/out/m2-play.png' });
// лес: проверка камеры среди деревьев
await page.evaluate(() => { const G = window.__G; G.player.pos.set(-440, G.terrain.heightAt(-440, 260), 260); });
await page.waitForTimeout(3000);
await page.screenshot({ path: 'tools/out/m3-forest.png' });
await page.evaluate(() => window.__G.ui.showBook('skills'));
await page.waitForTimeout(800);
await page.screenshot({ path: 'tools/out/m4-skills.png' });
console.log(errors.length ? errors.join('\n') : 'без ошибок');
await browser.close();
