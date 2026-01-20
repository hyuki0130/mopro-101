# Civic & Solana Attestation Service (SAS) 분석

> Solana 네이티브 KYC 검증 시스템과 ProofPort 연동 가능성 분석

## 1. 개요

### EAS vs SAS 비교

| 항목 | EAS (Ethereum) | SAS (Solana) |
|------|----------------|--------------|
| **체인** | Ethereum, Base, Optimism | Solana |
| **대표 KYC 제공자** | Coinbase | Civic |
| **아키텍처** | Stateful 컨트랙트 | Stateless + PDA |
| **최적화** | EVM 호환 | SVM 병렬처리 |
| **출시** | 2023~ | 2025.05~ |

```
┌─────────────────────────────────────────────────────────────┐
│                    Attestation 생태계                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────┐     │
│  │   EAS (Ethereum)     │      │    SAS (Solana)      │     │
│  ├──────────────────────┤      ├──────────────────────┤     │
│  │ • Coinbase KYC       │      │ • Civic Pass         │     │
│  │ • Gitcoin Passport   │      │ • Solana.ID          │     │
│  │ • Optimism RetroPGF  │      │ • 기타 발급자들       │     │
│  └──────────────────────┘      └──────────────────────┘     │
│                                                              │
│            동일한 개념: Schema → Attestation → Verify         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Civic Pass 상세 분석

### 2.1 Civic이란?

| 항목 | 내용 |
|------|------|
| **설립** | 2015년 (San Francisco) |
| **목적** | 탈중앙화 신원 검증 |
| **토큰** | CVC (Civic Token) |
| **처리량** | 200만+ 검증 완료 |
| **보호 TVL** | $500M+ |

**주요 고객:**
- Solrise DEX Pro
- Metaplex Candy Machine
- 다수의 Solana DeFi 프로토콜

### 2.2 Civic Pass 동작 원리

```
┌─────────────────────────────────────────────────────────────┐
│                 Civic Pass 발급 프로세스                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. 이메일/전화번호 인증                                      │
│         ↓                                                    │
│  2. 정부 발급 신분증 스캔 (여권, 운전면허 등)                  │
│         ↓                                                    │
│  3. 3D 얼굴 인식 (Liveness Check)                            │
│         ↓                                                    │
│  4. AI 검증 + 휴먼 리뷰                                       │
│         ↓                                                    │
│  5. OFAC 제재 목록 확인                                       │
│         ↓                                                    │
│  6. Civic Pass 발급 (Non-transferable Token)                 │
│                                                              │
│  ┌─────────────────────────────────────────────────┐        │
│  │  PII (개인정보)     │  Attestation (증명)       │        │
│  │  ─────────────────  │  ─────────────────────    │        │
│  │  Off-chain 저장     │  On-chain 저장 (Solana)   │        │
│  │  암호화됨           │  공개 검증 가능            │        │
│  └─────────────────────────────────────────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 Civic Pass 특징

**Non-transferable Token (SBT와 유사):**
- 지갑에 영구 귀속
- 전송/판매 불가
- Smart Contract에서 보유 여부 확인 가능

**Privacy-Preserving:**
- 개인정보(PII)는 절대 on-chain 저장 안 함
- 오직 "검증 완료" 증명만 on-chain
- 사용자가 데이터 통제권 보유

**검증 레벨:**
| 레벨 | 검증 항목 | 용도 |
|------|----------|------|
| CAPTCHA | 봇 방지 | 에어드랍, 민팅 |
| Uniqueness | 1인 1지갑 | Sybil 방지 |
| ID Verification | 신분증 | KYC/AML |
| Age Verification | 나이 확인 | 규제 준수 |

---

## 3. Solana Attestation Service (SAS)

### 3.1 SAS 개요

**Solana Foundation이 2025년 5월 출시한 공식 attestation 프로토콜.**

```
Program ID: 22zoJMtdu4tQc2PzL74ZUT7FrwgB1Udec8DdW4yw4BdG
```

**참여 조직:**
- Solana Foundation
- Civic
- Solana.ID
- Range Security

### 3.2 SAS 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                     SAS 3-Party 모델                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐                                           │
│  │   Issuer     │  발급자 (Civic, 거래소 등)                 │
│  │  (발급자)    │  - Credential 생성                        │
│  │              │  - Schema 정의                            │
│  │              │  - Attestation 발급                       │
│  └──────┬───────┘                                           │
│         │ 발급                                               │
│         ↓                                                    │
│  ┌──────────────┐                                           │
│  │   Holder     │  보유자 (유저 지갑)                        │
│  │  (보유자)    │  - Attestation 소유                       │
│  │              │  - 필요시 제시                            │
│  └──────┬───────┘                                           │
│         │ 제시                                               │
│         ↓                                                    │
│  ┌──────────────┐                                           │
│  │  Verifier    │  검증자 (dApp, 프로토콜)                   │
│  │  (검증자)    │  - Attestation 유효성 확인                │
│  │              │  - 접근 권한 부여                         │
│  └──────────────┘                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 SAS 데이터 구조

