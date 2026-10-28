#!/bin/sh
# A release ends with a GitHub release of v<version> at HEAD. Run inside the repo.
#   github-release.sh check <version>                   before the build: refuse what cannot ship
#   github-release.sh create <version> <title> <asset>  after it
set -e
version=$2
fail() { echo "github-release: $*" >&2; exit 1; }
case $1 in
  check)
    [ -z "$(git status --porcelain)" ] || fail "the working tree is dirty"
    git fetch -q origin
    [ -n "$(git branch -r --contains HEAD --list 'origin/*')" ] || fail "HEAD is not pushed to origin"
    [ -z "$(git ls-remote --tags origin "refs/tags/v$version")" ] || fail "v$version is already on origin; bump the version"
    ;;
  create)
    # The API refuses a short SHA for --target.
    gh release create "v$version" "$4" --target "$(git rev-parse HEAD)" --title "$3" --generate-notes
    ;;
  *) fail "usage: github-release.sh check <version> | create <version> <title> <asset>" ;;
esac
