#!/usr/bin/env bash
# Stage only the runtime files into a clean directory and deploy to Cloudflare
# Pages. Avoids uploading the Python venv, CLI, tests, and docs (and sidesteps
# Pages' 25 MiB per-file limit, which the venv's binaries would trip).
set -euo pipefail
cd "$(dirname "$0")"

DIST=".deploy"
rm -rf "$DIST"
mkdir -p "$DIST"

cp ./*.html ./*.css ./*.js manifest.webmanifest "$DIST"/
cp -R icons fonts books "$DIST"/

npx wrangler pages deploy "$DIST" --project-name=folia --commit-dirty=true
