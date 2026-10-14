#!/bin/sh

# Decrypt the files
gpg --quiet --batch --yes --decrypt --passphrase="$PASS" \
--output "${GITHUB_WORKSPACE}/portfolio/public/resume.json" "${GITHUB_WORKSPACE}/portfolio/public/resume.json.gpg"

gpg --quiet --batch --yes --decrypt --passphrase="$PASS" \
--output "${GITHUB_WORKSPACE}/portfolio/public/es-resume.json" "${GITHUB_WORKSPACE}/portfolio/public/es-resume.json.gpg"

# Correct the published CV copy after loading the encrypted source data.
sed -i \
  -e 's/manga cum laude/magna cum laude/g' \
  -e 's/Max Plank/Max Planck/g' \
  -e 's/European Clinic Essay/European clinical trial/g' \
  "${GITHUB_WORKSPACE}/portfolio/public/resume.json" \
  "${GITHUB_WORKSPACE}/portfolio/public/es-resume.json"
