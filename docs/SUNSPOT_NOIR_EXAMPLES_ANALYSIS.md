# Sunspot & Noir Examples 심층 분석

> ProofPort 앱에서 Solana ZK 검증 도구들을 활용할 수 있는지 분석

## 1. 프로젝트 개요

### Sunspot (reilabs/sunspot)

| 항목 | 내용 |
|------|------|
| **목적** | Noir 서킷을 Solana에서 증명/검증 |
| **증명 시스템** | Groth16 (gnark) |
| **언어** | Go (66.5%), Rust (30.2%) |
| **Noir 버전** | 1.0.0-beta.18 |
| **라이선스** | Apache 2.0 |
| **보안 감사** | ❌ 미완료 |

**핵심 기능:**
- ACIR → CCS 변환 (컴파일)
- Groth16 proving/verifying key 생성
- Solana 검증 프로그램 자동 생성

### Noir Examples (solana-foundation/noir-examples)

| 항목 | 내용 |
|------|------|
| **목적** | Solana에서 ZK 검증 예제 제공 |
| **증명 시스템** | Groth16 via Sunspot |
| **언어** | TypeScript (65.5%), Noir (12.7%), Rust (12.6%) |
| **Noir 버전** | 1.0.0-beta.13 |
| **라이선스** | MIT |

---

## 2. 포함된 서킷 분석

### 2.1 one (기본 예제)

가장 단순한 제약 조건 검증 서킷.

```noir
fn main(x: pub Field, y: Field) {
    assert(x != y);
}
```

**용도**: 기본 동작 확인용

---

### 2.2 verify_signer (ECDSA 서명 검증) ⭐

**ProofPort 활용 가능성: 높음**

secp256k1 ECDSA 서명을 ZK로 검증하는 서킷.

```noir
fn main(
    message_commitment: pub Field,    // Public: 메시지 해시의 Poseidon commitment
    public_key_x: [u8; 32],          // Private: 공개키 X
    public_key_y: [u8; 32],          // Private: 공개키 Y
    signature: [u8; 64],             // Private: 서명 (r + s)
    hashed_message: [u8; 32]         // Private: 서명된 메시지 해시
) {
    // 1. Commitment 검증
    let computed_commitment = hash_bytes32(hashed_message);
    assert(computed_commitment == message_commitment);

    // 2. 서명 검증
    assert(verify_signature(public_key_x, public_key_y, signature, hashed_message));
}
```

**핵심 기능:**
- 서명자의 공개키를 노출하지 않고 유효한 서명 증명
- Poseidon 해시로 메시지 commitment 생성
- Noir 표준 라이브러리의 ECDSA 사용

**Coinbase KYC 서킷과 유사점:**
| 항목 | verify_signer | coinbase-kyc |
|------|---------------|--------------|
| 서명 검증 | ✅ secp256k1 | ✅ secp256k1 |
| 공개키 숨김 | ✅ | ✅ |
| 메시지 commitment | Poseidon | keccak256 |

---

### 2.3 smt_exclusion (블랙리스트 제외 증명) ⭐⭐

**ProofPort 활용 가능성: 매우 높음**

Sparse Merkle Tree를 사용한 블랙리스트 미포함 증명.

```noir
fn main(
    smt_root: pub Field,           // Public: 블랙리스트 머클 루트
    pubkey_hash: pub Field,        // Public: 주소 해시
    pubkey: [u8; 32],              // Private: 실제 주소
    siblings: [Field; 254],        // Private: 머클 경로
    leaf_value: Field              // Private: 리프 값 (0이어야 함)
) {
    // 1. 주소 해시 검증
    let computed_hash = pubkey_to_index(pubkey);
    assert(computed_hash == pubkey_hash, "Pubkey hash mismatch");

    // 2. 리프가 비어있음 확인 (핵심!)
    assert(leaf_value == EMPTY_LEAF, "Exclusion failed: leaf is not empty");

    // 3. 머클 루트 재계산 검증
    let computed_root = compute_merkle_root(pubkey_hash, siblings, leaf_value);
    assert(computed_root == smt_root, "Root mismatch");
}
```

**핵심 개념:**
- **Exclusion Proof**: 특정 주소가 블랙리스트에 **없음**을 증명
- **TREE_DEPTH = 254**: BN254 필드의 충돌 저항성 확보
- **EMPTY_LEAF = 0**: 리프가 비어있으면 블랙리스트에 없음

**활용 시나리오:**
```
✅ "이 지갑 주소는 제재 목록에 없습니다"
✅ "이 사용자는 사기 DB에 등록되지 않았습니다"
✅ OFAC 컴플라이언스 증명
```

---

## 3. 기술 스택 비교

