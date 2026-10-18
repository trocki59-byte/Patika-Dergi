#!/usr/bin/env bash
set -euo pipefail

project_dir="$(cd "$(dirname "$0")/.." && pwd)"
output="$project_dir/PATIKA_DERGI_YAYIN.zip"
dist="$project_dir/dist"

node "$project_dir/scripts/generate-privacy-pages.mjs"
node "$project_dir/scripts/generate-feeds.mjs"
node "$project_dir/scripts/generate-sitemap.mjs"

rm -f "$output"
rm -rf "$dist"
mkdir -p "$dist"
cp -R "$project_dir/assets" "$project_dir/yazilar" "$project_dir/newsletter-worker" "$project_dir/scripts" "$project_dir/tests" "$dist/"
cp "$project_dir"/*.html "$project_dir"/*.xml "$project_dir/robots.txt" "$project_dir/BULTEN_KURULUM.md" "$dist/"

cd "$dist"
zip -qr "$output" .
unzip -t "$output"
