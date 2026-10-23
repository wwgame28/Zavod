# Эйрамор: Пепел Звёзд — заметки для работы с кодом

- Браузерная 3D-RPG на Three.js + Vite, чистый ES-модульный JavaScript без фреймворков. Все тексты игры — на русском.
- Запуск: `npm run dev` (порт 5173). Тесты требуют запущенного dev-сервера: `node tools/smoke-test.mjs`, `node tools/quest-test.mjs`. Chromium: `/opt/pw-browsers/chromium` (переменная `CHROME` переопределяет путь).
- Системы находят друг друга через общий объект `G` (`src/state.js`); в браузере доступны `window.__G` и `window.__game` для отладки и тестов.
- Контент — данные в `src/data/`; логика — в `src/systems/`. Новый контент обычно не требует правок логики.
- Балансные числа — только в `src/config.js` и `src/data/*`. Таблицы: `node tools/balance.mjs`.
- Координаты мира: X — восток, Z — юг (север = −Z). Высота — `G.terrain.heightAt(x, z)`.
- К герою в текстах обращаемся без грамматического рода.
- Профильные навыки: `../.claude/skills/{lore-architect,quest-designer,dialogue-writer,rpg-balance,world-builder}`.
