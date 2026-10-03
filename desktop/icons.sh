#!/bin/sh
# Regenerates every app icon, native and web, from the house logo the app bar wears.
# Run it after `cargo tauri ios init`, which fills the iOS set with Tauri's own logo.
set -e
here=$(cd "$(dirname "$0")" && pwd)
www=$here/..
cd "$here/src-tauri"

# The composition, in one place. A flat square of the bar's blue (tailwind's `chrome`),
# the house centred on its bounding box and as wide as GLYPH percent of the canvas. Apple's
# grid puts a glyph in the inner 60 to 65 percent; the house is wider than tall, so 64 keeps
# its height modest and its feet inside the maskable icon's safe circle (radius 40 percent).
# Square corners, no shadow, no alpha: iOS masks the shape itself and App Store Connect
# refuses an alpha channel on the 1024px image.
SIZE=1024
GLYPH=64
house=$www/src/assets/imgs/logo-house.svg
blue=$(node -p "require('$www/tailwind.config.js').theme.extend.colors.chrome.DEFAULT")
glyph=$((SIZE * GLYPH / 100))

mkdir -p target
rsvg-convert -h 2048 "$house" -o target/house.png
magick -size "${SIZE}x${SIZE}" "xc:$blue" \
  \( target/house.png -trim +repage -resize "${glyph}x${glyph}" \) \
  -gravity center -composite -alpha off PNG24:target/app-icon.png

# The web app wears the same icon: the PWA manifest (vite.config.js), the apple-touch-icon
# and the favicon (index.html) all point into public/img/icons.
icons=$www/public/img/icons
magick target/app-icon.png -resize 512x512 PNG24:"$icons/android-chrome-512x512.png"
magick target/app-icon.png -resize 192x192 PNG24:"$icons/android-chrome-192x192.png"
magick target/app-icon.png -resize 180x180 PNG24:"$icons/apple-touch-icon.png"
magick target/app-icon.png -define icon:auto-resize=48,32,16 "$icons/favicon.ico"

cargo tauri icon target/app-icon.png >/dev/null 2>&1
# Windows and Android are not built.
rm -rf icons/android icons/ios icons/Square*Logo.png icons/StoreLogo.png icons/icon.ico icons/64x64.png

# `tauri icon` writes the iOS set with an alpha channel, which App Store Connect refuses.
for png in gen/apple/Assets.xcassets/AppIcon.appiconset/*.png; do
  magick "$png" -alpha off "PNG24:$png"
done
"$here/icons.test.sh"
