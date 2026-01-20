# 거래소 KYC On-chain Attestation 분석

> Coinbase KYC 서킷과 유사하게 다른 거래소 KYC를 ZK로 검증할 수 있는지에 대한 분석

## 1. 현재 상황 요약

| 거래소/서비스 | On-chain Attestation | ZK 서킷 구현 가능성 |
|--------------|---------------------|-------------------|
| **Coinbase** | ✅ EAS 기반 제공 | ✅ **이미 구현됨** |
| Binance | ❌ 미제공 | ❌ 직접 불가 |
| OKX | ❌ 미제공 | ❌ 직접 불가 |
| Kraken | ❌ 미제공 | ❌ 직접 불가 |
| Bybit | ❌ 미제공 | ❌ 직접 불가 |

**핵심 발견**: Coinbase가 **유일하게** EAS(Ethereum Attestation Service)를 사용하여 on-chain KYC attestation을 제공하는 거래소입니다. 다른 주요 거래소들은 전통적인 중앙화 KYC만 제공하고 있어 직접적인 on-chain 검증이 불가능합니다.

---

## 2. 대안 접근법 (거래소 협조 없이 KYC 증명)

### A. zkPass - 가장 유망

[zkPass](https://zkpass.org/)는 **zkTLS** 기술을 사용하여 거래소의 협조 없이도 KYC 상태를 ZK로 증명할 수 있습니다.

**핵심 기술:**
- **3P-TLS (Three-Party TLS)**: 사용자, 웹사이트, zkPass 노드 간 3자 핸드셰이크
- 웹사이트 응답을 기반으로 ZK 증명 생성
- 1초 미만의 증명 생성 (브라우저에서)

**지원 플랫폼 (100+ 사이트):**
```
✅ Binance, OKX (투자자이기도 함!)
✅ Uber, Airbnb
✅ Ferrari, Adobe, Apple
✅ 다양한 Web2/Web3 서비스
```

**투자자**: Binance, OKX Ventures, Sequoia, Animoca Brands 등 $15M 유치

**사용 예시:**
```
"이 사용자는 Binance에서 KYC Level 2를 완료했음" → ZK 증명
실제 이름, 주소, 신분증 정보는 노출되지 않음
```

**서킷 구현 난이도**: 중간
- zkPass SDK 연동 필요
- TransGate 확장 프로그램 활용 가능
- 메인넷 2025년 예정

---

### B. Reclaim Protocol

[Reclaim Protocol](https://blog.reclaimprotocol.org/posts/zk-in-zktls)도 zkTLS 기반으로 유사한 기능을 제공합니다.

**특징:**
- HTTPS 프록시 서버(attestor)를 통한 TLS 세션 검증
- 암호화된 데이터만 attestor가 확인 (평문 접근 불가)
- 국가 ID를 활용한 KYC 검증 지원

**실제 활용 사례:**
- **ZKP2P**: Reclaim을 활용한 P2P 결제 검증
- **Stormbit Labs**: DeFi 대출에서 Web2 신용 데이터 활용

**보안 모델:**
- 사용자와 attestor 간 공모 위험 존재
- Subset sampling으로 완화 (랜덤 attestor 그룹 검증)

---

### C. Gitcoin Passport

[Gitcoin Passport](https://docs.passport.gitcoin.co/)는 EAS 기반 다양한 "Stamps"를 제공합니다.

**Stamps 종류:**
- KYC 검증 (Civic, BrightID 등)
- 생체인증
- Web3 활동 증명
- Web2 활동 증명 (소셜 미디어 등)

**EAS Schema:**
- `GITCOIN PASSPORT STAMPS V1`
- `GITCOIN PASSPORT SCORES V1`

**지원 네트워크**: Arbitrum, Optimism, Scroll, Base, zkSync 등

**특징:**
- 이미 on-chain에 attestation 존재
- Passport Score로 종합적인 신원 점수 제공
- 다양한 신원 증명 소스 조합 가능

---

### D. World ID (Worldcoin)

[World ID](https://world.org/world-id)는 생체인증(홍채) 기반 신원 증명입니다.

**특징:**
- Orb 디바이스로 홍채 스캔
- ZK 증명으로 "유니크한 인간"임을 증명
- KYC가 아닌 **Proof of Humanity**

**새로운 기능 (2024~):**
- World ID Passport Credential (칠레, 콜롬비아, 말레이시아, 한국 파일럿)
- NFC 여권 연동
- 향후 **zkKYC** 기능 추가 예정

**개발자 도구:**
- IDKit (Web SDK)
- Developer Portal
- OAuth 2.0 / OIDC 지원
- 향후 Verifiable Credentials (VCs), DIDs 지원 예정

---

### E. Polygon ID (현재 Privado ID)

[Privado ID](https://www.kaleido.io/blockchain-platform/polygon-id)는 Polygon의 ZK 기반 신원 솔루션입니다.

**특징:**
- Iden3 프로토콜 + Circom ZK 툴킷 사용
- W3C Verifiable Credentials 표준 지원
- zkMe와 통합하여 **zkKYC** 제공

**zkMe 통합:**
- Proof of Citizenship (PoC)
- AML 검사
- 글로벌 KYC/AML 규정 준수
- 자격증명 재사용으로 KYC 비용 절감

**최신 업데이트 (Release 6):**
- Non-merklized Credential 포맷
- 스마트 컨트랙트 내 신뢰 없는 분산 발행자 가능
- W3C Verifiable Credential Refresh 표준 최초 구현

---

## 3. 서킷 구현 추천 우선순위

### 1순위: zkPass 기반 멀티 거래소 KYC

```
장점:
- Binance, OKX 등 주요 거래소 KYC 증명 가능
- 거래소 협조 필요 없음 (TLS 세션에서 직접 추출)
- Binance Labs, OKX Ventures가 투자 (신뢰성)
- 100+ 웹사이트 지원

구현 방식:
1. zkPass TransGate 통합
2. 거래소 로그인 → KYC 상태 페이지 접속
3. TLS 응답에서 ZK 증명 생성
4. On-chain 검증

예상 Public Inputs:
- signal_hash (리플레이 방지)
- exchange_id (거래소 식별)
- kyc_level (인증 레벨)
- timestamp (검증 시점)
```

### 2순위: Gitcoin Passport Stamps

```
장점:
- 이미 EAS에 on-chain attestation 존재
- 다양한 신원 증명 소스 조합 가능
- Coinbase 서킷과 유사한 패턴으로 구현 가능

구현 방식:
- EAS attestation 읽어서 Merkle proof 생성
- 특정 Stamps 보유 증명
- Passport Score 임계값 검증
```

### 3순위: World ID 연동

```
장점:
- ZK 네이티브 설계
- SDK/IDKit 제공
- 생체인증 기반 강력한 Sybil 저항

구현 방식:
- World ID 검증 결과를 서킷 입력으로 활용
- "유니크한 인간"임을 증명
- 거래소 KYC보다는 Proof of Humanity에 가까움
```

---

## 4. 기술적 비교

| 항목 | Coinbase KYC | zkPass | Reclaim | Gitcoin |
|------|-------------|--------|---------|---------|
| **데이터 소스** | EAS Attestation | TLS 세션 | TLS 세션 | EAS Stamps |
| **거래소 협조** | 필요 | 불필요 | 불필요 | 불필요 |
| **ZK 프레임워크** | Noir (자체) | VOLE-ZK, zkSNARKs | ZKP | EAS 기반 |
| **증명 생성** | 앱에서 | 브라우저 | 브라우저 | 온체인 |
| **다중 거래소** | ❌ Coinbase만 | ✅ 100+ | ✅ 다양 | ❌ 제한적 |
| **메인넷 상태** | ✅ Live | 🔄 2025 | ✅ Live | ✅ Live |

---

## 5. zkTLS 기술 심층 분석

### zkTLS란?

**Zero-Knowledge Transport Layer Security**의 약자로, TLS 암호화 시스템과 ZK 증명을 결합한 하이브리드 프로토콜입니다.

### 동작 원리

```
┌─────────────┐     TLS 세션      ┌─────────────┐
│   사용자    │ ←───────────────→ │   웹사이트   │
│  (Prover)   │                   │ (Binance 등) │
└──────┬──────┘                   └─────────────┘
       │
       │ 암호화된 데이터만 공유
       ↓
┌─────────────┐
│  zkTLS 노드  │
│ (Attestor)  │
└──────┬──────┘
       │
       │ ZK 증명 생성
       ↓
┌─────────────┐
│ On-chain    │
│ Verification│
└─────────────┘
```

### TLSNotary의 기여

- MPC 기술 (Garbled Circuits) 활용
- 제3자 공증인/검증자 도입 성공
- zkTLS 발전의 기반 마련
- 오픈소스로 공개

### 보안 고려사항

1. **공모 위험**: 사용자와 attestor가 공모하면 위조 가능
2. **완화 방법**:
   - Subset sampling (랜덤 attestor 그룹)
   - Economic slashing (담보 손실)
   - Proof-by-committee

---

## 6. 결론

### Coinbase 외 거래소 KYC 서킷 구현 가능성

**직접 구현 불가:**
- Binance, OKX, Kraken, Bybit 등은 on-chain attestation 미제공
- 거래소가 EAS attestation을 제공하지 않으면 Coinbase 방식 불가

**대안 솔루션:**
1. **zkPass** (가장 유망): zkTLS로 거래소 협조 없이 KYC 증명. Binance, OKX 등 다양한 거래소 지원.
2. **Reclaim Protocol**: zkTLS 기반 유사 기능. 현재도 사용 가능.
3. **Gitcoin Passport**: EAS 기반 다양한 신원 Stamps. 종합적 신원 점수.
4. **World ID**: Proof of Humanity. 생체인증 기반.

### 권장 사항

1. **단기 (현재~)**: Gitcoin Passport Stamps 활용
   - 이미 on-chain에 데이터 존재
   - Coinbase 서킷과 유사한 패턴 적용 가능

2. **중기 (2025~)**: zkPass 통합
   - 메인넷 출시 후 바로 적용
   - 다양한 거래소 KYC를 단일 서킷으로 지원

3. **장기**: World ID zkKYC 기능 출시 대기
   - 생체인증 + KYC 결합
   - 가장 강력한 신원 증명

---

## References

- [zkPass - Private Data Protocol](https://zkpass.org/)
- [zkPass Identity and Compliance](https://docs.zkpass.org/overview/use-cases/identity-and-compliance)
- [Reclaim Protocol - The zk in zkTLS](https://blog.reclaimprotocol.org/posts/zk-in-zktls)
- [Coinbase Verifications GitHub](https://github.com/coinbase/verifications)
- [Ethereum Attestation Service](https://attest.org/)
- [EAS Ecosystem](https://attest.org/ecosystem)
- [Gitcoin Passport Docs](https://docs.passport.gitcoin.co/)
- [World ID Concepts](https://docs.world.org/world-id/concepts)
- [Polygon ID / Privado ID](https://www.kaleido.io/blockchain-platform/polygon-id)
- [zkMe on PolygonID](https://medium.com/@zkMe/zkme-and-polygonid-pioneering-a-new-era-in-web3-identity-verification-b6bfe574668b)
- [OKX Learn - zkPass Token](https://www.okx.com/en-eu/learn/zkpass-zkp-token-privacy-verification)
- [TLSNotary zkTLS Day](https://tlsnotary.org/zktls-day/)
