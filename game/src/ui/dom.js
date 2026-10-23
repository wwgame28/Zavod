// DOM-утилиты и SVG-иконки (цвет через currentColor).
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
export const $ = (sel, root = document) => root.querySelector(sel);
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const P = {
  // предметы
  potion: '<path d="M9 3h6v2h-1v3.2a6 6 0 1 1-4 0V5H9z" fill="currentColor"/><path d="M8.5 14a3.5 3.5 0 0 0 7 0z" fill="#fff" opacity=".35"/>',
  flask: '<path d="M10 3h4v5l4.5 9A2 2 0 0 1 16.7 20H7.3a2 2 0 0 1-1.8-3L10 8z" fill="currentColor"/><path d="M7.5 15h9" stroke="#fff" stroke-opacity=".4" stroke-width="1.5"/>',
  scroll: '<rect x="6" y="4" width="12" height="16" rx="2" fill="currentColor"/><path d="M9 8h6M9 11h6M9 14h4" stroke="#000" stroke-opacity=".35" stroke-width="1.4"/>',
  herb: '<path d="M12 21V11" stroke="#5a9a3c" stroke-width="2"/><path d="M12 13c-4 0-6-3-6-6 3 0 6 2 6 6zm0-2c0-4 2-7 6-7 0 3-2 7-6 7z" fill="#6fae44"/><circle cx="12" cy="7" r="3" fill="currentColor"/>',
  crystal: '<path d="M12 2l5 7-5 13-5-13z" fill="currentColor"/><path d="M12 2l5 7H7z" fill="#fff" opacity=".35"/>',
  dust: '<circle cx="8" cy="14" r="3" fill="currentColor"/><circle cx="15" cy="10" r="2.5" fill="currentColor"/><circle cx="14" cy="17" r="2" fill="currentColor"/><circle cx="10" cy="7" r="1.6" fill="currentColor"/>',
  ore: '<path d="M4 18l4-10 5-4 5 6 2 8z" fill="currentColor"/><path d="M8 8l5-4 1 8z" fill="#c78cff" opacity=".6"/>',
  pelt: '<path d="M6 4c3 2 9 2 12 0l1 6-2 10H7L5 10z" fill="currentColor"/>',
  silk: '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4v16M4 12h16M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" stroke-width="1.2"/>',
  orb: '<circle cx="12" cy="12" r="7" fill="currentColor"/><circle cx="10" cy="10" r="2.5" fill="#fff" opacity=".5"/>',
  feather: '<path d="M18 3C9 5 6 12 6 18l-2 3 2-1c6 0 11-4 12-17z" fill="currentColor"/><path d="M6 18l8-9" stroke="#000" stroke-opacity=".3" stroke-width="1.3"/>',
  sigil: '<circle cx="12" cy="12" r="8" fill="currentColor"/><path d="M12 6l3 6-3 6-3-6z" fill="#000" opacity=".35"/>',
  shard: '<path d="M12 1l4 8-4 14-4-14z" fill="currentColor"/><path d="M12 1l4 8h-8z" fill="#fff" opacity=".5"/>',
  amulet: '<path d="M6 3l6 9 6-9" fill="none" stroke="#c9a36a" stroke-width="1.6"/><circle cx="12" cy="15" r="5" fill="currentColor"/><circle cx="12" cy="15" r="2" fill="#fff" opacity=".4"/>',
  crate: '<rect x="4" y="6" width="16" height="13" fill="currentColor"/><path d="M4 10h16M4 15h16M9 6v13M15 6v13" stroke="#000" stroke-opacity=".3"/>',
  crown: '<path d="M4 18l1-10 4 4 3-6 3 6 4-4 1 10z" fill="currentColor"/>',
  // экипировка
  staff: '<path d="M7 21L16 7" stroke="#8a6a3a" stroke-width="2.4" stroke-linecap="round"/><circle cx="17" cy="6" r="3.5" fill="currentColor"/>',
  wand: '<path d="M6 19l9-9" stroke="#c9b08a" stroke-width="2.2" stroke-linecap="round"/><path d="M17 3l1.2 2.8L21 7l-2.8 1.2L17 11l-1.2-2.8L13 7l2.8-1.2z" fill="currentColor"/>',
  hood: '<path d="M12 3c5 0 7 5 7 9v8H5v-8c0-4 2-9 7-9z" fill="currentColor"/><path d="M9 13c0-2 1.3-4 3-4s3 2 3 4v5H9z" fill="#000" opacity=".4"/>',
  robe: '<path d="M8 3h8l2 5-1 1v12H7V9L6 8z" fill="currentColor"/><path d="M12 5v15" stroke="#000" stroke-opacity=".25"/>',
  gloves: '<path d="M7 21v-8L5 9l2-1 2 3V4h2v6V3h2v7V4h2v8l2-3 2 1-3 6v5z" fill="currentColor"/>',
  boots: '<path d="M7 3h6v10l6 3v4H5v-4l2-1z" fill="currentColor"/>',
  ring: '<circle cx="12" cy="14" r="6" fill="none" stroke="currentColor" stroke-width="3"/><path d="M12 3l3 4h-6z" fill="currentColor"/>',
  // интерфейс
  gold: '<circle cx="12" cy="12" r="8" fill="#ffd27a"/><circle cx="12" cy="12" r="5" fill="none" stroke="#b8862a" stroke-width="1.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
};

