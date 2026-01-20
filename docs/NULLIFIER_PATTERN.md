# Nullifier 패턴 가이드

ZK 서킷에서 중복 검증을 방지하기 위한 Nullifier 패턴 구현 가이드입니다.

---

## 목차

1. [개요](#개요)
2. [문제 상황](#문제-상황)
3. [Nullifier 패턴](#nullifier-패턴)
4. [서킷 구현](#서킷-구현)
5. [dApp 측 처리](#dapp-측-처리)
6. [On-chain 처리](#on-chain-처리)
7. [Noir Public Return 동작 원리](#noir-public-return-동작-원리)
8. [참고 자료](#참고-자료)

---

## 개요

### 사용 사례

- KYC 인증 후 에어드랍 지급 (중복 지급 방지)
- 투표 시스템 (중복 투표 방지)
- 리워드 클레임 (중복 클레임 방지)

### 핵심 개념

```
Nullifier = hash(user_private_data, scope)
```

- **user_private_data**: 유저 고유 식별자 (예: address, 서명 등)
- **scope**: dApp별 고유값 (예: 캠페인 ID, 컨트랙트 주소)

---

## 문제 상황

### 현재 구조의 문제

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   유저 A     │────►│  ZK 서킷    │────►│  에어드랍    │
│  (1차 요청)  │     │  검증 통과   │     │  지급 완료   │
└─────────────┘     └─────────────┘     └─────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   유저 A     │────►│  ZK 서킷    │────►│  에어드랍    │
│  (2차 요청)  │     │  검증 통과   │     │  또 지급!    │  ← 문제!
└─────────────┘     └─────────────┘     └─────────────┘
```

### 문제점

- 같은 유저가 여러 번 검증받을 수 있음
- dApp 입장에서 중복 요청 구분 불가
- user_address가 private이면 외부에서 확인 불가

---

## Nullifier 패턴

### 해결 방안

```
┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   유저 A     │────►│  ZK 서킷    │────►│  nullifier: 0xabc   │
│  (1차 요청)  │     │  검증 통과   │     │  → 저장 후 지급      │
└─────────────┘     └─────────────┘     └─────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────────────┐
│   유저 A     │────►│  ZK 서킷    │────►│  nullifier: 0xabc   │
│  (2차 요청)  │     │  검증 통과   │     │  → 이미 존재! 거부   │
└─────────────┘     └─────────────┘     └─────────────────────┘
```

### 특성

| 조건 | 결과 |
|------|------|
| 같은 유저 + 같은 scope | 항상 **같은** nullifier |
| 같은 유저 + 다른 scope | **다른** nullifier (프라이버시 보호) |
| 다른 유저 + 같은 scope | **다른** nullifier |

### 장점

- **user_address 노출 없이** 중복 방지
- dApp마다 scope가 다르므로 **교차 추적 불가** (프라이버시)
- On-chain에서도 `mapping(bytes32 => bool)`로 간단히 관리

---

## 서킷 구현

### 현재 Coinbase KYC 서킷 (수정 전)

```noir
fn main(
    signal_hash: pub [u8; 32],
    signer_list_merkle_root: pub [u8; 32],

    user_address: [u8; 20],  // private
    // ... 기타 private inputs
) {
    // 검증 로직
    // assert만 하고 반환값 없음
}
```

### Nullifier 추가 (수정 후)

```noir
fn main(
    // ============ Public Inputs ============
    signal_hash: pub [u8; 32],
    signer_list_merkle_root: pub [u8; 32],
    scope: pub [u8; 32],  // ← 추가: dApp별 고유값

    // ============ Private Inputs ============
    user_address: [u8; 20],
    // ... 기타 private inputs
) -> pub [u8; 32] {  // ← 추가: nullifier 반환

    // ... 기존 검증 로직 그대로 ...

    // ===== Nullifier 생성 =====
    // nullifier = keccak256(user_address || scope)
    let mut nullifier_input: [u8; 52] = [0; 52];  // 20 + 32

    for i in 0..20 {
        nullifier_input[i] = user_address[i];
    }
    for i in 0..32 {
        nullifier_input[20 + i] = scope[i];
    }

    keccak256(nullifier_input, 52)  // 서킷 내부에서 계산한 값 반환
}
```

### scope 값 예시

```typescript
// 에어드랍 캠페인별 scope
const scope = keccak256(
  encodePacked(
    ["address", "string"],
    [contractAddress, "airdrop-campaign-2024"]
  )
);

// 또는 단순히 컨트랙트 주소 (32 bytes로 패딩)
const scope = ethers.zeroPadValue(contractAddress, 32);
```

---

## dApp 측 처리

### 1. 증명 생성 시 scope 전달

```typescript
const scope = ethers.keccak256(
  ethers.toUtf8Bytes("my-dapp-airdrop-2024")
);

const inputs = [
  ...signalHashBytes,
  ...merkleRootBytes,
  ...scopeBytes,         // scope 추가
  ...userAddressBytes,
  // ... 기타 inputs
];

const proof = await generateNoirProof(
  circuitPath, srsPath, inputs, true, vk, false
);
```

### 2. Nullifier 추출

```typescript
import { parseProofWithPublicInputs } from './mopro_bindings';

// public inputs 개수 계산
// signal_hash(32) + merkle_root(32) + scope(32) + nullifier(32) = 128 bytes = 4 fields
const numPublicInputs = 4;

const parsed = parseProofWithPublicInputs(proof, numPublicInputs);

// 순서: [signal_hash, merkle_root, scope, nullifier]
// Noir에서 return value는 public inputs 마지막에 위치
const nullifier = parsed.publicInputs[3];  // bytes32
```

### 3. 중복 체크 (Off-chain)

```typescript
// DB에서 중복 체크
const nullifierHex = ethers.hexlify(nullifier);

const exists = await db.collection('nullifiers').findOne({
  nullifier: nullifierHex
});

if (exists) {
  return { error: "이미 에어드랍을 받았습니다" };
}

// 검증 성공 시 저장
await db.collection('nullifiers').insertOne({
  nullifier: nullifierHex,
  claimedAt: new Date(),
});

// 에어드랍 지급
await airdrop.send(userWallet);
```

---

## On-chain 처리

### Solidity Verifier 수정

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./HonkVerifier.sol";

contract KYCAirdrop {
    HonkVerifier public verifier;

    // 사용된 nullifier 추적
    mapping(bytes32 => bool) public usedNullifiers;

    // scope 값 (컨트랙트 배포 시 설정)
    bytes32 public immutable scope;

    event AirdropClaimed(bytes32 indexed nullifier, address recipient);

    constructor(address _verifier, bytes32 _scope) {
        verifier = HonkVerifier(_verifier);
        scope = _scope;
    }

    function claimAirdrop(
        bytes calldata proof,
        bytes32[] calldata publicInputs,
        address recipient
    ) external {
        // publicInputs 순서: [signal_hash, merkle_root, scope, nullifier]
        require(publicInputs.length == 4, "Invalid public inputs");

        bytes32 providedScope = publicInputs[2];
        bytes32 nullifier = publicInputs[3];

        // scope 검증
        require(providedScope == scope, "Invalid scope");

        // 중복 체크
        require(!usedNullifiers[nullifier], "Already claimed");

        // ZK 증명 검증
        require(verifier.verify(proof, publicInputs), "Invalid proof");

        // nullifier 기록
        usedNullifiers[nullifier] = true;

        // 에어드랍 지급
        _sendAirdrop(recipient);

        emit AirdropClaimed(nullifier, recipient);
    }

    function _sendAirdrop(address recipient) internal {
        // 토큰 전송 로직
    }
}
```

---

## Noir Public Return 동작 원리

### Noir에서 Return Value는 Public Input으로 취급

Noir 공식 문서:
> "A Noir circuit does not have a direct concept of a return value; it's treated as syntactic sugar. Under the hood, the return value is passed as an input to the circuit and checked at the end."

### Public Inputs 배열 순서

```noir
fn main(
    a: pub Field,      // public input 1
    b: pub Field,      // public input 2
    c: Field,          // private input (포함 안됨)
) -> pub Field         // public output (return)
```

Solidity verifier에 전달되는 순서:
```
publicInputs = [a, b, return_value]
```

### 서킷 컴파일 결과 (ABI)

```json
{
  "parameters": [
    { "name": "signal_hash", "visibility": "public" },
    { "name": "signer_list_merkle_root", "visibility": "public" },
    { "name": "scope", "visibility": "public" },
    { "name": "user_address", "visibility": "private" }
  ],
  "return_type": {
    "kind": "array",
    "length": 32,
    "type": { "kind": "integer", "sign": "unsigned", "width": 8 }
  }
}
```

### mopro에서 추출

```typescript
// proof 구조: [public_inputs_bytes | proof_bytes]
// public_inputs: 각 field가 32 bytes

const parsed = parseProofWithPublicInputs(proof, numPublicInputs);

// parsed.publicInputs[0] = signal_hash (32 bytes)
// parsed.publicInputs[1] = merkle_root (32 bytes)
// parsed.publicInputs[2] = scope (32 bytes)
// parsed.publicInputs[3] = nullifier (32 bytes) ← return value
```

---

## 참고 자료

- [Noir Documentation - Public Inputs and Returns](https://noir-lang.org/docs)
- [Semaphore Protocol - Nullifier Pattern](https://semaphore.appliedzkp.org/)
- [Tornado Cash - Nullifier Mechanism](https://tornado.cash/)

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2024-01-20 | 최초 작성 |
