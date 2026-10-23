# Echoes of the Last Sky

Аниме-фэнтези action RPG от третьего лица (Godot 4.3+, GDScript). Готово: **этап 1 — мир**, **этап 2 — главный персонаж**.

## Запуск
1. Установите [Godot 4.3](https://godotengine.org/download/archive/4.3-stable/) или новее (стандартная сборка, не .NET).
2. Откройте `echoes-of-the-last-sky/project.godot` в Godot (Import → выбрать файл) и нажмите **F5**.
   Или из терминала: `godot --path echoes-of-the-last-sky`.

Мир генерируется кодом при запуске (~3–5 с), внешних ассетов нет. В редакторе мир тоже строится
(генераторы — `@tool`), кнопка `Rebuild` в инспекторе узлов `MainIsland` / `SkyIslands` / `CloudLayer` пересобирает его.

## Управление (временная камера осмотра)
| Действие | Клавиши |
|---|---|
| Захват мыши / отпустить | ЛКМ / Esc (или держать ПКМ) |
| Полёт | WASD / стрелки, E/Space — вверх, Q/Ctrl — вниз |
| Быстрее / медленнее | Shift / Alt, колесо — базовая скорость |
| Точки обзора | 1–9 (прибытие, сверху, профиль, снизу, храм, древо, мост, водопад, горизонт) |
| Кинематографичный облёт | O |
| Скриншот / подсказка | F12 / H |
| Мир ⇄ просмотр героини | Tab |
| Поза / вращение (просмотр героини) | P / T |

## Главный персонаж
- `scenes/characters/hero.tscn` — узел `Hero`: процедурная героиня (скелет с именами костей Godot Humanoid,
  skinned-меш ~9.4k вершин, toon-шейдеры кожи/одежды/лица/волос, контур, моргание) и `HeroAnimator`
  (тестовые позы и «живой» idle).
- Своя модель (например, из Tripo3D): положите `assets/characters/hero/hero.glb` и укажите его в поле
  `Model Scene` узла `Hero` — модель масштабируется до 1.68 м, ставится на землю, получает toon-материалы и контур.
  Промпт для генерации — `assets/characters/hero/TRIPO3D_PROMPT.md`.
- `scenes/characters/hero_showcase.tscn` — просмотр героини в мире (7 ракурсов).

## Структура
- `scenes/main.tscn` — точка входа: мир + камера + HUD.
- `scenes/world/shattered_reach.tscn` — окружение, солнце, точки обзора, генераторы мира.
- `scripts/procgen/` — процедурная геометрия: остров (`island_shape`, `island_builder`), скалы, деревья, кристаллы, руины, облака.
- `scripts/world/` — сборка мира: центральный остров (раскладка уровней, достопримечательности), дальние острова, облачное море.
- `shaders/` — стилизованный toon-шейдинг (общие include), небо, облака, вода, контурные линии.
- `materials/` — материалы и процедурные шумовые текстуры.

## Проверки
```
godot --path . -- --selftest                     # генерация, коллизии земли, точки обзора, ввод камеры
godot --path . -- --capture=/tmp/shots --views=1,4  # рендер точек обзора в PNG + время кадра
godot --path . res://scenes/characters/hero_showcase.tscn -- --selftest   # риг, веса, пропорции, позы
godot --path . res://scenes/characters/hero_showcase.tscn -- --selftest --model=res://path/hero.glb
godot --headless --path . --script res://scripts/dev/export_hero_glb.gd -- hero.glb   # экспорт героини в GLB
```

## Сборка
Пресеты экспорта (Windows, Linux, macOS) лежат в `export_presets.cfg`:
`godot --headless --path . --export-release "Windows Desktop" ../build/EchoesOfTheLastSky.exe`
(нужны export templates 4.3).
