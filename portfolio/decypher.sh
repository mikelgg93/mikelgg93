#!/bin/sh

# Decrypt the files
gpg --quiet --batch --yes --decrypt --passphrase="$PASS" \
--output "${GITHUB_WORKSPACE}/portfolio/public/resume.json" "${GITHUB_WORKSPACE}/portfolio/public/resume.json.gpg"

gpg --quiet --batch --yes --decrypt --passphrase="$PASS" \
--output "${GITHUB_WORKSPACE}/portfolio/public/es-resume.json" "${GITHUB_WORKSPACE}/portfolio/public/es-resume.json.gpg"