**Credential (발급자 계정):**
```rust
struct Credential {
    authority: Pubkey,        // 발급자 권한
    name: String,             // "Civic", "OKX" 등
    signers: Vec<Pubkey>,     // 서명 권한 목록
    // ...
}
```

**Schema (데이터 구조 정의):**
```rust
struct Schema {
    credential: Pubkey,       // 상위 Credential
    name: String,             // "KYC_Level_2"
    version: u8,              // 버전
    layout: Vec<u8>,          // 필드 타입 정의
    field_names: Vec<String>, // 필드 이름
}

// Layout 타입 예시
// 0 = U8, 1 = U16, 2 = U32, 3 = U64
// 12 = String, 13 = Bool
// 예: [12, 0, 13] = [String, U8, Bool]
```

**Attestation (실제 증명):**
```rust
struct Attestation {
    schema: Pubkey,           // 스키마 PDA
    issuer: Pubkey,           // 발급자
    holder: Pubkey,           // 유저 지갑
    data: Vec<u8>,            // 스키마에 맞는 데이터
    expiry: i64,              // 만료 시간 (0 = 무제한)
    nonce: [u8; 32],          // 고유 식별자
}
```

### 3.4 SAS vs EAS 기술 비교

| 항목 | EAS (Ethereum) | SAS (Solana) |
|------|----------------|--------------|
| **계정 모델** | Stateful Contract | PDA (Program Derived Address) |
| **실행 모델** | 순차 실행 | 병렬 실행 |
| **가스비** | 높음 (~$5-50) | 매우 낮음 (~$0.001) |
| **속도** | ~12초 | ~400ms |
| **SDK** | ethers.js | @solana/web3.js, gill |

---

## 4. ZK 서킷 구현 가능성

### 4.1 Coinbase KYC vs Civic KYC 비교

| 항목 | Coinbase KYC (현재) | Civic KYC (구현 가능) |
|------|--------------------|--------------------|
| **Attestation 소스** | EAS (Base) | SAS (Solana) |
| **서명 알고리즘** | secp256k1 (ECDSA) | ed25519 (EdDSA) |
| **주소 형식** | 20 bytes (Ethereum) | 32 bytes (Solana) |
| **해시 함수** | keccak256 | sha256 / poseidon |
| **Noir 지원** | ✅ | ✅ |

### 4.2 Civic KYC ZK 서킷 설계

```noir
// circuits/civic_kyc/src/main.nr

use std::hash::sha256;
use std::eddsa::verify_signature;

// Public Inputs
// - signal_hash: 리플레이 방지용 랜덤 해시
// - civic_issuer_root: Civic 발급자 머클 루트
// - schema_id: KYC 스키마 식별자

// Private Inputs
// - user_wallet: Solana 지갑 주소 (32 bytes)
// - attestation_data: SAS attestation 데이터
// - issuer_pubkey: Civic 서명자 공개키
// - issuer_signature: ed25519 서명
// - merkle_proof: 발급자 유효성 증명

fn main(
    // Public Inputs
    signal_hash: pub [u8; 32],
    civic_issuer_root: pub Field,
    schema_id: pub Field,

    // Private Inputs (User)
    user_wallet: [u8; 32],
    user_signature: [u8; 64],
    user_pubkey: [u8; 32],

    // Private Inputs (Attestation)
    attestation_data: [u8; 256],
    attestation_length: u32,
    issuer_pubkey: [u8; 32],
    issuer_signature: [u8; 64],

    // Private Inputs (Merkle Proof)
    merkle_proof: [Field; 8],
    merkle_index: u32,
    proof_depth: u32
) {
    // 1. User가 signal_hash에 서명했는지 검증
    let user_signed = verify_signature(
        user_pubkey,
        user_signature,
        signal_hash
    );
    assert(user_signed, "Invalid user signature");

    // 2. user_pubkey가 user_wallet과 매칭되는지 검증
    let derived_wallet = derive_solana_address(user_pubkey);
    assert(derived_wallet == user_wallet, "Wallet mismatch");

    // 3. Attestation 데이터가 유효한지 검증
    let attestation_hash = sha256(attestation_data);
    let issuer_signed = verify_signature(
        issuer_pubkey,
        issuer_signature,
        attestation_hash
    );
    assert(issuer_signed, "Invalid issuer signature");

    // 4. 발급자가 Civic의 유효한 서명자인지 머클 증명
    let issuer_leaf = hash_pubkey(issuer_pubkey);
    let computed_root = compute_merkle_root(
        issuer_leaf,
        merkle_proof,
        merkle_index,
        proof_depth
    );
    assert(computed_root == civic_issuer_root, "Invalid issuer");

    // 5. Attestation에서 KYC 데이터 추출 및 검증
    let (parsed_schema, parsed_wallet, parsed_expiry) =
        parse_attestation(attestation_data, attestation_length);

    assert(parsed_schema == schema_id, "Schema mismatch");
    assert(parsed_wallet == user_wallet, "Holder mismatch");
    assert(parsed_expiry > current_timestamp(), "Attestation expired");
}
```

