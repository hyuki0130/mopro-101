#!/bin/bash

# SRS (Structured Reference String) 다운로드 및 생성
#
# 두 가지 옵션:
# 1. Barretenberg (bb): SRS 선택사항 (내장 SRS 있음)
# 2. mopro: circuit.srs 필수 (srs_downloader로 생성)
#
# 사용법:
#   ./download_srs.sh          # Barretenberg용 원본 SRS 다운로드
#   ./download_srs.sh mopro    # mopro용 circuit.srs 생성

CIRCUIT_NAME=$1

PROJECT_HOME="$(cd "$(dirname "$0")/.." && pwd)"
echo $PROJECT_HOME

echo "=================================================="
echo "mopro용 ${CIRCUIT_NAME} SRS 생성"
echo "=================================================="
echo ""
echo "📚 mopro는 circuit에 최적화된 SRS가 필요합니다"
echo "  - noir-rs의 srs_downloader 사용"
echo "  - ${PROJECT_HOME}/circuits/${CIRCUIT_NAME}.json 기반으로 최소 크기 SRS 생성"
echo "  - 모바일 앱에서 사용 (파일 크기 최적화)"
echo ""

# circuit.json 확인
if [ ! -f "${PROJECT_HOME}/circuits/${CIRCUIT_NAME}/target/${CIRCUIT_NAME}.json" ]; then
    echo "❌ ${CIRCUIT_NAME}.json이 없습니다. 먼저 circuit을 컴파일하세요:"
    echo "   nargo compile"
    exit 1
fi

# noir-rs 저장소 경로 (홈 디렉토리에 캐시)
NOIR_RS_DIR="$HOME/.cache/noir-rs"
MOPRO_DIR="${PROJECT_HOME}/mopro/${CIRCUIT_NAME}"

echo "   mopro: $MOPRO_DIR"
echo 

# noir-rs clone (캐시 확인)
if [ ! -d "$NOIR_RS_DIR" ]; then
    echo "📥 noir-rs 저장소 클론 중..."
    echo "   위치: $NOIR_RS_DIR"
    mkdir -p "$(dirname "$NOIR_RS_DIR")"
    git clone --depth 1 --branch v1.0.0-beta.8-3 https://github.com/zkmopro/noir-rs "$NOIR_RS_DIR"

    if [ $? -ne 0 ]; then
        echo "❌ noir-rs clone 실패"
        exit 1
    fi
else
    echo "✅ noir-rs 저장소 존재 (캐시 사용)"
    echo "   위치: $NOIR_RS_DIR"
fi

# mopro 디렉토리 생성 및 circuit.json 복사
echo ""
echo "📂 Circuit 파일 복사..."
rm -rf "$MOPRO_DIR/test-vectors/noir"
mkdir -p "$MOPRO_DIR/test-vectors/noir"
cp ${PROJECT_HOME}/circuits/${CIRCUIT_NAME}/target/${CIRCUIT_NAME}.json "$MOPRO_DIR/test-vectors/noir"

# 절대 경로 계산
CIRCUIT_PATH="$(cd "$MOPRO_DIR" && pwd)/test-vectors/noir/${CIRCUIT_NAME}.json"
OUTPUT_PATH="$(cd "$MOPRO_DIR" && pwd)/test-vectors/noir/${CIRCUIT_NAME}.srs"

echo "   Circuit: $CIRCUIT_PATH"
echo "   Output: $OUTPUT_PATH"
echo ""

# noir-rs 디렉토리로 이동하여 srs_downloader 실행
echo "🔧 SRS 생성 중..."
echo "   (처음 실행 시 Rust 빌드로 인해 5-10분 소요될 수 있습니다)"
echo ""

cd "$NOIR_RS_DIR"

cargo run --release --bin srs_downloader --features srs-downloader -- \
    -c "$CIRCUIT_PATH" \
    -o "$OUTPUT_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ circuit.srs 생성 완료!"
    ls -lh "$OUTPUT_PATH"
    echo ""
    echo "💡 파일 위치: $OUTPUT_PATH"
    echo ""
    echo "📋 다음 단계:"
    echo "   cd ${PROJECT_HOME}/proofport"
    echo "   mopro build"
else
    echo ""
    echo "❌ SRS 생성 실패"
    echo ""
    echo "💡 문제 해결:"
    echo "  1. Rust가 설치되어 있는지 확인: rustc --version"
    echo "  2. 인터넷 연결 확인 (SRS 데이터 다운로드 필요)"
    echo "  3. 디스크 공간 확인 (빌드 + SRS 데이터)"
    echo "  4. noir-rs 캐시 삭제 후 재시도: rm -rf ${NOIR_RS_DIR}"
    exit 1
fi