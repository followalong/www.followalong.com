#!/bin/sh
# Give the iOS build a CFBundleVersion that TestFlight accepts twice for one version. The
# Tauri CLI writes the version string into CFBundleVersion on every build, so Xcode runs
# this as the target's last phase (Set Build Number in gen/apple/project.yml): after the
# plist is copied into the product, before the signature is taken.
#
# The number is whole minutes since 2026-01-01 UTC: one integer that rises with the clock
# whatever git history does, and stays under 2^31 for four thousand years.
set -e
epoch=1767225600   # 2026-01-01T00:00:00Z
build=$(( ($(date -u '+%s') - epoch) / 60 ))
plist=${TARGET_BUILD_DIR:?}/${INFOPLIST_PATH:?}
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion $build" "$plist"
echo "CFBundleVersion $build ($(date -u '+%Y-%m-%d %H:%M') UTC)"
