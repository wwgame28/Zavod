// Хранилище с защитой: игра обязана работать, если localStorage недоступен.
const PREFIX = 'eiramor_';
export const store = {
  get(key, def = null) {
    try { const v = localStorage.getItem(PREFIX + key); return v == null ? def : JSON.parse(v); } catch { return def; }
  },
  set(key, value) {
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)); return true; } catch { return false; }
  },
  remove(key) { try { localStorage.removeItem(PREFIX + key); } catch { /* недоступно */ } },
};
