import { bus } from '../core/events.js';
import { G } from '../state.js';
import { QUESTS } from '../data/quests.js';
import { NPCS } from '../data/npcs.js';
import { ITEMS } from '../data/items.js';
import { ENEMIES } from '../data/enemies.js';
import { WAYSTONES, CAMPS, BOSSES, QUEST_OBJECTS, TABLETS } from '../data/locations.js';
import { generateGear, makeUnique } from './items.js';

// Состояние квеста: { state: active|ready|done, obj: индекс цели, n: прогресс, consumed: [] }
export class Quests {
  constructor() {
    this.s = {};
    this.tracked = null;
    this.reachT = 0;
    bus.on('inventory', () => this.checkCollect());
  }

  get(id) { return this.s[id] || null; }
  state(id) { return this.s[id]?.state || 'none'; }
  def(id) { return QUESTS[id]; }

  available(id) {
    const q = QUESTS[id];
    if (!q || this.s[id]) return false;
    if (q.req) {
      const st = this.state(q.req.quest);
      if (q.req.state === 'active+') { if (st === 'none') return false; }
      else if (st !== 'done') return false;
    }
    return true;
  }

  start(id, silent = false) {
    if (this.s[id]) return;
    this.s[id] = { state: 'active', obj: 0, n: 0, consumed: [] };
    if (!this.tracked || QUESTS[id].kind === 'main') this.tracked = id;
    if (!silent) { G.ui?.questBanner('Новое задание', QUESTS[id].name); G.audio?.play('quest'); }
    for (const n of QUESTS[id].start || []) this.start(n, true);
    bus.emit('quest', id);
    this._autoCheck(id);
  }

  current(id) { const st = this.s[id]; if (!st || st.state !== 'active') return null; return QUESTS[id].objectives[st.obj] || null; }

  objText(id) {
    const st = this.s[id]; const q = QUESTS[id];
    if (!st) return '';
    if (st.state === 'ready') return `Вернуться: ${NPCS[q.turnIn]?.name || ''}`;
    if (st.state === 'done') return 'Выполнено';
    const o = q.objectives[st.obj];
    if (!o) return '';
    const cnt = this.progress(id);
    return o.count ? `${o.text} (${Math.min(cnt, o.count)}/${o.count})` : o.text;
  }

  progress(id) {
    const st = this.s[id]; const o = this.current(id);
    if (!o) return 0;
    if (o.type === 'collect') return G.player.inventory.count(o.target);
    if (o.type === 'shards') return G.player.shards.length;
    if (o.type === 'tablets') return G.world.readTablets.size;
    if (o.type === 'waystone' && o.count) return G.world.activated.size;
    return st.n;
  }

  _objDone(id) {
    const st = this.s[id]; const q = QUESTS[id];
    const prev = q.objectives[st.obj];
    if (prev?.type === 'talk') this._consumeBefore(id, st.obj);
    st.obj++; st.n = 0;
    if (st.obj >= q.objectives.length) {
      if (q.turnIn) { st.state = 'ready'; G.ui?.toast(`«${q.name}»: вернитесь к ${NPCS[q.turnIn].name}`, 'quest'); G.audio?.play('quest'); }
      else this.complete(id);
    } else {
      G.ui?.toast(`«${q.name}»: ${this.objText(id)}`, 'quest');
      this._autoCheck(id);
    }
    bus.emit('quest', id);
  }

  _consumeBefore(id, upto) {
    const st = this.s[id]; const q = QUESTS[id];
    for (let i = 0; i < upto; i++) {
      const o = q.objectives[i];
      if (o.type === 'collect' && o.consume && !st.consumed.includes(i)) { G.player.inventory.remove(o.target, o.count); st.consumed.push(i); }
    }
  }

  // Проверка целей, которые уже могут быть выполнены
  _autoCheck(id) {
    const o = this.current(id);
    if (!o) return;
    const p = this.progress(id);
    if ((o.type === 'collect' || o.type === 'shards' || o.type === 'tablets') && p >= (o.count || 1)) this._objDone(id);
    else if (o.type === 'waystone' && (o.count ? p >= o.count : G.world.activated.has(o.target))) this._objDone(id);
    else if (o.type === 'boss' && G.enemies.deadBosses.has(o.target)) this._objDone(id);
  }

