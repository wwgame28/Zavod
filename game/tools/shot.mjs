// Скриншот страницы в headless Chromium: node tools/shot.mjs <url> <out.png> [waitMs]
import { chromium } from 'playwright-core';
const [url, out = 'tools/out/shot.png', wait = '4000'] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
await page.goto(url, { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(+wait);
await page.screenshot({ path: out });
console.log(logs.join('\n'));
await browser.close();
