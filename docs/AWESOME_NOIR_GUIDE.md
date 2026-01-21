# Awesome Noir 가이드

> Noir 생태계의 프로젝트, 라이브러리, 도구, 학습 자료 종합 정리
>
> 원본: https://github.com/noir-lang/awesome-noir

---

## 목차
1. [개요](#1-개요)
2. [프로젝트](#2-프로젝트)
3. [라이브러리](#3-라이브러리)
4. [개발 도구](#4-개발-도구)
5. [학습 자료](#5-학습-자료)
6. [벤치마크](#6-벤치마크)
7. [보일러플레이트](#7-보일러플레이트)

---

## 1. 개요

### Awesome Noir란?

Noir 언어로 개발된 프로젝트, 라이브러리, 도구, 학습 자료를 큐레이션한 목록입니다.

### 공식 리소스

| 리소스 | 링크 |
|--------|------|
| **공식 문서** | https://noir-lang.org/docs |
| **GitHub** | https://github.com/noir-lang |
| **Discord** | Noir 커뮤니티 채널 |
| **채용 정보** | 커뮤니티 Job Board (Notion) |

### 라이선스

CC0-1.0 (Public Domain) - 자유롭게 사용 가능

---

## 2. 프로젝트

### 2.1 신원 인증 (Identity)

| 프로젝트 | 설명 | 특징 |
|----------|------|------|
| **ZKPassport** | 여권 기반 신원 증명 | NFC 칩 데이터 검증, 나이/국적 선택적 공개 |
| **Self (OpenPassport)** | 정부 ID 기반 신원 지갑 | 다양한 신분증 지원 |
| **Anon-Aadhaar** | 인도 거주자 ID 검증 | Aadhaar 카드 기반 |
| **Rarimo** | 여권 서명 검증 회로 | 다중 여권 형식 지원 |

### 2.2 이메일 (Email)

| 프로젝트 | 설명 | 특징 |
|----------|------|------|
| **ZK Email** | 프라이버시 보호 이메일 검증 | DKIM 서명 검증, 선택적 공개 |

### 2.3 인증 (Authentication)

| 프로젝트 | 설명 | 특징 |
|----------|------|------|
| **zkLogin** | Apple/Google 계정으로 EVM 스마트 계정 인증 | Web2 → Web3 브릿지 |
| **Dark Safe** | 프라이버시 보호 다중 서명 모듈 | Safe 지갑 통합 |
| **zkSafe** | ZK 기반 Safe 모듈 | 익명 서명 |
| **SAMM** | 프라이버시 보호 다중 서명 | 서명자 익명화 |

### 2.4 상업용 (Commercial)

| 프로젝트 | 설명 | 특징 |
|----------|------|------|
| **GitClaim** | GitHub 기여도 기반 프라이버시 에어드랍 | 커밋 이력 증명 |
| **z-imburse** | 자동화된 프라이버시 경비 정산 | 영수증 검증 |
| **ZK-Flexor** | EVM 자산 잔고 프라이버시 증명 | 잔고 범위 증명 |

### 2.5 DeFi

| 프로젝트 | 설명 | 특징 |
|----------|------|------|
| **Mezcal** | 온체인 지정가 주문 다크풀 | 주문 프라이버시 보호 |

### 2.6 게임 (Gaming)

| 프로젝트 | 설명 | 특징 |
|----------|------|------|
| **ZK-AntiCheat** | 프라이버시 보호 안티치트 엔진 | 게임 공정성 보장 |
| **Terry Escape** | 멀티플레이어 전쟁 게임 | 안개 전쟁 메커니즘 |
| **zk-hangman-noir** | 행맨 게임 zkDApp 데모 | E2E 예제 |

### 2.7 거버넌스 (Governance)

| 프로젝트 | 설명 | 특징 |
|----------|------|------|
| **Nouns Anonymous Voting** | NounsDAO 프라이버시 투표 | 익명 투표 |

### 2.8 소셜 (Social)

| 프로젝트 | 설명 | 특징 |
|----------|------|------|
| **anon.world** | 선택적 익명 소셜 미디어 | 익명/실명 선택 |
| **Rate Limiting Nullifiers** | 익명 환경 스팸 방지 | Nullifier 기반 |
| **StealthNote** | 익명 조직 메시지 브로드캐스트 | 익명 공지 |

---

## 3. 라이브러리

### 3.1 암호학 - 해시 함수

| 라이브러리 | 설명 | 용도 |
|------------|------|------|
| **SHA256** | SHA256 해싱 | 범용, DKIM |
| **SHA512** | SHA512/384 해싱 | 강화된 보안 |
| **Keccak256** | Keccak256 해싱 | Ethereum 호환 |
| **Poseidon** | Poseidon/Poseidon2 해싱 | ZK 최적화 |
| **MiMC** | MiMC 해싱 | ZK 최적화 |
| **RIPEMD160** | RIPEMD160 해싱 | Bitcoin 호환 |

### 3.2 암호학 - 대칭키 암호화

| 라이브러리 | 설명 | 용도 |
|------------|------|------|
| **AES** | AES 암호화/복호화 | TLS, 범용 암호화 |
| **ChaCha20** | RFC7539 ChaCha20 | TLS 1.3 |
| **ElGamal** | Baby Jubjub ElGamal | ZK 친화적 암호화 |
| **Hydra** | BN254 대칭키 암호화 | ZK 특화 |
| **ECIES** | Baby Jubjub ECIES | 하이브리드 암호화 |
| **ECDH** | Baby Jubjub ECDH | 키 교환 |

### 3.3 암호학 - 서명 검증

| 라이브러리 | 설명 | 용도 |
|------------|------|------|
| **RSA** | RSA 서명 검증 | DKIM, TLS, 인증서 |
| **ECDSA** | NIST/Brainpool 커브 ECDSA | Ethereum, 여권 |
| **EdDSA** | EdDSA 서명 검증 | 최신 시스템 |
| **Schnorr** | Schnorr 서명 검증 | Bitcoin Taproot |
| **BLS12-381** | BLS 서명 및 페어링 | 다중 서명 집계 |
| **WebAuthn/Passkeys** | WebAuthn 서명 검증 | 생체 인증 |
| **JWT** | JSON Web Token 검증 | API 인증 |
| **PLUME** | ECDSA 기반 Nullifier | 익명성 + 중복 방지 |

### 3.4 암호학 - 기타

| 라이브러리 | 설명 | 용도 |
|------------|------|------|
| **BigNum** | 대수 연산 (256~8192 bit) | RSA, 큰 수 연산 |
| **BigCurve** | 임의 타원 곡선 연산 | 커스텀 커브 |
| **HMAC** | 해시 기반 메시지 인증 | API 인증, 무결성 |
| **ChaCha20 RNG** | 난수 생성 | 보안 랜덤 |
| **Semaphore** | 프라이버시 그룹 멤버십 | 익명 신호 |

### 3.5 데이터 타입 - 숫자

| 라이브러리 | 설명 | 용도 |
|------------|------|------|
| **Fraction** | 분수 연산 | 정밀 계산 |
| **ZKFloat** | 부동소수점 연산 | ML, 과학 계산 |
| **IEEE754** | IEEE 754 부동소수점 | 표준 호환 |
| **Complex Numbers** | 복소수 연산 | 수학 연산 |
| **Fixed Point** | 고정소수점 연산 | 정밀 금융 계산 |

### 3.6 데이터 타입 - 텍스트/파싱

| 라이브러리 | 설명 | 용도 |
|------------|------|------|
| **JSON Parser** | RFC 8259 JSON 파싱 | API 응답 처리 |
| **Base64** | Base64 인코딩/디코딩 | 데이터 인코딩 |
| **String Utils** | 문자열 유틸리티 | 텍스트 처리 |
| **String Search** | 부분 문자열 검색 증명 | 텍스트 검증 |
| **zkRegEx** | 정규표현식 검증 | 패턴 매칭 |

### 3.7 데이터 타입 - 컬렉션

| 라이브러리 | 설명 | 용도 |
|------------|------|------|
| **Sort** | 고정 크기 배열 정렬 | 데이터 정렬 |
| **Sparse Array** | 희소 배열 | 메모리 효율 |
| **Lib_LinkList** | 이중 연결 리스트 | 동적 데이터 |
| **Matrix Operations** | 행렬 연산 | ML, 수학 |
| **Statistical Library** | 통계 연산 | 데이터 분석 |

### 3.8 블록체인 특화

| 라이브러리 | 설명 | 용도 |
|------------|------|------|
| **Ethereum Storage Proofs** | 이더리움 스토리지 검증 | 상태 증명 |
| **Ethereum MPT Proof** | 머클 패트리샤 트라이 증명 | 상태 증명 |
| **EVM Call Simulation** | EVM 호출 시뮬레이션 | 트랜잭션 검증 |
| **Bitcoin Script** | 비트코인 스크립트 검증 | BTC 브릿지 |
| **Aztec Utilities** | Aztec 프로토콜 도구 | L2 개발 |

### 3.9 머신러닝

| 라이브러리 | 설명 | 용도 |
|------------|------|------|
| **ML Inference** | 신경망 추론 | zkML |

---

## 4. 개발 도구

### 4.1 핵심 도구

| 도구 | 설명 | 링크 |
|------|------|------|
| **Nargo** | Noir 패키지 매니저 & CLI | 공식 |
| **NoirJS** | JavaScript/WASM 바인딩 | 브라우저 지원 |
| **Barretenberg** | 공식 증명 백엔드 | 기본 프루버 |

### 4.2 IDE 지원

| 도구 | 설명 |
|------|------|
| **VS Code Extension** | 문법 하이라이팅, 디버깅 |
| **IntelliJ Plugin** | JetBrains IDE 지원 |

### 4.3 모바일 개발

| 도구 | 설명 |
|------|------|
| **MoPro** | 모바일 프루버 (iOS/Android) |
| **React Native Binding** | RN 바인딩 |

### 4.4 EVM 통합

| 도구 | 설명 |
|------|------|
| **Hardhat Plugin** | Hardhat 프레임워크 통합 |
| **Solidity Verifier** | Solidity 검증 컨트랙트 생성 |

### 4.5 디버깅 & 프로파일링

| 도구 | 설명 |
|------|------|
| **Noir Debugger** | 스텝 디버깅 |
| **Profiling Tools** | 성능 분석 |
| **Noir Linter** | 코드 스타일 검사 |

### 4.6 보안

| 도구 | 설명 |
|------|------|
| **Formal Verification (Lean)** | Lean 기반 형식 검증 |
| **Security Audit Checklists** | 보안 체크리스트 |

---

## 5. 학습 자료

### 5.1 인터랙티브 튜토리얼

| 자료 | 설명 | 형태 |
|------|------|------|
| **Noirlings** | 실습 기반 연습 문제 | CLI |
| **Noirlings.app** | 브라우저 기반 학습 | 웹앱 |
| **Glass Bridge With Noir** | ZK 증명 데모 게임 | 게임 |

### 5.2 교육 과정

| 과정 | 제공자 | 설명 |
|------|--------|------|
| **Noir Programming and ZK Circuits** | Cyfrin | ZK 프로토콜 구축 완전 과정 |
| **Open Source Noir Course** | ZKCamp | 6강 종합 커리큘럼 |
| **BattleZips-Noir** | - | 온체인 배틀십 게임 구축 |

### 5.3 발표 & 워크샵

**Noir 코딩:**
- Build Your First ZK App with Noir
- ProtocolBerg v2: Learn Noir in an Afternoon
- Noir Xmas Camp: Building Applications with Noir
- NoirHack: Advanced Noir (unconstrained functions)
- NoirCon 2: Vibe Coding Noir (AI 지원 코딩)

**프로젝트 통합:**
- d/Infra Summit: coNoir
- NoirCon 2: Semaphore
- NoirHack: MoPro, ZK Email, ZK Kit, ZKPassport

**보안:**
- Circuit Safety and Introduction to Noir
- Noir Xmas Camp: Circuit Security & Production Readiness
- NoirCon 2: Lampe (Lean 형식 검증)

### 5.4 블로그 & 아티클

| 제목 | 주제 |
|------|------|
| Understanding Technical Aspects of Aztec and Noir | Aztec 기술 개요 |
| Noir 101 for Solidity developers | Solidity 개발자용 입문 |
| Privacy-preserving KYC with Noir | zkKYC 구현 |
| Build Decentralized Voting Application with Noir | 투표 앱 구현 |

### 5.5 다국어 자료

| 언어 | 자료 |
|------|------|
| 스페인어 | Introduction to Noir |
| 광둥어 | Building ZK dApp |

---

## 6. 벤치마크

| 벤치마크 | 대상 | 설명 |
|----------|------|------|
| **Ethproofs SHA256/ECDSA** | 크로스 스택 | ZK 스택 비교 |
| **MoPro Benchmarks** | 모바일/브라우저 | 모바일 성능 측정 |
| **Semaphore Benchmarks** | Semaphore | 구현체 비교 |
| **RSA Benchmarks** | RSA 서명 검증 | 성능 측정 |
| **ECDSA secp256r1** | ECDSA | 다중 ZK 스택 |
| **Noir Development Bench** | Noir | 최신 커밋 컴파일/실행 |
| **Noir Benchmark CLI** | NoirJS + BB | 프로파일링 도구 |

---

## 7. 보일러플레이트

| 템플릿 | 용도 | 특징 |
|--------|------|------|
| **hardhat-noir-starter** | Hardhat 통합 | Solidity + Noir |
| **noir-library-starter** | 라이브러리 개발 | 패키지 템플릿 |
| **noir-react-native-starter** | 모바일 개발 | RN + Noir |
| **nargo binary examples** | 기본 예제 | prove/verify, codegen, recursion |
| **noir-recursive** | 재귀 증명 | UltraHonk 재귀 |

---

## 8. ProofPort 관련 핵심 라이브러리

### 즉시 활용 가능

```toml
# Nargo.toml

[dependencies]
# 이메일 검증
zkemail = { tag = "v0.4.2", git = "https://github.com/zkemail/zkemail.nr", directory = "lib" }

# RSA 서명 (DKIM 등)
noir_rsa = { tag = "v0.3.3", git = "https://github.com/zkpassport/noir_rsa" }

# 대수 연산
bignum = { tag = "v0.4.2", git = "https://github.com/noir-lang/noir-bignum" }

# JSON 파싱
noir_json_parser = { git = "https://github.com/noir-lang/noir_json_parser" }

# AES-GCM (zkTLS용)
# noir_aes_gcm = { git = "https://github.com/pluto/Noir-AES-GCM" }
```

### 카테고리별 활용

| 용도 | 라이브러리 |
|------|------------|
| **이메일 검증** | zkemail, noir_rsa, SHA256 |
| **여권 검증** | zkpassport, ECDSA, SHA256 |
| **zkTLS** | AES, ChaCha20, JSON Parser |
| **Attestation** | ECDSA, Keccak256, Merkle |
| **익명성** | Semaphore, PLUME, Poseidon |

---

## 참고

- **원본**: https://github.com/noir-lang/awesome-noir
- **라이선스**: CC0-1.0 (Public Domain)
- **기여**: PR을 통해 커뮤니티 기여 가능

---

*최종 업데이트: 2025-01-21*