### 4.3 서명 알고리즘 차이점

**secp256k1 (Ethereum/Coinbase):**
```noir
// ECDSA 서명 검증
use std::ecdsa_secp256k1::verify_signature;

let valid = verify_signature(pub_key_x, pub_key_y, signature, message_hash);
```

**ed25519 (Solana/Civic):**
```noir
// EdDSA 서명 검증
use std::eddsa::verify_signature;

let valid = verify_signature(pub_key, signature, message);
```

**Noir 표준 라이브러리 지원:**
| 알고리즘 | 지원 여부 | Import |
|---------|----------|--------|
| secp256k1 ECDSA | ✅ | `std::ecdsa_secp256k1` |
| ed25519 EdDSA | ✅ | `std::eddsa` |
| BN254 | ✅ | `std::scalar_mul` |

---

## 5. 멀티체인 검증 아키텍처

### 5.1 크로스체인 ZK 검증

**핵심 개념: 데이터 소스와 검증 체인 분리**

```
┌─────────────────────────────────────────────────────────────┐
│              크로스체인 KYC 검증                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐      ┌─────────────────┐               │
│  │ Coinbase KYC    │      │   Civic KYC     │               │
│  │ (EAS/Base)      │      │   (SAS/Solana)  │               │
│  └────────┬────────┘      └────────┬────────┘               │
│           │                        │                         │
│           └──────────┬─────────────┘                         │
│                      │                                       │
│                      ↓                                       │
│           ┌─────────────────────┐                           │
│           │   ZK 증명 생성      │                           │
│           │   (mopro/모바일)    │                           │
│           └──────────┬──────────┘                           │
│                      │                                       │
│        ┌─────────────┼─────────────┐                        │
│        ↓             ↓             ↓                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │   EVM    │  │  Solana  │  │  기타    │                  │
│  │  (Base)  │  │          │  │  체인    │                  │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                              │
│  "한 번 KYC → 어디서든 증명!"                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 구현 시나리오

**시나리오 A: Civic KYC → EVM 검증**
```
1. 유저가 Civic에서 KYC 완료 (Solana)
2. SAS attestation 데이터 가져오기
3. 모바일에서 ZK 증명 생성 (mopro/Ultra Honk)
4. Base/Ethereum에서 증명 검증
5. EVM dApp 접근 권한 획득
```

**시나리오 B: Coinbase KYC → Solana 검증**
```
1. 유저가 Coinbase에서 KYC 완료 (Base)
2. EAS attestation 데이터 가져오기
3. 서버에서 ZK 증명 생성 (Sunspot/Groth16)
4. Solana에서 증명 검증
5. Solana dApp 접근 권한 획득
```

### 5.3 ProofPort 확장 로드맵

```
┌─────────────────────────────────────────────────────────────┐
│              ProofPort 멀티체인 로드맵                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Phase 1 (현재):                                             │
│  ├── Coinbase KYC → EVM 검증                                │
│  └── mopro + Ultra Honk                                      │
│                                                              │
│  Phase 2 (단기):                                             │
│  ├── Civic KYC 서킷 추가                                     │
│  ├── ed25519 서명 검증                                       │
│  └── SAS attestation 파싱                                    │
│                                                              │
│  Phase 3 (중기):                                             │
│  ├── Solana Verifier 배포 (Groth16)                          │
│  ├── Coinbase → Solana 크로스체인                            │
│  └── Civic → EVM 크로스체인                                  │
│                                                              │
│  Phase 4 (장기):                                             │
│  ├── 다중 KYC 제공자 지원                                    │
│  │   └── Binance (zkPass), OKX (zkPass), Kraken...          │
│  ├── 다중 체인 지원                                          │
│  │   └── Ethereum, Base, Solana, Arbitrum, Polygon...       │
│  └── "Universal KYC Proof"                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. 기술적 고려사항

### 6.1 Solana 주소 vs Ethereum 주소

| 항목 | Ethereum | Solana |
|------|----------|--------|
| **크기** | 20 bytes | 32 bytes |
| **형식** | keccak256(pubkey)[12:] | pubkey 그대로 |
| **체크섬** | EIP-55 (대소문자) | 없음 (Base58) |
| **예시** | 0x742d35Cc... | 7EcD...Bx9 |

### 6.2 Attestation 만료 처리

