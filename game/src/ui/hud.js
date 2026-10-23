import * as THREE from 'three';
import { CONFIG, SCHOOLS, RARITY } from '../config.js';
import { G } from '../state.js';
import { SKILLS } from '../data/skills.js';
import { QUESTS } from '../data/quests.js';
import { WAYSTONES, BOSSES } from '../data/locations.js';
import { STATUS } from '../systems/status.js';
import { itemName } from '../systems/items.js';
import { h, icon, skillIcon } from './dom.js';
import { toMap } from './map.js';

const _p = new THREE.Vector3();

export class HUD {
  constructor(root) {
    this.root = h('div', { id: 'hud' });
    root.append(this.root);
    this._build();
    this.floats = [];
    this.platePool = []; this.ebarPool = [];
    this.mmT = 0;
    this.toastList = [];
  }

  _build() {
    const R = this.root;
    // Персонаж
    this.lvl = h('div', { class: 'plevel' }, '1');
    this.ptsBadge = h('span', { class: 'pts hidden' }, '');
    this.lvl.append(this.ptsBadge);
    this.pname = h('div', { class: 'pname' });
    const bar = (cls) => { const b = h('div', { class: 'bar ' + cls }, h('i', { class: 'lag' }), h('i', { class: 'f' }), h('span')); return b; };
    this.hpBar = bar('hp'); this.mpBar = bar('mp'); this.staBar = bar('sta thin');
    this.buffs = h('div', { class: 'buffs' });
    R.append(h('div', { class: 'hud-tl' }, h('div', { class: 'pframe' }, this.lvl, h('div', { class: 'bars' }, this.pname, this.hpBar, this.mpBar, this.staBar)), this.buffs));
    // Миникарта
    this.mm = h('canvas', { width: 176, height: 176 });
    this.mmctx = this.mm.getContext('2d');
    this.regionEl = h('div', { class: 'region-name' });
    this.clockEl = h('div', { class: 'clock' });
    this.goldEl = h('div', { class: 'gold' });
    R.append(h('div', { class: 'hud-tr' }, h('div', { class: 'minimap' }, this.mm, h('div', { class: 'n' }, 'С')), this.regionEl, this.clockEl, this.goldEl));
    // Трекер
    this.tracker = h('div', { class: 'tracker' });
    R.append(this.tracker);
    // Панель заклинаний
    this.slots = [];
    const hb = h('div', { class: 'hotbar' });
    const basic = h('div', { class: 'slot small', title: 'Тайный снаряд (ЛКМ)' }, h('div', { html: skillIcon('arcane', '#c7a6ff', 34) }), h('span', { class: 'key' }, 'ЛКМ'));
    hb.append(basic, h('div', { class: 'sep' }));
    for (let i = 0; i < 6; i++) {
      const s = h('div', { class: 'slot interactive' }, h('div', { class: 'ic' }), h('div', { class: 'cd' }), h('div', { class: 'cdt' }), h('span', { class: 'key' }, String(i + 1)));
      s.addEventListener('pointerdown', (e) => { e.preventDefault(); if (G.game.state === 'play' && !G.ui.blocking) G.player.tryCast(G.player.hotbar[i]); });
      this.slots.push(s); hb.append(s);
    }
    hb.append(h('div', { class: 'sep' }));
    this.potHp = h('div', { class: 'slot small' }, h('div', { html: icon('potion', 26, '#ff5a5a') }), h('div', { class: 'cd' }), h('span', { class: 'key' }, 'Q'), h('span', { class: 'cnt' }));
    this.potMp = h('div', { class: 'slot small' }, h('div', { html: icon('potion', 26, '#5aa9ff') }), h('div', { class: 'cd' }), h('span', { class: 'key' }, 'R'), h('span', { class: 'cnt' }));
    this.potHp.classList.add('interactive'); this.potMp.classList.add('interactive');
    this.potHp.addEventListener('pointerdown', (e) => { e.preventDefault(); G.player.drink('potion_hp'); });
    this.potMp.addEventListener('pointerdown', (e) => { e.preventDefault(); G.player.drink('potion_mp'); });
    hb.append(this.potHp, this.potMp);
    this.xpFill = h('i');
    this.xpTxt = h('div', { class: 'xptxt' });
    R.append(h('div', { class: 'hotbar-wrap' }, hb, h('div', { class: 'xpbar' }, this.xpFill), this.xpTxt));
    // Прочее
    this.cross = h('div', { class: 'crosshair' }, h('i'));
    this.target = h('div', { class: 'target hidden' }, h('div', { class: 'tn' }), bar('t'), h('div', { class: 'ts' }));
    this.boss = h('div', { class: 'bossbar hidden' }, h('div', { class: 'bn' }), h('div', { class: 'bt' }), bar('b'), h('div', { class: 'shield hidden' }, 'Защищён силой Осколка'));
    this.prompt = h('div', { class: 'prompt hidden' });
    this.toasts = h('div', { class: 'toasts' });
    this.banner = h('div', { class: 'banner' });
    this.bossSayEl = h('div', { class: 'bosssay hidden' });
    this.floatLayer = h('div', { class: 'floats' });
    this.plates = h('div', { class: 'plates' });
    this.waypoint = h('div', { class: 'waypoint hidden' }, h('div', { class: 'wd' }), h('div', { class: 'wt' }));
    this.vignette = h('div', { class: 'vignette' });
    this.fps = h('div', { class: 'fps hidden' });
    R.prepend(this.vignette, this.plates, this.floatLayer);
    R.append(this.cross, this.target, this.boss, this.prompt, this.toasts, this.banner, this.bossSayEl, this.waypoint, this.fps);
  }

