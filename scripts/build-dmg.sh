#!/bin/bash
# Build Folio.app and optional .dmg installer
# Usage: ./scripts/build-dmg.sh [--dmg]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "=== Building Folio ==="

# Step 1: Build the project
echo "[1/3] Building project..."
./gradlew build

# Step 2: Create .app bundle
echo "[2/3] Creating .app bundle..."
rm -rf build/jpackage/Folio.app
./gradlew jpackageApp

if [ -d "build/jpackage/Folio.app" ]; then
    echo "✅ Folio.app created: build/jpackage/Folio.app"
    ls -la "build/jpackage/Folio.app"
else
    echo "❌ Failed to create .app bundle"
    exit 1
fi

# Step 3: Create .dmg if --dmg flag passed
if [ "$1" = "--dmg" ]; then
    echo "[3/3] Creating .dmg installer..."
    rm -rf build/jpackage-dmg/Folio*.dmg
    ./gradlew jpackageDmg

    DMG_FILE=$(ls build/jpackage-dmg/Folio*.dmg 2>/dev/null | head -1)
    if [ -n "$DMG_FILE" ]; then
        echo "✅ DMG created: $DMG_FILE"
        ls -la "$DMG_FILE"
    else
        echo "❌ Failed to create .dmg installer"
        exit 1
    fi
else
    echo "[3/3] Skipping .dmg (use --dmg flag to create installer)"
fi

echo ""
echo "=== Build Complete ==="
echo ""
echo "To install:"
echo "  cp -r build/jpackage/Folio.app /Applications/"
echo ""
echo "To run:"
echo "  open build/jpackage/Folio.app"
echo ""
