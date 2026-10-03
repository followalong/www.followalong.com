#!/bin/sh
# The App Store takes the app's icon from the build's 1024px marketing image, and `ios init`
# fills that slot with Tauri's own logo. This fails until the image is the Follow Along icon:
# 1024 square, no alpha channel, the bar's blue to the corners, the white house at the size
# icons.sh composes. The web icons come from the same image and are checked the same way.
set -e
here=$(cd "$(dirname "$0")" && pwd)
www=$here/..
blue=$(node -p "require('$www/tailwind.config.js').theme.extend.colors.chrome.DEFAULT" | tr a-f A-F | tr -d '#')
marketing=$here/src-tauri/gen/apple/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png

fail() { echo "icons.test.sh: $*" >&2; exit 1; }
pixel() { magick "$1" -depth 8 -format "%[hex:p{$2,$3}]" info:; }

read -r w h channels <<EOF
$(magick identify -format '%w %h %[channels]' "$marketing")
EOF
[ "$w $h" = "1024 1024" ] || fail "marketing icon is ${w}x${h}, not 1024x1024"
[ "${channels%% *}" = srgb ] || fail "marketing icon is $channels; the App Store refuses an alpha channel"

# The ground reaches the corners, and the house's apex sits where a 64 percent glyph puts it:
# the first pixel down the centre column that is not blue lies 25 to 30 percent from the top,
# and the roof's stroke is solid white just below it.
[ "$(pixel "$marketing" 30 30)" = "$blue" ] || fail "corner is $(pixel "$marketing" 30 30), not the bar's $blue"
apex=$(magick "$marketing" -crop 1x1024+512+0 +repage -depth 8 txt:- |
  awk -v blue="#$blue" 'NR > 1 && $3 != blue { sub(/^[0-9]+,/, "", $1); sub(/:/, "", $1); print $1; exit }')
[ "$apex" -ge 256 ] && [ "$apex" -le 307 ] || fail "the house's apex is at row $apex, outside 256..307"
[ "$(pixel "$marketing" 512 $((apex + 12)))" = FFFFFF ] || fail "the roof at row $((apex + 12)) is not white"

# The web app's icons: the sizes index.html and vite.config.js promise, on the same ground.
for want in android-chrome-512x512.png:512 android-chrome-192x192.png:192 apple-touch-icon.png:180; do
  file=$www/public/img/icons/${want%%:*}
  side=${want##*:}
  [ "$(magick identify -format '%wx%h' "$file")" = "${side}x${side}" ] || fail "$file is not ${side}x${side}"
  [ "$(pixel "$file" 2 2)" = "$blue" ] || fail "$file's corner is not the bar's $blue"
done
sizes=$(magick identify -format '%w ' "$www/public/img/icons/favicon.ico")
[ "$sizes" = "48 32 16 " ] || fail "favicon.ico holds $sizes, not 48 32 16"
echo "icons: ok"
