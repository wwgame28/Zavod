import { G } from '../state.js';
import { h } from './dom.js';

// Сенсорное управление: левый стик — движение, правая половина — обзор, кнопки действий.
// Показывается только на устройствах с грубым указателем (телефоны, планшеты).
export function setupTouch(root) {
  const coarse = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  if (!coarse) return null;
  const I = G.input;
  const knob = h('i');
  const stick = h('div', { class: 'stick' }, knob);
  const look = h('div', { class: 'look' });
  const btn = (label, code, hold = false) => {
    const b = h('button', { class: 'tb' }, label);
    b.addEventListener('touchstart', (e) => { e.preventDefault(); G.audio?.init(); I.setVirtual(code, true); if (!hold) setTimeout(() => I.setVirtual(code, false), 60); }, { passive: false });
    if (hold) b.addEventListener('touchend', (e) => { e.preventDefault(); I.setVirtual(code, false); }, { passive: false });
    return b;
  };
  const menu = h('button', { class: 'tb', style: { position: 'absolute', top: '200px', right: '16px', width: '50px', height: '50px' } }, '☰');
  menu.addEventListener('touchstart', (e) => { e.preventDefault(); if (G.ui.modal) G.ui.closeModal(true); else G.ui.showBook('inv'); }, { passive: false });
  const btns = h('div', { class: 'tbtns' },
    btn('E', 'KeyE'), btn('Атака', 'Mouse0', true),
    btn('Прыжок', 'Space'), btn('Перекат', 'KeyC'));
  const el = h('div', { class: 'touch' }, look, stick, btns, menu);
  root.append(el);
  G.ui.touch = true;
  root.classList.add('touchmode');

  let sid = null, sx = 0, sy = 0;
  stick.addEventListener('touchstart', (e) => {
    e.preventDefault(); G.audio?.init();
    const t = e.changedTouches[0]; sid = t.identifier;
    const r = stick.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2;
  }, { passive: false });
  stick.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier !== sid) continue;
      let dx = (t.clientX - sx) / 55, dy = (t.clientY - sy) / 55;
      const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      I.virtualMove.x = dx; I.virtualMove.y = -dy;
      knob.style.transform = `translate(${dx * 40}px, ${dy * 40}px)`;
      if (l > 0.95) I.setVirtual('ShiftLeft', true); else I.setVirtual('ShiftLeft', false);
    }
  }, { passive: false });
  const endStick = (e) => { for (const t of e.changedTouches) if (t.identifier === sid) { sid = null; I.virtualMove.x = 0; I.virtualMove.y = 0; knob.style.transform = ''; I.setVirtual('ShiftLeft', false); } };
  stick.addEventListener('touchend', endStick); stick.addEventListener('touchcancel', endStick);

  let lid = null, lx = 0, ly = 0;
  look.addEventListener('touchstart', (e) => { e.preventDefault(); const t = e.changedTouches[0]; lid = t.identifier; lx = t.clientX; ly = t.clientY; }, { passive: false });
  look.addEventListener('touchmove', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) {
      if (t.identifier !== lid) continue;
      I.virtualLook.x += (t.clientX - lx) * 2.2; I.virtualLook.y += (t.clientY - ly) * 2.2;
      lx = t.clientX; ly = t.clientY;
    }
  }, { passive: false });
  look.addEventListener('touchend', () => { lid = null; });
  return {
    el,
    update() { el.style.display = G.game.state === 'play' && !G.ui.blocking ? 'block' : 'none'; },
  };
}
