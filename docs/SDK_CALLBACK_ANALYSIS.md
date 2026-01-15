# ProofPort SDK 콜백 방식 심층 분석

## 1. 현재 상태

### 1.1 현재 구현: HTTP POST 콜백

```
[dApp] → Deep Link/QR 생성 (callbackUrl 포함)
    ↓
[ProofPort App] → 증명 생성 → 온체인 검증
    ↓
[ProofPort App] → HTTP POST로 결과 전송
    ↓
[dApp 서버] → 결과 수신 → DB 저장
    ↓
[dApp 프론트엔드] → 폴링으로 결과 확인
```

### 1.2 현재 방식의 장단점

| 장점 | 단점 |
|------|------|
| 구현 단순 | dApp에 백엔드 서버 필요 |
| 인프라 비용 없음 (우리 측) | 개발 환경 localhost 문제 |
| 표준적인 웹훅 패턴 | 실시간성 부족 (폴링 필요) |
| 신뢰 불필요 (직접 전송) | 서버리스 dApp 지원 불가 |

### 1.3 현재 지원하는 dApp 유형

- ✅ 백엔드 서버가 있는 전통적인 서비스
- ✅ 중앙화된 웹 서비스
- ❌ 순수 클라이언트 사이드 dApp
- ❌ IPFS/정적 호스팅 dApp
- ❌ 서버리스 Web3 dApp

---

## 2. 대안 분석

### 2.1 WebSocket 중계 서버

```
[dApp 브라우저] ←─WebSocket─→ [ProofPort 중계 서버] ←─WebSocket─→ [ProofPort App]
```

#### 구현 방식
- ProofPort가 WebSocket 중계 서버 운영
- SDK가 자동으로 중계 서버에 연결
- requestId 기반으로 메시지 라우팅

#### 장단점

| 장점 | 단점 |
|------|------|
| 실시간 결과 전송 | 서버 운영 비용 (월 $50-200+) |
| localhost 문제 없음 | 중앙화된 인프라 의존 |
| 콜백 URL 설정 불필요 | 서버 장애 시 전체 서비스 중단 |
| 서버리스 dApp 지원 | 연결 상태 관리 복잡 |
| zkpassport와 동일한 UX | |

#### 비용 추정
- 소규모: $50-100/월 (AWS EC2 t3.small + ALB)
- 중규모: $200-500/월 (다중 AZ, 오토스케일링)
- 대규모: $1,000+/월 (글로벌 분산)

#### zkpassport 참고
```typescript
// zkpassport SDK 사용 예
const { url } = queryBuilder
  .gte("age", 18)
  .done()
  .onResult((result) => {
    // WebSocket으로 실시간 수신
    console.log(result.verified);
  });
```

---

### 2.2 온체인 Registry (사용자 가스비)

```
[ProofPort App] → registerVerification() 호출 → [ProofRegistry Contract]
                                                        ↓
[dApp] ← isVerified() 조회 또는 이벤트 구독 ←──────────────┘
```

#### 구현 방식
```solidity
contract ProofRegistry {
    mapping(bytes32 => VerificationResult) public results;

    function registerVerification(
        bytes32 requestId,
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) external {
        bool verified = verifier.verify(proof, publicInputs);
        results[requestId] = VerificationResult(msg.sender, verified, block.timestamp);
        emit Verified(requestId, msg.sender, verified);
    }
}
```

#### 장단점

| 장점 | 단점 |
|------|------|
| 완전 탈중앙화 | 사용자 가스비 부담 (~$0.5-2) |
| Trustless | 트랜잭션 확정 대기 시간 |
| 영구적인 검증 기록 | 사용자 경험 저하 |
| 서버 불필요 | 지갑 연결 필수 |

#### 가스비 추정 (Sepolia 기준)
- 저장 트랜잭션: ~50,000-80,000 gas
- 예상 비용: $0.5-2 (네트워크 상황에 따라)

---

### 2.3 온체인 Registry (Relayer - 우리가 가스비 부담)

```
[ProofPort App] → 서명된 검증 결과 생성
    ↓
[ProofPort Relayer] → registerVerification() 대신 호출 (가스비 부담)
    ↓
[ProofRegistry Contract] → 결과 저장
    ↓
[dApp] → 조회
```

#### 구현 방식
1. ProofPort 앱이 검증 결과에 서명
2. Relayer 서버가 서명 검증 후 트랜잭션 제출
3. Relayer가 가스비 지불

#### 장단점

| 장점 | 단점 |
|------|------|
| 사용자 가스비 없음 | 우리가 가스비 부담 |
| Trustless (온체인 저장) | Relayer 서버 운영 필요 |
| 좋은 UX | 비용 예측 어려움 |
| 서버리스 dApp 지원 | 악용 방지 로직 필요 |

#### 비용 추정
- 트랜잭션당: $0.5-2
- 월 1,000건: $500-2,000
- 월 10,000건: $5,000-20,000

#### 스폰서십 모델
- 초기: ProofPort가 부담
- 성장기: dApp별 크레딧 제공 (월 100건 무료)
- 수익화: 초과 사용량 과금 또는 프리미엄 플랜

---

### 2.4 서명 기반 Off-chain 검증

```
[ProofPort App] → 온체인 검증 (view call, 가스비 없음)
    ↓
[ProofPort App] → 검증 결과 + ProofPort 서명 생성
    ↓
[dApp] → 서명 검증 (off-chain)
```

