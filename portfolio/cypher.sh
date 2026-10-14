#!/bin/sh
set -eu

if [ -z "${PASS:-}" ]; then
  echo "cypher.sh: PASS is not set; provide PASS environment variable." >&2
  exit 1
fi

PUBLIC_DIR="$(cd "$(dirname "$0")" && pwd)/public"

# Encrypt the files
gpg --quiet --batch --yes --pinentry-mode loopback --passphrase="$PASS" \
  --symmetric --output "$PUBLIC_DIR/resume.json.gpg" "$PUBLIC_DIR/resume.json"

gpg --quiet --batch --yes --pinentry-mode loopback --passphrase="$PASS" \
  --symmetric --output "$PUBLIC_DIR/es-resume.json.gpg" "$PUBLIC_DIR/es-resume.json"

echo "Successfully encrypted resume.json.gpg and es-resume.json.gpg."
