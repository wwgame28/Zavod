// Шина событий: квесты, UI и звук подписываются на игровые события.
export class Emitter {
  constructor() { this.map = new Map(); }
  on(type, fn) { if (!this.map.has(type)) this.map.set(type, new Set()); this.map.get(type).add(fn); return () => this.off(type, fn); }
  off(type, fn) { this.map.get(type)?.delete(fn); }
  emit(type, payload) { const set = this.map.get(type); if (set) for (const fn of [...set]) fn(payload); }
}
export const bus = new Emitter();
