#!/usr/bin/env bash
# Устанавливает на твой компьютер (macOS/Linux) четыре инструмента из видео:
#   1. OmniRoute         — роутер: переключает Claude Code на другие модели, когда кончился лимит
#   2. Claude-Mem        — плагин: память между сессиями
#   3. Headroom          — прокси: сжимает логи и контекст перед отправкой в модель
#   4. Claude Code Setup — официальный плагин Anthropic: советует хуки/скиллы/субагентов/MCP
#
# Запуск:  bash setup.sh
set -euo pipefail

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "✗ Не найден '$1'. $2" >&2
    exit 1
  fi
}

need claude "Установи Claude Code: https://code.claude.com/docs/en/setup"
need npm "Установи Node.js 22+: https://nodejs.org"

echo "→ Плагины Claude Code (Claude-Mem, Claude Code Setup)"
claude plugin marketplace add anthropics/claude-plugins-official || true
claude plugin marketplace add thedotmack/claude-mem || true
claude plugin install claude-code-setup@claude-plugins-official
claude plugin install claude-mem@thedotmack

echo "→ Headroom"
if command -v uv >/dev/null 2>&1; then
  uv tool install --python 3.13 "headroom-ai[all]"
else
  need python3 "Установи Python 3.10+ или uv: https://docs.astral.sh/uv/"
  python3 -m pip install --user "headroom-ai[all]"
fi

echo "→ OmniRoute"
npm install -g \
  --allow-scripts=omniroute,keytar,onnxruntime-node,@parcel/watcher,@swc/core,protobufjs,esbuild \
  omniroute

cat <<'EOF'

✓ Готово. Что дальше:

  OmniRoute:  запусти `omniroute`, открой http://localhost:20128 → Providers →
              подключи бесплатные модели (GLM, Gemini и т.д.).
              Потом запускай Claude Code через него: `omniroute launch`

  Headroom:   `headroom wrap claude` — Claude Code через сжимающий прокси.
              Проверка: `headroom doctor`, экономия: `headroom dashboard`

  Claude-Mem: перезапусти Claude Code — память подхватится сама.

  Claude Code Setup: в Claude Code напиши «recommend automations for this project».

Подробности — в SETUP.md.
EOF