  setVisible(v) { this.root.classList.toggle('hidden', !v); }

  project(x, y, z) {
    _p.set(x, y, z).project(G.camera.cam);
    if (_p.z > 1) return null;
    return { x: (_p.x * 0.5 + 0.5) * innerWidth, y: (-_p.y * 0.5 + 0.5) * innerHeight, behind: _p.z > 1 };
  }

  // ---------------- всплывающие числа ----------------
  floatText(pos, text, color = '#fff', scale = 1, yOff = 1.8) {
    let f = this.floats.find((x) => !x.alive);
    if (!f) {
      if (this.floats.length > 50) return;
      f = { el: h('div', { class: 'ft' }), alive: false };
      this.floatLayer.append(f.el); this.floats.push(f);
    }
    f.alive = true; f.t = 0; f.x = pos.x + (Math.random() - 0.5) * 0.6; f.y = pos.y + yOff; f.z = pos.z + (Math.random() - 0.5) * 0.6;
    f.vx = (Math.random() - 0.5) * 30;
    f.el.textContent = text; f.el.style.color = color; f.el.style.fontSize = `${Math.round(17 * scale)}px`;
    f.el.style.display = 'block';
  }

  toast(text, kind = 'info', item = null) {
    const el = h('div', { class: 'toast ' + kind });
    if (item?.kind === 'gear') el.innerHTML = `Добыча: <b style="color:${RARITY[item.rarity].color}">${itemName(item)}</b>`;
    else el.textContent = text;
    this.toasts.prepend(el);
    while (this.toasts.children.length > 6) this.toasts.lastChild.remove();
    setTimeout(() => el.classList.add('out'), 4200);
    setTimeout(() => el.remove(), 4700);
  }

  showBanner(b1, b2, b3 = '') {
    this.banner.className = 'banner';
    this.banner.innerHTML = '';
    this.banner.append(h('div', { class: 'b1' }, b1), h('div', { class: 'b2' }, b2), b3 ? h('div', { class: 'b3' }, b3) : null);
    void this.banner.offsetWidth;
    this.banner.className = 'banner show';
  }

  bossSay(name, text) {
    this.bossSayEl.innerHTML = '';
    this.bossSayEl.append(h('b', {}, name), `«${text}»`);
    this.bossSayEl.classList.remove('hidden');
    clearTimeout(this._bsT);
    this._bsT = setTimeout(() => this.bossSayEl.classList.add('hidden'), 5500);
  }

  setPrompt(t) {
    if (!t) { this.prompt.classList.add('hidden'); this._prompt = null; return; }
    if (this._prompt === t) return;
    this._prompt = t;
    this.prompt.innerHTML = `<kbd>E</kbd>${t}`;
    this.prompt.classList.remove('hidden');
  }

