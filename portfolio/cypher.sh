#!/bin/sh

# Encrypt the files
gpg --quiet --batch --yes --symmetric --output public/resume.json.gpg public/resume.json

gpg --quiet --batch --yes --symmetric --output public/es-resume.json.gpg public/es-resume.json