  advance(id) {
    const o = this.current(id);
    if (o && o.type === 'talk') this._objDone(id);
  }

  complete(id) {
    const st = this.s[id]; const q = QUESTS[id];
    if (!st || st.state === 'done') return;
    this._consumeBefore(id, q.objectives.length);
    st.state = 'done';
    const P = G.player;
    const r = q.rewards || {};
    if (r.gold) { P.gold += r.gold; }
    for (const it of r.items || []) P.inventory.addStack(it.id, it.n);
    for (const g of r.gen || []) { const item = generateGear(Math.max(q.level, P.level), g.rarity, g.slot); if (!P.inventory.addGear(item)) G.loot.drop(P.pos.x, P.pos.z, item); }
    if (r.unique) { const item = makeUnique(r.unique, P.level); if (!P.inventory.addGear(item)) G.loot.drop(P.pos.x, P.pos.z, item); }
    if (r.skillPoints) { P.skillPoints += r.skillPoints; P.bonusSP += r.skillPoints; }
    if (r.flag) P.flags[r.flag] = true;
    if (r.xp) P.addXp(r.xp);
    G.ui?.questBanner('Задание выполнено', q.name, rewardText(r));
    G.audio?.play('quest');
    if (this.tracked === id) this.tracked = null;
    for (const n of q.next || []) this.start(n, true);
    if (q.next?.length) G.ui?.toast(`Новое задание: «${QUESTS[q.next[0]].name}»`, 'quest');
    if (!this.tracked) this.tracked = this.firstActive();
    bus.emit('quest', id);
    G.game?.save(true);
    if (id === 'mq7') G.game.finish();
  }

  firstActive() {
    let side = null;
    for (const [id, st] of Object.entries(this.s)) {
      if (st.state === 'done') continue;
      if (QUESTS[id].kind === 'main') return id;
      side = side || id;
    }
    return side;
  }

  // ---------------- события мира ----------------
  each(fn) { for (const id of Object.keys(this.s)) if (this.s[id].state === 'active') fn(id, this.current(id), this.s[id]); }

  onKill(type) {
    this.each((id, o, st) => { if (o?.type === 'kill' && o.target === type) { st.n++; if (st.n >= o.count) this._objDone(id); else bus.emit('quest', id); } });
  }
  onBoss(bossId) { this.each((id, o) => { if (o?.type === 'boss' && o.target === bossId) this._objDone(id); }); }
  onInteract(kind) {
    let used = false;
    this.each((id, o, st) => { if (!used && o?.type === 'interact' && o.target === kind) { used = true; st.n++; if (st.n >= (o.count || 1)) this._objDone(id); else bus.emit('quest', id); } });
    return used;
  }
  wantsInteract(kind) {
    let want = false;
    this.each((id, o) => { if (o?.type === 'interact' && o.target === kind) want = true; });
    return want;
  }
  onWaystone() { this.each((id) => this._autoCheck(id)); }
  onTablet() { this.each((id) => this._autoCheck(id)); }
  onShard() { this.each((id) => this._autoCheck(id)); }
  checkCollect() { this.each((id, o) => { if (o?.type === 'collect') this._autoCheck(id); }); }

  update(dt) {
    this.reachT -= dt;
    if (this.reachT > 0) return;
    this.reachT = 0.4;
    const P = G.player;
    this.each((id, o) => { if (o?.type === 'reach' && Math.hypot(P.pos.x - o.x, P.pos.z - o.z) < o.r) this._objDone(id); });
  }

  // ---------------- маркеры ----------------
  markerFor(npcId) {
    let mark = null;
    for (const [id, q] of Object.entries(QUESTS)) {
      const st = this.state(id);
      if (st === 'ready' && q.turnIn === npcId) return { t: '?', main: q.kind === 'main' };
      if (st === 'active') { const o = this.current(id); if (o?.type === 'talk' && o.target === npcId) return { t: '?', main: q.kind === 'main' }; }
      if (!mark && q.giver === npcId && this.available(id) && isOffered(id)) mark = { t: '!', main: q.kind === 'main' };
    }
    return mark;
  }

