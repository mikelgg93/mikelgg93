#!/bin/sh

# Decrypt the file
mkdir -p "${GITHUB_WORKSPACE}/secrets"
gpg --quiet --batch --yes --decrypt --passphrase="$PASS" \
--output "${GITHUB_WORKSPACE}/components/data/RESUME.json" "${GITHUB_WORKSPACE}/components/data/RESUME.json.gpg"

