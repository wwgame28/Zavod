// Экспорт карты острова с подписями в docs/map.jpg
import { chromium } from 'playwright-core';
import { writeFileSync } from 'node:fs';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(process.argv[2] || 'http://localhost:5173/', { waitUntil: 'load' });
await page.waitForFunction(() => window.__game?.state === 'title', null, { timeout: 120000 });
const data = await page.evaluate(async () => {
  const { REGIONS } = await import('/src/data/regions.js');
  const { WAYSTONES, BOSSES, TABLETS } = await import('/src/data/locations.js');
  const { NPCS } = await import('/src/data/npcs.js');
  const { ENEMIES } = await import('/src/data/enemies.js');
  const src = window.__game.mapCanvas, S = 1024, half = 820;
  const c = document.createElement('canvas'); c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.drawImage(src, 0, 0, S, S);
  const M = (x, z) => [((x + half) / (half * 2)) * S, ((z + half) / (half * 2)) * S];
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = 'rgba(176,138,255,.9)'; ctx.setLineDash([6, 5]); ctx.lineWidth = 2;
  { const [x, y] = M(20, -560); ctx.beginPath(); ctx.arc(x, y, (150 / 1640) * S, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
  for (const b of BOSSES) { const [x, y] = M(b.x, b.z); ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 9, 0, 7); ctx.stroke(); ctx.font = '600 12px sans-serif'; ctx.fillStyle = '#ffd0c8'; ctx.fillText(ENEMIES[b.type].name, x, y + 18); }
  for (const t of TABLETS) { const [x, y] = M(t.x, t.z); ctx.fillStyle = '#ffd27a'; ctx.fillRect(x - 3, y - 4, 6, 8); }
  for (const w of WAYSTONES) { const [x, y] = M(w.x, w.z); ctx.fillStyle = '#7fe8ff'; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 8); ctx.lineTo(x - 6, y); ctx.fill(); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke(); }
  for (const n of Object.values(NPCS)) { const [x, y] = M(n.x, n.z); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); }
  for (const r of REGIONS) { const [x, y] = M(r.center[0], r.center[1]); ctx.font = 'italic 700 26px Georgia, serif'; ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillText(r.name, x + 2, y + 2); ctx.fillStyle = '#fff4dc'; ctx.fillText(r.name, x, y); ctx.font = '600 14px sans-serif'; ctx.fillStyle = '#e8e0f8'; ctx.fillText(`ур. ${r.levels[0]}–${r.levels[1]}`, x, y + 22); }
  return c.toDataURL('image/jpeg', 0.88);
});
writeFileSync('docs/map.jpg', Buffer.from(data.split(',')[1], 'base64'));
console.log('docs/map.jpg сохранена');
await browser.close();