  // Куда идти по цели квеста: {x, z, label}
  target(id) {
    const st = this.s[id]; const q = QUESTS[id];
    if (!st || st.state === 'done') return null;
    const P = G.player;
    const near = (pts) => { let b = null, bd = Infinity; for (const p of pts) { const d = Math.hypot(p.x - P.pos.x, p.z - P.pos.z); if (d < bd) { bd = d; b = p; } } return b; };
    if (st.state === 'ready') { const n = NPCS[q.turnIn]; return n ? { x: n.x, z: n.z, label: n.name } : null; }
    const o = q.objectives[st.obj];
    if (!o) return null;
    switch (o.type) {
      case 'talk': { const n = NPCS[o.target]; return { x: n.x, z: n.z, label: n.name }; }
      case 'reach': return { x: o.x, z: o.z, label: o.text };
      case 'kill': { const c = near(CAMPS.filter((c) => c.types.includes(o.target))); return c ? { x: c.x, z: c.z, label: ENEMIES[o.target].name } : null; }
      case 'boss': { const b = BOSSES.find((b) => b.id === o.target); return b ? { x: b.x, z: b.z, label: ENEMIES[b.type].name } : null; }
      case 'interact': { const p = near(QUEST_OBJECTS.filter((x) => x.kind === o.target && !G.world.used.has(x.id))); return p ? { x: p.x, z: p.z, label: p.label } : null; }
      case 'collect': {
        const drop = Object.entries(ENEMIES).find(([, e]) => e.drops?.some((d) => d.item === o.target));
        if (drop) { const c = near(CAMPS.filter((c) => c.types.includes(drop[0]))); if (c) return { x: c.x, z: c.z, label: ITEMS[o.target].name }; }
        const n = near(G.world.gatherNodes.filter((g) => g.item === o.target && g.ready));
        return n ? { x: n.x, z: n.z, label: ITEMS[o.target].name } : null;
      }
      case 'waystone': {
        if (o.target) { const w = WAYSTONES.find((w) => w.id === o.target); return { x: w.x, z: w.z, label: w.name }; }
        const w = near(WAYSTONES.filter((w) => !G.world.activated.has(w.id) && !w.insideDome)); return w ? { x: w.x, z: w.z, label: w.name } : null;
      }
      case 'tablets': { const t = near(TABLETS.filter((t) => !G.world.readTablets.has(t.id))); return t ? { x: t.x, z: t.z, label: 'Скрижаль Раскола' } : null; }
      case 'shards': {
        const pending = ['mq5_life', 'mq5_shadow', 'mq5_frost', 'mq5_storm', 'mq5_fire'].filter((qq) => this.state(qq) === 'active' || this.state(qq) === 'ready');
        let best = null, bd = Infinity;
        for (const qq of pending) { const t = this.target(qq); if (t) { const d = Math.hypot(t.x - P.pos.x, t.z - P.pos.z); if (d < bd) { bd = d; best = t; } } }
        return best;
      }
      default: return null;
    }
  }

  serialize() { return { s: this.s, tracked: this.tracked }; }
  load(d) { this.s = d?.s || {}; this.tracked = d?.tracked || this.firstActive(); }
}

// Побочные квесты, которые NPC предлагают сам (а не стартуют цепочкой)
function isOffered(id) { return QUESTS[id].kind === 'side'; }

export function rewardText(r) {
  const parts = [];
  if (r.xp) parts.push(`${r.xp} опыта`);
  if (r.gold) parts.push(`${r.gold} золота`);
  for (const it of r.items || []) parts.push(`${ITEMS[it.id].name} ×${it.n}`);
  if (r.gen?.length) parts.push(`снаряжение ×${r.gen.length}`);
  if (r.unique) parts.push('легендарный предмет');
  if (r.skillPoints) parts.push(`+${r.skillPoints} очко навыка`);
  return parts.join(' · ');
}
