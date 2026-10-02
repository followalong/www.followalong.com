#!/bin/sh
# gen/apple is committed, and it repeats what tauri.conf.json says. `cargo tauri ios init`
# rewrites it and drops the hand-set parts. This fails until project.yml and the generated
# project agree with tauri.conf.json and carry those parts again.
set -e
here=$(cd "$(dirname "$0")" && pwd)

python3 - "$here/src-tauri" <<'PY'
import json, plistlib, re, sys
root = sys.argv[1]
conf = json.load(open(f"{root}/tauri.conf.json"))
yml = open(f"{root}/gen/apple/project.yml").read()
pbx = open(f"{root}/gen/apple/follow-along.xcodeproj/project.pbxproj").read()
plist = plistlib.load(open(f"{root}/gen/apple/follow-along_iOS/Info.plist", "rb"))
entitlements = plistlib.load(open(f"{root}/gen/apple/follow-along_iOS/follow-along_iOS.entitlements", "rb"))
scheme = open(f"{root}/gen/apple/follow-along.xcodeproj/xcshareddata/xcschemes/follow-along_iOS.xcscheme").read()

def setting(key):
    found = re.search(rf"^\s*{key}: (.+)$", yml, re.M)
    return found and found.group(1).strip()

assert setting("PRODUCT_BUNDLE_IDENTIFIER") == conf["identifier"], "project.yml has another bundle identifier"
assert setting("PRODUCT_NAME") == conf["productName"], "project.yml has another product name"
assert setting("DEVELOPMENT_TEAM") == conf["bundle"]["iOS"]["developmentTeam"], "project.yml has another team"
assert setting("iOS") == conf["bundle"]["iOS"]["minimumSystemVersion"], "project.yml has another deployment target"
for text, where in [(yml, "project.yml"), (pbx, "the Xcode project; run xcodegen")]:
    assert "ios-build-number.sh" in text, f"the Set Build Number phase is missing from {where}"
assert plist.get("ITSAppUsesNonExemptEncryption") is False, "Info.plist does not declare export compliance; run xcodegen"
assert plist.get("UIStatusBarStyle") == "UIStatusBarStyleLightContent" and plist.get("UIViewControllerBasedStatusBarAppearance") is False, "Info.plist does not set the light status bar; run xcodegen"
assert "FollowAlong.storekit" in scheme and "follow-along_iOSTests" in scheme, "the scheme lost the StoreKit configuration or the test target; run xcodegen"
assert any(t.get("CFBundleURLSchemes") == ["followalong"] for t in plist.get("CFBundleURLTypes", [])), "Info.plist does not register followalong://; run xcodegen"
assert entitlements.get("com.apple.developer.associated-domains") == ["applinks:www.followalong.com"], "the entitlements lost the associated domain; run xcodegen"
assert "Tests/Simulator.entitlements" in pbx, "the simulator build lost get-task-allow, which the StoreKit test needs; run xcodegen"
assert conf["identifier"] in pbx and conf["bundle"]["iOS"]["developmentTeam"] in pbx, "the Xcode project is stale; run xcodegen"
print("ios project: ok")
PY
