#!/bin/sh
# Build, sign, notarize and staple the macOS release. Outside the App Store: Developer ID.
# Re-runnable: every step overwrites its own output.
#
# Product values (name, identifier, team) live in src-tauri/tauri.conf.json and the version
# in ../package.json. This script takes only what belongs to the person releasing:
#   APPLE_SIGNING_IDENTITY  SHA-1 of the Developer ID Application certificate
#   NOTARY_PROFILE          a `notarytool store-credentials` profile, or
#   APPLE_API_KEY_PATH + APPLE_API_KEY + APPLE_API_ISSUER, or
#   APPLE_ID + APPLE_PASSWORD + APPLE_TEAM_ID
set -e
here=$(cd "$(dirname "$0")" && pwd)
name=$(sed -n 's/.*"productName": "\(.*\)".*/\1/p' "$here/src-tauri/tauri.conf.json")
version=$(sed -n 's/.*"version": "\(.*\)".*/\1/p' "$here/../package.json")
arch=$(uname -m | sed 's/^arm64$/aarch64/')

# Credentials are checked before the build, so a missing one costs no wait.
"$here/signing.test.sh"
if [ -n "$NOTARY_PROFILE" ]; then
  set -- --keychain-profile "$NOTARY_PROFILE"
elif [ -n "$APPLE_API_KEY" ] && [ -n "$APPLE_API_ISSUER" ] && [ -n "$APPLE_API_KEY_PATH" ]; then
  set -- --key "$APPLE_API_KEY_PATH" --key-id "$APPLE_API_KEY" --issuer "$APPLE_API_ISSUER"
elif [ -n "$APPLE_ID" ] && [ -n "$APPLE_PASSWORD" ] && [ -n "$APPLE_TEAM_ID" ]; then
  set -- --apple-id "$APPLE_ID" --password "$APPLE_PASSWORD" --team-id "$APPLE_TEAM_ID"
else
  cat >&2 <<'MSG'
release.sh: no notarization credentials. Store them once:

  xcrun notarytool store-credentials followalong \
    --key /path/to/AuthKey_<KEYID>.p8 --key-id <KEYID> --issuer <ISSUER-UUID>
  export NOTARY_PROFILE=followalong
MSG
  exit 1
fi

cd "$here/src-tauri"
# Tauri signs with APPLE_SIGNING_IDENTITY, hardened runtime on. Its own notarization is
# kept out of the way (it cannot use a keychain profile): notarytool runs below instead.
# CI=true skips the Finder layout of the disk image, which a terminal may not script.
env -u APPLE_ID -u APPLE_PASSWORD -u APPLE_API_KEY -u APPLE_API_ISSUER \
  CI=true cargo tauri build

app=target/release/bundle/macos/$name.app
dmg=target/release/bundle/dmg/${name}_${version}_${arch}.dmg

# One submission covers the app too: notarytool reads the code nested in the image.
xcrun notarytool submit "$dmg" "$@" --wait
xcrun stapler staple "$dmg"
xcrun stapler staple "$app"

codesign --verify --deep --strict --verbose=2 "$app"
spctl --assess --type execute --verbose "$app"
xcrun stapler validate "$app"
ls -lh "$dmg"
