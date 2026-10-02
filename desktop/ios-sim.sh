#!/bin/sh
# Build the app for the iOS simulator, install it and launch it:  ./ios-sim.sh <udid>
# `cargo tauri ios build --target aarch64-sim` refuses to start unless a simulator runtime
# matches the Xcode SDK, so this drives cargo and xcodebuild itself.
set -e
udid=${1:?usage: ios-sim.sh <simulator udid>}
here=$(cd "$(dirname "$0")" && pwd)
conf=$here/src-tauri/tauri.conf.json
name=$(sed -n 's/.*"productName": "\(.*\)".*/\1/p' "$conf")
identifier=$(sed -n 's/.*"identifier": "\(.*\)".*/\1/p' "$conf")
out=$here/.ios-sim

(cd "$here/.." && yarn build)

cd "$here/src-tauri"
# Without custom-protocol the app asks a dev server for the page and shows a blank screen.
cargo rustc --release --lib --target aarch64-apple-ios-sim \
  --crate-type staticlib --features tauri/custom-protocol

# Only one configuration's libapp.a may exist, or Xcode finds two commands producing it.
rm -rf gen/apple/Externals
mkdir -p gen/apple/Externals/arm64/release gen/apple/assets
cp target/aarch64-apple-ios-sim/release/libfollow_along_lib.a gen/apple/Externals/arm64/release/libapp.a

# The project's Build Rust Code phase runs `cargo tauri ios xcode-script`, which needs a
# parent `cargo tauri ios build` to answer it. The staticlib is already in place, so a
# cargo earlier on PATH answers that one call and passes every other one through.
mkdir -p "$out/bin"
printf '#!/bin/sh\ncase "$1 $2 $3" in "tauri ios xcode-script") exit 0 ;; esac\nexec %s "$@"\n' \
  "$(command -v cargo)" > "$out/bin/cargo"
chmod +x "$out/bin/cargo"

PATH="$out/bin:$PATH" xcodebuild -quiet -project gen/apple/follow-along.xcodeproj \
  -scheme follow-along_iOS -configuration release -sdk iphonesimulator \
  -destination "id=$udid" -derivedDataPath "$out/derived" CODE_SIGNING_ALLOWED=NO build

xcrun simctl install "$udid" "$out/derived/Build/Products/release-iphonesimulator/$name.app"
xcrun simctl launch "$udid" "$identifier"
