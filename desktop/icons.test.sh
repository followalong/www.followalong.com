#!/bin/sh
# The App Store takes the app's icon from the build's 1024px marketing image, and `ios init`
# fills that slot with Tauri's own logo. This fails until the image is the Follow Along icon:
# 1024 square, no alpha channel, on the same ground as the PWA's icon.
set -e
here=$(cd "$(dirname "$0")" && pwd)

python3 - "$here/src-tauri/gen/apple/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png" \
  "$here/../public/img/icons/android-chrome-512x512.png" <<'PY'
import sys
from PIL import Image
im, art = Image.open(sys.argv[1]), Image.open(sys.argv[2]).convert("RGB")
assert im.size == (1024, 1024), f"marketing icon is {im.size}, not 1024x1024"
assert im.mode == "RGB", f"marketing icon is {im.mode}; the App Store refuses an alpha channel"
for at in [(0.03, 0.03), (0.5, 0.5), (0.6, 0.2), (0.6, 0.5)]:
    ours = im.getpixel((int(at[0] * 1024), int(at[1] * 1024)))
    theirs = art.getpixel((int(at[0] * art.width), int(at[1] * art.height)))
    assert max(abs(a - b) for a, b in zip(ours, theirs)) < 12, f"{at}: {ours} is not the PWA icon's {theirs}"
print("icons: ok")
PY
