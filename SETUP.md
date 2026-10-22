# Инструменты для Claude Code

Четыре инструмента из видео (пятый в записи не попал).

| # | Инструмент | Репозиторий | Что делает | Тип |
|---|---|---|---|---|
| 1 | OmniRoute | [diegosouzapw/OmniRoute](https://github.com/diegosouzapw/OmniRoute) | Подключает 100+ моделей к Claude Code и сам переключается на GLM/Gemini и др., когда кончился лимит Claude | Локальный сервер-роутер |
| 2 | Claude-Mem | [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) | Память между сессиями: проект, стиль, файлы | Плагин Claude Code |
| 3 | Headroom | [headroomlabs-ai/headroom](https://github.com/headroomlabs-ai/headroom) | Стоит между тобой и моделью, сжимает логи и контекст (до −95% токенов на логах) | Локальный прокси |
| 4 | Claude Code Setup | [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official/tree/main/plugins/claude-code-setup) | Сканирует проект и советует хуки, скиллы, субагентов, MCP-серверы | Официальный плагин Anthropic |

## Установка на свой компьютер

```bash
git clone -b claude/claude-code-tools-setup https://github.com/wwgame28/Zavod.git && cd Zavod
bash setup.sh
```

Нужны: Claude Code, Node.js 22+, Python 3.10+ (или `uv`).

## Плагины автоматически для этого проекта

Чтобы Claude Code сам предлагал Claude-Mem и Claude Code Setup всем, кто открывает
этот репозиторий, создай `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "claude-plugins-official": {
      "source": { "source": "github", "repo": "anthropics/claude-plugins-official" }
    },
    "thedotmack": {
      "source": { "source": "github", "repo": "thedotmack/claude-mem" }
    }
  },
  "enabledPlugins": {
    "claude-code-setup@claude-plugins-official": true,
    "claude-mem@thedotmack": true
  }
}
```

## Как пользоваться

**OmniRoute**: запусти `omniroute`, открой <http://localhost:20128>, затем Providers,
и подключи провайдеров своим аккаунтом или ключом. Запускай Claude Code командой
`omniroute launch`.

**Headroom**: `headroom wrap claude` запускает Claude Code через прокси.
`headroom doctor` проверяет, что всё работает, `headroom dashboard` показывает экономию.

**Claude-Mem**: перезапусти Claude Code, и контекст прошлых сессий подтянется сам.
При первой установке через `npx claude-mem install` он предложит войти в cmem.ai,
это необязательно.

**Claude Code Setup**: в Claude Code напиши *«recommend automations for this project»*.

> OmniRoute и Headroom оба встают между Claude Code и моделью. Для начала
> используй что-то одно, а не оба сразу.
