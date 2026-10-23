# Главный герой — промпт для Tripo3D

## Prompt (Text to 3D) — вариант A, героиня
```
Full-body 3D anime fantasy heroine, young adult sky wanderer, stylized anime proportions (7 heads tall), standing in A-pose, arms slightly away from body, legs slightly apart, symmetrical, facing forward, calm neutral expression, large expressive eyes. Shoulder-length silver-white hair with soft sky-blue tips and one thin braid. Fitted ivory short coat with sky-blue panels and thin gold trim, short capelet on the left shoulder, navy shorts over dark tights, brown leather belt with small pouches, knee-high brown boots with gold buckles, fingerless gloves. Glowing cyan crystal pendant on the chest. Clean stylized shapes, smooth surfaces, flat hand-painted colors, anime cel-shaded game character.
```

## Вариант B, герой (замены в промпте A)
- `heroine` → `hero`
- волосы → `messy silver-white hair with sky-blue tips`
- `navy shorts over dark tights` → `navy trousers tucked into the boots`

## Negative prompt
```
photorealistic, realistic skin, baked lighting, baked shadows, strong highlights, weapon, held objects, long scarf, long cape, cloth touching the ground, fused fingers, extra limbs, asymmetrical body, open mouth, pedestal, base, background
```

## Настройки и экспорт
- Текстура: включена (HD). PBR можно выключить — освещение даёт toon-шейдер игры.
- Сетка: 20–50 тыс. треугольников (Quad / Smart Low Poly, если есть).
- Риг: авториг гуманоида; если есть анимации — Idle, Walk, Run, Jump.
- Формат: **GLB** с встроенными текстурами.
- Оружие не нужно — отдельной моделью на этапе боя.
- Надёжнее: Image to 3D по чистому концепту «вид спереди, A-pose, белый фон».

## Куда положить
`echoes-of-the-last-sky/assets/characters/hero/hero.glb` — затем в сцене `scenes/characters/hero.tscn`
перетащить файл в поле `Model Scene` узла `Hero` (или прислать файл в чат — подключу сам).
