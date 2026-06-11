#!/usr/bin/env bash
# gerar-icns.sh — converte build-assets/icon.png (1024+) em build-assets/icon.icns.
# Roda após scripts/gerar-icone.js (que renderiza o orb em PNG). macOS apenas.
set -euo pipefail

cd "$(dirname "$0")/../build-assets"

if [ ! -f icon.png ]; then
  echo "icon.png não encontrado — rode antes: electron scripts/gerar-icone.js" >&2
  exit 1
fi

rm -rf icon.iconset
mkdir icon.iconset

gerar() { sips -z "$1" "$1" icon.png --out "icon.iconset/$2" >/dev/null; }
gerar 16   icon_16x16.png
gerar 32   icon_16x16@2x.png
gerar 32   icon_32x32.png
gerar 64   icon_32x32@2x.png
gerar 128  icon_128x128.png
gerar 256  icon_128x128@2x.png
gerar 256  icon_256x256.png
gerar 512  icon_256x256@2x.png
gerar 512  icon_512x512.png
gerar 1024 icon_512x512@2x.png

iconutil -c icns icon.iconset -o icon.icns
rm -rf icon.iconset
echo "build-assets/icon.icns gerado."

# Ícone da barra de menus (tray) a partir do orb sozinho.
if [ -f tray-master.png ]; then
  sips -z 22 22 tray-master.png --out ../src/assets/tray-icon.png >/dev/null
  sips -z 44 44 tray-master.png --out ../src/assets/tray-icon@2x.png >/dev/null
  echo "src/assets/tray-icon.png + tray-icon@2x.png gerados."
fi
