#!/bin/sh
# Playwright MCP: просмотр сайта в браузере, скриншоты, проверка анимаций.
# В облачных сессиях Claude Code Chromium уже установлен в /opt/pw-browsers —
# используем его (контейнер работает от root, поэтому без песочницы);
# локально Playwright найдёт свой браузер сам.
if [ -x /opt/pw-browsers/chromium ]; then
  set -- --executable-path /opt/pw-browsers/chromium --no-sandbox "$@"
fi
exec npx -y @playwright/mcp@0.0.83 --headless --isolated "$@"
