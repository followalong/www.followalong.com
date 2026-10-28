#!/bin/sh
# Runs github-release.sh in a throwaway clone of a throwaway origin, with gh stubbed.
set -e
here=$(cd "$(dirname "$0")" && pwd)
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
g() { git -c user.name=t -c user.email=t@t -c core.hooksPath=/dev/null -c commit.gpgsign=false -c tag.gpgsign=false "$@"; }

g init -q --bare "$tmp/origin.git"
g clone -q "$tmp/origin.git" "$tmp/work" 2>/dev/null
cd "$tmp/work"
g commit -q --allow-empty -m one
g push -q origin HEAD

mkdir "$tmp/bin"
printf '#!/bin/sh\nprintf "%%s\\n" "$@" > "%s"\n' "$tmp/gh.args" > "$tmp/bin/gh"
chmod +x "$tmp/bin/gh"
release() { PATH="$tmp/bin:$PATH" "$here/github-release.sh" "$@"; }
refused() { if release check 1.0.0 2>/dev/null; then echo "FAIL: released $1"; exit 1; fi; }

release check 1.0.0 || { echo "FAIL: a clean, pushed HEAD was refused"; exit 1; }

touch stray
refused "a dirty tree"
rm stray

g commit -q --allow-empty -m two
refused "a HEAD that is not on origin"
g push -q origin HEAD

g tag v1.0.0 && g push -q origin v1.0.0 && g tag -d v1.0.0 >/dev/null
refused "a version whose tag is on origin"
release check 1.0.1 || { echo "FAIL: a bumped version was refused"; exit 1; }

# The API refuses a short SHA for --target.
printf dmg > "$tmp/App_1.0.1.dmg"
release create 1.0.1 "App 1.0.1" "$tmp/App_1.0.1.dmg"
expected=$(printf '%s\n' release create v1.0.1 "$tmp/App_1.0.1.dmg" --target "$(git rev-parse HEAD)" --title "App 1.0.1" --generate-notes)
[ "$(cat "$tmp/gh.args")" = "$expected" ] || { printf 'FAIL: gh got\n%s\nnot\n%s\n' "$(cat "$tmp/gh.args")" "$expected"; exit 1; }
echo "github-release: ok"
