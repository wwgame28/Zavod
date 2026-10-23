import { CONFIG, SCHOOLS, RARITY, ELEMENTS } from '../config.js';
import { G } from '../state.js';
import { bus } from '../core/events.js';
import { SKILLS, SKILL_ORDER, ORIGINS, TIER_REQ, BASIC_ATTACK } from '../data/skills.js';
import { ITEMS, SLOTS, SLOT_ORDER, RECIPES, STAT_LABELS } from '../data/items.js';
import { QUESTS } from '../data/quests.js';
import { REGIONS } from '../data/regions.js';
import { WAYSTONES, BOSSES } from '../data/locations.js';
import { LORE, PROLOGUE } from '../data/lore.js';
import { ENDINGS } from '../data/dialogues.js';
import { NPCS } from '../data/npcs.js';
import { ENEMIES } from '../data/enemies.js';
import { gearStats, itemName, itemColor, formatStat, sellValue, upgradeCost, salvageYield } from '../systems/items.js';
import { spellMult } from '../systems/stats.js';
import { rewardText } from '../systems/quests.js';
import { HUD } from './hud.js';
import { h, clear, icon, skillIcon, GEAR_ICON } from './dom.js';
import { toMap, fromMap, MAP_GRID } from './map.js';
import { setupTouch } from './touch.js';

const ROBES = [0x3a4a8a, 0x8a2a3a, 0x2f6a4a, 0x5a3a7a, 0x2a2a30, 0xc9b08a, 0x2a6a8a];
const ATTR_INFO = {
  str: ['Сила', '+3 здоровья, +0,5 брони, усиливает тайный снаряд'],
  agi: ['Ловкость', '+0,25% крит. удара, +2 выносливости, скорость бега'],
  int: ['Интеллект', '+2 силы магии, +7 маны'],
  vit: ['Живучесть', '+10 здоровья, +1 брони, регенерация'],
  spi: ['Дух', '+0,25 маны/с, +3 маны, сокращение перезарядки'],
};
const DIFFS = [
  { id: 'story', name: 'Сюжет', taken: 0.6 },
  { id: 'normal', name: 'Странник', taken: 1 },
  { id: 'hard', name: 'Испытание', taken: 1.4 },
];

function entryIcon(e, size = 34) {
  if (!e) return '';
  if (e.kind === 'gear') return icon(GEAR_ICON[e.base] || 'orb', size, RARITY[e.rarity].color);
  const d = ITEMS[e.id];
  return icon(d?.icon || 'orb', size, d?.color || '#fff');
}

export class UI {
  constructor(root) {
    this.root = root;
    this.hud = new HUD(root);
    this.hud.setVisible(false);
    this.layer = h('div', { id: 'layer' });
    this.tip = h('div', { class: 'tooltip hidden' });
    this.fadeEl = h('div', { class: 'fade' });
    root.append(this.layer, this.tip, this.fadeEl);
    this.modal = null;        // текущее модальное окно (пауза мира)
    this.dialogueEl = null;
    this.bookTab = 'char';
    this.selSkill = null;
    this.selQuest = null;
    bus.on('inventory', () => this.refresh());
    bus.on('stats', () => this.refresh());
    bus.on('skills', () => this.refresh());
    bus.on('quest', () => this.refresh());
    addEventListener('keydown', (e) => this._keys(e));
    addEventListener('mousemove', (e) => { this.mx = e.clientX; this.my = e.clientY; if (!this.tip.classList.contains('hidden')) this._placeTip(); });
  }

  // ------------- общие -------------
  get blocking() { return !!this.modal || !!this.dialogueEl; }
  floatText(...a) { this.hud.floatText(...a); }
  toast(...a) { this.hud.toast(...a); }
  bossSay(...a) { this.hud.bossSay(...a); }
  setPrompt(t) { this.hud.setPrompt(t); }
  questBanner(a, b, c) { this.hud.showBanner(a, b, c); }
  levelUp(l) { this.hud.showBanner('Новый уровень', `Уровень ${l}`, '+3 очка характеристик · +1 очко навыка'); }
  regionBanner(r) { this.hud.showBanner(r.levels ? `Уровни ${r.levels[0]}–${r.levels[1]}` : '', r.name, r.desc); }
  fade(on) { this.fadeEl.classList.toggle('on', on); }

  _open(el, name) {
    this.closeModal(true);
    this.modal = { el, name };
    this.layer.append(el);
    if (['ending', 'death', 'title', 'creator', 'prologue'].includes(name)) this.hud.setVisible(false);
    G.input?.exitLock();
    this.hideTip();
  }
  closeModal(silent = false) {
    if (!this.modal) return;
    this.modal.el.remove();
    const was = this.modal.name;
    this.modal = null;
    this.hideTip(); this._closeCtx();
    if (G.game.state === 'play') this.hud.setVisible(true);
    if (!silent && G.game.state === 'play' && was !== 'title') G.input?.requestLock();
  }