```noir
// 만료 검증 로직
fn check_expiry(expiry: i64, current_time: pub i64) {
    // expiry == 0 means no expiration
    if expiry != 0 {
        assert(current_time < expiry, "Attestation expired");
    }
}
```

### 6.3 발급자 목록 관리

**Merkle Tree 방식 (권장):**
```
Civic Signers Merkle Root
         │
    ┌────┴────┐
    │         │
  ┌─┴─┐     ┌─┴─┐
  │   │     │   │
Signer1 Signer2 Signer3 Signer4
```

**On-chain Registry 방식:**
- Solana: SAS Credential account의 signers 필드
- EVM: 컨트랙트에 발급자 목록 저장

---

## 7. 구현 예시

### 7.1 SAS Attestation 읽기 (TypeScript)

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { getAttestationAccount } from 'sas-lib';

async function getCivicAttestation(
    connection: Connection,
    userWallet: PublicKey,
    schemaId: PublicKey
) {
    // Attestation PDA 계산
    const [attestationPda] = PublicKey.findProgramAddressSync(
        [
            Buffer.from('attestation'),
            schemaId.toBuffer(),
            userWallet.toBuffer(),
        ],
        SAS_PROGRAM_ID
    );

    // Account 데이터 가져오기
    const attestation = await getAttestationAccount(
        connection,
        attestationPda
    );

    return {
        schema: attestation.schema,
        issuer: attestation.issuer,
        holder: attestation.holder,
        data: attestation.data,
        expiry: attestation.expiry,
    };
}
```

### 7.2 ZK 입력 데이터 생성

```typescript
async function generateCivicProofInputs(
    userWallet: Keypair,
    attestation: Attestation,
    signalHash: Uint8Array
) {
    // 1. User가 signal_hash에 서명
    const userSignature = nacl.sign.detached(
        signalHash,
        userWallet.secretKey
    );

    // 2. Attestation 데이터 시리얼라이즈
    const attestationData = serializeAttestation(attestation);

    // 3. Civic 발급자 머클 증명 생성
    const merkleProof = await getCivicIssuerMerkleProof(
        attestation.issuer
    );

    return {
        // Public inputs
        signal_hash: Array.from(signalHash),
        civic_issuer_root: merkleProof.root,
        schema_id: attestation.schema.toBase58(),

        // Private inputs
        user_wallet: Array.from(userWallet.publicKey.toBytes()),
        user_signature: Array.from(userSignature),
        user_pubkey: Array.from(userWallet.publicKey.toBytes()),
        attestation_data: Array.from(attestationData),
        attestation_length: attestationData.length,
        issuer_pubkey: Array.from(attestation.issuer.toBytes()),
        issuer_signature: Array.from(attestation.issuerSignature),
        merkle_proof: merkleProof.siblings,
        merkle_index: merkleProof.index,
        proof_depth: merkleProof.depth,
    };
}
```

---

## 8. 보안 고려사항

### 8.1 SAS 보안 모델

| 위험 | 완화 방법 |
|------|----------|
| **발급자 위조** | 머클 증명으로 유효한 발급자 검증 |
| **리플레이 공격** | signal_hash + nonce 사용 |
| **만료된 증명** | expiry 타임스탬프 검증 |
| **스키마 불일치** | schema_id 검증 |

### 8.2 ZK 서킷 보안

```noir
// 필수 검증 항목
fn verify_all(/* inputs */) {
    // 1. 유저 소유권 증명
    assert(verify_user_signature(...));

    // 2. 지갑 주소 매칭
    assert(user_wallet == derived_from_pubkey);

    // 3. 발급자 서명 검증
    assert(verify_issuer_signature(...));

    // 4. 발급자 유효성 (머클 증명)
    assert(verify_issuer_merkle_proof(...));

    // 5. Attestation 만료 확인
    assert(not_expired(...));

    // 6. 스키마 ID 매칭
    assert(schema_matches(...));
}
```

---

## 9. ZK 서킷 언어 선택: Noir vs Circom

### 9.1 Noir와 Circom 비교

**두 가지 모두 ZK 서킷을 작성하는 언어이지만, 특성이 다릅니다.**

```
┌─────────────────────────────────────────────────────────────┐
│                    ZK 서킷 언어 비교                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐      ┌──────────────────┐             │
│  │      Noir        │      │     Circom       │             │
│  ├──────────────────┤      ├──────────────────┤             │
│  │ • Rust-like 문법  │      │ • JS-like 문법   │             │
│  │ • Aztec 개발      │      │ • iden3 개발     │             │
│  │ • Ultra Honk (기본)│     │ • Groth16 (기본) │             │
│  │ • Trusted Setup ❌│      │ • Trusted Setup ✅│            │
│  └──────────────────┘      └──────────────────┘             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

