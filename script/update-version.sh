#!/bin/bash

# COAV Version Update Script
# This script updates version numbers across all relevant files

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to display usage
usage() {
    echo "Usage: $0 <version>"
    echo "Example: $0 1.2.3"
    echo ""
    echo "This script updates version numbers in:"
    echo "  - package.json"
    echo "  - src-tauri/Cargo.toml"
    echo "  - src-tauri/tauri.conf.json"
    exit 1
}

# Function to validate version format
validate_version() {
    if ! [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+)?$ ]]; then
        echo -e "${RED}Error: Invalid version format${NC}"
        echo "Version must be in format: X.Y.Z or X.Y.Z-suffix"
        echo "Examples: 1.0.0, 2.1.3-beta, 3.0.0-rc1"
        exit 1
    fi
}

# Function to update version in a JSON file using sed
update_json_version() {
    local file=$1
    local key=$2
    local version=$3
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/\"$key\": \"[^\"]*\"/\"$key\": \"$version\"/g" "$file"
    else
        # Linux
        sed -i "s/\"$key\": \"[^\"]*\"/\"$key\": \"$version\"/g" "$file"
    fi
}

# Function to update version in Cargo.toml
update_cargo_version() {
    local file=$1
    local version=$2
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/^version = \"[^\"]*\"/version = \"$version\"/g" "$file"
    else
        # Linux
        sed -i "s/^version = \"[^\"]*\"/version = \"$version\"/g" "$file"
    fi
}

# Check if version argument is provided
if [ $# -eq 0 ]; then
    usage
fi

VERSION=$1
validate_version "$VERSION"

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo -e "${YELLOW}Updating COAV version to ${VERSION}${NC}"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Update package.json
if [ -f "package.json" ]; then
    echo -n "Updating package.json... "
    update_json_version "package.json" "version" "$VERSION"
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}Error: package.json not found${NC}"
    exit 1
fi

# Update src-tauri/Cargo.toml
if [ -f "src-tauri/Cargo.toml" ]; then
    echo -n "Updating src-tauri/Cargo.toml... "
    update_cargo_version "src-tauri/Cargo.toml" "$VERSION"
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}Error: src-tauri/Cargo.toml not found${NC}"
    exit 1
fi

# Update src-tauri/tauri.conf.json
if [ -f "src-tauri/tauri.conf.json" ]; then
    echo -n "Updating src-tauri/tauri.conf.json... "
    update_json_version "src-tauri/tauri.conf.json" "version" "$VERSION"
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}Error: src-tauri/tauri.conf.json not found${NC}"
    exit 1
fi

# Update Cargo.lock
echo -n "Updating Cargo.lock... "
cd src-tauri
cargo update -p coav --precise "$VERSION" 2>/dev/null || true
cd ..
echo -e "${GREEN}✓${NC}"

echo ""
echo -e "${GREEN}Version updated successfully to ${VERSION}${NC}"
echo ""
echo "Next steps:"
echo "1. Review the changes: git diff"
echo "2. Commit the changes: git add . && git commit -m \"chore: bump version to ${VERSION}\""
echo "3. Create a tag: git tag -a v${VERSION} -m \"Release version ${VERSION}\""
echo "4. Push changes: git push origin main && git push origin v${VERSION}"