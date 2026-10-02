#!/bin/sh
# Buy a subscription in the simulator against gen/apple/FollowAlong.storekit, with no App Store
# Connect:  ./ios-storekit.test.sh <udid>
# A plain `simctl launch` has no StoreKit configuration, so the purchase runs under
# `xcodebuild test`: Tests/PurchaseTests.swift runs inside the app, opens the test session and
# buys through window.__TAURI__.storekit.
set -e
udid=${1:?usage: ios-storekit.test.sh <simulator udid>}
here=$(cd "$(dirname "$0")" && pwd)

"$here/ios-sim.sh" "$udid"

log=$(mktemp)
PATH="$here/.ios-sim/bin:$PATH" xcodebuild -quiet -project "$here/src-tauri/gen/apple/follow-along.xcodeproj" \
  -scheme follow-along_iOS -configuration release -sdk iphonesimulator \
  -destination "id=$udid" -derivedDataPath "$here/.ios-sim/derived" test > "$log" 2>&1 || { tail -40 "$log"; exit 1; }
# The result line is an XCTest activity, read back out of the newest .xcresult.
result=$(ls -td "$here/.ios-sim/derived/Logs/Test/"*.xcresult | head -1)
xcrun xcresulttool get test-results activities --path "$result" \
  --test-id 'PurchaseTests/testThePageCanBuyAndRestore()' |
  python3 -c 'import json, re, sys; print(re.search(r"storekit purchase: .*?entitlements=\d+", json.dumps(json.load(sys.stdin)).replace("\\\"", "\"")).group())' ||
  { echo "ios-storekit.test.sh: the test left no result in $result" >&2; exit 1; }
