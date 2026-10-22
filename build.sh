#!/usr/bin/env sh
# Собирает самостоятельные index.html из game.html (game.html — фрагмент без
# <!doctype>/<head>/<body>, в таком виде он публикуется как Artifact).
# Игры: ./game.html («Завод») и ./sakura/game.html («Клинок лепестков»).
set -e
cd "$(dirname "$0")"
for dir in . sakura; do
  [ -f "$dir/game.html" ] || continue
  {
    printf '%s\n' '<!doctype html>' '<html lang="ru">' '<head>' \
      '<meta charset="utf-8">' \
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">' \
      '<meta name="theme-color" content="#110e10">' \
      '<style>:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}</style>'
    cat "$dir/game.html"
    printf '%s\n' '</html>'
  } > "$dir/index.html"
  echo "$dir/index.html собран"
done
