#!/bin/bash
# Clear Android build cache and mopro poly-mmap cache files
# Run this before building if you encounter "insufficient storage" errors

echo "=== Clearing Android Build Cache ==="

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Project directory: $PROJECT_DIR"

# Clear Gradle build cache
echo "Clearing Gradle build cache..."
cd "$PROJECT_DIR/android"
./gradlew clean 2>/dev/null || echo "Gradle clean skipped (no daemon)"

# Clear Gradle cache directory
GRADLE_CACHE="$HOME/.gradle/caches"
if [ -d "$GRADLE_CACHE" ]; then
    echo "Clearing Gradle caches directory..."
    rm -rf "$GRADLE_CACHE/build-cache-"* 2>/dev/null
    rm -rf "$GRADLE_CACHE/transforms-"* 2>/dev/null
    echo "Gradle cache cleared"
fi

# Clear Android build directory
echo "Clearing Android build directory..."
rm -rf "$PROJECT_DIR/android/app/build" 2>/dev/null
rm -rf "$PROJECT_DIR/android/build" 2>/dev/null
rm -rf "$PROJECT_DIR/android/.gradle" 2>/dev/null

# Clear metro bundler cache
echo "Clearing Metro bundler cache..."
rm -rf "$PROJECT_DIR/node_modules/.cache" 2>/dev/null
rm -rf /tmp/metro-* 2>/dev/null
rm -rf /tmp/haste-map-* 2>/dev/null

# Clear React Native cache
echo "Clearing React Native cache..."
rm -rf "$PROJECT_DIR/.react-native" 2>/dev/null

# Clear watchman if installed
if command -v watchman &> /dev/null; then
    echo "Clearing Watchman cache..."
    watchman watch-del-all 2>/dev/null
fi

echo ""
echo "=== Cache Cleared Successfully ==="
echo "You can now run: npm run android"
