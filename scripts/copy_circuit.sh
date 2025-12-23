#!/bin/bash

# 서킷 파일 및 mopro 바인딩을 ProofPortApp으로 복사
# 사용법: ./scripts/copy_circuit.sh

set -e

PROJECT_HOME="$(cd "$(dirname "$0")/.." && pwd)"
MOPRO_DIR="${PROJECT_HOME}/mopro"
APP_DIR="${PROJECT_HOME}/ProofPortApp"

echo "=================================================="
echo "서킷 및 바인딩 복사"
echo "=================================================="
echo ""
echo "📂 프로젝트: $PROJECT_HOME"
echo ""

# 1. mopro 바인딩 복사
echo "1️⃣  mopro 바인딩 복사..."
if [ -d "${MOPRO_DIR}/MoproReactNativeBindings" ]; then
    rm -rf "${APP_DIR}/mopro_bindings"
    cp -r "${MOPRO_DIR}/MoproReactNativeBindings" "${APP_DIR}/mopro_bindings"
    echo "   ✅ MoproReactNativeBindings → mopro_bindings"
else
    echo "   ❌ MoproReactNativeBindings가 없습니다. mopro 빌드를 먼저 실행하세요."
    exit 1
fi

# 2. 서킷 파일 복사 (JSON + SRS + VK)
echo ""
echo "2️⃣  서킷 파일 복사..."
mkdir -p "${APP_DIR}/assets/circuits"

for circuit_file in "${MOPRO_DIR}/test-vectors/noir"/*.json; do
    if [ -f "$circuit_file" ]; then
        circuit_name=$(basename "$circuit_file" .json)

        # JSON 복사
        cp "$circuit_file" "${APP_DIR}/assets/circuits/"
        echo "   ✅ ${circuit_name}.json"

        # SRS 복사 (있으면)
        srs_file="${MOPRO_DIR}/test-vectors/noir/${circuit_name}.srs"
        if [ -f "$srs_file" ]; then
            cp "$srs_file" "${APP_DIR}/assets/circuits/"
            echo "   ✅ ${circuit_name}.srs"
        fi

        # VK 복사 (있으면 - 번들에 포함!)
        vk_file="${MOPRO_DIR}/test-vectors/noir/${circuit_name}.vk"
        if [ -f "$vk_file" ]; then
            cp "$vk_file" "${APP_DIR}/assets/circuits/"
            echo "   ✅ ${circuit_name}.vk (VK 번들링)"
        fi
    fi
done

# 3. Android assets에 복사
echo ""
echo "3️⃣  Android assets에 복사..."
ANDROID_ASSETS="${APP_DIR}/android/app/src/main/assets/circuits"
mkdir -p "$ANDROID_ASSETS"
cp "${APP_DIR}/assets/circuits"/* "$ANDROID_ASSETS/"
echo "   ✅ Android assets 복사 완료"
ls -la "$ANDROID_ASSETS/"

# 4. iOS assets에 복사
echo ""
echo "4️⃣  iOS assets에 복사..."
IOS_ASSETS="${APP_DIR}/ios/ProofPortApp"
for circuit_file in "${APP_DIR}/assets/circuits"/*.json; do
    if [ -f "$circuit_file" ]; then
        circuit_name=$(basename "$circuit_file" .json)
        cp "${APP_DIR}/assets/circuits/${circuit_name}.json" "$IOS_ASSETS/"
        cp "${APP_DIR}/assets/circuits/${circuit_name}.srs" "$IOS_ASSETS/" 2>/dev/null || true
        cp "${APP_DIR}/assets/circuits/${circuit_name}.vk" "$IOS_ASSETS/" 2>/dev/null || true
        echo "   ✅ ${circuit_name} → iOS assets"
    fi
done

echo ""
echo "=================================================="
echo "✅ 복사 완료!"
echo "=================================================="
echo ""
echo "📂 바인딩: ${APP_DIR}/mopro_bindings/"
echo "📂 서킷 (공용): ${APP_DIR}/assets/circuits/"
echo "📂 서킷 (Android): ${ANDROID_ASSETS}/"
echo "📂 서킷 (iOS): ${IOS_ASSETS}/"
echo ""
echo "📋 복사된 파일 (공용):"
ls -la "${APP_DIR}/assets/circuits/"
echo ""
