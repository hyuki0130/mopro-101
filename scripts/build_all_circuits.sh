#!/bin/bash

# =============================================================================
# Build All Circuits - 모든 Noir 회로 컴파일, 증명 생성, 검증, 컨트랙트 생성
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CIRCUITS_DIR="$PROJECT_ROOT/circuits"
CONTRACTS_DIR="$PROJECT_ROOT/contracts"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 카운터
TOTAL=0
SUCCESS=0
FAILED=0

echo ""
echo "============================================================"
echo "  Noir Circuit Build System"
echo "============================================================"
echo ""

# bb CLI 확인
if ! command -v bb &> /dev/null; then
    echo -e "${RED}Error: bb (barretenberg) not installed${NC}"
    echo "Install: curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/master/barretenberg/cpp/installation/install | bash"
    exit 1
fi

# nargo 확인
if ! command -v nargo &> /dev/null; then
    echo -e "${RED}Error: nargo not installed${NC}"
    exit 1
fi

BB_VERSION=$(bb --version)
NARGO_VERSION=$(nargo --version | head -1)
echo -e "${BLUE}bb CLI:${NC} $BB_VERSION"
echo -e "${BLUE}nargo:${NC} $NARGO_VERSION"
echo ""

# contracts 디렉토리 생성
mkdir -p "$CONTRACTS_DIR"

# Nargo.toml이 있는 모든 디렉토리 찾기
find "$CIRCUITS_DIR" -name "Nargo.toml" -type f | while read nargo_file; do
    CIRCUIT_DIR="$(dirname "$nargo_file")"
    CIRCUIT_NAME="$(basename "$CIRCUIT_DIR")"

    # Nargo.toml에서 실제 패키지 이름 추출
    PACKAGE_NAME=$(grep -E "^name" "$nargo_file" | head -1 | sed 's/.*"\([^"]*\)".*/\1/')

    echo "============================================================"
    echo -e "${BLUE}Building:${NC} $CIRCUIT_NAME (package: $PACKAGE_NAME)"
    echo "============================================================"

    cd "$CIRCUIT_DIR"

    # 이전 빌드 결과물 정리
    rm -rf ./target

    # 1. 컴파일
    echo -e "${YELLOW}[1/6]${NC} Compiling circuit..."
    if nargo compile 2>&1; then
        echo -e "${GREEN}  ✓ Compilation complete${NC}"
    else
        echo -e "${RED}  ✗ Compilation failed${NC}"
        continue
    fi

    # 컴파일된 JSON 파일 찾기
    CIRCUIT_JSON="./target/${PACKAGE_NAME}.json"
    if [ ! -f "$CIRCUIT_JSON" ]; then
        echo -e "${RED}  ✗ Circuit JSON not found: $CIRCUIT_JSON${NC}"
        continue
    fi

    # 2. Witness 생성 (Prover.toml 필요)
    if [ -f "Prover.toml" ]; then
        echo -e "${YELLOW}[2/5]${NC} Generating witness..."
        if nargo execute witness 2>&1; then
            echo -e "${GREEN}  ✓ Witness generated${NC}"
        else
            echo -e "${RED}  ✗ Witness generation failed${NC}"
            continue
        fi

        # 3. Proof + VK 생성 (공식 데모 방식: --write_vk로 한 번에)
        echo -e "${YELLOW}[3/5]${NC} Generating proof + VK (Keccak)..."
        if bb prove \
            -b "$CIRCUIT_JSON" \
            -w ./target/witness.gz \
            -o ./target/proof \
            --oracle_hash keccak \
            --output_format bytes_and_fields \
            --write_vk 2>&1; then
            PROOF_SIZE=$(wc -c < ./target/proof/proof 2>/dev/null | tr -d ' ')
            echo -e "${GREEN}  ✓ Proof + VK generated ($PROOF_SIZE bytes)${NC}"
        else
            echo -e "${RED}  ✗ Proof generation failed${NC}"
            continue
        fi

        # 4. Proof 검증
        echo -e "${YELLOW}[4/5]${NC} Verifying proof..."
        if bb verify \
            -p ./target/proof/proof \
            -k ./target/proof/vk \
            -i ./target/proof/public_inputs \
            --oracle_hash keccak 2>&1; then
            echo -e "${GREEN}  ✓ Proof verified successfully${NC}"
        else
            echo -e "${RED}  ✗ Proof verification failed${NC}"
            continue
        fi
    else
        echo -e "${YELLOW}[2/5]${NC} Skipping witness (no Prover.toml)"
        echo -e "${YELLOW}[3/5]${NC} Skipping proof generation"
        echo -e "${YELLOW}[4/5]${NC} Skipping verification"

        # VK만 생성 (Prover.toml 없을 때)
        echo -e "${YELLOW}[3/5]${NC} Generating VK only (Keccak)..."
        if bb write_vk -b "$CIRCUIT_JSON" -o ./target/proof --oracle_hash keccak 2>&1; then
            echo -e "${GREEN}  ✓ VK generated${NC}"
        else
            echo -e "${RED}  ✗ VK generation failed${NC}"
            continue
        fi
    fi

    # 5. Solidity Verifier 생성
    echo -e "${YELLOW}[5/5]${NC} Generating Solidity verifier..."
    # snake_case를 PascalCase로 변환 (age_verifier -> AgeVerifier, zk_coinbase_attestor -> ZkCoinbaseAttestor)
    VERIFIER_NAME=$(echo "$PACKAGE_NAME" | sed 's/_/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2)}1' | tr -d ' ')
    VERIFIER_FILE="$CONTRACTS_DIR/${VERIFIER_NAME}.sol"
    if bb write_solidity_verifier -k ./target/proof/vk -o "$VERIFIER_FILE" 2>&1; then
        VERIFIER_LINES=$(wc -l < "$VERIFIER_FILE" | tr -d ' ')
        echo -e "${GREEN}  ✓ Verifier generated: ${VERIFIER_NAME}.sol ($VERIFIER_LINES lines)${NC}"
    else
        echo -e "${RED}  ✗ Verifier generation failed${NC}"
        continue
    fi

    echo ""
done

echo "============================================================"
echo -e "${GREEN}  Build Complete!${NC}"
echo "============================================================"
echo ""
echo "Generated contracts:"
ls -la "$CONTRACTS_DIR"/*.sol 2>/dev/null || echo "  (none)"
echo ""