| 항목 | Noir | Circom |
|------|------|--------|
| **문법** | Rust-like | JavaScript-like |
| **개발사** | Aztec | iden3 |
| **기본 증명 시스템** | Ultra Honk | Groth16 |
| **Trusted Setup** | ❌ 불필요 | ⚠️ 필요 |
| **증명 크기** | ~수 KB | ~200 bytes |
| **mopro 지원** | ✅ noir-rs | ✅ circom-prover |
| **EVM 검증** | ✅ | ✅ |
| **Solana 검증** | ⚠️ Sunspot 필요 | ✅ groth16-solana |

### 9.2 Circom + Groth16 = 멀티체인 모바일 증명

**Circom은 Solana 전용이 아닙니다! EVM + Solana 모두 지원합니다.**

```
┌─────────────────────────────────────────────────────────────┐
│                 Circom 서킷 검증 옵션                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Circom 서킷 (.circom)                                       │
│         │                                                    │
│         ↓                                                    │
│  Groth16 증명 생성 (snarkjs / rapidsnark / mopro)            │
│         │                                                    │
│    ┌────┴────────────┐                                      │
│    ↓                 ↓                                      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ EVM Verifier │  │Solana Verifier│                        │
│  │ (snarkjs)    │  │(groth16-solana)│                       │
│  └──────────────┘  └──────────────┘                        │
│                                                              │
│  동일한 Circom 서킷 → EVM + Solana 모두 검증!                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 9.3 언어 vs 증명 시스템 vs 체인 매트릭스

| 서킷 언어 | 증명 시스템 | 검증 가능 체인 | mopro 모바일 | Trusted Setup |
|----------|------------|---------------|-------------|---------------|
| **Noir** | Ultra Honk | EVM | ✅ | ❌ 불필요 |
| **Noir** | Groth16 (Sunspot) | Solana | ❌ 서버만 | ⚠️ 필요 |
| **Circom** | Groth16 | **EVM + Solana** | ✅ | ⚠️ 필요 |

### 9.4 Circom으로 Civic KYC 서킷 예시

```circom
// circuits/civic_kyc.circom

pragma circom 2.1.0;

include "node_modules/circomlib/circuits/eddsa.circom";
include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/mux1.circom";

template CivicKYC(merkleDepth) {
    // ============ Public Inputs ============
    signal input signalHash[256];        // 리플레이 방지 해시 (bits)
    signal input civicIssuerRoot;        // Civic 발급자 머클 루트
    signal input schemaId;               // KYC 스키마 ID

    // ============ Private Inputs (User) ============
    signal input userPubkey[256];        // ed25519 공개키 (bits)
    signal input userSignatureR[256];    // 서명 R (bits)
    signal input userSignatureS[256];    // 서명 S (bits)

    // ============ Private Inputs (Attestation) ============
    signal input attestationHash[256];   // attestation 데이터 해시
    signal input issuerPubkey[256];      // Civic 서명자 공개키
    signal input issuerSignatureR[256];  // 발급자 서명 R
    signal input issuerSignatureS[256];  // 발급자 서명 S

    // ============ Private Inputs (Merkle) ============
    signal input merklePath[merkleDepth];
    signal input merkleIndices[merkleDepth];

    // ============ 1. User 서명 검증 (ed25519) ============
    component userSigVerify = EdDSAVerifier(256);
    for (var i = 0; i < 256; i++) {
        userSigVerify.A[i] <== userPubkey[i];
        userSigVerify.R[i] <== userSignatureR[i];
        userSigVerify.S[i] <== userSignatureS[i];
        userSigVerify.msg[i] <== signalHash[i];
    }
    userSigVerify.out === 1;

    // ============ 2. Issuer 서명 검증 ============
    component issuerSigVerify = EdDSAVerifier(256);
    for (var i = 0; i < 256; i++) {
        issuerSigVerify.A[i] <== issuerPubkey[i];
        issuerSigVerify.R[i] <== issuerSignatureR[i];
        issuerSigVerify.S[i] <== issuerSignatureS[i];
        issuerSigVerify.msg[i] <== attestationHash[i];
    }
    issuerSigVerify.out === 1;

    // ============ 3. Merkle Proof (유효한 발급자 확인) ============
    component merkleVerify = MerkleTreeChecker(merkleDepth);

    // issuerPubkey를 Poseidon으로 해시하여 leaf 생성
    component issuerHash = Poseidon(2);
    // ... 해시 로직

    merkleVerify.leaf <== issuerHash.out;
    merkleVerify.root <== civicIssuerRoot;
    for (var i = 0; i < merkleDepth; i++) {
        merkleVerify.pathElements[i] <== merklePath[i];
        merkleVerify.pathIndices[i] <== merkleIndices[i];
    }

    // ============ 4. 출력 ============
    signal output valid;
    valid <== 1;
}