// Иконки навыков: глиф поверх кружка цвета школы
const S = {
  fireball: '<circle cx="12" cy="13" r="5" fill="#fff"/><path d="M12 3c2 3 6 5 6 10a6 6 0 0 1-12 0c0-3 2-4 2-6 1 1 2 2 2 3 0-3 1-5 2-7z" fill="none" stroke="#fff" stroke-width="1.5"/>',
  embers: '<circle cx="8" cy="15" r="2" fill="#fff"/><circle cx="14" cy="11" r="2.4" fill="#fff"/><circle cx="16" cy="17" r="1.5" fill="#fff"/><circle cx="10" cy="8" r="1.3" fill="#fff"/>',
  wave: '<path d="M4 16c3-6 5-8 8-8s5 2 8 8" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M6 19c2-4 4-6 6-6s4 2 6 6" fill="none" stroke="#fff" stroke-width="1.6"/>',
  cloak: '<path d="M12 4l7 4v5c0 4-3 6-7 8-4-2-7-4-7-8V8z" fill="none" stroke="#fff" stroke-width="2"/>',
  meteor: '<circle cx="15" cy="15" r="4" fill="#fff"/><path d="M4 4l8 8M7 3l6 7M3 7l7 6" stroke="#fff" stroke-width="1.6"/>',
  shard: '<path d="M12 3l3 7-3 11-3-11z" fill="#fff"/>',
  nova: '<circle cx="12" cy="12" r="3" fill="#fff"/><circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="3 2"/>',
  armor: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" fill="#fff" opacity=".9"/>',
  snow: '<path d="M12 3v18M4 7.5l16 9M4 16.5l16-9" stroke="#fff" stroke-width="1.8"/>',
  blizzard: '<path d="M5 8h10a3 3 0 1 0-3-3M3 13h15a3 3 0 1 1-3 3M6 18h6" fill="none" stroke="#fff" stroke-width="1.8"/>',
  chain: '<path d="M13 2L6 13h5l-2 9 8-12h-5z" fill="#fff"/>',
  blink: '<path d="M4 12h9M10 7l5 5-5 5" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M17 4l2 3-2 1 3 4" stroke="#fff" stroke-width="1.4" fill="none"/>',
  spark: '<path d="M12 3l2 7 7 2-7 2-2 7-2-7-7-2 7-2z" fill="#fff"/>',
  ball: '<circle cx="12" cy="12" r="5" fill="#fff"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" stroke="#fff" stroke-width="1.4"/>',
  storm: '<path d="M6 10a4 4 0 0 1 8-2 3 3 0 1 1 3 5H6a2.5 2.5 0 0 1 0-3z" fill="#fff"/><path d="M11 14l-2 4h3l-2 4" stroke="#fff" stroke-width="1.6" fill="none"/>',
  heal: '<path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z" fill="#fff"/>',
  roots: '<path d="M12 3v8M12 11c-2 3-5 4-7 8M12 11c2 3 5 4 7 8M12 11v10" fill="none" stroke="#fff" stroke-width="2"/>',
  leaf: '<path d="M5 19C5 9 11 5 19 5c0 8-4 14-14 14z" fill="#fff"/><path d="M5 19l9-9" stroke="#000" stroke-opacity=".3" stroke-width="1.4"/>',
  tree: '<circle cx="12" cy="9" r="6" fill="#fff"/><path d="M12 13v8" stroke="#fff" stroke-width="2.4"/>',
  wolf: '<path d="M5 9l3-5 2 4h4l2-4 3 5v4l-3 6h-8l-3-6z" fill="#fff"/><circle cx="10" cy="11" r="1" fill="#000"/><circle cx="14" cy="11" r="1" fill="#000"/>',
  bolt: '<path d="M4 20L16 8" stroke="#fff" stroke-width="2.4"/><circle cx="17" cy="7" r="4" fill="#fff"/>',
  drain: '<path d="M12 3c3 5 6 8 6 12a6 6 0 0 1-12 0c0-4 3-7 6-12z" fill="#fff"/><path d="M9 15h6" stroke="#000" stroke-opacity=".3" stroke-width="1.5"/>',
  curse: '<circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M12 5l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z" fill="#fff"/>',
  eye: '<path d="M2 12c3-5 7-7 10-7s7 2 10 7c-3 5-7 7-10 7S5 17 2 12z" fill="#fff"/><circle cx="12" cy="12" r="3" fill="#000" opacity=".6"/>',
  rift: '<path d="M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0" fill="none" stroke="#fff" stroke-width="1.2"/><path d="M12 6a6 6 0 0 1 0 12 3 3 0 0 1 0-6 3 3 0 0 0 0-6z" fill="#fff"/>',
  arcane: '<path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" fill="#fff"/>',
};

export function icon(name, size = 24, color = 'currentColor') {
  const body = P[name] || P.orb;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="color:${color}" aria-hidden="true">${body}</svg>`;
}
export function skillIcon(name, schoolColor, size = 40) {
  const body = S[name] || S.arcane;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><defs><radialGradient id="g${name}" cx="35%" cy="30%"><stop offset="0" stop-color="${schoolColor}" stop-opacity="1"/><stop offset="1" stop-color="#14121e" stop-opacity="1"/></radialGradient></defs><rect x="0" y="0" width="24" height="24" rx="5" fill="url(#g${name})"/><g transform="translate(2.4 2.4) scale(.8)">${body}</g></svg>`;
}
export const GEAR_ICON = { staff: 'staff', wand: 'wand', hood: 'hood', robe: 'robe', gloves: 'gloves', boots: 'boots', amulet: 'amulet', ring: 'ring' };