  _keys(e) {
    if (e.target && e.target.tagName === 'INPUT') return;
    const g = G.game;
    if (!g || g.state === 'loading') return;
    if (this.dialogueEl) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 9) { const b = this.dialogueEl.querySelectorAll('.opt')[n - 1]; if (b) b.click(); }
      if (e.code === 'Space' || e.code === 'Enter') { if (this._typing) this._finishTyping(); }
      if (e.code === 'Escape') { const opts = this.dialogueEl.querySelectorAll('.opt'); if (opts.length === 1) opts[0].click(); }
      return;
    }
    if (g.state === 'prologue') { if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') this._prologueNext?.(); return; }
    if (g.state !== 'play') return;
    const map = { Tab: 'char', KeyI: 'inv', KeyP: 'char', KeyK: 'skills', KeyJ: 'journal', KeyM: 'map' };
    if (e.code === 'Escape') {
      e.preventDefault();
      if (this.modal) { if (this.modal.name !== 'death') this.closeModal(); }
      else this.showPause();
      return;
    }
    if (map[e.code]) {
      e.preventDefault();
      if (this.modal?.name === 'book' && (this.bookTab === map[e.code] || e.code === 'Tab')) { this.closeModal(); return; }
      if (this.modal && this.modal.name !== 'book') return;
      this.showBook(map[e.code]);
    }
    if (e.code === 'F5') { e.preventDefault(); g.save(); }
    if (e.code === 'Backquote') { G.settings.showFps = !G.settings.showFps; g.saveSettings(); }
    // назначение навыка на панель при наведении
    if (this.modal?.name === 'book' && this.bookTab === 'skills' && this.hoverSkill) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 6) this._assign(this.hoverSkill, n - 1);
    }
  }

  // ------------- загрузка и титульный экран -------------
  showLoading(text, p = 0) {
    if (!this.loadEl) {
      this.loadBar = h('i');
      this.loadTxt = h('div', { class: 'tagline' });
      this.loadEl = h('div', { class: 'screen', style: { background: 'var(--bg)' } }, h('div', { class: 'title-wrap' }, h('div', { class: 'logo' }, 'Эйрамор', h('small', {}, 'Пепел Звёзд')), this.loadTxt, h('div', { class: 'loading-bar' }, this.loadBar)));
      this.layer.append(this.loadEl);
    }
    this.loadTxt.textContent = text; this.loadBar.style.width = `${Math.round(p * 100)}%`;
  }
  hideLoading() { this.loadEl?.remove(); this.loadEl = null; }

  showTitle(hasSave) {
    this.hud.setVisible(false);
    const el = h('div', { class: 'screen dim' },
      h('div', { class: 'title-wrap' },
        h('div', { class: 'logo' }, 'Эйрамор', h('small', {}, 'Пепел Звёзд')),
        h('div', { class: 'tagline' }, 'Триста лет назад звезда Астра раскололась. Прошлой ночью её осколок упал рядом с вами — и проснулся у вас в груди.'),
        h('div', { class: 'menu-col' },
          hasSave ? h('button', { class: 'btn primary', onclick: () => { G.audio.init(); G.game.continueGame(); } }, 'Продолжить') : null,
          h('button', { class: 'btn' + (hasSave ? '' : ' primary'), onclick: () => { G.audio.init(); this.showCreator(); } }, 'Новая игра'),
          h('button', { class: 'btn', onclick: () => { G.audio.init(); this.showSettings('title'); } }, 'Настройки'),
          h('button', { class: 'btn', onclick: () => this.showHelp('title') }, 'Управление'),
        ),
      ),
      h('div', { class: 'version' }, 'v0.1 · Three.js · всё процедурное'),
    );
    this._open(el, 'title');
  }

  showCreator() {
    const st = { name: 'Странник', origin: 'ember', robe: ROBES[0], diff: 'normal' };
    const nameIn = h('input', { type: 'text', value: st.name, maxlength: 18, oninput: (e) => { st.name = e.target.value; } });
    const origins = h('div', { class: 'origins' });
    const renderO = () => {
      clear(origins);
      for (const o of ORIGINS) {
        const sc = SCHOOLS[o.school];
        origins.append(h('div', { class: 'origin' + (st.origin === o.id ? ' sel' : ''), onclick: () => { st.origin = o.id; renderO(); G.audio.play('ui'); } },
          h('div', { html: skillIcon(SKILLS[o.skill].icon, sc.color, 40) }),
          h('b', {}, o.name), h('p', {}, o.desc), h('p', { style: { color: sc.color, marginTop: '6px' } }, `Школа: ${sc.name} · ${SKILLS[o.skill].name}`)));
      }
    };
    renderO();
    const sw = h('div', { class: 'swatches' });
    const renderS = () => { clear(sw); for (const c of ROBES) sw.append(h('div', { class: 'swatch' + (st.robe === c ? ' sel' : ''), style: { background: '#' + c.toString(16).padStart(6, '0') }, onclick: () => { st.robe = c; renderS(); } })); };
    renderS();
    const seg = h('div', { class: 'seg' });
    const renderD = () => { clear(seg); for (const d of DIFFS) seg.append(h('button', { class: st.diff === d.id ? 'sel' : '', onclick: () => { st.diff = d.id; renderD(); } }, d.name)); };
    renderD();
    const el = h('div', { class: 'screen dim' }, h('div', { class: 'panel creator' },
      h('h2', {}, 'Пробуждение'),
      h('label', { class: 'lbl' }, 'Имя'), nameIn,
      h('label', { class: 'lbl' }, 'Предыстория — стартовая школа магии'), origins,
      h('label', { class: 'lbl' }, 'Цвет мантии'), sw,
      h('label', { class: 'lbl' }, 'Сложность'), seg,
      h('div', { style: { display: 'flex', gap: '10px', marginTop: '24px', justifyContent: 'flex-end' } },
        h('button', { class: 'btn ghost', onclick: () => G.game.toTitle() }, 'Назад'),
        h('button', { class: 'btn primary', onclick: () => G.game.newGame({ name: (st.name || 'Странник').trim().slice(0, 18) || 'Странник', origin: st.origin, robe: st.robe, diff: st.diff }) }, 'Начать путь')),
    ));
    this._open(el, 'creator');
    setTimeout(() => nameIn.focus(), 50);
  }

  showPrologue(onDone) {
    const box = h('div', { class: 'prologue' });
    const ps = PROLOGUE.map((t) => h('p', {}, t));
    box.append(...ps, h('div', { class: 'hint' }, 'Пробел — дальше'));
    const el = h('div', { class: 'screen', style: { background: 'rgba(5,4,10,.92)' }, onclick: () => next() }, box);
    this._open(el, 'prologue');
    let i = 0;
    const next = () => {
      if (i < ps.length) { ps[i].classList.add('on'); i++; if (i === ps.length) box.lastChild.textContent = 'Пробел — начать'; }
      else { this._prologueNext = null; this.closeModal(true); onDone(); }
    };
    this._prologueNext = next;
    next();
    this._prologueTimer = setInterval(() => { if (!this._prologueNext) { clearInterval(this._prologueTimer); return; } if (i < ps.length) next(); }, 2600);
  }

  // ------------- пауза, настройки, помощь -------------
  showPause() {
    const el = h('div', { class: 'screen dim' }, h('div', { class: 'title-wrap' },
      h('div', { class: 'logo', style: { fontSize: '56px' } }, 'Пауза'),
      h('div', { class: 'menu-col', style: { marginTop: '24px' } },
        h('button', { class: 'btn primary', onclick: () => this.closeModal() }, 'Продолжить'),
        h('button', { class: 'btn', onclick: () => { G.game.save(); } }, 'Сохранить (F5)'),
        h('button', { class: 'btn', onclick: () => this.showBook('char') }, 'Книга героя (Tab)'),
        h('button', { class: 'btn', onclick: () => this.showSettings('pause') }, 'Настройки'),
        h('button', { class: 'btn', onclick: () => this.showHelp('pause') }, 'Управление'),
        h('button', { class: 'btn ghost', onclick: () => { G.game.save(true); G.game.toTitle(); } }, 'Выйти в меню'),
      )));
    this._open(el, 'pause');
  }

  showSettings(back) {
    const S = G.settings;
    const range = (k, min, max, step, label) => h('div', { class: 'setting' }, h('span', {}, label),
      h('input', { type: 'range', min, max, step, value: S[k], oninput: (e) => { S[k] = +e.target.value; G.game.applySettings(); } }));
    const check = (k, label) => h('div', { class: 'setting' }, h('span', {}, label),
      h('input', { type: 'checkbox', checked: S[k] ? 'checked' : null, onchange: (e) => { S[k] = e.target.checked; G.game.applySettings(); } }));
    const q = h('select', { onchange: (e) => { S.quality = e.target.value; G.game.applySettings(); } },
      h('option', { value: 'high', selected: S.quality === 'high' ? 'selected' : null }, 'Высокое'),
      h('option', { value: 'low', selected: S.quality === 'low' ? 'selected' : null }, 'Быстрое'));
    const el = h('div', { class: 'screen dim' }, h('div', { class: 'panel dialog-box' },
      h('h2', {}, 'Настройки'),
      range('master', 0, 1, 0.05, 'Общая громкость'), range('music', 0, 1, 0.05, 'Музыка'), range('sfx', 0, 1, 0.05, 'Эффекты'),
      range('sens', 0.3, 2.5, 0.05, 'Чувствительность мыши'),
      check('invertY', 'Инвертировать ось Y'), check('reduceMotion', 'Уменьшить тряску и вспышки'),
      check('waypoint', 'Маркер цели на экране'), check('showFps', 'Показывать FPS (~)'),
      h('div', { class: 'setting' }, h('span', {}, 'Графика'), q),
      h('div', { style: { marginTop: '18px', textAlign: 'right' } }, h('button', { class: 'btn primary', onclick: () => { G.game.saveSettings(); back === 'title' ? G.game.toTitle() : this.showPause(); } }, 'Готово')),
    ));
    this._open(el, 'settings');
  }

  showHelp(back) {
    const k = (keys, d) => [h('span', {}, ...keys.map((x) => h('kbd', {}, x)).flatMap((x, i) => (i ? [' ', x] : [x]))), h('span', {}, d)];
    const el = h('div', { class: 'screen dim' }, h('div', { class: 'panel dialog-box', style: { width: 'min(680px,94vw)' } },
      h('h2', {}, 'Управление'),
      h('div', { class: 'keys' },
        ...k(['W', 'A', 'S', 'D'], 'Движение (относительно камеры)'), ...k(['Мышь'], 'Обзор (кликните по экрану, чтобы захватить курсор)'),
        ...k(['ЛКМ'], 'Тайный снаряд — базовая атака'), ...k(['1', '–', '6'], 'Заклинания с панели'),
        ...k(['Shift'], 'Бег (тратит выносливость)'), ...k(['Пробел'], 'Прыжок'), ...k(['C'], 'Перекат — неуязвимость на миг'),
        ...k(['E'], 'Говорить, собирать, открывать, путевые камни'), ...k(['Q'], 'Зелье здоровья'), ...k(['R'], 'Зелье маны'),
        ...k(['Tab', 'P'], 'Персонаж и характеристики'), ...k(['I'], 'Сумка и экипировка'), ...k(['K'], 'Книга навыков'),
        ...k(['J'], 'Журнал заданий и летопись'), ...k(['M'], 'Карта и путешествия'), ...k(['Колесо'], 'Приблизить/отдалить камеру'),
        ...k(['F5'], 'Сохранить'), ...k(['Esc'], 'Пауза / закрыть окно'), ...k(['ПКМ'], 'Обзор без захвата курсора; меню предмета в сумке'),
      ),
      h('p', { style: { color: 'var(--muted)', fontSize: '13px', lineHeight: 1.5 } }, 'Геймпад: левый стик — движение, правый — камера, RT — атака, LB/RB/крестовина — заклинания, A — прыжок, B — перекат, X — действие, Y — зелье, Start — пауза, Back — карта.'),
      h('div', { style: { marginTop: '14px', textAlign: 'right' } }, h('button', { class: 'btn primary', onclick: () => (back === 'title' ? G.game.toTitle() : this.showPause()) }, 'Назад')),
    ));
    this._open(el, 'help');
  }

  // ------------- смерть, финал, скрижаль -------------
  showDeath() {
    const btn = h('button', { class: 'btn primary', disabled: true, onclick: () => { this.closeModal(); G.game.respawn(); } }, 'Возродиться у путевого камня');
    const el = h('div', { class: 'screen', style: { background: 'radial-gradient(ellipse at center, rgba(60,0,0,.4), rgba(5,0,0,.9))' } }, h('div', { class: 'title-wrap death' },
      h('h1', {}, 'Свет угас'),
      h('div', { class: 'tagline' }, `Осколок в груди тлеет и ждёт. Вы потеряете ${Math.round(CONFIG.PROGRESSION.deathGoldLoss * 100)}% золота.`),
      h('div', { class: 'menu-col' }, btn)));
    this._open(el, 'death');
    setTimeout(() => { btn.disabled = false; }, 1500);
  }

  showEnding(choice) {
    const E = ENDINGS[choice];
    const P = G.player;
    const mins = Math.round(P.playTime / 60);
    const el = h('div', { class: 'screen', style: { background: 'radial-gradient(ellipse at center, rgba(20,16,40,.7), rgba(5,4,10,.95))' } }, h('div', { class: 'title-wrap ending', style: { maxWidth: '780px' } },
      h('div', { class: 'b1', style: { letterSpacing: '.3em', color: 'var(--accent)', textTransform: 'uppercase', fontSize: '13px' } }, 'Финал'),
      h('h1', {}, E.title),
      h('p', { class: 'et' }, E.text),
      h('div', { class: 'tagline' }, `${P.name} · уровень ${P.level} · врагов повержено: ${P.kills} · падений: ${P.deaths} · в пути: ${mins} мин`),
      h('div', { class: 'menu-col' },
        h('button', { class: 'btn primary', onclick: () => this.closeModal() }, 'Продолжить странствие'),
        h('button', { class: 'btn ghost', onclick: () => { G.game.save(true); G.game.toTitle(); } }, 'В главное меню')),
    ));
    this._open(el, 'ending');
  }

  showReader(title, text) {
    const el = h('div', { class: 'screen dim', onclick: (e) => { if (e.target === el) this.closeModal(); } }, h('div', { class: 'panel reader' },
      h('button', { class: 'x-btn', onclick: () => this.closeModal(), html: icon('close', 18) }),
      h('h2', {}, title), h('p', {}, text),
      h('div', { style: { textAlign: 'center', marginTop: '16px' } }, h('button', { class: 'btn', onclick: () => this.closeModal() }, 'Закрыть'))));
    this._open(el, 'reader');
  }

  // ------------- диалоги -------------
  showDialogue({ name, title, text, options, onPick }) {
    this.hideDialogue(false);
    G.input?.exitLock();
    const tEl = h('div', { class: 'dtext' });
    const opts = h('div', { class: 'opts' });
    options.forEach((o, i) => opts.append(h('button', { class: 'opt', onclick: () => { if (this._typing) { this._finishTyping(); return; } onPick(i); } }, h('kbd', {}, String(i + 1)), o)));
    this.dialogueEl = h('div', { class: 'panel dialogue interactive' }, h('div', { class: 'dn' }, name), h('div', { class: 'dt2' }, title || ''), tEl, opts);
    this.layer.append(this.dialogueEl);
    // печать текста
    let i = 0;
    this._typing = true;
    opts.style.opacity = '0.35';
    this._finishTyping = () => { clearInterval(this._typeT); tEl.textContent = text; this._typing = false; opts.style.opacity = '1'; };
    clearInterval(this._typeT);
    this._typeT = setInterval(() => { i += 3; tEl.textContent = text.slice(0, i); if (i >= text.length) this._finishTyping(); }, 16);
    tEl.addEventListener('click', () => this._typing && this._finishTyping());
  }
  hideDialogue(relock = true) {
    clearInterval(this._typeT); this._typing = false;
    if (this.dialogueEl) { this.dialogueEl.remove(); this.dialogueEl = null; if (relock && !this.modal && G.game.state === 'play') G.input?.requestLock(); }
  }

  // ------------- подсказки -------------
  showTip(html) { this.tip.innerHTML = html; this.tip.classList.remove('hidden'); this._placeTip(); }
  hideTip() { this.tip.classList.add('hidden'); }
  _placeTip() {
    const w = this.tip.offsetWidth, hh = this.tip.offsetHeight;
    let x = (this.mx || 0) + 18, y = (this.my || 0) + 14;
    if (x + w > innerWidth - 8) x = (this.mx || 0) - w - 14;
    if (y + hh > innerHeight - 8) y = innerHeight - hh - 8;
    this.tip.style.left = x + 'px'; this.tip.style.top = Math.max(8, y) + 'px';
  }

  itemTip(e, opts = {}) {
    if (!e) return '';
    const P = G.player;
    if (e.kind === 'gear') {
      const R = RARITY[e.rarity];
      const st = gearStats(e);
      const eq = opts.compare !== false ? P.equipment[e.slot] : null;
      const eqSt = eq && eq !== e ? gearStats(eq) : null;
      let lines = '';
      for (const [k, v] of Object.entries(st)) {
        let diff = '';
        if (eqSt) { const d = Math.round((v - (eqSt[k] || 0)) * 10) / 10; if (d) diff = ` <span class="${d > 0 ? 'pos' : 'neg'}">(${d > 0 ? '+' : ''}${d})</span>`; }
        lines += `<div class="st">${formatStat(k, v)}${diff}</div>`;
      }
      if (eqSt) for (const [k, v] of Object.entries(eqSt)) if (!(k in st)) lines += `<div class="neg">−${v} ${STAT_LABELS[k] || k}</div>`;
      const lvlWarn = e.level > P.level + 2 ? `<div class="neg">Требуется уровень ${e.level - 2}</div>` : '';
      return `<div class="tt" style="color:${R.color}">${itemName(e)}</div><div class="tr" style="color:${R.color}">${R.name} · ${SLOTS[e.slot]} · ур. ${e.level}</div>${lines}${lvlWarn}${e.lore ? `<div class="lore">${e.lore}</div>` : ''}${opts.price ? `<div class="hint">Цена: ${opts.price} з.</div>` : ''}${opts.hint ? `<div class="hint">${opts.hint}</div>` : ''}`;
    }
    const d = ITEMS[e.id];
    const types = { consumable: 'Расходник', material: 'Материал', quest: 'Предмет задания', shard: 'Великий Осколок' };
    return `<div class="tt" style="color:${itemColor(e)}">${d.name}${e.n > 1 ? ' ×' + e.n : ''}</div><div class="tr" style="color:var(--muted)">${types[d.type] || ''}</div><div>${d.desc}</div>${opts.price ? `<div class="hint">Цена: ${opts.price} з.</div>` : ''}${opts.hint ? `<div class="hint">${opts.hint}</div>` : ''}`;
  }

  _ctx(x, y, items) {
    this._closeCtx();
    const el = h('div', { class: 'ctx interactive' }, ...items.map(([t, fn]) => h('button', { onclick: () => { this._closeCtx(); fn(); } }, t)));
    el.style.left = Math.min(x, innerWidth - 190) + 'px'; el.style.top = Math.min(y, innerHeight - items.length * 40 - 10) + 'px';
    document.body.append(el);
    this._ctxEl = el;
    setTimeout(() => addEventListener('mousedown', this._ctxOff = (ev) => { if (!el.contains(ev.target)) this._closeCtx(); }), 0);
  }
  _closeCtx() { this._ctxEl?.remove(); this._ctxEl = null; if (this._ctxOff) removeEventListener('mousedown', this._ctxOff); }

  // ------------- книга героя -------------
  showBook(tab = 'char') {
    this.bookTab = tab;
    const tabs = [['char', 'Персонаж', 'P'], ['inv', 'Сумка', 'I'], ['skills', 'Навыки', 'K'], ['journal', 'Журнал', 'J'], ['map', 'Карта', 'M']];
    const tabBar = h('div', { class: 'tabs' });
    const body = h('div', { class: 'book-body' });
    const book = h('div', { class: 'panel book' }, h('button', { class: 'x-btn', onclick: () => this.closeModal(), html: icon('close', 18) }), tabBar, body);
    const el = h('div', { class: 'screen dim', onclick: (e) => { if (e.target === el) this.closeModal(); } }, book);
    this.bookBody = body; this.bookTabs = tabBar;
    const renderTabs = () => {
      clear(tabBar);
      const P = G.player;
      for (const [id, name, key] of tabs) {
        const dot = (id === 'char' && P.attrPoints > 0) || (id === 'skills' && P.skillPoints > 0);
        tabBar.append(h('button', { class: 'tab' + (this.bookTab === id ? ' sel' : ''), onclick: () => { this.bookTab = id; renderTabs(); this._renderBook(); G.audio.play('ui'); } }, name, h('kbd', {}, key), dot ? h('span', { class: 'dot' }) : null));
      }
    };
    this._renderTabs = renderTabs;
    renderTabs();
    this._open(el, 'book');
    this._renderBook();
  }

  refresh() {
    if (this.modal?.name === 'book') { this._renderTabs?.(); this._renderBook(); }
    if (this.modal?.name === 'service') this._renderService?.();
  }

  _renderBook() {
    const b = this.bookBody; if (!b) return;
    const keepScroll = b.scrollTop;
    clear(b);
    this.hideTip();
    ({ char: () => this._charTab(b), inv: () => this._invTab(b), skills: () => this._skillsTab(b), journal: () => this._journalTab(b), map: () => this._mapTab(b) })[this.bookTab]();
    b.scrollTop = keepScroll;
  }

  _charTab(b) {
    const P = G.player, s = P.stats;
    const need = P.xpToNext();
    const attrs = h('div', { class: 'card' }, h('h3', { style: { marginTop: 0 } }, 'Характеристики'),
      h('div', { style: { color: P.attrPoints ? 'var(--good)' : 'var(--muted)', marginBottom: '6px' } }, `Свободных очков: ${P.attrPoints}`));
    for (const k of ['str', 'agi', 'int', 'vit', 'spi']) {
      attrs.append(h('div', { class: 'attr' }, h('div', {}, h('b', {}, ATTR_INFO[k][0]), h('small', {}, ATTR_INFO[k][1])),
        h('div', { class: 'v' }, String(s[k])),
        h('button', { class: 'plus', disabled: P.attrPoints <= 0, onclick: () => P.spendAttr(k), title: 'Вложить очко' }, '+')));
    }
    const res = Object.entries(s.res).map(([k, v]) => [ELEMENTS[k].name, `${Math.round(v)}%`]);
    const kv = (rows) => h('div', { class: 'kv' }, ...rows.flatMap(([a, v]) => [h('span', {}, a), h('span', {}, String(v))]));
    const derived = h('div', { class: 'card' }, h('h3', { style: { marginTop: 0 } }, 'Боевые показатели'),
      kv([['Здоровье', s.maxHp], ['Мана', s.maxMp], ['Выносливость', s.maxSta], ['Сила магии', s.sp], ['Урон оружия', s.weaponDmg],
        ['Шанс крит. удара', `${s.crit.toFixed(1)}%`], ['Крит. урон', `${Math.round(s.critDmg)}%`], ['Броня', s.armor],
        ['Восст. здоровья', `${s.hpRegen.toFixed(1)}/с`], ['Восст. маны', `${s.mpRegen.toFixed(1)}/с`], ['Сокр. перезарядки', `${s.cdr.toFixed(1)}%`],
        ['Скорость бега', `${Math.round(s.speed * 100)}%`], ['Похищение жизни', `${s.leech.toFixed(1)}%`], ...res]));
    const mast = h('div', { class: 'card' }, h('h3', { style: { marginTop: 0 } }, 'Мастерство школ'));
    for (const [sc, d] of Object.entries(SCHOOLS)) {
      const m = P.mastery[sc];
      const full = m.lvl >= CONFIG.PROGRESSION.masteryMax;
      const k = full ? 1 : m.xp / CONFIG.PROGRESSION.masteryXp(m.lvl);
      mast.append(h('div', { class: 'mastery' }, h('span', { style: { color: d.color } }, d.name),
        h('div', { class: 'bar' }, h('i', { class: 'f', style: { background: d.color, transform: `scaleX(${k})` } })), h('span', {}, `${m.lvl}/10`)));
    }
    mast.append(h('div', { style: { color: 'var(--muted)', fontSize: '12px', marginTop: '6px' } }, `Каждый круг мастерства: +${CONFIG.PROGRESSION.masteryBonus * 100}% урона школы и −1% маны.`));
    const shards = h('div', { class: 'shards' });
    for (const [sc, d] of Object.entries(SCHOOLS)) shards.append(h('div', { class: 'shardslot' + (P.shards.includes(sc) ? ' on' : ''), style: { color: d.color }, title: `Великий Осколок: ${d.name}`, html: icon('shard', 30, d.color) }));
    const hero = h('div', { class: 'card' },
      h('div', { style: { fontFamily: 'var(--font-title)', fontSize: '30px', fontWeight: 700, color: 'var(--primary)' } }, P.name),
      h('div', { style: { color: 'var(--muted)' } }, `${ORIGINS.find((o) => o.id === P.origin)?.name} · уровень ${P.level}`),
      h('div', { class: 'bar', style: { marginTop: '8px' } }, h('i', { class: 'f', style: { background: 'var(--xp)', transform: `scaleX(${P.level >= CONFIG.PROGRESSION.maxLevel ? 1 : P.xp / need})` } }), h('span', {}, P.level >= CONFIG.PROGRESSION.maxLevel ? 'Максимум' : `${Math.floor(P.xp)} / ${need}`)),
      h('h3', {}, 'Великие Осколки'), shards,
      h('div', { style: { color: 'var(--muted)', fontSize: '12.5px', marginTop: '8px' } }, 'Каждый Осколок даёт постоянный бонус и открывает высший круг своей школы.'),
      h('h3', {}, 'Летопись странствия'),
      kv([['Врагов повержено', P.kills], ['Падений', P.deaths], ['Время в пути', `${Math.round(P.playTime / 60)} мин`], ['Путевых камней', `${G.world.activated.size} / ${WAYSTONES.length}`], ['Скрижалей прочитано', `${G.world.readTablets.size} / 7`]]));
    b.append(h('div', { class: 'cols' }, h('div', {}, hero, h('div', { style: { height: '16px' } }), attrs), h('div', {}, derived, h('div', { style: { height: '16px' } }), mast)));
  }

  _invTab(b) {
    const P = G.player;
    const doll = h('div', { class: 'doll' });
    for (const slot of SLOT_ORDER) {
      const it = P.equipment[slot];
      const c = it ? RARITY[it.rarity].color : 'rgba(255,255,255,.1)';
      const cell = h('div', { class: 'eq', onclick: () => it && P.unequip(slot) },
        h('div', { class: 'ic', style: { borderColor: c }, html: it ? entryIcon(it, 34) : '' }),
        h('div', {}, h('div', { class: 'sl' }, SLOTS[slot]), h('div', { class: 'nm', style: { color: it ? c : 'var(--muted)' } }, it ? itemName(it) : 'Пусто')));
      if (it) { cell.onmouseenter = () => this.showTip(this.itemTip(it, { compare: false, hint: 'Клик — снять' })); cell.onmouseleave = () => this.hideTip(); }
      doll.append(cell);
    }
    const grid = h('div', { class: 'grid' });
    P.inventory.slots.forEach((e, i) => {
      const better = e?.kind === 'gear' && this._better(e);
      const cell = h('div', { class: 'cell' + (better ? ' better' : ''), style: e?.kind === 'gear' ? { borderColor: RARITY[e.rarity].color + '88' } : {},
        html: e ? entryIcon(e, 34) : '' });
      if (e) {
        if (e.kind === 'stack' && e.n > 1) cell.append(h('span', { class: 'cnt' }, String(e.n)));
        if (e.kind === 'gear') { cell.append(h('span', { class: 'lv' }, String(e.level))); if (e.up) cell.append(h('span', { class: 'up' }, '+' + e.up)); }
        cell.onmouseenter = () => this.showTip(this.itemTip(e, { hint: 'Клик — надеть/использовать · ПКМ — действия' }));
        cell.onmouseleave = () => this.hideTip();
        cell.onclick = () => { this.hideTip(); P.useItem(i); };
        cell.oncontextmenu = (ev) => {
          ev.preventDefault(); this.hideTip();
          const items = [];
          if (e.kind === 'gear') items.push(['Надеть', () => P.equip(i)], ['Разобрать на пепел (+' + salvageYield(e) + ')', () => G.shop.salvage(i)]);
          else if (ITEMS[e.id].type === 'consumable') items.push(['Использовать', () => P.useItem(i)]);
          const t = e.kind === 'stack' ? ITEMS[e.id].type : 'gear';
          if (t !== 'quest' && t !== 'shard') items.push(['Выбросить', () => { P.inventory.takeAt(i); }]);
          if (items.length) this._ctx(ev.clientX, ev.clientY, items);
        };
      }
      grid.append(cell);
    });
    const junk = () => {
      let n = 0;
      for (let i = 0; i < P.inventory.size; i++) { const e = P.inventory.slots[i]; if (e?.kind === 'gear' && e.rarity === 0 && !this._better(e)) { G.shop.salvage(i); n++; } }
      if (!n) this.toast('Нет обычных вещей для разбора', 'info');
    };
    b.append(h('div', { class: 'inv' },
      h('div', {}, h('h3', { style: { marginTop: 0 } }, 'Экипировка'), doll,
        h('div', { class: 'card', style: { marginTop: '14px' } }, h('div', { class: 'kv' },
          h('span', {}, 'Здоровье'), h('span', {}, String(P.stats.maxHp)), h('span', {}, 'Сила магии'), h('span', {}, String(P.stats.sp)),
          h('span', {}, 'Броня'), h('span', {}, String(P.stats.armor)), h('span', {}, 'Крит'), h('span', {}, P.stats.crit.toFixed(1) + '%')))),
      h('div', {},
        h('div', { class: 'toolbar' }, h('h3', { style: { margin: 0, flex: 1 } }, `Сумка (${P.inventory.size - P.inventory.freeCount()}/${P.inventory.size})`),
          h('div', { class: 'gold', style: { textShadow: 'none' }, html: icon('gold', 18) + P.gold }),
          h('button', { class: 'btn small', onclick: () => P.inventory.sort() }, 'Сортировать'),
          h('button', { class: 'btn small', onclick: junk, title: 'Разобрать все обычные (серые) вещи, кроме лучших' }, 'Разобрать хлам')),
        grid)));
  }

  _better(it) {
    const P = G.player;
    const eq = P.equipment[it.slot];
    if (!eq) return true;
    const score = (x) => { const s = gearStats(x); let v = 0; for (const [k, val] of Object.entries(s)) v += val * ({ sp: 1, int: 1.4, hp: 0.12, armor: 0.25, weaponDmg: 1.6, crit: 2, critDmg: 0.4, vit: 1, spi: 0.9, agi: 0.8, str: 0.6, mp: 0.1, speed: 1 }[k] ?? 0.5); return v; };
    return score(it) > score(eq) * 1.02;
  }

  _skillsTab(b) {
    const P = G.player;
    const top = h('div', { class: 'skilltop' },
      h('div', {}, h('span', { class: 'pts-badge' }, `Очки навыков: ${P.skillPoints}`)),
      h('div', { style: { color: 'var(--muted)', fontSize: '12.5px', maxWidth: '560px' } }, 'Выберите активный навык и нажмите на ячейку панели внизу (или наведите и нажмите 1–6). Круг II — с 6 ур. и 3 очками в школе, круг III — с 12 ур., 6 очками и Великим Осколком школы.'));
    const wrap = h('div', { class: 'schools' });
    for (const [sc, sd] of Object.entries(SCHOOLS)) {
      const col = h('div', { class: 'school', style: { borderTopColor: sd.color } }, h('h4', { style: { color: sd.color } }, sd.name), h('div', { class: 'sd' }, sd.desc));
      const m = P.mastery[sc];
      col.append(h('div', { class: 'mastery', style: { gridTemplateColumns: '1fr 40px' } }, h('div', { class: 'bar' }, h('i', { class: 'f', style: { background: sd.color, transform: `scaleX(${m.lvl >= 10 ? 1 : m.xp / CONFIG.PROGRESSION.masteryXp(m.lvl)})` } })), h('span', { style: { fontSize: '11px' } }, `${m.lvl}/10`)));
      let lastTier = 0;
      for (const id of SKILL_ORDER[sc]) {
        const s = SKILLS[id];
        if (s.tier !== lastTier) { lastTier = s.tier; col.append(h('div', { class: 'tier-lbl' }, ['', 'Круг I', 'Круг II', 'Круг III'][s.tier])); }
        const r = P.skills[id] || 0;
        const can = P.canLearn(id);
        const mult = s.type === 'active' ? spellMult(P, sc) : 1;
        const v = s.vals(Math.max(1, r));
        const sv = { ...v };
        for (const key of ['dmg', 'heal', 'burst']) if (sv[key] != null) sv[key] = Math.round(sv[key] * mult);
        const nextV = r > 0 && r < s.max ? s.vals(r + 1) : null;
        const card = h('div', { class: 'sk' + (this.selSkill === id ? ' sel' : '') + (r === 0 && !can.ok ? ' locked' : '') },
          h('div', { class: 'row' }, h('div', { html: skillIcon(s.icon, sd.color, 36) }),
            h('div', {}, h('div', { class: 'nm' }, s.name), h('div', { class: 'rk' }, `${s.type === 'active' ? 'Активный' : 'Пассивный'} · ранг ${r}/${s.max}${s.type === 'active' ? ` · ${G.spells.manaCost(id, Math.max(1, r))} маны · ${(s.vals(Math.max(1, r)).cd ?? s.cd)} с` : ''}`))),
          h('div', { class: 'ds' }, s.desc(sv)),
          nextV ? h('div', { class: 'ds', style: { color: 'var(--muted)' } }, 'Далее: ' + s.desc(Object.fromEntries(Object.entries(nextV).map(([k, x]) => [k, ['dmg', 'heal', 'burst'].includes(k) ? Math.round(x * mult) : x])))) : null,
          !can.ok && r < s.max ? h('div', { class: 'rq' }, can.why) : null);
        if (can.ok) card.append(h('button', { class: 'plus learn', title: 'Изучить ранг', onclick: (e) => { e.stopPropagation(); P.learn(id); } }, '+'));
        card.onclick = () => { if (s.type === 'active' && r > 0) { this.selSkill = this.selSkill === id ? null : id; this._renderBook(); } };
        card.onmouseenter = () => { this.hoverSkill = s.type === 'active' && r > 0 ? id : null; };
        card.onmouseleave = () => { this.hoverSkill = null; };
        col.append(card);
      }
      wrap.append(col);
    }
    const assign = h('div', { class: 'assign' }, h('span', { style: { marginRight: '6px' } }, this.selSkill ? `Назначить «${SKILLS[this.selSkill].name}»:` : 'Панель заклинаний:'));
    for (let i = 0; i < 6; i++) {
      const id = P.hotbar[i];
      const slot = h('div', { class: 'slot', title: id ? SKILLS[id].name + ' — клик ПКМ убрать' : 'Пусто', html: id ? skillIcon(SKILLS[id].icon, SCHOOLS[SKILLS[id].school].color, 44) : '' });
      slot.append(h('span', { class: 'key' }, String(i + 1)));
      slot.onclick = () => { if (this.selSkill) this._assign(this.selSkill, i); };
      slot.oncontextmenu = (e) => { e.preventDefault(); P.hotbar[i] = null; this._renderBook(); };
      assign.append(slot);
    }
    assign.append(h('span', { style: { color: 'var(--muted)', fontSize: '12px', marginLeft: '8px' } }, `ЛКМ — ${BASIC_ATTACK.name}, всегда доступен.`));
    b.append(top, wrap, assign);
  }

  _assign(id, i) {
    const P = G.player;
    const j = P.hotbar.indexOf(id);
    if (j >= 0) P.hotbar[j] = P.hotbar[i];
    P.hotbar[i] = id;
    this.selSkill = null;
    G.audio.play('ui');
    this._renderBook();
  }

  _journalTab(b) {
    const Q = G.quests;
    const ids = Object.keys(Q.s);
    const active = ids.filter((q) => Q.s[q].state !== 'done').sort((a, c) => (QUESTS[a].kind === 'main' ? 0 : 1) - (QUESTS[c].kind === 'main' ? 0 : 1));
    const done = ids.filter((q) => Q.s[q].state === 'done');
    if (!this.selQuest || !Q.s[this.selQuest]) this.selQuest = Q.tracked || active[0] || null;
    const list = h('div', { class: 'qlist' });
    const item = (q) => {
      const d = QUESTS[q];
      const el = h('div', { class: `qitem ${d.kind}${Q.s[q].state === 'done' ? ' done' : ''}${this.selQuest === q ? ' sel' : ''}`, onclick: () => { this.selQuest = q; this._renderBook(); } },
        h('b', {}, (Q.tracked === q ? '◆ ' : '') + d.name), h('small', {}, `${d.kind === 'main' ? 'Сюжет' : 'Побочное'} · рек. ур. ${d.level} · ${Q.s[q].state === 'ready' ? 'можно сдать' : Q.s[q].state === 'done' ? 'выполнено' : 'в процессе'}`));
      list.append(el);
    };
    list.append(h('h3', { style: { marginTop: 0 } }, 'Задания'));
    active.forEach(item);
    if (!active.length) list.append(h('div', { style: { color: 'var(--muted)' } }, 'Нет активных заданий. Поговорите с жителями — над головой у тех, кто ждёт помощи, горит «!».'));
    if (done.length) { list.append(h('h3', {}, 'Выполненные')); done.forEach(item); }
    list.append(h('h3', {}, 'Летопись'));
    const lore = [...G.world.readTablets];
    list.append(h('div', { class: 'qitem' + (this.selQuest === '__lore' ? ' sel' : ''), onclick: () => { this.selQuest = '__lore'; this._renderBook(); } }, h('b', {}, `Скрижали Раскола (${lore.length}/7)`), h('small', {}, 'История мира')));
    list.append(h('div', { class: 'qitem' + (this.selQuest === '__best' ? ' sel' : ''), onclick: () => { this.selQuest = '__best'; this._renderBook(); } }, h('b', {}, 'Бестиарий и регионы'), h('small', {}, 'Кто водится на острове')));
    const det = h('div', { class: 'qdetail' });
    const q = this.selQuest;
    if (q === '__lore') {
      det.append(h('h2', {}, 'Скрижали Раскола'));
      if (!lore.length) det.append(h('p', {}, 'Вы ещё не нашли ни одной скрижали. Ищите каменные плиты с золотым знаком.'));
      for (const id of Object.keys(LORE)) if (G.world.readTablets.has(id)) det.append(h('div', { class: 'lore-entry' }, h('b', {}, LORE[id].title), h('p', {}, LORE[id].text)));
    } else if (q === '__best') {
      det.append(h('h2', {}, 'Регионы Эйрамора'));
      for (const r of REGIONS) det.append(h('div', { class: 'lore-entry' }, h('b', {}, `${r.name} · ур. ${r.levels[0]}–${r.levels[1]}`), h('p', {}, r.desc)));
      det.append(h('h2', {}, 'Хранители Осколков'));
      for (const bb of BOSSES) { const e = ENEMIES[bb.type]; det.append(h('div', { class: 'lore-entry' }, h('b', {}, `${e.name} — ${e.title}`), h('p', {}, `Уровень ${bb.level}. ${G.enemies.deadBosses.has(bb.id) ? 'Повержен.' : 'Ещё жив.'}`))); }
    } else if (q) {
      const d = QUESTS[q], st = Q.s[q];
      det.append(h('h2', {}, d.name), h('div', { style: { color: 'var(--muted)', fontSize: '13px' } }, `${d.kind === 'main' ? `Сюжет · Акт ${d.act}` : 'Побочное задание'} · выдаёт: ${NPCS[d.giver]?.name || '—'} · рекомендуемый уровень ${d.level}`), h('p', {}, d.summary));
      d.objectives.forEach((o, i) => {
        const ok = st.state !== 'active' || i < st.obj;
        const cur = st.state === 'active' && i === st.obj;
        det.append(h('div', { class: 'obj' + (ok ? ' ok' : '') + (cur ? ' cur' : '') }, cur ? Q.objText(q) : o.text));
      });
      if (d.turnIn) det.append(h('div', { class: 'obj' + (st.state === 'done' ? ' ok' : st.state === 'ready' ? ' cur' : '') }, `Вернуться к: ${NPCS[d.turnIn].name}`));
      det.append(h('h3', {}, 'Награда'), h('div', {}, rewardText(d.rewards || {}) || '—'));
      if (st.state !== 'done') det.append(h('div', { style: { marginTop: '16px', display: 'flex', gap: '8px' } },
        h('button', { class: 'btn small' + (Q.tracked === q ? ' primary' : ''), onclick: () => { Q.tracked = q; this._renderBook(); } }, Q.tracked === q ? 'Отслеживается' : 'Отслеживать'),
        h('button', { class: 'btn small', onclick: () => { this.bookTab = 'map'; this._mapFocus = Q.target(q); this._renderTabs(); this._renderBook(); } }, 'Показать на карте')));
    }
    b.append(h('div', { class: 'journal' }, list, det));
  }

  _mapTab(b) {
    const canvas = h('canvas');
    const box = h('div', { class: 'mapbox' }, canvas);
    const tipEl = h('div', { class: 'maptip hidden' });
    box.append(tipEl);
    const legend = h('div', { class: 'maplegend' });
    b.append(h('div', { class: 'mapwrap', style: { height: '100%' } }, box, legend));
    const P = G.player;
    const inCombat = G.enemies.inCombat();
    legend.append(h('h3', { style: { marginTop: 0 } }, 'Путевые камни'), h('div', { style: { color: 'var(--muted)', fontSize: '12px', marginBottom: '6px' } }, inCombat ? 'Нельзя путешествовать во время боя.' : 'Клик — мгновенное путешествие.'));
    for (const w of WAYSTONES) {
      const on = G.world.activated.has(w.id) && (!w.insideDome || G.world.domeOpen);
      legend.append(h('div', { class: 'ws' + (on && !inCombat ? '' : ' off'), onclick: () => { if (on && !inCombat) { this.closeModal(); G.game.travel(w.id); } } },
        h('b', { style: { color: on ? 'var(--accent)' : 'var(--muted)' } }, on ? '◆ ' : '◇ ', w.name), h('div', { style: { fontSize: '11px', color: 'var(--muted)' } }, REGIONS.find((r) => r.id === w.region).name)));
    }
    legend.append(h('h3', {}, 'Обозначения'),
      h('div', { class: 'li' }, h('span', { style: { color: '#ffd27a', fontWeight: 700 } }, '◆'), 'Цель задания'),
      h('div', { class: 'li' }, h('span', { style: { color: '#ffd27a', fontWeight: 700 } }, '!'), 'Новое задание'),
      h('div', { class: 'li' }, h('span', { style: { color: '#ff5a5a' } }, '◯'), 'Хранитель Осколка'),
      h('div', { class: 'li' }, h('span', { style: { color: '#7fe8ff' } }, '◆'), 'Путевой камень'));
    const draw = () => {
      const W = box.clientWidth, H = box.clientHeight;
      canvas.width = W * devicePixelRatio; canvas.height = H * devicePixelRatio;
      const ctx = canvas.getContext('2d');
      ctx.scale(devicePixelRatio, devicePixelRatio);
      const S = Math.min(W, H) * 0.98;
      const ox = (W - S) / 2, oy = (H - S) / 2;
      ctx.fillStyle = '#0e2030'; ctx.fillRect(0, 0, W, H);
      ctx.drawImage(G.game.mapCanvas, ox, oy, S, S);
      // туман войны
      const fog = document.createElement('canvas');
      fog.width = fog.height = MAP_GRID;
      const fctx = fog.getContext('2d');
      const img = fctx.createImageData(MAP_GRID, MAP_GRID);
      const disc = G.game.discovered;
      for (let i = 0; i < disc.length; i++) { img.data[i * 4] = 8; img.data[i * 4 + 1] = 7; img.data[i * 4 + 2] = 14; img.data[i * 4 + 3] = disc[i] ? 0 : 215; }
      fctx.putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(fog, ox, oy, S, S);
      const M = (x, z) => { const p = toMap(x, z, S); return { x: ox + p.x, y: oy + p.y }; };
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const r of REGIONS) {
        const p = M(r.center[0], r.center[1]);
        ctx.font = '700 italic 18px "Cormorant Garamond", serif';
        ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(r.name, p.x + 1, p.y + 1);
        ctx.fillStyle = '#f1ecdf'; ctx.fillText(r.name, p.x, p.y);
        ctx.font = '11px Rubik, sans-serif'; ctx.fillStyle = '#c8c0d8'; ctx.fillText(`ур. ${r.levels[0]}–${r.levels[1]}`, p.x, p.y + 15);
      }
      if (!G.world.domeOpen) { const c = M(20, -560); ctx.strokeStyle = 'rgba(176,138,255,.8)'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.arc(c.x, c.y, (150 / (CONFIG.WORLD_HALF * 2)) * S, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
      for (const bb of BOSSES) { if (G.enemies.deadBosses.has(bb.id)) continue; const p = M(bb.x, bb.z); ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.stroke(); }
      for (const w of WAYSTONES) {
        const p = M(w.x, w.z); const on = G.world.activated.has(w.id);
        ctx.fillStyle = on ? '#7fe8ff' : '#6a7080';
        ctx.beginPath(); ctx.moveTo(p.x, p.y - 7); ctx.lineTo(p.x + 5, p.y); ctx.lineTo(p.x, p.y + 7); ctx.lineTo(p.x - 5, p.y); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.font = 'bold 16px Rubik, sans-serif';
      for (const n of G.npcs.list) { const mk = G.quests.markerFor(n.id); if (!mk) continue; const p = M(n.def.x, n.def.z); ctx.fillStyle = '#000'; ctx.fillText(mk.t, p.x + 1, p.y + 1); ctx.fillStyle = mk.main ? '#ffd27a' : '#fff'; ctx.fillText(mk.t, p.x, p.y); }
      for (const qid of Object.keys(G.quests.s)) {
        const t = G.quests.target(qid); if (!t) continue;
        const p = M(t.x, t.z); const tr = qid === G.quests.tracked;
        ctx.fillStyle = tr ? '#ffd27a' : 'rgba(255,210,122,.55)'; ctx.strokeStyle = '#1a1208'; ctx.lineWidth = 1.5;
        const r = tr ? 8 : 5;
        ctx.beginPath(); ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x + r * 0.75, p.y); ctx.lineTo(p.x, p.y + r); ctx.lineTo(p.x - r * 0.75, p.y); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      const pp = M(P.pos.x, P.pos.z);
      ctx.save(); ctx.translate(pp.x, pp.y); ctx.rotate(Math.PI - P.heading);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      if (this._mapFocus) { const f = M(this._mapFocus.x, this._mapFocus.z); ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(f.x, f.y, 14 + Math.sin(performance.now() / 200) * 2, 0, Math.PI * 2); ctx.stroke(); }
      this._mapGeom = { ox, oy, S };
    };
    requestAnimationFrame(draw);
    canvas.onmousemove = (e) => {
      const g = this._mapGeom; if (!g) return;
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const w = fromMap(mx - g.ox, my - g.oy, g.S);
      let best = null, bd = 18;
      const cands = [...WAYSTONES.map((x) => ({ x: x.x, z: x.z, t: `${x.name}${G.world.activated.has(x.id) ? '' : ' (не пробуждён)'}` })),
        ...BOSSES.filter((x) => !G.enemies.deadBosses.has(x.id)).map((x) => ({ x: x.x, z: x.z, t: `${ENEMIES[x.type].name}, ур. ${x.level}` })),
        ...G.npcs.list.map((n) => ({ x: n.def.x, z: n.def.z, t: `${n.name} — ${n.title}` }))];
      for (const c of cands) { const p = toMap(c.x, c.z, g.S); const d = Math.hypot(p.x + g.ox - mx, p.y + g.oy - my); if (d < bd) { bd = d; best = c; } }
      if (best) { tipEl.classList.remove('hidden'); tipEl.textContent = best.t; tipEl.style.left = mx + 'px'; tipEl.style.top = my + 'px'; }
      else tipEl.classList.add('hidden');
      void w;
    };
    canvas.onmouseleave = () => tipEl.classList.add('hidden');
  }

  // ------------- сервисы NPC -------------
  openService(kind, npcId) {
    const npc = NPCS[npcId];
    if (kind === 'shop') return this._shop(npcId, npc);
    if (kind === 'craft') return this._craft(npc);
    if (kind === 'smith') return this._smith(npc);
  }

  _serviceShell(title, sub) {
    const body = h('div', { class: 'cols', style: { marginTop: '10px' } });
    const goldEl = h('div', { class: 'gold', style: { textShadow: 'none', fontSize: '16px' } });
    const panel = h('div', { class: 'panel service' }, h('button', { class: 'x-btn', onclick: () => this.closeModal(), html: icon('close', 18) }),
      h('div', { class: 'toolbar' }, h('div', { style: { flex: 1 } }, h('h2', { style: { margin: 0 } }, title), h('div', { style: { color: 'var(--muted)' } }, sub)), goldEl), body);
    const el = h('div', { class: 'screen dim', onclick: (e) => { if (e.target === el) this.closeModal(); } }, panel);
    this._open(el, 'service');
    return { body, goldEl };
  }

  _row(e, right, onTip) {
    const c = e.kind === 'gear' ? RARITY[e.rarity].color : itemColor(e);
    const row = h('div', { class: 'row-item' }, h('div', { class: 'ic', style: { borderColor: c }, html: entryIcon(e, 30) }),
      h('div', { class: 'nm', style: { color: c } }, itemName(e) + (e.kind === 'stack' && e.n > 1 ? ` ×${e.n}` : ''), h('small', {}, e.kind === 'gear' ? `${RARITY[e.rarity].name} · ${SLOTS[e.slot]} · ур. ${e.level}` : ITEMS[e.id].desc)), right);
    row.onmouseenter = () => this.showTip(onTip ? onTip() : this.itemTip(e)); row.onmouseleave = () => this.hideTip();
    return row;
  }

  _shop(npcId, npc) {
    const { body, goldEl } = this._serviceShell(`Торговля — ${npc.name}`, npc.title);
    const render = () => {
      clear(body); this.hideTip();
      const P = G.player;
      goldEl.innerHTML = icon('gold', 18) + P.gold;
      const left = h('div', { class: 'scroll' }, h('h3', { style: { marginTop: 0 } }, 'Товары'));
      G.shop.stockFor(npcId).forEach((e, i) => {
        const price = G.shop.buyPrice(e);
        left.append(this._row(e, h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, h('span', { class: 'pr' }, price + ' з.'), h('button', { class: 'btn small', disabled: P.gold < price, onclick: () => { G.shop.buy(npcId, i); render(); } }, 'Купить')), () => this.itemTip(e, { price })));
      });
      const right = h('div', { class: 'scroll' }, h('h3', { style: { marginTop: 0 } }, 'Ваша сумка — продажа'));
      P.inventory.slots.forEach((e, i) => {
        if (!e) return;
        const t = e.kind === 'stack' ? ITEMS[e.id].type : 'gear';
        if (t === 'quest' || t === 'shard') return;
        const v = sellValue(e) * (e.kind === 'stack' ? e.n : 1);
        right.append(this._row(e, h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } }, h('span', { class: 'pr' }, v + ' з.'), h('button', { class: 'btn small', onclick: () => { G.shop.sell(i); render(); } }, 'Продать'))));
      });
      body.append(left, right);
    };
    this._renderService = render;
    render();
  }

  _craft(npc) {
    const { body, goldEl } = this._serviceShell(`Алхимия — ${npc.name}`, 'Котёл травницы: зелья и эликсиры из собранных трав');
    const render = () => {
      clear(body); this.hideTip();
      const P = G.player;
      goldEl.innerHTML = icon('gold', 18) + P.gold;
      const left = h('div', { class: 'scroll' }, h('h3', { style: { marginTop: 0 } }, 'Рецепты'));
      for (const r of RECIPES) {
        const out = { kind: 'stack', id: r.out, n: r.n };
        const ins = h('div', { class: 'recipe-in' }, ...Object.entries(r.inputs).map(([id, n]) => h('span', { class: P.inventory.has(id, n) ? 'ok' : 'no' }, `${ITEMS[id].name} ${P.inventory.count(id)}/${n}  `)), r.gold ? h('span', { class: P.gold >= r.gold ? 'ok' : 'no' }, `· ${r.gold} з.`) : null);
        const row = this._row(out, h('button', { class: 'btn small', disabled: !G.shop.canCraft(r), onclick: () => { G.shop.craft(r.id); render(); } }, 'Сварить'));
        row.querySelector('.nm small').replaceWith(ins);
        left.append(row);
      }
      const right = h('div', { class: 'scroll' }, h('h3', { style: { marginTop: 0 } }, 'Ингредиенты в сумке'));
      const mats = P.inventory.slots.filter((e) => e && e.kind === 'stack' && ITEMS[e.id].type === 'material');
      if (!mats.length) right.append(h('p', { style: { color: 'var(--muted)' } }, 'Собирайте травы и кристаллы в мире (E), чтобы варить зелья.'));
      for (const e of mats) right.append(this._row(e, null));
      body.append(left, right);
    };
    this._renderService = render;
    render();
  }

  _smith(npc) {
    const { body, goldEl } = this._serviceShell(`Кузня — ${npc.name}`, 'Улучшение до +5 (каждый уровень +10% к свойствам) и разбор на звёздный пепел');
    const render = () => {
      clear(body); this.hideTip();
      const P = G.player;
      goldEl.innerHTML = icon('gold', 18) + P.gold + ` · пепел ×${P.inventory.count('star_ash')}`;
      const left = h('div', { class: 'scroll' }, h('h3', { style: { marginTop: 0 } }, 'Улучшение'));
      const list = [...SLOT_ORDER.map((s) => P.equipment[s]).filter(Boolean), ...P.inventory.slots.filter((e) => e?.kind === 'gear')];
      for (const it of list) {
        const c = upgradeCost(it);
        const maxed = (it.up || 0) >= 5;
        const can = !maxed && P.gold >= c.gold && P.inventory.has('star_ash', c.ash);
        left.append(this._row(it, h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
          h('span', { class: 'pr', style: { fontSize: '12px' } }, maxed ? 'макс.' : `${c.gold} з. · ${c.ash} пепла`),
          h('button', { class: 'btn small', disabled: !can, onclick: () => { G.shop.upgrade(it); render(); } }, `+${(it.up || 0) + 1}`))));
      }
      const right = h('div', { class: 'scroll' }, h('h3', { style: { marginTop: 0 } }, 'Разбор вещей из сумки'));
      P.inventory.slots.forEach((e, i) => {
        if (e?.kind !== 'gear') return;
        right.append(this._row(e, h('button', { class: 'btn small', onclick: () => { G.shop.salvage(i); render(); } }, `Разобрать (+${salvageYield(e)})`)));
      });
      body.append(left, right);
    };
    this._renderService = render;
    render();
  }

  update(dt) {
    if (G.game.state === 'play') this.hud.update(dt);
    if (this.touchCtl === undefined && G.input) this.touchCtl = setupTouch(this.root);
    this.touchCtl?.update();
  }
}