// 메인 컴포넌트 (public inputs 지정)
component main {public [signalHash, civicIssuerRoot, schemaId]} = CivicKYC(8);
```

### 9.5 mopro + Circom + Solana 워크플로우

[zk-solana-mobile-verifier](https://github.com/greg-nagy/zk-solana-mobile-verifier) 프로젝트 참고:

```
┌─────────────────────────────────────────────────────────────┐
│            mopro + Circom + Solana 흐름                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Circom 서킷 작성 (.circom)                               │
│         ↓                                                    │
│  2. 컴파일: circom → r1cs, wasm                              │
│         ↓                                                    │
│  3. Trusted Setup (Powers of Tau + Circuit-specific)        │
│         ↓                                                    │
│  4. mopro circom-prover로 모바일 증명 생성                   │
│         ↓                                                    │
│  5. groth16-solana Verifier에서 검증                        │
│                                                              │
│  ⚠️ 주의: proof.A의 y좌표 negation 필요!                     │
│  ⚠️ 주의: G2 ordering (c1, c0) 맞춤 필요                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Trusted Setup 이해하기

### 10.1 Trusted Setup이란?

**ZK 증명을 생성하기 전에 필요한 "초기 설정 의식(ceremony)"입니다.**

```
┌─────────────────────────────────────────────────────────────┐
│                    Trusted Setup 개념                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  "증명을 만들기 전에, 먼저 '열쇠'를 만들어야 해요"            │
│                                                              │
│  ┌─────────────┐                                            │
│  │ Trusted     │ ──→ Proving Key (pk)   → 증명 생성에 사용   │
│  │ Setup       │                                            │
│  │ (초기 설정)  │ ──→ Verifying Key (vk) → 증명 검증에 사용   │
│  └─────────────┘                                            │
│         │                                                    │
│         ↓                                                    │
│  ⚠️ "Toxic Waste" (독성 폐기물)                              │
│     - 이 값이 유출되면 가짜 증명 생성 가능!                   │
│     - 반드시 폐기해야 함                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 왜 "Trusted"인가?

```
┌─────────────────────────────────────────────────────────────┐
│                    신뢰가 필요한 이유                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Setup 과정에서 비밀 랜덤값 생성:                             │
│                                                              │
│     τ (tau) = 비밀 랜덤값                                    │
│                                                              │
│  이 값을 알면?                                               │
│  → 유효하지 않은 증명도 "유효"하게 만들 수 있음!              │
│  → 시스템 전체가 무너짐                                       │
│                                                              │
│  그래서 "신뢰"가 필요:                                        │
│  → "Setup 참여자들이 τ를 정말 폐기했다"고 믿어야 함           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 10.3 Groth16 vs Ultra Honk 비교

| 항목 | Groth16 (Circom) | Ultra Honk (Noir) |
|------|-----------------|-------------------|
| **Trusted Setup** | ⚠️ **필요** | ✅ **불필요** |
| **Setup 유형** | 서킷별 (Circuit-specific) | Universal (없음) |
| **증명 크기** | ~200 bytes (매우 작음) | ~수 KB (큼) |
| **검증 속도** | 매우 빠름 | 빠름 |
| **보안 가정** | Setup 참여자 신뢰 필요 | 수학적 가정만 |
| **서킷 수정 시** | Setup 다시 필요 | 바로 사용 가능 |

### 10.4 Trusted Setup 방식

**방식 1: 단독 Setup (위험!)**

```
┌─────────────────────────────────────────────────────────────┐
│  한 명이 Setup 수행                                          │
│                                                              │
│  개발자 혼자: τ 생성 → pk, vk 생성 → τ 폐기(?)               │
│                                                              │
│  ⚠️ 문제: "정말 폐기했는지 어떻게 믿어?"                      │
│  ⚠️ 개발/테스트용으로만 사용                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**방식 2: MPC Ceremony (권장)**

```
┌─────────────────────────────────────────────────────────────┐
│  Multi-Party Computation (다자간 계산)                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  참여자 1: τ₁ 생성 → 기여 → τ₁ 폐기                          │
│      ↓                                                       │
│  참여자 2: τ₂ 생성 → 기여 → τ₂ 폐기                          │
│      ↓                                                       │
│  참여자 3: τ₃ 생성 → 기여 → τ₃ 폐기                          │
│      ↓                                                       │
│     ...                                                      │
│      ↓                                                       │
│  최종 pk, vk 생성                                            │
│                                                              │
│  ✅ 장점: 참여자 중 단 1명만 정직해도 안전!                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 10.5 실제 MPC Ceremony 사례

**Zcash Powers of Tau:**
```
- 87명 참여
- 전 세계에서 진행
- 다양한 랜덤값 생성 방법:
  • 방사선 붕괴
  • 비행기 GPS 좌표
  • 용암 램프 영상
- 모든 참여 기록 공개
```

**Tornado Cash:**
```
- 1,114명 참여
- 참여자 중 1명만 정직하면 안전
- 누구나 참여 가능
```

