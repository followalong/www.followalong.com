#!/bin/sh
# Build the signed App Store .ipa. With UPLOAD=1, also send it to TestFlight.
# Without UPLOAD=1 nothing leaves this machine except Xcode fetching the signing profile.
#
# Product values (name, identifier, team) live in src-tauri/tauri.conf.json and the version
# in ../package.json. This script takes an App Store Connect API key (Developer role):
#   APPLE_API_KEY       the key id
#   APPLE_API_ISSUER    the issuer uuid
#   APPLE_API_KEY_PATH  path to AuthKey_<key id>.p8
set -e
here=$(cd "$(dirname "$0")" && pwd)
name=$(sed -n 's/.*"productName": "\(.*\)".*/\1/p' "$here/src-tauri/tauri.conf.json")
: "${APPLE_API_KEY:?}" "${APPLE_API_ISSUER:?}" "${APPLE_API_KEY_PATH:?}"

# `ios init` undoes three hand-set things; an upload without them is refused or mislabelled.
"$here/ios-project.test.sh"
"$here/icons.test.sh"

cd "$here/src-tauri"
cargo tauri ios build --export-method app-store-connect

# The build number that ships is the archive's, so it is read out of the .ipa, not the log.
ipa=gen/apple/build/arm64/$name.ipa
plist=$(mktemp)
unzip -p "$ipa" "Payload/$name.app/Info.plist" > "$plist"
plutil -p "$plist" |
  grep -E 'CFBundleIdentifier|CFBundleShortVersionString|CFBundleVersion|ITSAppUsesNonExemptEncryption'
case $(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$plist") in
  *[!0-9]*) echo "testflight.sh: the build number is still the version; Set Build Number did not land" >&2; exit 1 ;;
esac

if [ "$UPLOAD" != 1 ]; then
  echo "Built $here/src-tauri/$ipa. Nothing was uploaded; run again with UPLOAD=1 to send it."
  exit 0
fi
xcrun altool --upload-app -f "$ipa" -t ios \
  --api-key "$APPLE_API_KEY" --api-issuer "$APPLE_API_ISSUER" --p8-file-path "$APPLE_API_KEY_PATH"
