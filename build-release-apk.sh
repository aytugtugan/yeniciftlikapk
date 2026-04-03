#!/bin/bash
# Build Release APK for YeniCiftlik Mobile App
# Usage: ./build-release-apk.sh [version-code]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BUILDS_DIR="$PROJECT_ROOT/builds"

# Create builds directory if not exists
mkdir -p "$BUILDS_DIR"

# Get version info
VERSION_CODE=${1:-1}
BUILD_DATE=$(date +%Y%m%d_%H%M%S)
APK_NAME="yeniciftlik-v${VERSION_CODE}-${BUILD_DATE}.apk"

echo "================================"
echo "YeniCiftlik Release APK Builder"
echo "================================"
echo "Build Directory: $PROJECT_ROOT"
echo "Output: $BUILDS_DIR/$APK_NAME"
echo "Version Code: $VERSION_CODE"
echo ""

# Check if in correct directory
if [ ! -f "$PROJECT_ROOT/package.json" ]; then
    echo "❌ Error: package.json not found in $PROJECT_ROOT"
    echo "Please run this script from the MobileApp directory"
    exit 1
fi

echo "📦 Installing dependencies..."
cd "$PROJECT_ROOT"
npm install

echo ""
echo "🔨 Building release APK..."
npm run android -- --mode Release

# Find the built APK
BUILT_APK=$(find "$PROJECT_ROOT/android/app/build/outputs/apk" -name "*.apk" -type f -printf '%T@ %p\n' | sort -rn | head -1 | cut -d' ' -f2-)

if [ -f "$BUILT_APK" ]; then
    echo ""
    echo "✅ APK built successfully!"
    echo "📁 Built APK: $BUILT_APK"
    echo ""
    echo "📤 Copying to builds directory..."
    cp "$BUILT_APK" "$BUILDS_DIR/$APK_NAME"
    
    echo ""
    echo "✨ Release APK ready!"
    echo "📍 Location: $BUILDS_DIR/$APK_NAME"
    echo ""
    echo "📝 Next steps:"
    echo "1. Upload to yeniciftlikapk repository"
    echo "2. Update version info in release website"
    echo "3. Test on tablets before distributing"
    echo ""
else
    echo "❌ APK build failed or not found"
    exit 1
fi
