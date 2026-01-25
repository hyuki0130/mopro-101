# Digital Credential API & 모바일 신분증 연동 조사

> 조사일: 2026-01-25

## 목차

1. [Multipaz (OpenWallet Foundation)](#1-multipaz-openwallet-foundation)
2. [Open DID (OmniOneID)](#2-open-did-omnioneid)
3. [한국 모바일 신분증 연동](#3-한국-모바일-신분증-연동)
4. [이용기관 등록 절차](#4-이용기관-등록-절차)
5. [국가별 mDL 현황](#5-국가별-mdl-현황)
6. [ProofPort 연동 방안](#6-proofport-연동-방안)

---

## 1. Multipaz (OpenWallet Foundation)

### 개요

| 항목 | 내용 |
|------|------|
| GitHub | https://github.com/openwallet-foundation/multipaz |
| 표준 | ISO/IEC 18013-5:2021 (mDL) |
| 플랫폼 | Android, iOS, Server (Kotlin Multiplatform) |
| 라이선스 | Apache 2.0 |
| 상태 | pre-1.0 (2026년 초 1.0 예정) |

### 주요 라이브러리

| 라이브러리 | 설명 |
|-----------|------|
| `multipaz` | ISO mdoc, IETF SD-JWT VC 지원, 근거리 전송 구현 |
| `multipaz-compose` | Compose 애플리케이션용 UI |
| `multipaz-doctypes` | mDL, EU PID 등 문서 유형 및 샘플 데이터 |
| `multipaz-longfellow` | Zero-Knowledge Proofs 지원 |
| `multipaz-swift` | iOS용 Swift/SwiftUI 기능 |

### 테스트 환경

| URL | 용도 |
|-----|------|
| https://issuer.multipaz.org | 테스트 자격증명 발급 (OpenID4VCI) |
| https://verifier.multipaz.org | mDL/EU PID 검증 테스트 |

### 샘플 앱 (multipaz-samples)

| 앱 | 설명 | 플랫폼 |
|----|------|--------|
| SwiftWallet | iOS용 Swift 지갑 | iOS |
| ComposeWallet | Kotlin Multiplatform 지갑 | Android, iOS |
| SimpleVerifierStandalone | mDL 검증기 | - |

### iOS 빌드 방법

```bash
# 1. Xcode 설정
sudo xcode-select -s /Applications/Xcode.app

# 2. DeveloperConfig 생성
cp samples/testapp/iosApp/DeveloperConfig.xcconfig.template \
   samples/testapp/iosApp/DeveloperConfig.xcconfig
# Team ID 편집

# 3. Xcode에서 열기
open samples/testapp/iosApp/TestApp.xcodeproj
```

### Apple/Google Wallet 연동

- W3C Digital Credentials API 지원
- OpenID4VP 프로토콜 지원
- Apple Wallet: iOS 26부터 지원 (2025.9월~)
- Google Wallet: 이미 지원 (Android Credential Manager)

---

## 2. Open DID (OmniOneID)

### 개요

| 항목 | 내용 |
|------|------|
| 개발사 | 라온시큐어 (Raonsecure) |
| GitHub | https://github.com/OmniOneID |
| 표준 | W3C DID/VC |
| 라이선스 | Apache 2.0 |
| 역할 | 한국 모바일 신분증 기반 기술 |

### 구조

```
라온시큐어 (회사)
└── OmniOne (브랜드)
    ├── OmniOneID (GitHub 조직)
    └── Open DID (오픈소스 프로젝트)
```

### 주요 저장소 (34개)

**모바일 SDK**
| 저장소 | 플랫폼 | 기능 |
|--------|--------|------|
| did-client-sdk-ios | iOS | DID Wallet, VC/VP, ZKP |
| did-client-sdk-aos | Android | DID Wallet, VC/VP, ZKP |

**서버 컴포넌트**
| 저장소 | 역할 | 언어 |
|--------|------|------|
| did-ta-server | Trust Anchor | Java |
| did-ca-server | Certificate Authority | Java |
| did-issuer-server | VC 발급자 | Java |
| did-verifier-server | VP 검증자 | TypeScript |
| did-wallet-server | 지갑 백엔드 | Java |
| did-orchestrator-server | 전체 조율 | TypeScript |

**ZKP 관련**
| 저장소 | 기능 |
|--------|------|
| did-zkp-sdk-server | 서버용 ZKP SDK (v2.0.0) |
| did-crypto-sdk-server | 암호화 SDK |

### iOS SDK 스펙

- Swift 5.8
- iOS 15.0+
- Xcode 26.0.1
- VCManager: VC 관리
- ZKPManager: 영지식증명

### Open DID vs 정부 신분증

```
Open DID SDK = 기술 프레임워크 (도구)
            ≠ 정부 신분증 데이터 접근권

SDK를 가지고 있다고 정부 데이터에 접근할 수 있는 것이 아님!
→ 이용기관 등록 필요
```

---

## 3. 한국 모바일 신분증 연동

### 생태계 구조

```
행정안전부 (정책)
    ↓
한국조폐공사 (운영)
    ↓
라온시큐어 등 (기술 공급) → Open DID
    ↓
정부 모바일 신분증 앱
    ↓
민간 앱 (네이버, 카카오뱅크, 토스 등)
```

### 연동 방식

| 방식 | 설명 | 기기 수 | API 필요 |
|------|------|---------|---------|
| QR-CPM | 고객 QR → 검증자 스캔 | 2대 | O |
| QR-MPM | 검증자 QR → 고객 스캔 | 1대 | O |
| App2App | 딥링크로 앱 간 통신 | 1대 | O |
| Web2App | 웹 → 앱 호출 | 1대 | O |

### App2App 흐름 (은행 앱 예시)

```
[은행 앱]                    [신분증 앱]
    │                            │
    │ 딥링크 호출                │
    │ mobileid://verify?...     │
    │ ─────────────────────────▶│
    │                            │ 사용자 생체인증
    │                            │
    │ VP 데이터 수신              │
    │ ◀─────────────────────────│
    │ mybank://callback?vp=...  │
    │                            │
    │ VP 검증 (서버 통신)         │
```

### 검증앱 (개인 사용 가능)

| 플랫폼 | 다운로드 |
|--------|----------|
| Android | [Google Play](https://play.google.com/store/apps/details?id=kr.go.verify.mobileid) |
| iOS | [App Store](https://apps.apple.com/kr/app/모바일-신분증-검증앱/id1600615242) |

**기능**
- 성인인증
- 실명확인
- 면허확인
- 위변조 검증

**한계**
- 수동 확인 (사람이 직접 스캔)
- API 연동 불가
- 데이터 추출 불가

### 민간개방 현황 (2025.7월~)

| 앱 | 상태 | iPhone |
|----|------|--------|
| 카카오뱅크 | 서비스 중 | O |
| 토스 | 서비스 중 | O |
| 네이버 | 서비스 중 | X (예정) |
| KB국민은행 | 서비스 중 | X (예정) |
| NH농협은행 | 서비스 중 | X (예정) |

---

## 4. 이용기관 등록 절차

### 경로 1: 한국조폐공사 (정부 채널)

**연락처**
| 항목 | 정보 |
|------|------|
| 웹사이트 | https://dev.mobileid.go.kr |
| 전화 | 042-870-1498~9 |
| 이메일 | mid_apply@komsco.com |
| 콜센터 | 1688-0990 |

**절차**
```
STEP 1: 신청서 작성
        - dev.mobileid.go.kr에서 연계신청서 다운로드
        - 기관 정보, 서비스 목적, 연동 방식, 보안 계획 작성

STEP 2: 공문 접수
        - 한국조폐공사장 앞으로 공문 발송
        - 사업자등록증 등 첨부

STEP 3: 심의
        - 선정위원회 심의
        - 결과: 승인 / 보완요청 / 반려

STEP 4: 승인 및 키 발급
        - DID Document 발급
        - Wallet 파일 발급
        - SP 계정 생성

STEP 5: 연계 개발
        - SDK 다운로드
        - 테스트 환경 연동

STEP 6: 통합 테스트

STEP 7: 서비스 개시
```

### 경로 2: YESKEY/금융결제원 (금융 채널)

**연락처**
| 항목 | 정보 |
|------|------|
| 웹사이트 | https://mobileid.yeskey.or.kr |
| 고객센터 | 1577-5500 (평일 09:00~17:45) |

**절차**
```
1. 서비스 신청
2. API 키 발급 신청
3. 방화벽 등록 신청
4. 통합테스트 결과 등록
5. 서비스 실시 신청
```

### 필요 서류 (예상)

- 연계 서비스 신청서
- 사업자등록증 사본
- 서비스 계획서
- 개인정보처리방침 또는 보안 계획서
- (추가) 정보보호 인증서, 시스템 구성도

### 예상 소요 시간

| 단계 | 기간 |
|------|------|
| 심의 | 2~4주 |
| 개발 | 2~4주 |
| 전체 | 1~3개월 |

### 스타트업/개인

- 공식적으로 명시 안 됨
- 직접 문의 필요

---

## 5. 국가별 mDL 현황

### 한국

| 항목 | 상태 |
|------|------|
| 시스템 | DID 기반 자체 시스템 |
| 표준 | ISO 18013-5 호환 X |
| Apple/Google Wallet | X |
| ISO 18013-5 도입 계획 | 공식 발표 없음 |

### 미국

| 항목 | 상태 |
|------|------|
| 지원 주 | ~21개 주 (CA, AZ, CO 등) |
| Apple Wallet | O |
| Google Wallet | O |
| TSA 체크포인트 | 250+ 지점 |

### 유럽 (EU)

| 항목 | 상태 |
|------|------|
| EUDI Wallet 의무화 | 2026.12월 |
| 현재 운영 국가 | 오스트리아 (유일하게 ISO 18013-5) |
| 디지털 ID 보유 국가 | 9개국 (오스트리아, 벨기에, 프랑스 등) |
| 2026년 준비 상태 | 불확실 |

### 정리

| 지역 | ISO 18013-5 mDL | 지금 테스트 가능 |
|------|----------------|-----------------|
| 미국 | O | O (Apple/Google Wallet) |
| 오스트리아 | O | O (eAusweise 앱) |
| 한국 | X | X |
| EU 대부분 | 2026~2027 예정 | X |

---

## 6. ProofPort 연동 방안

### 방안 비교

| 방안 | 신뢰도 | API 필요 | 현실성 |
|------|--------|---------|--------|
| 이용기관 등록 | ★★★★★ | O | 어려움 (심의) |
| Multipaz 테스트 환경 | ★★★ | X | 쉬움 (테스트용) |
| zkTLS | ★★★★ | X | 유망 |
| Self-Attestation | ★ | X | 의미 없음 |

### 추천 아키텍처

```
ProofPort
├── Open DID SDK     → 한국 모바일 신분증 연동 (이용기관 등록 시)
├── Multipaz SDK     → 글로벌 mDL 연동 (미국/EU)
└── mopro/Noir       → 커스텀 ZK 증명 생성
```

### Open DID + ProofPort 통합 흐름

```
[Open DID SDK]              [ProofPort (mopro)]
      │                            │
      │ 1. VC 저장/관리            │
      │    (신분증 정보)           │
      │ ─────────────────────────▶│ 2. VC 데이터 추출
      │                            │    - 생년월일
      │                            │    - 이름 등
      │                            │
      │                            │ 3. Noir 서킷 입력 생성
      │                            │
      │                            │ 4. ZK Proof 생성
      │                            │
      │                            │ 5. On-chain 검증
```

### 즉시 가능한 액션

**1. Multipaz 테스트**
```bash
git clone https://github.com/openwallet-foundation/multipaz-samples.git
cd multipaz-samples/SwiftWallet
open SwiftWallet.xcodeproj
# issuer.multipaz.org에서 테스트 mDL 발급
```

**2. 이용기관 등록 문의**
```
전화: 042-870-1498~9
이메일: mid_apply@komsco.com

질문:
- 스타트업도 등록 가능한지?
- 테스트 환경만 먼저 사용 가능한지?
- 비용은?
```

**3. Open DID SDK 분석**
```bash
git clone https://github.com/OmniOneID/did-client-sdk-ios.git
# VCManager, ZKPManager API 분석
```

---

## 참고 링크

### Multipaz
- [GitHub](https://github.com/openwallet-foundation/multipaz)
- [Samples](https://github.com/openwallet-foundation/multipaz-samples)
- [Issuer](https://issuer.multipaz.org)
- [Verifier](https://verifier.multipaz.org)

### Open DID
- [GitHub](https://github.com/OmniOneID)
- [iOS SDK](https://github.com/OmniOneID/did-client-sdk-ios)
- [Architecture](https://github.com/OmniOneID/did-doc-architecture)
- [공식 사이트](https://opendid.omnione.net/community/)

### 한국 모바일 신분증
- [공식 사이트](https://www.mobileid.go.kr)
- [개발지원센터](https://dev.mobileid.go.kr)
- [YESKEY 포털](https://mobileid.yeskey.or.kr)
- [한국조폐공사](https://www.komsco.com/kor/contents/162)

### 표준 문서
- [ISO 18013-5](https://www.iso.org/standard/69084.html)
- [W3C DID](https://www.w3.org/TR/did-core/)
- [W3C VC](https://www.w3.org/TR/vc-data-model/)