### ProofPort vs Sunspot 파이프라인

```
┌─────────────────────────────────────────────────────────────────┐
│                    ProofPort (현재)                              │
├─────────────────────────────────────────────────────────────────┤
│  Noir Circuit → ACIR → Barretenberg → Ultra Honk → EVM Verifier │
│                                                                  │
│  도구: nargo, bb, mopro (noir-rs)                                │
│  체인: Base, Sepolia (EVM)                                       │
│  증명 크기: ~수 KB                                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Sunspot (Solana)                              │
├─────────────────────────────────────────────────────────────────┤
│  Noir Circuit → ACIR → CCS → gnark → Groth16 → Solana Verifier  │
│                                                                  │
│  도구: nargo, sunspot CLI (Go)                                   │
│  체인: Solana                                                    │
│  증명 크기: 324-388 bytes                                         │
└─────────────────────────────────────────────────────────────────┘
```

### 핵심 차이점

| 항목 | ProofPort (mopro) | Sunspot |
|------|-------------------|---------|
| **증명 시스템** | Ultra Honk | Groth16 |
| **백엔드** | Barretenberg | gnark |
| **타겟 체인** | EVM (Base, Sepolia) | Solana |
| **Trusted Setup** | 불필요 (Universal) | **필요** ⚠️ |
| **증명 크기** | 수 KB | 324-388 bytes |
| **모바일 지원** | ✅ mopro | ❌ CLI only |
| **검증 비용** | ~300K gas | 170K-500K CU |

---

## 4. ProofPort 적용 가능성 분석

### 4.1 직접 통합: ❌ 불가능

**이유:**
1. **증명 시스템 불일치**: Ultra Honk ≠ Groth16
2. **체인 불일치**: EVM ≠ Solana
3. **모바일 지원 없음**: Sunspot은 CLI 도구

### 4.2 서킷 로직 재사용: ✅ 가능

**Noir 서킷 코드는 증명 시스템과 독립적!**

```
┌──────────────────┐
│   Noir Circuit   │  ← 이 부분은 재사용 가능!
│   (main.nr)      │
└────────┬─────────┘
         │
    ┌────┴────┐
    ↓         ↓
┌───────┐  ┌───────┐
│ Sunspot│  │ mopro │
│Groth16 │  │UltraHonk│
│Solana  │  │ EVM   │
└───────┘  └───────┘
```

**재사용 가능한 코드:**
- `verify_signer`: ECDSA 서명 검증 로직
- `smt_exclusion`: Sparse Merkle Tree 로직
- Poseidon 해시 함수 사용 패턴
- 바이트 배열 → Field 변환 유틸리티

### 4.3 Solana 지원 추가: ⚠️ 가능하지만 복잡

