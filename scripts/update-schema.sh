#!/usr/bin/env bash
# Fetches schema.graphql from a tallox.go release and regenerates the typed documents.
#
#   scripts/update-schema.sh            the release pinned in schema.tag
#   scripts/update-schema.sh v5.34.0    that release, and pin it
#   scripts/update-schema.sh --check    only compare the committed file with the pinned release
#
# The backend attaches its canonical SDL to every release. Taking it from there instead of
# introspecting a running server means the GUI is built against a contract that exists as a
# released artefact, and the file carries the directive usages (@scope, @interactiveOnly,
# @fullReach) that introspection never reports. For work against an unreleased backend there
# is still `pnpm run update-schema:live`; CI refuses that file until it is pinned to a release.
set -euo pipefail
cd "$(dirname "$0")/.."

check=false
tag=""
case "${1:-}" in
	--check) check=true ;;
	"") ;;
	*) tag="$1" ;;
esac
[ -n "$tag" ] || tag="$(tr -d '[:space:]' < schema.tag)"

if ! [[ "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	echo "not a release tag: '$tag'" >&2
	exit 1
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
curl -fsSL --retry 3 -o "$tmp" "https://github.com/obcode/tallox.go/releases/download/${tag}/schema.graphql"

if $check; then
	if ! cmp -s "$tmp" schema.graphql; then
		echo "schema.graphql differs from the schema of tallox.go ${tag}." >&2
		echo "Run 'pnpm run update-schema' (or pin a newer release with 'pnpm run update-schema <tag>')." >&2
		exit 1
	fi
	echo "schema.graphql is the schema of tallox.go ${tag}."
	exit 0
fi

cp "$tmp" schema.graphql
echo "$tag" > schema.tag
pnpm codegen
