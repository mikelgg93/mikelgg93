#!/bin/sh
set -eu

# Runs from any CI (Cloudflare Pages, GitHub Actions) or locally.
PUBLIC_DIR="$(cd "$(dirname "$0")" && pwd)/public"

if [ -z "${PASS:-}" ]; then
  echo "decypher.sh: PASS is not set; cannot decrypt the CV data." >&2
  exit 1
fi

# Decrypt the files
gpg --quiet --batch --yes --pinentry-mode loopback --passphrase="$PASS" \
  --output "$PUBLIC_DIR/resume.json" "$PUBLIC_DIR/resume.json.gpg"

gpg --quiet --batch --yes --pinentry-mode loopback --passphrase="$PASS" \
  --output "$PUBLIC_DIR/es-resume.json" "$PUBLIC_DIR/es-resume.json.gpg"