#### 구현 방식

**ProofPort 앱 응답:**
```typescript
interface SignedVerificationResult {
  requestId: string;
  circuit: string;
  verified: boolean;
  timestamp: number;
  proof: string;
  publicInputs: string[];
  // ProofPort 서명
  signature: string;
  signer: string; // ProofPort 공개 서명 주소
}
```

**dApp에서 검증:**
```typescript
import { verifyMessage } from 'ethers';

function verifyProofPortSignature(result: SignedVerificationResult): boolean {
  const message = JSON.stringify({
    requestId: result.requestId,
    circuit: result.circuit,
    verified: result.verified,
    timestamp: result.timestamp,
  });

  const recoveredAddress = verifyMessage(message, result.signature);
  return recoveredAddress === PROOFPORT_SIGNER_ADDRESS;
}
```

#### 장단점

| 장점 | 단점 |
|------|------|
| 가스비 없음 | ProofPort 서명 신뢰 필요 |
| 즉시 결과 확인 | 검증 기록이 온체인에 없음 |
| 인프라 비용 최소 | 서명키 관리 책임 |
| 서버리스 dApp 지원 | 서명키 유출 시 위험 |
| 구현 가장 단순 | |

#### 신뢰 모델
- ProofPort가 서명 = "이 증명은 온체인에서 검증되었음"을 보증
- 실제 ZK 증명 검증은 이미 온체인에서 완료됨
- 서명은 "검증 완료 확인서" 역할

---

### 2.5 하이브리드: 서명 + 선택적 온체인

```
기본: 서명 기반 (빠르고 무료)
    ↓
선택: dApp이 원하면 온체인 저장 (dApp이 가스비 부담)
```

#### 구현 방식
1. 기본적으로 서명된 결과 반환
2. dApp이 원하면 자체 컨트랙트에서 검증+저장
3. 또는 ProofPort Registry에 저장 요청 (dApp이 비용 부담)

```typescript
// dApp 선택 1: 서명만 검증 (무료)
const isValid = verifyProofPortSignature(result);

// dApp 선택 2: 자체 컨트랙트에 저장 (dApp이 가스비)
await myContract.storeVerification(result.proof, result.publicInputs);

// dApp 선택 3: ProofPort Registry 사용 (dApp이 가스비)
await proofRegistry.store(result, { value: gasFee });
```

---

## 3. 종합 비교

| 방식 | 서버 필요 | 가스비 | 실시간 | Trustless | 비용 (우리) | 복잡도 |
|------|----------|--------|--------|-----------|-------------|--------|
| HTTP POST (현재) | dApp 서버 | 없음 | ❌ 폴링 | ✅ | $0 | 낮음 |
| WebSocket 중계 | 우리 서버 | 없음 | ✅ | ❌ | $100-500/월 | 중간 |
| 온체인 (유저) | 없음 | 유저 | ⏱️ 블록 | ✅ | $0 | 중간 |
| 온체인 (Relayer) | 우리 서버 | 우리 | ⏱️ 블록 | ✅ | $500-5000/월 | 높음 |
| 서명 기반 | 없음 | 없음 | ✅ | ⚠️ 서명 신뢰 | $0 | 낮음 |
| 하이브리드 | 선택적 | 선택적 | ✅ | 선택적 | $0-500/월 | 중간 |

---

## 4. 권장안

### 4.1 단기 (현재)

**현재 HTTP POST 콜백 유지 + 서명 기반 추가**

이유:
- 기존 구현 활용
- 추가 인프라 비용 없음
- 서버리스 dApp 지원 가능

```typescript
// ProofResponse에 서명 추가
interface ProofResponse {
  // 기존 필드들...

  // 새로 추가
  signature: string;
  signer: string;
}
```

### 4.2 중기 (사용자 증가 시)

**WebSocket 중계 서버 도입**

이유:
- UX 개선 (실시간)
- localhost 문제 완전 해결
- zkpassport와 동등한 경험

### 4.3 장기 (생태계 성숙 시)

**온체인 Registry + Relayer (스폰서십)**

이유:
- 완전 Trustless
- 영구적인 검증 기록
- 스폰서/파트너십으로 비용 충당

---

## 5. 구현 우선순위

### Phase 1: 서명 기반 추가 (1-2일)
- [ ] ProofPort 서명키 생성 및 관리
- [ ] 앱에서 검증 결과 서명 생성
- [ ] SDK에 서명 검증 유틸리티 추가
- [ ] 문서화

### Phase 2: WebSocket 중계 (1-2주)
- [ ] 중계 서버 설계 및 구현
- [ ] SDK에 WebSocket 클라이언트 추가
- [ ] 앱에 WebSocket 연결 추가
- [ ] 인프라 구축 (AWS/GCP)

### Phase 3: 온체인 Registry (2-4주)
- [ ] ProofRegistry 컨트랙트 설계
- [ ] Relayer 서버 구현
- [ ] 스폰서십 모델 설계
- [ ] 멀티체인 배포

---

## 6. 결론

**즉시 적용 가능한 개선:**
1. 현재 HTTP POST 콜백 유지
2. **서명 기반 검증 추가** (서버리스 dApp 지원)

**향후 로드맵:**
1. WebSocket → UX 개선
2. 온체인 Registry → 완전 탈중앙화

서명 기반 방식은 **비용 없이** 서버리스 dApp을 지원할 수 있어서 가장 현실적인 첫 단계입니다.
