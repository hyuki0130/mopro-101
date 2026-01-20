# zkTLS 기술 분석 및 ProofPort 전략

## 목차
1. [zkTLS 개요](#1-zktls-개요)
2. [주요 아키텍처 모델](#2-주요-아키텍처-모델)
3. [핵심 암호학 요소](#3-핵심-암호학-요소)
4. [주요 프로토콜별 분석](#4-주요-프로토콜별-분석)
5. [오픈소스 라이선스 현황](#5-오픈소스-라이선스-현황)
6. [Noir 생태계 기존 구현체](#6-noir-생태계-기존-구현체)
7. [ProofPort 차별화 전략](#7-proofport-차별화-전략)
8. [구현 로드맵](#8-구현-로드맵)

---

## 1. zkTLS 개요

### 1.1 zkTLS란?

zkTLS는 **Zero-Knowledge Proofs (ZKP)**와 **TLS (Transport Layer Security)**를 결합한 기술입니다.

**핵심 목표:**
- 서버 협조 없이 HTTPS로 보호된 데이터의 출처(provenance)를 증명
- 실제 데이터를 공개하지 않고 데이터에 대한 사실만 증명
- Web2 데이터를 Web3 (블록체인)에서 검증 가능하게 만듦

### 1.2 동작 흐름

```
┌─────────────────────────────────────────────────────────────┐
│                    zkTLS 동작 흐름                           │
├─────────────────────────────────────────────────────────────┤
│  1. TLS Handshake: 클라이언트 ↔ 서버 (암호화 세션 수립)      │
│  2. zkTLS 캡처: 세션 데이터 (암호화된 데이터, 인증서) 수집    │
│  3. ZK Circuit: TLS 제약조건에 맞는 zk-SNARK 회로에서 처리   │
│  4. Proof 출력: 민감한 정보 숨기면서 데이터 진위/출처 증명    │
│  5. On-chain 검증: 블록체인에서 분산 검증                    │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 활용 사례

| Use Case | 설명 |
|----------|------|
| **KYC 검증** | 거래소 KYC 완료 여부 증명 (개인정보 노출 없이) |
| **소득 증명** | 은행 잔고, 급여 수준 증명 |
| **소속 증명** | 대학/회사 소속 증명 |
| **신용 기반 DeFi** | 전통 금융 신용으로 DeFi 대출 |
| **Social Reputation** | SNS 팔로워, GitHub 기여도 증명 |

---

## 2. 주요 아키텍처 모델

### 2.1 MPC 모델 (Multi-Party Computation)

**대표:** TLSNotary, zkPass (MPC Mode), Opacity

```
┌──────────┐     TLS      ┌──────────┐
│  Prover  │◄────────────►│  Server  │
│ (Client) │              │ (Web2)   │
└────┬─────┘              └──────────┘
     │ MPC Protocol
     │ (Garbled Circuits + OT)
     ▼
┌──────────┐
│ Verifier │
│ (Notary) │
└──────────┘
```

**핵심 기술:**
- Garbled Circuits (GC): 함수를 암호화된 회로로 변환
- Oblivious Transfer (OT): 선택 정보 노출 없이 메시지 전송
- Key Sharding: TLS 세션 키를 Prover와 Verifier가 분할 보유

**장점:** 암호학적 보증, 하드웨어 신뢰 불필요
**단점:** 높은 계산/통신 비용, TEE 대비 20배 느림

### 2.2 Proxy 모델 (Proxy Witness)

**대표:** Reclaim Protocol, zkPass (Proxy Mode)

```
┌──────────┐     TLS      ┌──────────┐
│  Prover  │◄────────────►│  Server  │
│ (Client) │              │ (Web2)   │
└────┬─────┘              └──────────┘
     │ 암호화된 데이터 관찰
     ▼
┌────────────────┐
│  Proxy Witness │ ← 암호화된 request/response만 봄
│  (Attestor)    │   (복호화 키 없음)
└────────┬───────┘
         │ Attestation
         ▼
┌────────────────┐
│  Client-side   │ ← AES/ChaCha20 복호화가 ZK 회로 내부에서 수행
│  ZK Circuit    │
└────────────────┘
```

**장점:** 브라우저 수정 불필요, 빠른 성능
**단점:** Proxy 중앙화 리스크, 서버의 proxy 차단 가능성

### 2.3 TEE 모델 (Trusted Execution Environment)

**대표:** Opacity Network (TEE + MPC 하이브리드)

```
┌────────────────────────────────────────┐
│           Intel SGX Enclave            │
│  ┌──────────────────────────────────┐  │
│  │  Balance/Data Reporting Logic    │  │
│  │  + Attestation Quote 생성        │  │
│  └──────────────────────────────────┘  │
│  MRENCLAVE: 코드 해시 (무결성 증명)     │
└────────────────────────────────────────┘
         │
         ▼ Remote Attestation Quote
┌────────────────────────────────────────┐
│  Intel Attestation Service (IAS)       │
└────────────────────────────────────────┘
```

**장점:** 빠른 성능, 높은 처리량
**단점:** Intel 하드웨어 신뢰 필요, side-channel 공격 가능성

### 2.4 모델별 비교

| 특성 | MPC 모델 | Proxy 모델 | TEE 모델 |
|------|----------|------------|----------|
| **신뢰 가정** | 암호학적 | Proxy 정직성 | 하드웨어 |
| **성능** | 느림 (~20x) | 빠름 | 매우 빠름 |
| **확장성** | 중간 | 높음 | 높음 |
| **보안 수준** | 최고 | 중간 | 하드웨어 의존 |
| **대표 구현** | TLSNotary, zkPass | Reclaim | Opacity |

---

## 3. 핵심 암호학 요소

### 3.1 Garbled Circuits (GC)

- 부울 회로를 암호화하여 2자간 안전 계산
- Yao's Garbled Circuit 프로토콜 기반
- TLSNotary, zkPass에서 사용

### 3.2 Oblivious Transfer (OT)

- 송신자가 여러 메시지 중 하나를 전송하되, 어떤 것이 선택됐는지 모름
- 1-of-2 OT: 두 메시지 중 하나 선택
- Silent OT: 오프라인 통신 최소화 (zkPass 최적화)

### 3.3 VOLE (Vector Oblivious Linear Evaluation)

- zkPass에서 사용하는 효율적 commitment 방식
- VOLEitH (VOLE-in-the-Head): 비대화형으로 변환
- 브라우저/디바이스에서 즉시 증명 생성 가능

### 3.4 기술 요소 정리표

| 기술 | 설명 | 사용처 |
|------|------|--------|
| **Garbled Circuits** | 부울 회로를 암호화하여 2자간 안전 계산 | TLSNotary, zkPass |
| **Oblivious Transfer** | 선택 정보 노출 없이 메시지 선택 전송 | 모든 MPC 기반 |
| **VOLE** | 벡터 형태의 OLE로 효율적 commitment | zkPass, DECO |
| **VOLEitH** | VOLE-ZK를 비대화형으로 변환 | zkPass |
| **Silent OT** | 오프라인 통신 최소화 OT | zkPass |
| **Three Halves** | GC 테이블 크기 최적화 | zkPass |
| **TEE/SGX** | 하드웨어 기반 격리 실행 환경 | Opacity |
| **DKIM/RSA** | 이메일 발신자 인증 | zkEmail |

---

## 4. 주요 프로토콜별 분석

### 4.1 DECO (Cornell Tech)

2019년 Cornell Tech에서 발표된 zkTLS의 선구적 연구.

**Three-Phase Protocol:**
1. Three-Party Handshake: TLS 세션 키를 Prover/Verifier가 분할
2. Query Execution: 웹사이트에 쿼리 실행
3. Proof Generation: ZK 증명 생성

**핵심 최적화:**
- SHA-256의 Merkle–Damgård 구조 활용
- MAC-then-Encrypt 구조 활용
- 2PC 오버헤드 최소화

**지원:** TLS 1.2, TLS 1.3 (GCM), ECDHE

### 4.2 zkPass

3P-TLS + MPC + NIZK 통합 하이브리드 시스템.

**두 가지 모드:**
- Proxy Mode: P가 V를 통해 S와 통신
- MPC Mode: P와 V 모두 클라이언트로 S와 통신

**MPC 최적화:**
| 기법 | 효과 |
|------|------|
| Silent OT | OT 생성 시 오프라인 통신 최소화 |
| Three Halves Make a Whole | Garbled Table 크기 감소 |
| Stacked GC | 통신량 감소, 실행 속도 향상 |
| Paillier 암호화 | 덧셈적 동형암호로 Pre-master Key 분할 |

**성능:** AES128 블록 수 300배 감소, 실행 속도 10배 향상

### 4.3 TLSNotary

2013년부터 시작된 비영리 프로젝트 (PSE/Ethereum Foundation).

**프로토콜 단계:**
1. Prover가 서버에 TLS 요청, Verifier와 MPC 협력
2. Prover가 데이터를 선택적 공개 (Selective Disclosure)
3. Verifier가 데이터 검증

**기술 스택:**
- Garbled Circuits: Yao's GC 구현
- Oblivious Transfer: 1-of-2 OT
- Custom .casm 회로 (Noir/Circom 아님)

### 4.4 Reclaim Protocol

Proxy Witness 모델 기반.

**동작:**
1. HTTP Proxy가 암호화된 트래픽만 관찰
2. (request, response) 튜플에 대한 attestation 발행
3. 클라이언트 측 ZK 회로 내부에서 AES 복호화

**라이선스:** AGPL (상업용은 Foundation 승인 필요)

### 4.5 Opacity Network

TLSNotary + Proof by Committee + EigenLayer AVS

**Proof by Committee:**
- 10개의 독립 Notary Node가 동일한 증명 생성
- 모든 노드가 Intel SGX enclave에서 실행
- EigenLayer AVS로 경제적 인센티브/슬래싱

---

## 5. 오픈소스 라이선스 현황

### 5.1 자유롭게 사용 가능 (MIT/Apache)

| 프로젝트 | 라이선스 | 상업적 사용 |
|----------|----------|-------------|
| **TLSNotary** | MIT / Apache 2.0 | ✅ 가능 |
| **Noir** | MIT / Apache 2.0 | ✅ 가능 |
| **zkEmail** | MIT | ✅ 가능 |
| **Pluto** | Apache 2.0 | ✅ 가능 |
| **zkPassport** | Apache 2.0 | ✅ 가능 |

### 5.2 주의 필요

| 프로젝트 | 라이선스 | 상업적 사용 |
|----------|----------|-------------|
| **Reclaim Protocol** | AGPL | ⚠️ Foundation 승인 필요 |
| **zkPass** | Proprietary | ❌ 자체 구현 필요 |
| **Circom/Circomlib** | GPL | ⚠️ GPL 전염성 |

### 5.3 공개 표준 (누구나 구현 가능)

모든 핵심 기술은 RFC 공개 표준:

| 표준 | 문서 | 비고 |
|------|------|------|
| DKIM | RFC 6376 | 이메일 서명 |
| TLS 1.3 | RFC 8446 | 보안 통신 |
| AES-GCM | NIST SP 800-38D | 대칭키 암호화 |
| RSA | - | 특허 만료 (2000) |
| SHA-256 | NIST FIPS 180-4 | 해시 |

**결론:** 프로토콜/알고리즘 자체는 공개 표준이므로 직접 구현 100% 합법

---

## 6. Noir 생태계 기존 구현체

### 6.1 zkemail.nr (이메일 검증)

| 항목 | 내용 |
|------|------|
| **GitHub** | [zkemail/zkemail.nr](https://github.com/zkemail/zkemail.nr) |
| **라이선스** | MIT |
| **버전** | v0.4.2 |
| **보안 감사** | ✅ Consensys Diligence (2024.12) |

```toml
# Nargo.toml
[dependencies]
zkemail = { tag = "v0.4.2", git = "https://github.com/zkemail/zkemail.nr", directory = "lib" }
```

**제공 기능:**
- `verify_dkim_signature` - DKIM 서명 검증
- `get_email_address` - 이메일 주소 추출
- `mask_text` - 선택적 텍스트 공개
- `partial_sha256_var_end` - 대용량 이메일 효율적 해싱

### 6.2 zkpassport/circuits (여권 검증)

| 항목 | 내용 |
|------|------|
| **GitHub** | [zkpassport/circuits](https://github.com/zkpassport/circuits) |
| **라이선스** | Apache 2.0 |

**제공 기능:**
- 여권 NFC 칩 데이터 검증
- ICAO 표준 디지털 서명 검증
- 나이/국적/신원 선택적 공개

### 6.3 noir-lang 공식 라이브러리

| 라이브러리 | GitHub | 용도 |
|------------|--------|------|
| **noir_rsa** | noir-lang/noir_rsa | RSA 서명 검증 |
| **noir-bignum** | noir-lang/noir-bignum | 대수 연산 (256~8192 bit) |
| **noir_json_parser** | noir-lang/noir_json_parser | JSON 파싱 |

### 6.4 Pluto 웹 프루버 회로

| 항목 | 내용 |
|------|------|
| **GitHub** | pluto/noir-web-prover-circuits |
| **라이선스** | Apache 2.0 |

**포함 회로:**
- AES-GCM: TLS 1.2/1.3 복호화
- ChaCha20: TLS 1.3 복호화
- HTTP Parser: HTTP 응답 파싱
- JSON Extractor: JSON 데이터 추출

### 6.5 awesome-noir 암호 라이브러리

**해시 함수:** SHA256, SHA512, Keccak256, Poseidon, MiMC, RIPEMD160

**서명 검증:** ECDSA, EdDSA, RSA, Schnorr, BLS12-381, WebAuthn

**대칭키 암호화:** AES-GCM, ChaCha20, ECIES, ElGamal

**유틸리티:** JSON Parser, Base64, zkRegEx, JWT 검증

---

## 7. ProofPort 차별화 전략

### 7.1 포지셔닝

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ProofPort의 포지셔닝                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   기초 라이브러리 (이미 있음)                                               │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐                      │
│   │zkemail.nr│ │zkpassport│ │noir_rsa  │ │noir_json │                      │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘                      │
│        │            │            │            │                            │
│        └────────────┴────────────┴────────────┘                            │
│                          │                                                 │
│                          ▼                                                 │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │                  ProofPort Layer (새로운!)                  │          │
│   │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │          │
│   │  │ noir-zktls  │ │ Composition │ │   Mobile    │           │          │
│   │  │ (자체구현)  │ │  Framework  │ │     SDK     │           │          │
│   │  └─────────────┘ └─────────────┘ └─────────────┘           │          │
│   └─────────────────────────────────────────────────────────────┘          │
│                          │                                                 │
│                          ▼                                                 │
│   ┌─────────────────────────────────────────────────────────────┐          │
│   │                      mopro                                  │          │
│   └─────────────────────────────────────────────────────────────┘          │
│                                                                             │
│   핵심: "기존 라이브러리를 대체하는 게 아니라,                              │
│         그 위에서 새로운 가치를 만드는 통합 레이어"                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 3가지 차별화 영역

#### Layer 1: noir-zktls (자체 구현)

**왜 가능한가?**
- TLSNotary: MPC 기반 - Noir 회로 아님
- Reclaim: gnark (Go) 기반 - Noir 아님
- zkPass: 자체 구현 - Noir 아님
- **완전한 zkTLS in Noir = 새로운 것!**

**구현 범위:**
- ChaCha20-Poly1305 (TLS 1.3 기본) - Noir에 없음
- TLS Record Parser - 없음
- HTTP/JSON Extractor 통합 - 없음

#### Layer 2: Proof Composition Framework

**역할:**
- 기존 라이브러리(zkemail.nr, zkpassport) 증명을 입력으로 받음
- Recursive verification으로 결합
- Cross-linking: "같은 사람"임을 증명
- Aggregate output: 복합 신뢰도 점수

```noir
#[recursive]
fn compose_proofs<N>(
    proofs: [impl Composable; N],
    linking_mode: u8,
) -> ComposedOutput {
    // 각 증명 재귀적 검증
    for i in 0..N {
        verify_inner_proof(proofs[i]);
    }
    // Cross-linking + Trust scoring
}
```

#### Layer 3: 인프라 & 서비스 (비즈니스)

- Notary/Proxy 서버 (zkTLS용)
- ProofPort Cloud API
- Mobile SDK (mopro 기반)
- Verifier 컨트랙트 관리

### 7.3 오픈소스 vs 비즈니스 분리

**오픈소스 (MIT/Apache):**
- `noir-zktls` - zkTLS Noir 회로
- `noir-proof-composer` - Composition 회로
- `@proofport/core` - 기본 SDK

**비즈니스:**
- ProofPort Cloud (SaaS)
- Enterprise SDK (SLA, 전용 지원)
- Verification Service (멀티체인)

---

## 8. 구현 로드맵

### Phase 1 (4주): noir-zktls 핵심 구현

- ChaCha20-Poly1305 회로 (TLS 1.3 기본)
- HTTP Response 파싱
- JSON 선택적 공개
- 기본 Notary 서버

### Phase 2 (3주): Composition Framework

- 표준 인터페이스 정의
- Recursive verification
- zkemail.nr, zkpassport 연동 테스트
- Trust score 알고리즘

### Phase 3 (3주): 통합 & 서비스화

- mopro 연동
- ProofPort SDK
- Cloud API
- 문서화

### Phase 4: 오픈소스 공개 & Noir 재단 제안

- noir-zktls MIT 공개
- noir-proof-composer MIT 공개
- Noir 재단 협력 논의

---

## 참고 자료

### 공식 문서 & 표준
- [RFC 6376 - DKIM Signatures](https://datatracker.ietf.org/doc/html/rfc6376)
- [RFC 8446 - TLS 1.3](https://datatracker.ietf.org/doc/html/rfc8446)
- [Noir Documentation](https://noir-lang.org/docs/)

### GitHub 저장소
- [TLSNotary](https://github.com/tlsnotary/tlsn) - MIT/Apache 2.0
- [zkemail.nr](https://github.com/zkemail/zkemail.nr) - MIT
- [zkpassport/circuits](https://github.com/zkpassport/circuits) - Apache 2.0
- [Pluto Noir-AES-GCM](https://github.com/pluto/Noir-AES-GCM) - Apache 2.0
- [awesome-noir](https://github.com/noir-lang/awesome-noir)
- [mopro](https://zkmopro.org/)

### 연구 논문 & 블로그
- [DECO: Liberating Web Data](https://arxiv.org/html/1909.00938) - Cornell Tech
- [zkPass Technical Overview](https://docs.zkpass.org/overview/technical-overview)
- [TLSNotary Protocol Review](https://arxiv.org/html/2409.17670v1)
- [Reclaim Protocol - Proxying Is Enough](https://blog.reclaimprotocol.org/posts/proxying-is-enough)
- [VOLE-in-the-Head Paper](https://eprint.iacr.org/2023/996)

### 보안 감사
- [zkEmail Noir - Consensys Diligence (2024.12)](https://diligence.security/audits/2024/12/zk-email-noir/)

---

*최종 업데이트: 2025-01-21*