mopro에 Solana 지원 PoC가 존재합니다:
- [zk-solana-mobile-verifier](https://github.com/greg-nagy/zk-solana-mobile-verifier)

**필요한 작업:**
1. mopro Circom (Groth16) 사용
2. groth16-solana 검증자 배포
3. proof.A의 y좌표 negation 처리
4. G2 ordering (c1, c0) 맞춤

---

## 5. 구체적 활용 방안

### 방안 1: smt_exclusion 서킷 포팅 (권장)

블랙리스트 제외 증명을 ProofPort에 추가.

**수정 필요 사항:**
```noir
// 원본 (Solana용 - Poseidon)
let computed_hash = poseidon_hash_2(low, high);

// 수정 (EVM용 - keccak256)
let computed_hash = std::hash::keccak256(pubkey);
```

**예상 결과:**
```
circuits/
├── age_verifier/         # 기존
├── coinbase-kyc/         # 기존
└── smt_exclusion/        # 새로 추가
    ├── src/main.nr
    └── Nargo.toml
```

**Use Case:**
- OFAC 제재 목록 미포함 증명
- 사기 DB 미등록 증명
- 프로토콜별 블랙리스트 확인

### 방안 2: verify_signer 로직 활용

Coinbase KYC 서킷의 서명 검증과 유사하므로, 범용 서명 검증 서킷으로 확장 가능.

```noir
// 범용 서명 검증 서킷
fn main(
    message_hash: pub [u8; 32],
    signature: [u8; 64],
    expected_signer: pub [u8; 20]  // 이더리움 주소
) {
    // ecrecover로 서명자 복구
    let recovered = ecrecover(message_hash, signature);
    assert(recovered == expected_signer);
}
```

### 방안 3: Solana 멀티체인 지원

장기적으로 ProofPort를 멀티체인으로 확장:

```
┌─────────────────────────────────────────────────────────────┐
│                    ProofPort v2 (멀티체인)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐                                           │
│  │ Noir Circuit │                                           │
│  └──────┬───────┘                                           │
│         │                                                    │
│    ┌────┴────┬────────────┐                                 │
│    ↓         ↓            ↓                                 │
│ ┌──────┐  ┌──────┐   ┌──────────┐                          │
│ │Ultra │  │Groth16│   │  기타   │                          │
│ │Honk  │  │(gnark)│   │ 백엔드  │                          │
│ └──┬───┘  └──┬───┘   └────┬────┘                          │
│    ↓         ↓            ↓                                 │
│ ┌──────┐  ┌──────┐   ┌──────────┐                          │
│ │ EVM  │  │Solana│   │  기타   │                          │
│ │(Base)│  │      │   │  체인   │                          │
│ └──────┘  └──────┘   └──────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. 코드 예시: smt_exclusion 포팅

### 원본 (Solana/Groth16)

```noir
// circuits/smt_exclusion/src/main.nr (원본)
use std::hash::poseidon;

global TREE_DEPTH: u32 = 254;
global EMPTY_LEAF: Field = 0;

fn poseidon_hash_2(left: Field, right: Field) -> Field {
    poseidon::bn254::hash_2([left, right])
}

fn main(
    smt_root: pub Field,
    pubkey_hash: pub Field,
    pubkey: [u8; 32],
    siblings: [Field; 254],
    leaf_value: Field
) {
    // ... 검증 로직
}
```

### ProofPort용 수정 버전

```noir
// circuits/smt_exclusion/src/main.nr (ProofPort용)
use std::hash::keccak256;
use std::hash::poseidon;

global TREE_DEPTH: u32 = 160;  // 이더리움 주소용 (20 bytes = 160 bits)
global EMPTY_LEAF: Field = 0;

// keccak256 사용 (EVM 호환)
fn hash_address(addr: [u8; 20]) -> Field {
    let hash = keccak256(addr, 20);
    // hash를 Field로 변환
    bytes32_to_field(hash)
}

fn main(
    smt_root: pub Field,              // 블랙리스트 머클 루트
    address_commitment: pub Field,     // 주소 commitment (리플레이 방지)
    user_address: [u8; 20],           // Private: 이더리움 주소
    siblings: [Field; 160],           // Private: 머클 경로
    leaf_value: Field                 // Private: 리프 값
) {
    // 1. Address commitment 검증
    let computed_commitment = hash_address(user_address);
    assert(computed_commitment == address_commitment, "Address mismatch");

    // 2. Exclusion 검증 (리프가 비어있어야 함)
    assert(leaf_value == EMPTY_LEAF, "Address is blacklisted!");

    // 3. 머클 루트 재계산
    let computed_root = compute_merkle_root(computed_commitment, siblings, leaf_value);
    assert(computed_root == smt_root, "Invalid merkle proof");
}
```

---

## 7. 결론 및 권장 사항

### 즉시 활용 가능 ✅

| 항목 | 설명 |
|------|------|
| **smt_exclusion 로직** | 블랙리스트 제외 증명을 ProofPort에 추가 |
| **Poseidon 해시 패턴** | Noir 표준 라이브러리 활용법 참고 |
| **바이트 변환 유틸** | `bytes16_to_field()` 등 재사용 |

### 중기 고려 사항 ⚠️

| 항목 | 설명 |
|------|------|
| **Solana 지원** | mopro + Groth16으로 멀티체인 확장 가능 |
| **범용 서명 검증** | verify_signer 기반 범용 서킷 개발 |

### 권장하지 않음 ❌

| 항목 | 이유 |
|------|------|
| **Sunspot 직접 사용** | 모바일 미지원, 체인 불일치 |
| **Groth16으로 전환** | Trusted Setup 필요, 현재 인프라 호환 안 됨 |

---

## 8. 참고 자료

### 공식 저장소
- [Sunspot (reilabs)](https://github.com/reilabs/sunspot)
- [Noir Examples (Solana Foundation)](https://github.com/solana-foundation/noir-examples)
- [mopro](https://github.com/zkmopro/mopro)
- [zk-solana-mobile-verifier](https://github.com/greg-nagy/zk-solana-mobile-verifier)
- [groth16-solana (Light Protocol)](https://github.com/Lightprotocol/groth16-solana)

### 기술 문서
- [Noir Documentation](https://noir-lang.org/docs/)
- [mopro Noir Adapter](https://zkmopro.org/docs/adapters/noir/)
- [Barretenberg](https://github.com/AztecProtocol/barretenberg)

### 관련 프로젝트
- [Helius - ZK on Solana](https://www.helius.dev/blog/zero-knowledge-proofs-its-applications-on-solana)
- [Bonsol - ZK Co-Processor for Solana](https://bonsol.sh/)