### 10.6 Trusted Setup 실행 방법 (snarkjs)

```bash
# ============ Phase 1: Powers of Tau (Universal) ============
# 이미 완료된 ceremony 재사용 (권장)
wget https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau

# 또는 직접 생성 (테스트용)
snarkjs powersoftau new bn128 15 pot15_0000.ptau
snarkjs powersoftau contribute pot15_0000.ptau pot15_0001.ptau --name="First"
snarkjs powersoftau prepare phase2 pot15_0001.ptau pot15_final.ptau

# ============ Phase 2: Circuit-specific ============
# 서킷 컴파일
circom civic_kyc.circom --r1cs --wasm --sym

# Phase 2 Setup
snarkjs groth16 setup civic_kyc.r1cs pot15_final.ptau civic_kyc_0000.zkey

# 추가 기여 (선택사항, 보안 강화)
snarkjs zkey contribute civic_kyc_0000.zkey civic_kyc_0001.zkey \
    --name="Contributor 1"
snarkjs zkey contribute civic_kyc_0001.zkey civic_kyc_final.zkey \
    --name="Contributor 2"

# Verification Key 추출
snarkjs zkey export verificationkey civic_kyc_final.zkey verification_key.json

# Solidity Verifier 생성 (EVM용)
snarkjs zkey export solidityverifier civic_kyc_final.zkey CivicKYCVerifier.sol
```

### 10.7 ProofPort에서의 Trusted Setup

```
┌─────────────────────────────────────────────────────────────┐
│                    현재 vs Circom 추가 시                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  현재 (Noir + Ultra Honk):                                   │
│  ├── Trusted Setup 불필요 ✅                                 │
│  ├── 서킷 수정해도 재설정 불필요                              │
│  └── 바로 배포 가능                                          │
│                                                              │
│  Circom 추가 시 (Groth16):                                   │
│  ├── Trusted Setup 필요 ⚠️                                  │
│  ├── 서킷마다 별도 Phase 2 Setup 필요                        │
│  │                                                           │
│  ├── 옵션 1: 혼자 Setup (개발/테스트용)                      │
│  │   └── 빠르지만 프로덕션에는 부적합                         │
│  │                                                           │
│  ├── 옵션 2: MPC Ceremony (프로덕션용)                       │
│  │   └── 안전하지만 시간과 조율 필요                         │
│  │                                                           │
│  └── 옵션 3: 기존 Powers of Tau 재사용 (권장) ✅             │
│      └── Phase 1은 이미 완료된 것 사용                       │
│      └── Phase 2만 진행하면 됨                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 11. 구현 옵션 비교 및 권장사항

### 11.1 Civic KYC 구현 옵션

| 옵션 | 서킷 언어 | 증명 시스템 | EVM | Solana | 모바일 증명 | Trusted Setup |
|------|----------|------------|-----|--------|------------|---------------|
| **A** | Noir | Ultra Honk | ✅ | ❌ | ✅ | ❌ 불필요 |
| **B** | Noir | Groth16 (Sunspot) | ❌ | ✅ | ❌ 서버만 | ⚠️ 필요 |
| **C** | Circom | Groth16 | ✅ | ✅ | ✅ | ⚠️ 필요 |
| **D** | 하이브리드 | 둘 다 | ✅ | ✅ | ✅ | ⚠️ 일부 |

### 11.2 권장 구현 전략

```
┌─────────────────────────────────────────────────────────────┐
│                    권장 구현 전략                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  EVM 검증 (Base, Ethereum, Arbitrum...)              │    │
│  │  ─────────────────────────────────────────────────  │    │
│  │  Noir + Ultra Honk (현재 방식 유지)                   │    │
│  │  • Trusted Setup 불필요                              │    │
│  │  • 모바일 증명 가능                                   │    │
│  │  • 서킷 수정 용이                                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Solana 검증                                         │    │
│  │  ─────────────────────────────────────────────────  │    │
│  │  옵션 1: Circom + Groth16 (모바일 증명 원할 때)       │    │
│  │  옵션 2: Noir + Sunspot (서버 증명으로 충분할 때)     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 11.3 Circom 사용 시 장단점

**장점:**
- ✅ 동일 서킷으로 EVM + Solana 모두 모바일 증명
- ✅ 증명 크기가 매우 작음 (~200 bytes)
- ✅ 검증 가스비 저렴
- ✅ 성숙한 생태계 (circomlib, snarkjs)

**단점:**
- ⚠️ Trusted Setup 필요 (MPC Ceremony 권장)
- ⚠️ 서킷 수정 시 Phase 2 재실행 필요
- ⚠️ 개발 경험이 Noir보다 덜 현대적

---

## 12. 결론

### 12.1 Civic KYC ZK 서킷 구현 가능성

