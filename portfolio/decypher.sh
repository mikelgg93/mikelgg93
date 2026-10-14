#!/bin/sh
set -eu

# Runs from any CI (GitHub Actions, Cloudflare Pages) or locally.
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

# Correct the published CV copy after loading the encrypted source data.
# Portable in-place edit (GNU and BSD sed differ on -i).
for f in "$PUBLIC_DIR/resume.json" "$PUBLIC_DIR/es-resume.json"; do
  sed \
    -e 's/manga cum laude/magna cum laude/g' \
    -e 's/Max Plank/Max Planck/g' \
    -e 's/European Clinic Essay/European clinical trial/g' \
    "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done
