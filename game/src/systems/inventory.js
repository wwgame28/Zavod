import { ITEMS } from '../data/items.js';

// Сумка: 40 ячеек. Стакаемые предметы {kind:'stack', id, n}, экипировка — объект предмета.
export class Inventory {
  constructor(size = 40) { this.size = size; this.slots = new Array(size).fill(null); this.onChange = null; }

  changed() { this.onChange?.(); }

  freeCount() { return this.slots.filter((s) => !s).length; }

  addStack(id, n = 1) {
    const def = ITEMS[id];
    if (!def) return 0;
    let left = n;
    for (const s of this.slots) {
      if (left <= 0) break;
      if (s && s.kind === 'stack' && s.id === id && s.n < def.stack) { const k = Math.min(def.stack - s.n, left); s.n += k; left -= k; }
    }
    for (let i = 0; i < this.size && left > 0; i++) {
      if (!this.slots[i]) { const k = Math.min(def.stack, left); this.slots[i] = { kind: 'stack', id, n: k }; left -= k; }
    }
    if (left !== n) this.changed();
    return n - left;
  }

  addGear(item) {
    const i = this.slots.indexOf(null);
    if (i < 0) return false;
    this.slots[i] = item; this.changed();
    return true;
  }

  add(entry) { return entry.kind === 'gear' ? (this.addGear(entry) ? 1 : 0) : this.addStack(entry.id, entry.n || 1); }

  count(id) { let c = 0; for (const s of this.slots) if (s && s.kind === 'stack' && s.id === id) c += s.n; return c; }
  has(id, n = 1) { return this.count(id) >= n; }

  remove(id, n = 1) {
    let left = n;
    for (let i = this.size - 1; i >= 0 && left > 0; i--) {
      const s = this.slots[i];
      if (s && s.kind === 'stack' && s.id === id) { const k = Math.min(s.n, left); s.n -= k; left -= k; if (s.n <= 0) this.slots[i] = null; }
    }
    if (left !== n) this.changed();
    return n - left;
  }

  takeAt(i) { const s = this.slots[i]; this.slots[i] = null; this.changed(); return s; }
  putAt(i, s) { this.slots[i] = s; this.changed(); }

  sort() {
    const order = { gear: 0, consumable: 1, shard: 2, quest: 3, material: 4 };
    const items = this.slots.filter(Boolean);
    items.sort((a, b) => {
      const ta = a.kind === 'gear' ? 'gear' : ITEMS[a.id]?.type, tb = b.kind === 'gear' ? 'gear' : ITEMS[b.id]?.type;
      if (ta !== tb) return (order[ta] ?? 9) - (order[tb] ?? 9);
      if (a.kind === 'gear') return b.rarity - a.rarity || b.level - a.level;
      return a.id.localeCompare(b.id);
    });
    this.slots = items.concat(new Array(this.size - items.length).fill(null));
    this.changed();
  }

  serialize() { return this.slots; }
  load(arr) { this.slots = new Array(this.size).fill(null); (arr || []).forEach((s, i) => { if (i < this.size) this.slots[i] = s; }); }
}
