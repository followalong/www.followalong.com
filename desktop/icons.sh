#!/bin/sh
# Regenerates every app icon from the PWA's 512px icon, the only art there is.
# Run it after `cargo tauri ios init`, which fills the iOS set with Tauri's own logo.
set -e
here=$(cd "$(dirname "$0")" && pwd)
cd "$here/src-tauri"

# The art has a soft transparent edge, so it goes on its own ground before it is scaled up.
mkdir -p target
python3 - "$here/../public/img/icons/android-chrome-512x512.png" target/app-icon.png <<'PY'
import sys
from PIL import Image
art = Image.open(sys.argv[1]).convert("RGBA")
ground = Image.new("RGB", art.size, art.getpixel((8, 8))[:3])
ground.paste(art, mask=art.getchannel("A"))
ground.resize((1024, 1024), Image.LANCZOS).save(sys.argv[2])
PY

cargo tauri icon target/app-icon.png >/dev/null 2>&1
# Windows and Android are not built.
rm -rf icons/android icons/ios icons/Square*Logo.png icons/StoreLogo.png icons/icon.ico icons/64x64.png

# `tauri icon` writes the iOS set with an alpha channel, which App Store Connect refuses.
python3 - gen/apple/Assets.xcassets/AppIcon.appiconset/*.png <<'PY'
import sys
from PIL import Image
for path in sys.argv[1:]:
    Image.open(path).convert("RGB").save(path)
PY
"$here/icons.test.sh"
