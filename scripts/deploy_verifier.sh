#!/bin/bash

# =============================================================================
# Deploy Verifier Script - Solidity Verifier를 네트워크에 배포
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# =============================================================================
# 배포된 ZKTranscriptLib 라이브러리 주소 (공개 정보 - 한 번 배포 후 재사용)
# =============================================================================
SEPOLIA_LIB_ADDRESS="0xF239e24B6B1749A525AfA8741E29c482778a1ac8"
MAINNET_LIB_ADDRESS=""

# 사용법 출력
usage() {
    echo ""
    echo "Usage: $0 <command> <network>"
    echo ""
    echo "Commands:"
    echo "  lib        ZKTranscriptLib 라이브러리 배포 (최초 1회)"
    echo "  age        AgeVerifier 배포"
    echo "  coinbase   ZkCoinbaseAttestor 배포"
    echo ""
    echo "Networks: sepolia, mainnet"
    echo ""
    echo "Examples:"
    echo "  $0 lib sepolia       # 라이브러리 먼저 배포 (최초 1회)"
    echo "  $0 age sepolia       # AgeVerifier 배포"
    echo "  $0 coinbase sepolia  # ZkCoinbaseAttestor 배포"
    echo ""
    exit 1
}

# 인자 검증
if [ $# -ne 2 ]; then
    usage
fi

COMMAND=$1
NETWORK=$2

cd "$PROJECT_ROOT"

# .env 파일 로드
if [ -f .env ]; then
    source .env
else
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# 환경 변수 검증
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: PRIVATE_KEY not set in .env${NC}"
    exit 1
fi

# 네트워크별 설정
case $NETWORK in
    sepolia)
        RPC_URL="$SEPOLIA_RPC_URL"
        LIB_ADDRESS="$SEPOLIA_LIB_ADDRESS"
        EXPLORER="https://sepolia.etherscan.io"
        ;;
    mainnet)
        RPC_URL="$MAINNET_RPC_URL"
        LIB_ADDRESS="$MAINNET_LIB_ADDRESS"
        EXPLORER="https://etherscan.io"
        ;;
    *)
        echo -e "${RED}Error: Unknown network '$NETWORK'${NC}"
        exit 1
        ;;
esac

# 라이브러리 배포
if [ "$COMMAND" == "lib" ]; then
    echo ""
    echo "============================================================"
    echo -e "  ${BLUE}Deploying ZKTranscriptLib to $NETWORK${NC}"
    echo "============================================================"
    echo ""

    if [ "$NETWORK" == "mainnet" ]; then
        echo -e "${YELLOW}Warning: Deploying to MAINNET!${NC}"
        read -p "Continue? (y/N) " -r
        [[ ! $REPLY =~ ^[Yy]$ ]] && exit 0
    fi

    forge create "contracts/AgeVerifier.sol:ZKTranscriptLib" \
        --rpc-url "$RPC_URL" \
        --private-key "$PRIVATE_KEY" \
        --broadcast \
        --verify \
        --etherscan-api-key "$ETHERSCAN_API_KEY"

    echo ""
    echo -e "${GREEN}============================================================${NC}"
    echo -e "${GREEN}  Library deployed! Update the address in this script.${NC}"
    echo -e "${GREEN}============================================================${NC}"
    exit 0
fi

# Verifier 배포 - 라이브러리 주소 필요
if [ -z "$LIB_ADDRESS" ]; then
    echo -e "${RED}Error: Library address not set${NC}"
    echo "Run './scripts/deploy_verifier.sh lib $NETWORK' first"
    exit 1
fi

# Verifier 매핑
case $COMMAND in
    age)
        CONTRACT_FILE="contracts/AgeVerifier.sol"
        CONTRACT_NAME="HonkVerifier"
        DISPLAY_NAME="AgeVerifier"
        ;;
    coinbase)
        CONTRACT_FILE="contracts/ZkCoinbaseAttestor.sol"
        CONTRACT_NAME="HonkVerifier"
        DISPLAY_NAME="ZkCoinbaseAttestor"
        ;;
    *)
        echo -e "${RED}Error: Unknown command '$COMMAND'${NC}"
        usage
        ;;
esac

echo ""
echo "============================================================"
echo -e "  ${BLUE}Deploying $DISPLAY_NAME to $NETWORK${NC}"
echo "============================================================"
echo -e "  Library: $LIB_ADDRESS"
echo ""

if [ "$NETWORK" == "mainnet" ]; then
    echo -e "${YELLOW}Warning: Deploying to MAINNET!${NC}"
    read -p "Continue? (y/N) " -r
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 0
fi

forge create "$CONTRACT_FILE:$CONTRACT_NAME" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --libraries "$CONTRACT_FILE:ZKTranscriptLib:$LIB_ADDRESS" \
    --broadcast \
    --verify \
    --etherscan-api-key "$ETHERSCAN_API_KEY"

echo ""
echo "============================================================"
echo -e "  ${GREEN}Deployment Complete!${NC}"
echo "============================================================"
echo "  $EXPLORER"
echo ""