| 항목 | 평가 | 비고 |
|------|------|------|
| **기술적 가능성** | ✅ 가능 | Noir/Circom 모두 ed25519 지원 |
| **데이터 접근성** | ✅ 가능 | SAS는 공개 데이터 |
| **구현 난이도** | 중간 | Coinbase 서킷과 유사한 패턴 |
| **멀티체인 검증** | ✅ 가능 | ZK 증명은 체인 무관 |
| **모바일 증명** | ✅ 가능 | mopro (Noir/Circom 모두 지원) |

### 12.2 서킷 언어 선택 가이드

| 상황 | 권장 선택 | 이유 |
|------|----------|------|
| EVM만 지원 | **Noir** | Trusted Setup 불필요, 개발 편의성 |
| Solana만 지원 | **Circom** | groth16-solana 직접 지원 |
| EVM + Solana 모두 | **Circom** 또는 **하이브리드** | 동일 서킷으로 멀티체인 |
| 빠른 개발/수정 필요 | **Noir** | Setup 없이 바로 배포 |
| 프로덕션 + 최소 증명 크기 | **Circom** | ~200 bytes 증명 |

### 12.3 핵심 가치

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  "한 번의 KYC로 모든 체인에서 프라이버시 보호 검증"           │
│                                                              │
│  Civic (Solana) ──→ ZK Proof ──→ EVM 검증                   │
│  Coinbase (Base) ──→ ZK Proof ──→ Solana 검증               │
│                                                              │
│  이것이 ZK 크로스체인의 진정한 파워!                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 12.4 최종 요약

```
┌─────────────────────────────────────────────────────────────┐
│                    ProofPort 멀티체인 전략                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  현재 (Phase 1):                                             │
│  └── Noir + Ultra Honk → EVM (Trusted Setup 불필요)         │
│                                                              │
│  Solana 확장 (Phase 2):                                      │
│  ├── 옵션 A: Circom + Groth16 → 모바일 증명 가능             │
│  │           (Trusted Setup 필요, Powers of Tau 재사용)      │
│  │                                                           │
│  └── 옵션 B: Noir + Sunspot → 서버 증명만                    │
│              (Trusted Setup 필요, 모바일 증명 불가)           │
│                                                              │
│  권장: EVM은 Noir 유지, Solana는 Circom 추가 (하이브리드)    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 13. 참고 자료

### 공식 문서
- [Solana Attestation Service](https://attest.solana.com/)
- [SAS Documentation](https://attest.solana.com/docs)
- [SAS GitHub](https://github.com/solana-foundation/solana-attestation-service)
- [Civic Documentation](https://docs.civic.com/)
- [Civic Pass Integration](https://docs.civic.com/pass/use-cases/smart-contract-development)

### 기술 자료
- [Civic on Solana Ecosystem](https://solana.com/ecosystem/civic)
- [SAS TypeScript Guide](https://github.com/pratikbuilds/sas-ts-guide)
- [How to Build Digital Credentials](https://attest.solana.com/docs/guides/ts/how-to-create-digital-credentials)

### 관련 뉴스
- [Civic joins SAS](https://www.biometricupdate.com/202505/civic-joins-solana-attestation-service-for-solid-foundation-for-verifiable-credentials)
- [SAS Launch Announcement](https://solana.com/news/solana-attestation-service)
- [SAS Explained - CCN](https://www.ccn.com/education/crypto/solana-attestation-service-sas-explained-kyc-once-access-everywhere/)

### 코드 저장소
- [Civic Token Guard](https://github.com/civicteam/token-guard)
- [Civic Transfer Hook](https://github.com/civicteam/token-extensions-transfer-hook)
- [Civic Pass Workshop](https://github.com/civicteam/solana-civic-pass-workshop)
- [zk-solana-mobile-verifier](https://github.com/greg-nagy/zk-solana-mobile-verifier) - mopro + Circom + Solana PoC
- [groth16-solana](https://github.com/Lightprotocol/groth16-solana) - Solana Groth16 Verifier

### Circom & Trusted Setup
- [Circom Documentation](https://docs.circom.io/)
- [circomlib](https://github.com/iden3/circomlib) - Circom 표준 라이브러리
- [snarkjs](https://github.com/iden3/snarkjs) - Groth16 증명 생성/검증
- [Hermez Powers of Tau](https://github.com/hermeznetwork/phase2ceremony) - 재사용 가능한 Trusted Setup
- [Zcash Powers of Tau](https://github.com/ZcashFoundation/powersoftau-attestations)

### mopro (Mobile Prover)
- [mopro GitHub](https://github.com/zkmopro/mopro)
- [mopro Documentation](https://zkmopro.org/)
- [mopro Circom Prover](https://github.com/zkmopro/mopro/tree/main/circom-prover)
- [mopro Noir Adapter](https://zkmopro.org/docs/adapters/noir/)
