#!/bin/bash

# 모든 서킷의 SRS (Structured Reference String) 생성
#
# circuits/ 디렉토리 내의 모든 컴파일된 서킷에 대해 SRS를 생성합니다.
# 생성된 SRS 파일은 mopro/test-vectors/noir/ 에 저장됩니다.
#
# 사용법:
#   ./generate_all_srs.sh

set -e

PROJECT_HOME="$(cd "$(dirname "$0")/.." && pwd)"
CIRCUITS_DIR="${PROJECT_HOME}/circuits"
MOPRO_DIR="${PROJECT_HOME}/mopro"
TEST_VECTORS_DIR="${MOPRO_DIR}/test-vectors/noir"

echo "=================================================="
echo "모든 서킷 SRS 생성"
echo "=================================================="
echo ""
echo "📂 프로젝트: $PROJECT_HOME"
echo "📂 서킷 디렉토리: $CIRCUITS_DIR"
echo "📂 출력 디렉토리: $TEST_VECTORS_DIR"
echo ""

# noir-rs 저장소 경로 (홈 디렉토리에 캐시)
NOIR_RS_DIR="$HOME/.cache/noir-rs"

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

echo ""

# 출력 디렉토리 생성
mkdir -p "$TEST_VECTORS_DIR"

# 컴파일된 서킷 찾기
CIRCUIT_FILES=$(find "$CIRCUITS_DIR" -path "*/target/*.json" -type f 2>/dev/null)

if [ -z "$CIRCUIT_FILES" ]; then
    echo "❌ 컴파일된 서킷이 없습니다."
    echo "   먼저 각 서킷 디렉토리에서 'nargo compile'을 실행하세요."
    exit 1
fi

echo "🔍 발견된 서킷:"
echo "$CIRCUIT_FILES" | while read -r file; do
    echo "   - $(basename "$file")"
done
echo ""

# 각 서킷에 대해 SRS 생성
SUCCESS_COUNT=0
FAIL_COUNT=0

for CIRCUIT_JSON in $CIRCUIT_FILES; do
    CIRCUIT_NAME=$(basename "$CIRCUIT_JSON" .json)

    echo "=================================================="
    echo "🔧 ${CIRCUIT_NAME} SRS 생성 중..."
    echo "=================================================="

    # JSON 파일 복사
    cp "$CIRCUIT_JSON" "$TEST_VECTORS_DIR/"
    echo "   ✅ ${CIRCUIT_NAME}.json 복사 완료"

    # 절대 경로 계산
    CIRCUIT_PATH="${TEST_VECTORS_DIR}/${CIRCUIT_NAME}.json"
    OUTPUT_PATH="${TEST_VECTORS_DIR}/${CIRCUIT_NAME}.srs"

    echo "   Circuit: $CIRCUIT_PATH"
    echo "   Output: $OUTPUT_PATH"
    echo ""

    # noir-rs 디렉토리로 이동하여 srs_downloader 실행
    cd "$NOIR_RS_DIR"

    if cargo run --release --bin srs_downloader --features srs-downloader -- \
        -c "$CIRCUIT_PATH" \
        -o "$OUTPUT_PATH"; then
        echo ""
        echo "   ✅ ${CIRCUIT_NAME}.srs 생성 완료!"
        ls -lh "$OUTPUT_PATH"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo ""
        echo "   ❌ ${CIRCUIT_NAME}.srs 생성 실패"
        FAIL_COUNT=$((FAIL_COUNT + 1))
    fi

    echo ""
done

# 결과 요약
echo "=================================================="
echo "📋 결과 요약"
echo "=================================================="
echo ""
echo "   ✅ 성공: $SUCCESS_COUNT"
echo "   ❌ 실패: $FAIL_COUNT"
echo ""
echo "📂 생성된 파일:"
ls -lh "$TEST_VECTORS_DIR"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo "✅ 모든 SRS 생성 완료!"
    echo ""
    echo "📋 다음 단계:"
    echo "   cd ${MOPRO_DIR}"
    echo "   mopro build"
else
    echo "⚠️  일부 SRS 생성 실패. 위 로그를 확인하세요."
    exit 1
fi