  _setBar(bar, v, max, label = true) {
    const k = max > 0 ? Math.max(0, Math.min(1, v / max)) : 0;
    bar.children[1].style.transform = `scaleX(${k})`;
    bar.children[0].style.transform = `scaleX(${k})`;
    if (label) bar.children[2].textContent = `${Math.ceil(v)} / ${Math.round(max)}`;
  }

  // ---------------- кадр ----------------
  update(dt) {
    const P = G.player, st = P.stats;
    this.lvl.firstChild.nodeValue = String(P.level);
    const pts = P.attrPoints + P.skillPoints;
    this.ptsBadge.classList.toggle('hidden', pts <= 0);
    this.ptsBadge.textContent = '+' + pts;
    this.pname.textContent = P.name;
    this._setBar(this.hpBar, P.hp, st.maxHp);
    this._setBar(this.mpBar, P.mp, st.maxMp);
    this._setBar(this.staBar, P.sta, st.maxSta, false);
    const low = P.hp / st.maxHp;
    this.vignette.style.boxShadow = `inset 0 0 ${low < 0.3 ? 200 : 160}px rgba(200,20,20,${low < 0.3 ? (0.3 - low) * 2 + 0.1 * Math.sin(G.time * 6) + 0.1 : 0})`;
    // баффы
    const keys = Object.keys(P.statuses);
    const sig = keys.map((k) => k + Math.ceil(P.statuses[k].t)).join();
    if (sig !== this._buffSig) {
      this._buffSig = sig; this.buffs.innerHTML = '';
      for (const k of keys) { const d = STATUS[k]; this.buffs.append(h('div', { class: 'buff', style: { borderColor: d.color, color: d.color }, title: d.name }, `${d.name.split(' ')[0].slice(0, 7)} ${Math.ceil(P.statuses[k].t)}`)); }
    }
    // панель
    for (let i = 0; i < 6; i++) {
      const id = P.hotbar[i], s = this.slots[i];
      const icEl = s.children[0];
      if (icEl.dataset.id !== (id || '')) {
        icEl.dataset.id = id || '';
        icEl.innerHTML = id ? skillIcon(SKILLS[id].icon, SCHOOLS[SKILLS[id].school].color, 44) : '';
        s.classList.toggle('empty', !id);
        s.title = id ? SKILLS[id].name : 'Пусто — назначьте навык в книге (K)';
      }
      const cdEl = s.children[1], cdt = s.children[2];
      if (id) {
        const left = P.cds[id] || 0, total = G.spells.cooldown(id, P.skills[id] || 1);
        cdEl.style.transform = `scaleY(${left > 0 ? Math.min(1, left / total) : 0})`;
        cdt.textContent = left > 0.05 ? (left < 3 ? left.toFixed(1) : Math.ceil(left)) : '';
        s.classList.toggle('nomana', P.mp < G.spells.manaCost(id, P.skills[id] || 1));
      } else { cdEl.style.transform = 'scaleY(0)'; cdt.textContent = ''; }
    }
    const pc = Math.max(0, P.potionCd) / CONFIG.PLAYER.potionCd;
    this.potHp.children[1].style.transform = `scaleY(${pc})`; this.potMp.children[1].style.transform = `scaleY(${pc})`;
    this.potHp.lastChild.textContent = P.inventory.count('potion_hp');
    this.potMp.lastChild.textContent = P.inventory.count('potion_mp');
    const need = P.xpToNext();
    this.xpFill.style.width = `${P.level >= CONFIG.PROGRESSION.maxLevel ? 100 : (P.xp / need) * 100}%`;
    this.xpTxt.textContent = P.level >= CONFIG.PROGRESSION.maxLevel ? 'Максимальный уровень' : `Опыт: ${Math.floor(P.xp)} / ${need}`;
    // регион, время, золото
    const reg = G.game.region;
    if (reg && this._reg !== reg.id) { this._reg = reg.id; this.regionEl.textContent = reg.name; }
    const tod = G.world.tod * 24;
    const hh = Math.floor(tod), mm = Math.floor((tod - hh) * 60);
    this.clockEl.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} · ${tod > 6 && tod < 20 ? 'день' : 'ночь'}`;
    this.goldEl.innerHTML = `${icon('gold', 16)}${P.gold}`;
    this._tracker();
    this._target();
    this._boss();
    this._floats(dt);
    this._plates();
    this._waypoint();
    this.mmT -= dt;
    if (this.mmT <= 0) { this.mmT = 0.066; this._minimap(); }
    if (G.settings.showFps) {
      this.fps.classList.remove('hidden');
      const ri = G.renderer.info.render;
      this.fps.textContent = `FPS ${G.game.fps.toFixed(0)} · вызовы ${ri.calls} · треуг. ${(ri.triangles / 1000).toFixed(0)}k · враги ${G.enemies.list.length} · ${P.pos.x.toFixed(0)}, ${P.pos.z.toFixed(0)}`;
    } else this.fps.classList.add('hidden');
  }

  _tracker() {
    const Q = G.quests;
    const id = Q.tracked;
    const P = G.player;
    let sig = id ? id + Q.objText(id) : '';
    const sides = Object.keys(Q.s).filter((q) => q !== id && Q.s[q].state !== 'done').slice(0, 2);
    sig += sides.map((q) => q + Q.objText(q)).join();
    const t = id ? Q.target(id) : null;
    const dist = t ? Math.round(Math.hypot(t.x - P.pos.x, t.z - P.pos.z)) : null;
    sig += Math.round((dist || 0) / 10);
    if (sig === this._trackSig) return;
    this._trackSig = sig;
    this.tracker.innerHTML = '';
    if (id) {
      this.tracker.append(h('div', { class: 'qt' }, QUESTS[id].name), h('div', { class: 'qo' }, Q.objText(id)));
      if (dist != null) this.tracker.append(h('div', { class: 'qd' }, `◆ ${t.label} — ${dist} м`));
    }
    for (const q of sides) this.tracker.append(h('div', { class: 'side' }, h('div', { class: 'qt' }, QUESTS[q].name), h('div', { class: 'qo' }, Q.objText(q))));
  }

  _target() {
    const cam = G.camera;
    const hit = G.enemies.raycast(cam.cam.position, cam.lookDir, 70);
    const e = hit?.enemy || (G.player.lastTarget?.alive && G.time - (G.player.lastTarget.lastHit || 0) < 4 ? G.player.lastTarget : null);
    this.cross.classList.toggle('on', !!hit);
    if (!e || e.boss) { this.target.classList.add('hidden'); return; }
    this.target.classList.remove('hidden');
    const diff = e.level - G.player.level;
    const lc = diff >= 4 ? '#ff5a5a' : diff >= 2 ? '#ffb347' : diff <= -5 ? '#8a8a8a' : '#e8e8e8';
    this.target.children[0].innerHTML = `${e.elite ? '<em>★ </em>' : ''}${e.name} <span style="color:${lc}">[${e.level}]</span>`;
    this._setBar(this.target.children[1], e.hp, e.maxHp);
    const sts = Object.keys(e.statuses).map((k) => STATUS[k]?.name).filter(Boolean).join(' · ');
    this.target.children[2].textContent = `${e.def.family}${sts ? ' — ' + sts : ''}`;
  }

  _boss() {
    const b = G.enemies.engagedBoss();
    if (!b) { this.boss.classList.add('hidden'); return; }
    this.boss.classList.remove('hidden');
    this.boss.children[0].textContent = `${b.def.name} [${b.level}]`;
    this.boss.children[1].textContent = b.def.title || '';
    this._setBar(this.boss.children[2], b.hp, b.maxHp);
    this.boss.children[3].classList.toggle('hidden', !b.shielded);
  }

  _floats(dt) {
    for (const f of this.floats) {
      if (!f.alive) continue;
      f.t += dt;
      if (f.t > 1.1) { f.alive = false; f.el.style.display = 'none'; continue; }
      const s = this.project(f.x, f.y + f.t * 1.4, f.z);
      if (!s) { f.el.style.display = 'none'; continue; }
      f.el.style.display = 'block';
      const k = f.t < 0.12 ? 1 + (0.12 - f.t) * 4 : 1;
      f.el.style.transform = `translate(${s.x + f.vx * f.t - 20}px, ${s.y}px) scale(${k})`;
      f.el.style.opacity = f.t > 0.7 ? String(1 - (f.t - 0.7) / 0.4) : '1';
    }
  }

  _plates() {
    const P = G.player;
    let pi = 0, ei = 0;
    const plate = () => {
      let el = this.platePool[pi];
      if (!el) { el = h('div', { class: 'plate' }); this.plates.append(el); this.platePool.push(el); }
      pi++; el.style.display = 'block'; return el;
    };
    for (const n of G.npcs.list) {
      const d = Math.hypot(n.pos.x - P.pos.x, n.pos.z - P.pos.z);
      const mk = G.quests.markerFor(n.id);
      if (d > (mk ? 60 : 22)) continue;
      const s = this.project(n.pos.x, n.pos.y + 2.35 * (n.def.model.scale || 1), n.pos.z);
      if (!s) continue;
      const el = plate();
      const sig = n.id + (mk ? mk.t + mk.main : '') + (d < 22);
      if (el.dataset.sig !== sig) {
        el.dataset.sig = sig;
        el.innerHTML = (mk ? `<div class="mk ${mk.main ? '' : 'side'}">${mk.t}</div>` : '') + (d < 22 ? `<div class="pn">${n.name}</div><div class="pt">${n.title}</div>` : '');
      }
      el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
    }
    for (const b of G.loot.bags) {
      const d = Math.hypot(b.x - P.pos.x, b.z - P.pos.z);
      if (d > 14) continue;
      const s = this.project(b.x, b.y + 1.2, b.z); if (!s) continue;
      const el = plate();
      const sig = 'b' + b.item.uid + b.item.id;
      if (el.dataset.sig !== sig) {
        el.dataset.sig = sig;
        const c = b.item.kind === 'gear' ? RARITY[b.item.rarity].color : '#ffd27a';
        el.innerHTML = `<div class="pn" style="color:${c};font-size:12px">${itemName(b.item)}</div>`;
      }
      el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
    }
    for (; pi < this.platePool.length; pi++) this.platePool[pi].style.display = 'none';
    // полоски здоровья врагов
    for (const e of G.enemies.list) {
      if (!e.alive || e.boss) continue;
      const d = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z);
      if (d > 34 || (e.hp >= e.maxHp && e.state !== 'chase' && !e.elite && e.team !== 'ally')) continue;
      const s = this.project(e.pos.x, e.pos.y + e.height + 0.5, e.pos.z); if (!s) continue;
      let el = this.ebarPool[ei];
      if (!el) { el = h('div', { class: 'ebar' }, h('div', { class: 'el' }), h('div', { class: 'bar' }, h('i', { class: 'lag' }), h('i', { class: 'f' }), h('span'))); this.plates.append(el); this.ebarPool.push(el); }
      ei++;
      el.style.display = 'block';
      el.className = 'ebar' + (e.elite ? ' elite' : '');
      el.children[0].textContent = e.team === 'ally' ? e.name : `${e.elite ? '★ ' : ''}${e.level}`;
      const bf = el.children[1].children[1];
      bf.style.background = e.team === 'ally' ? '#7ee081' : '';
      this._setBar(el.children[1], e.hp, e.maxHp, false);
      el.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`;
    }
    for (; ei < this.ebarPool.length; ei++) this.ebarPool[ei].style.display = 'none';
  }

  _waypoint() {
    const Q = G.quests;
    const t = Q.tracked ? Q.target(Q.tracked) : null;
    if (!t || !G.settings.waypoint) { this.waypoint.classList.add('hidden'); return; }
    const P = G.player;
    const d = Math.hypot(t.x - P.pos.x, t.z - P.pos.z);
    if (d < 6) { this.waypoint.classList.add('hidden'); return; }
    const y = G.terrain.heightAt(t.x, t.z) + 3;
    _p.set(t.x, y, t.z).project(G.camera.cam);
    let x = (_p.x * 0.5 + 0.5) * innerWidth, yy = (-_p.y * 0.5 + 0.5) * innerHeight;
    if (_p.z > 1) { x = innerWidth - x; yy = innerHeight - 40; }
    const m = 40;
    x = Math.max(m, Math.min(innerWidth - m, x)); yy = Math.max(m + 40, Math.min(innerHeight - 120, yy));
    this.waypoint.classList.remove('hidden');
    this.waypoint.style.transform = `translate(${x}px, ${yy}px) translate(-50%, -50%)`;
    this.waypoint.children[1].textContent = `${Math.round(d)} м`;
  }

  _minimap() {
    const ctx = this.mmctx, map = G.game.mapCanvas;
    if (!map) return;
    const P = G.player, S = 176, R = 130;
    const ms = map.width;
    const k = ms / (CONFIG.WORLD_HALF * 2);
    const c = toMap(P.pos.x, P.pos.z, ms);
    ctx.save();
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#0e2030'; ctx.fillRect(0, 0, S, S);
    const src = R * k;
    ctx.drawImage(map, c.x - src, c.y - src, src * 2, src * 2, 0, 0, S, S);
    const sc = S / (R * 2);
    const W = (x, z) => ({ x: S / 2 + (x - P.pos.x) * sc, y: S / 2 + (z - P.pos.z) * sc });
    // путевые камни
    for (const w of WAYSTONES) {
      const p = W(w.x, w.z); if (p.x < -5 || p.x > S + 5 || p.y < -5 || p.y > S + 5) continue;
      ctx.fillStyle = G.world.activated.has(w.id) ? '#7fe8ff' : '#6a7080';
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 5); ctx.lineTo(p.x + 4, p.y); ctx.lineTo(p.x, p.y + 5); ctx.lineTo(p.x - 4, p.y); ctx.fill();
    }
    // враги
    for (const e of G.enemies.list) {
      if (!e.alive) continue;
      const p = W(e.pos.x, e.pos.z); if (p.x < 0 || p.x > S || p.y < 0 || p.y > S) continue;
      ctx.fillStyle = e.team === 'ally' ? '#7ee081' : e.boss ? '#ff3b3b' : e.elite ? '#ffb347' : '#e2494d';
      ctx.beginPath(); ctx.arc(p.x, p.y, e.boss ? 5 : 2.5, 0, Math.PI * 2); ctx.fill();
    }
    for (const b of BOSSES) {
      if (G.enemies.deadBosses.has(b.id)) continue;
      const p = W(b.x, b.z); if (p.x < 0 || p.x > S || p.y < 0 || p.y > S) continue;
      ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.stroke();
    }
    // NPC с заданиями
    ctx.font = 'bold 14px Rubik, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const n of G.npcs.list) {
      const mk = G.quests.markerFor(n.id);
      const p = W(n.pos.x, n.pos.z); if (p.x < 0 || p.x > S || p.y < 0 || p.y > S) continue;
      if (mk) { ctx.fillStyle = '#000'; ctx.fillText(mk.t, p.x + 1, p.y + 1); ctx.fillStyle = mk.main ? '#ffd27a' : '#f0f0f0'; ctx.fillText(mk.t, p.x, p.y); }
      else { ctx.fillStyle = '#e8e0c8'; ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2); ctx.fill(); }
    }
    // цель квеста
    const Q = G.quests, t = Q.tracked ? Q.target(Q.tracked) : null;
    if (t) {
      let p = W(t.x, t.z);
      const dx = p.x - S / 2, dy = p.y - S / 2, d = Math.hypot(dx, dy), maxR = S / 2 - 8;
      if (d > maxR) p = { x: S / 2 + (dx / d) * maxR, y: S / 2 + (dy / d) * maxR };
      ctx.fillStyle = '#ffd27a'; ctx.strokeStyle = '#1a1208'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(p.x, p.y - 6); ctx.lineTo(p.x + 5, p.y); ctx.lineTo(p.x, p.y + 6); ctx.lineTo(p.x - 5, p.y); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // игрок и обзор камеры
    const yaw = G.camera.yaw;
    ctx.translate(S / 2, S / 2);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 60, yaw - Math.PI / 2 - 0.55, yaw - Math.PI / 2 + 0.55); ctx.fill();
    ctx.rotate(Math.PI - G.player.heading);
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5.5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5.5, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
}
