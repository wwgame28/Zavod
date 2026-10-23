import { Game } from './game.js';

// Точка входа. Если WebGL недоступен — объясняем, а не падаем молча.
function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

if (!hasWebGL()) {
  document.getElementById('ui').innerHTML = '<div class="screen"><div class="title-wrap"><div class="logo">Эйрамор</div><p class="tagline">Ваш браузер не поддерживает WebGL. Откройте игру в свежей версии Chrome, Firefox, Edge или Safari.</p></div></div>';
} else {
  const game = new Game();
  game.boot().catch((e) => {
    console.error(e);
    document.getElementById('ui').innerHTML = `<div class="screen"><div class="title-wrap"><div class="logo">Эйрамор</div><p class="tagline">Не удалось запустить игру: ${String(e.message || e)}</p></div></div>`;
  });
}
