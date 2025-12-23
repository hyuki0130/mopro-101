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
| [Alchemy](https://www.alchemy.com/) | `https://eth-sepolia.g.alchemy.com/v2/API_KEY` | 무료 300M CU/월 |
| [Infura](https://infura.io/) | `https://sepolia.infura.io/v3/API_KEY` | 무료 100K req/일 |
| [QuickNode](https://www.quicknode.com/) | Dashboard에서 확인 | 무료 티어 제공 |
| Public RPC | `https://rpc.sepolia.org` | 속도 느림, 불안정 |

### Sepolia ETH 얻는 방법 (Faucet)

| Faucet | URL | 조건 |
|--------|-----|------|
| Alchemy Sepolia Faucet | https://sepoliafaucet.com/ | Alchemy 계정 필요 |
| Infura Sepolia Faucet | https://www.infura.io/faucet/sepolia | Infura 계정 필요 |
| QuickNode Faucet | https://faucet.quicknode.com/ethereum/sepolia | 0.001 ETH 메인넷 잔액 필요 |
| Google Cloud Faucet | https://cloud.google.com/application/web3/faucet/ethereum/sepolia | Google 계정 필요 |

---

## 4. Sepolia 테스트넷 배포

### 컴파일

```bash
# 컨트랙트 컴파일
forge build

# 컴파일 결과 확인
ls -la out/
```

### 배포 (forge create)

```bash
# AgeVerifier 배포
forge create contracts/AgeVerifier.sol:HonkVerifier \
    --rpc-url $SEPOLIA_RPC_URL \
    --private-key $PRIVATE_KEY \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY

# ZkCoinbaseAttestor 배포
forge create contracts/ZkCoinbaseAttestor.sol:HonkVerifier \
    --rpc-url $SEPOLIA_RPC_URL \
    --private-key $PRIVATE_KEY \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY
```

### 배포 결과 예시

```
[⠊] Compiling...
No files changed, compilation skipped
Deployer: 0x1234...abcd
Deployed to: 0x5678...efgh
Transaction hash: 0xabcd...1234
Starting contract verification...
Submitted contract for verification:
    Response: OK
    GUID: xxxxx
    URL: https://sepolia.etherscan.io/address/0x5678...efgh
Contract successfully verified
```

### 배포 스크립트 사용 (선택)

`script/Deploy.s.sol` 생성:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "forge-std/Script.sol";

// 생성된 Verifier 컨트랙트의 인터페이스
interface IHonkVerifier {
    function verify(bytes calldata _proof, bytes32[] calldata _publicInputs)
        external view returns (bool);
}

contract DeployVerifier is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 컨트랙트 배포는 forge create로 직접 하거나
        // 여기서 new로 생성 가능

        vm.stopBroadcast();
    }
}
```

스크립트로 배포:

```bash
forge script script/Deploy.s.sol:DeployVerifier \
    --rpc-url $SEPOLIA_RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY
```

---

## 5. Ethereum Mainnet 배포

### 배포 전 체크리스트

- [ ] Sepolia에서 충분히 테스트 완료
- [ ] 메인넷 ETH 충분히 보유 (배포 비용 약 0.05-0.1 ETH)
- [ ] 개인키 보안 확인
- [ ] 컨트랙트 코드 최종 검토

### 배포

```bash
# ZkCoinbaseAttestor 메인넷 배포
forge create contracts/ZkCoinbaseAttestor.sol:HonkVerifier \
    --rpc-url $MAINNET_RPC_URL \
    --private-key $PRIVATE_KEY \
    --verify \
    --etherscan-api-key $ETHERSCAN_API_KEY
```

### 가스비 추정

```bash
# 배포 전 가스비 추정
forge create contracts/ZkCoinbaseAttestor.sol:HonkVerifier \
    --rpc-url $MAINNET_RPC_URL \
    --private-key $PRIVATE_KEY \
    --estimate
```

### Legacy 트랜잭션 사용 (가스 문제 시)

```bash
forge create contracts/ZkCoinbaseAttestor.sol:HonkVerifier \
    --rpc-url $MAINNET_RPC_URL \
    --private-key $PRIVATE_KEY \
    --legacy \
    --gas-price 30gwei \
    --verify
```

---

## 6. 컨트랙트 검증 (Etherscan)

### 방법 1: 배포 시 자동 검증 (권장)

`--verify` 플래그 사용 (위 명령어 참고)

### 방법 2: 수동 검증

배포 후 별도로 검증:

```bash
# Sepolia
forge verify-contract \
    <CONTRACT_ADDRESS> \
    contracts/ZkCoinbaseAttestor.sol:HonkVerifier \
    --chain sepolia \
    --etherscan-api-key $ETHERSCAN_API_KEY

# Mainnet
forge verify-contract \
    <CONTRACT_ADDRESS> \
    contracts/ZkCoinbaseAttestor.sol:HonkVerifier \
    --chain mainnet \
    --etherscan-api-key $ETHERSCAN_API_KEY
```

### 검증 상태 확인

```bash
forge verify-check <GUID> --chain sepolia
```

### Chain ID 참고

| 네트워크 | Chain ID | Chain Name |
|----------|----------|------------|
| Ethereum Mainnet | 1 | mainnet |
| Sepolia Testnet | 11155111 | sepolia |
| Goerli Testnet | 5 | goerli (deprecated) |

---

## 7. 배포된 컨트랙트 테스트

### cast로 컨트랙트 호출

```bash
# 컨트랙트 정보 확인
cast code <CONTRACT_ADDRESS> --rpc-url $SEPOLIA_RPC_URL

# verify 함수 시그니처 확인
cast sig "verify(bytes,bytes32[])"
# 0x1e8e1e13
```

### Proof 준비

```bash
# circuits 디렉토리에서 proof 생성
cd circuits/coinbase-kyc
./build.sh

# proof hex 확인
cat ./target/proof.hex

# public inputs 확인 (바이너리)
xxd ./target/proof/public_inputs
```

### JavaScript로 테스트

```javascript
const { ethers } = require('ethers');

async function testVerifier() {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

    const verifierAddress = "0x..."; // 배포된 주소
    const verifierABI = [
        "function verify(bytes calldata _proof, bytes32[] calldata _publicInputs) external view returns (bool)"
    ];

    const verifier = new ethers.Contract(verifierAddress, verifierABI, provider);

    // proof.hex 파일에서 로드
    const proofHex = "0x...";

    // public inputs (signal_hash + signer_list_merkle_root)
    const publicInputs = [
        "0x957118857...", // signal_hash (32 bytes)
        "0xb60da9815..." // signer_list_merkle_root (32 bytes)
    ];

    try {
        const isValid = await verifier.verify(proofHex, publicInputs);
        console.log("Proof valid:", isValid);
    } catch (error) {
        console.error("Verification failed:", error);
    }
}

testVerifier();
```

### Foundry 테스트

`test/Verifier.t.sol` 생성:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "forge-std/Test.sol";

interface IHonkVerifier {
    function verify(bytes calldata _proof, bytes32[] calldata _publicInputs)
        external view returns (bool);
}

contract VerifierTest is Test {
    IHonkVerifier verifier;

    function setUp() public {
        // Fork Sepolia
        vm.createSelectFork(vm.envString("SEPOLIA_RPC_URL"));
        verifier = IHonkVerifier(0x...); // 배포된 주소
    }

    function testVerifyProof() public {
        bytes memory proof = hex"..."; // proof 데이터
        bytes32[] memory publicInputs = new bytes32[](2);
        publicInputs[0] = bytes32(hex"...");
        publicInputs[1] = bytes32(hex"...");

        bool result = verifier.verify(proof, publicInputs);
        assertTrue(result);
    }
}
```

테스트 실행:

```bash
forge test -vvv
```

---

## 8. Noir/Barretenberg 주의사항

### 필수: `--oracle_hash keccak` 플래그

Solidity 검증을 위해 반드시 keccak 해시를 사용해야 합니다:

```bash
# VK 생성
bb write_vk -b ./target/circuit.json -o ./target/vk --oracle_hash keccak

# Proof 생성
bb prove -b ./target/circuit.json -w ./target/witness.gz -k ./target/vk/vk -o ./target/proof --oracle_hash keccak
```

> 기본값인 Poseidon2를 사용하면 온체인 검증이 실패합니다.

### EVM Precompile 요구사항

Barretenberg verifier가 사용하는 precompile:
- `ecMul` (0x07)
- `ecAdd` (0x06)
- `ecPairing` (0x08)
- `modexp` (0x05)

Ethereum Mainnet과 모든 EVM 호환 체인에서 지원됩니다.

### Public Inputs 형식

- Noir 회로에서 `pub` 키워드로 표시된 입력값들
- 순서가 정확히 일치해야 함
- `bytes32[]` 배열로 전달

### 버전 매칭

```bash
bb --version
# 현재: v1.0.0-nightly.20250723
```

`bb` CLI 버전과 생성된 컨트랙트의 버전이 일치해야 합니다.

### 가스 비용 예상

| 항목 | 예상 비용 |
|------|----------|
| 컨트랙트 배포 | ~0.05-0.1 ETH (90KB 컨트랙트) |
| verify 호출 (온체인) | ~200,000-500,000 gas |
| verify 호출 (오프체인) | 무료 (view 함수) |

---

## 배포 체크리스트

### Sepolia 테스트넷

- [ ] Foundry 설치 완료
- [ ] Alchemy/Infura API 키 발급
- [ ] Sepolia ETH 확보 (Faucet)
- [ ] Etherscan API 키 발급
- [ ] `.env` 파일 구성
- [ ] `forge build` 성공
- [ ] 테스트넷 배포 및 검증
- [ ] proof 검증 테스트

### Ethereum Mainnet

- [ ] Sepolia에서 모든 테스트 통과
- [ ] 메인넷 ETH 확보
- [ ] 가스비 추정 확인
- [ ] 메인넷 배포
- [ ] Etherscan 검증 완료

---

## 유용한 Foundry 명령어

```bash
# 컴파일
forge build

# 테스트
forge test -vvv

# 가스 리포트
forge test --gas-report

# 컨트랙트 크기 확인
forge build --sizes

# 로컬 노드 실행
anvil

# 트랜잭션 조회
cast tx <TX_HASH> --rpc-url $SEPOLIA_RPC_URL

# 잔액 확인
cast balance <ADDRESS> --rpc-url $SEPOLIA_RPC_URL

# ABI 인코딩
cast abi-encode "verify(bytes,bytes32[])" <PROOF> "[<INPUT1>,<INPUT2>]"
```

---

## 참고 자료

- [Foundry Book](https://book.getfoundry.sh/)
- [Foundry GitHub](https://github.com/foundry-rs/foundry)
- [Barretenberg - Solidity Verifier](https://barretenberg.aztec.network/docs/how_to_guides/how-to-solidity-verifier/)
- [Noir Documentation](https://noir-lang.org/docs/)
- [Etherscan API](https://docs.etherscan.io/)
- [Alchemy Docs](https://docs.alchemy.com/)
