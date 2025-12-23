#!/bin/bash

# mopro 빌드 스크립트
# React Native 바인딩 생성 (iOS + Android)

set -e

PROJECT_HOME="$(cd "$(dirname "$0")/.." && pwd)"
MOPRO_DIR="${PROJECT_HOME}/mopro"

echo "=================================================="
echo "mopro 빌드"
echo "=================================================="
echo ""
echo "📂 프로젝트: $PROJECT_HOME"
echo "📂 mopro 디렉토리: $MOPRO_DIR"
echo ""

cd "$MOPRO_DIR"

echo "🔧 빌드 시작..."
echo ""

mopro build --mode release \
  --platforms react-native \
  --architectures aarch64-apple-ios \
  --architectures aarch64-apple-ios-sim \
  --architectures aarch64-linux-android

echo ""
echo "=================================================="
echo "✅ mopro 빌드 완료!"
echo "=================================================="
echo ""
echo "📂 생성된 바인딩: ${MOPRO_DIR}/MoproReactNativeBindings/"
echo ""

# 자동으로 바인딩 및 서킷 파일 복사
echo "🔄 바인딩 및 서킷 파일을 ProofPortApp으로 복사 중..."
echo ""
"${PROJECT_HOME}/scripts/copy_circuit.sh"

# mopro 바인딩 lib 빌드 (TypeScript 컴파일)
echo ""
echo "🔧 mopro 바인딩 lib 빌드 중..."
cd "${PROJECT_HOME}/ProofPortApp/mopro_bindings"
npm run prepare
echo "   ✅ lib 폴더 생성 완료"

echo ""
echo "=================================================="
echo "✅ 전체 빌드 완료!"
echo "=================================================="
echo ""
echo "📂 mopro 바인딩: ${PROJECT_HOME}/ProofPortApp/mopro_bindings/"
echo "📂 lib 폴더: ${PROJECT_HOME}/ProofPortApp/mopro_bindings/lib/"
echo ""
echo "이제 앱을 실행하세요:"
echo "  cd ProofPortApp && npm run ios:device"
echo "  cd ProofPortApp && npm run android:device"
