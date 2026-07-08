# Noir Circuit Verifier 온체인 배포 가이드

Foundry를 사용하여 Noir 회로의 Solidity Verifier를 Ethereum 네트워크에 배포하는 방법을 설명합니다.

- **개발/테스트:** Sepolia Testnet
- **프로덕션:** Ethereum Mainnet

## 목차

1. [Foundry 설치](#1-foundry-설치)
2. [프로젝트 설정](#2-프로젝트-설정)
3. [환경 변수 구성](#3-환경-변수-구성)
4. [Sepolia 테스트넷 배포](#4-sepolia-테스트넷-배포)
5. [Ethereum Mainnet 배포](#5-ethereum-mainnet-배포)
6. [컨트랙트 검증 (Etherscan)](#6-컨트랙트-검증-etherscan)
7. [배포된 컨트랙트 테스트](#7-배포된-컨트랙트-테스트)
8. [Noir/Barretenberg 주의사항](#8-noirbarretenberg-주의사항)

---

## 1. Foundry 설치

### macOS / Linux

```bash
# Foundry 설치
curl -L https://foundry.paradigm.xyz | bash

# 쉘 재시작 또는 source
source ~/.bashrc  # 또는 ~/.zshrc

# Foundry 업데이트
foundryup
```

### 설치 확인

```bash
forge --version
# forge 0.2.0 (xxxxxxx 2024-xx-xx)

cast --version
# cast 0.2.0 (xxxxxxx 2024-xx-xx)

anvil --version
# anvil 0.2.0 (xxxxxxx 2024-xx-xx)
```

### Foundry 도구 설명

| 도구 | 용도 |
|------|------|
| `forge` | 컴파일, 테스트, 배포 |
| `cast` | 블록체인 상호작용 (call, send, tx 조회) |
| `anvil` | 로컬 테스트 노드 |
| `chisel` | Solidity REPL |

---

## 2. 프로젝트 설정

### Foundry 프로젝트 초기화

```bash
cd /path/to/mopro-101

# 기존 프로젝트에 Foundry 초기화 (기존 파일 유지)
forge init --force --no-commit
```

### foundry.toml 설정

프로젝트 루트에 `foundry.toml` 생성/수정:

```toml
[profile.default]
src = "contracts"
out = "out"
libs = ["lib"]
solc = "0.8.27"
optimizer = true
optimizer_runs = 200

# Etherscan 검증 설정
[etherscan]
mainnet = { key = "${ETHERSCAN_API_KEY}" }
sepolia = { key = "${ETHERSCAN_API_KEY}" }

# RPC 엔드포인트
[rpc_endpoints]
mainnet = "${MAINNET_RPC_URL}"
sepolia = "${SEPOLIA_RPC_URL}"
```

### 디렉토리 구조

```
mopro-101/
├── contracts/                 # Solidity 소스 (src 대신 사용)
│   ├── AgeVerifier.sol
│   └── ZkCoinbaseAttestor.sol
├── script/                    # 배포 스크립트
├── test/                      # Foundry 테스트
├── out/                       # 컴파일 결과물
├── foundry.toml
└── .env
```

---

## 3. 환경 변수 구성

### .env 파일 생성

프로젝트 루트에 `.env` 파일 생성:

```bash
# ===========================================
# Network RPC URLs
# ===========================================

# Ethereum Mainnet (프로덕션)
# Alchemy: https://www.alchemy.com/
# Infura: https://infura.io/
MAINNET_RPC_URL="https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY"

# Sepolia Testnet (개발/테스트)
SEPOLIA_RPC_URL="https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY"

# ===========================================
# Deployment Keys
# ===========================================

# 배포용 개인키 (0x 접두사 포함)
# 주의: 절대 Git에 커밋하지 마세요!
PRIVATE_KEY="0xyour_private_key_here"

# ===========================================
# Block Explorer API Keys
# ===========================================

# Etherscan API 키 (https://etherscan.io/myapikey)
ETHERSCAN_API_KEY="your_etherscan_api_key"
```

### .gitignore에 추가

```bash
echo ".env" >> .gitignore
echo "out/" >> .gitignore
echo "cache/" >> .gitignore
```

### 환경 변수 로드

```bash
source .env
```

### RPC URL 얻는 방법

**무료 RPC 제공자:**

| 제공자 | URL | 특징 |
|--------|-----|------|
| [Alchemy](https://www.alchemy.com/) | `https://eth-sepolia.g.alchemy.com/v2/API_KEY` | 무료 티어 제공, 안정적 |
| [Infura](https://infura.io/) | `https://sepolia.infura.io/v3/API_KEY` | 무료 티어 제공 |
| [Public Node](https://ethereum.publicnode.com/) | `https://ethereum-sepolia-rpc.publicnode.com` | 키 없이 사용 가능 (Rate limit 있음) |

---

## 4. Sepolia 테스트넷 배포

### 4.1 Sepolia ETH 받기

배포 및 테스트에 사용할 테스트 ETH를 Faucet에서 받습니다:

- [Alchemy Sepolia Faucet](https://sepoliafaucet.com/)
- [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)
- [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)

### 4.2 컴파일

```bash
forge build
```

### 4.3 배포 (Verifier 예시: AgeVerifier)

```bash
forge create contracts/AgeVerifier.sol:AgeVerifier \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

또는 스크립트를 사용하는 경우 (`script/DeployVerifier.s.sol`):

```bash
forge script script/DeployVerifier.s.sol \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### 4.4 배포 결과 확인

배포가 완료되면 콘솔에 배포된 컨트랙트 주소가 출력됩니다. 브로드캐스트 로그는 `broadcast/DeployVerifier.s.sol/11155111/run-latest.json` 에서 확인 가능합니다.

---

## 5. Ethereum Mainnet 배포

> ⚠️ **주의:** Mainnet 배포는 실제 자금이 소요됩니다. 배포 전 Sepolia에서 충분히 테스트하세요.

### 5.1 가스비 확인

```bash
cast gas-price --rpc-url $MAINNET_RPC_URL
```

### 5.2 배포 전 시뮬레이션 (Dry Run)

`--broadcast` 옵션 없이 실행하여 시뮬레이션만 수행합니다:

```bash
forge script script/DeployVerifier.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY
```

### 5.3 실제 배포

```bash
forge script script/DeployVerifier.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY \
  --slow
```

> `--slow` 옵션은 트랜잭션을 순차적으로 전송하여 nonce 충돌을 방지합니다.

### 5.4 하드웨어 지갑 사용 (권장)

프로덕션 배포 시 개인키 대신 하드웨어 지갑 사용을 권장합니다:

```bash
forge script script/DeployVerifier.s.sol \
  --rpc-url $MAINNET_RPC_URL \
  --ledger \
  --sender <YOUR_LEDGER_ADDRESS> \
  --broadcast \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

---

## 6. 컨트랙트 검증 (Etherscan)

### 배포 시 자동 검증

위 배포 명령에 `--verify --etherscan-api-key $ETHERSCAN_API_KEY` 옵션을 포함하면 배포 직후 자동으로 검증됩니다.

### 수동 검증

이미 배포된 컨트랙트를 나중에 검증해야 하는 경우:

```bash
forge verify-contract \
  <DEPLOYED_CONTRACT_ADDRESS> \
  contracts/AgeVerifier.sol:AgeVerifier \
  --chain sepolia \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

Mainnet의 경우 `--chain mainnet` 사용:

```bash
forge verify-contract \
  <DEPLOYED_CONTRACT_ADDRESS> \
  contracts/AgeVerifier.sol:AgeVerifier \
  --chain mainnet \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

### 검증 상태 확인

```bash
forge verify-check <GUID> --chain sepolia --etherscan-api-key $ETHERSCAN_API_KEY
```

검증이 완료되면 Etherscan 컨트랙트 페이지의 "Contract" 탭에서 소스 코드와 ABI를 확인할 수 있습니다.

---

## 7. 배포된 컨트랙트 테스트

### 7.1 `cast call`로 read 함수 호출

```bash
cast call <DEPLOYED_CONTRACT_ADDRESS> \
  "verify(bytes,bytes32[])(bool)" \
  <PROOF_BYTES> \
  "[<PUBLIC_INPUT_1>,<PUBLIC_INPUT_2>]" \
  --rpc-url $SEPOLIA_RPC_URL
```

### 7.2 `cast send`로 트랜잭션 전송 (state 변경 함수인 경우)

```bash
cast send <DEPLOYED_CONTRACT_ADDRESS> \
  "verifyAndStore(bytes,bytes32[])" \
  <PROOF_BYTES> \
  "[<PUBLIC_INPUT_1>,<PUBLIC_INPUT_2>]" \
  --rpc-url $SEPOLIA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### 7.3 Foundry 테스트로 검증 (Fork 테스트)

`test/VerifierIntegration.t.sol` 작성 후:

```bash
forge test --match-path test/VerifierIntegration.t.sol \
  --fork-url $SEPOLIA_RPC_URL \
  -vvvv
```

### 7.4 배포 주소 및 ABI 기록

프론트엔드/앱 연동을 위해 배포된 주소와 ABI를 별도 파일에 기록해 두는 것을 권장합니다 (예: `deployments/sepolia.json`).

```json
{
  "AgeVerifier": {
    "address": "0x...",
    "abi": "out/AgeVerifier.sol/AgeVerifier.json"
  }
}
```

---

## 8. Noir/Barretenberg 주의사항

Noir 회로에서 생성된 Solidity Verifier를 배포할 때 다음 사항에 주의하세요.

### 8.1 Verifier 재생성

- 회로(`.nr` 파일)를 수정한 경우, **반드시** Verifier Solidity 코드를 재생성해야 합니다:

```bash
nargo compile
bb write_vk -b ./target/<circuit>.json -o ./target/vk
bb write_solidity_verifier -k ./target/vk -o ./contracts/Verifier.sol
```

- 회로와 Verifier가 불일치하면 `verify()` 호출이 항상 실패하거나 예상치 못한 결과를 반환합니다.

### 8.2 Proof 인코딩 형식

- Barretenberg가 생성하는 proof는 raw bytes 형태이며, 온체인 Verifier는 특정 바이트 레이아웃(예: UltraHonk, UltraPlonk)을 기대합니다.
- `bb`로 생성한 proof를 그대로 `verify()`에 전달하기 전에, 사용 중인 backend(UltraPlonk vs UltraHonk)에 맞는 인코딩인지 확인하세요.
- Public input과 proof가 분리되어 있는 경우, 순서와 개수가 회로 정의와 정확히 일치해야 합니다.

### 8.3 Solidity 버전 호환성

- `bb write_solidity_verifier`로 생성된 Verifier는 특정 Solidity 버전(pragma)을 요구할 수 있습니다. `foundry.toml`의 `solc` 값을 생성된 코드의 pragma와 일치시키세요.

### 8.4 가스 비용

- Noir/Barretenberg 기반 Verifier(특히 UltraPlonk)는 검증 연산이 무거워 가스 비용이 상당히 높을 수 있습니다 (수백만 gas 수준).
- Mainnet 배포 전 반드시 Sepolia에서 실제 `verify()` 호출 가스 사용량을 측정하세요:

```bash
cast estimate <DEPLOYED_CONTRACT_ADDRESS> \
  "verify(bytes,bytes32[])" \
  <PROOF_BYTES> "[...]" \
  --rpc-url $SEPOLIA_RPC_URL
```

### 8.5 라이브러리/의존성 버전 고정

- `nargo`, `bb`(barretenberg) 버전이 다르면 생성되는 Verifier 코드나 proof 포맷이 달라질 수 있습니다. 팀 내에서 동일한 버전을 사용하도록 `Nargo.toml` 및 CI 설정에 버전을 명시하세요.

### 8.6 배포 전 체크리스트

- [ ] 최신 회로로 Verifier 재생성 완료
- [ ] Sepolia에서 실제 proof로 `verify()` 성공 확인
- [ ] 가스 사용량 측정 및 예산 확인
- [ ] `foundry.toml` solc 버전과 생성된 코드 pragma 일치 확인
- [ ] Etherscan 검증 완료
- [ ] 배포 주소/ABI 기록 및 프론트엔드 연동 확인
