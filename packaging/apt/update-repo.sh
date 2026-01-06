#!/bin/bash
# Script to update APT repository with new .deb packages
# This is called by the release workflow

set -e

REPO_DIR="${1:-.}"
DEB_FILE="$2"

if [ -z "$DEB_FILE" ]; then
    echo "Usage: $0 <repo-dir> <deb-file>"
    exit 1
fi

cd "$REPO_DIR"

# Initialize repository if needed
if [ ! -d "db" ]; then
    mkdir -p db dists/stable/main/binary-amd64 pool/main
fi

# Add package to repository
reprepro -b . includedeb stable "$DEB_FILE"

echo "Repository updated successfully"
