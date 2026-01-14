# ProofPort SDK

외부 Dapp에서 ProofPort 앱의 ZK Proof 기능을 사용할 수 있게 해주는 JavaScript/TypeScript SDK입니다.

## 기능

- **Age Verifier**: 출생년도를 공개하지 않고 나이 요건 충족 증명
- **Coinbase KYC**: Coinbase 본인인증을 ZK로 증명

## 설치

```bash
npm install @proofport/sdk
# 또는
yarn add @proofport/sdk
```

## 빠른 시작

### 1. SDK 초기화

```typescript
import { ProofPortSDK } from '@proofport/sdk';

const sdk = new ProofPortSDK({
  defaultCallbackUrl: 'https://your-app.com/verify'
});
```

### 2. Age Verification 요청 생성

```typescript
// 요청 생성
const request = sdk.createAgeVerificationRequest({
  birthYear: 2000,
  currentYear: 2026,
  minAge: 18
}, {
  dappName: 'My Dapp',
  message: '서비스 이용을 위해 성인 인증이 필요합니다.'
});

// QR 코드 생성 (모바일 웹에서 앱 연동)
const qrDataUrl = await sdk.generateQRCode(request);
document.getElementById('qr').src = qrDataUrl;

// 또는 Deep Link로 직접 앱 열기
sdk.openProofRequest(request);
```

### 3. Coinbase KYC 요청 생성

```typescript
const request = sdk.createCoinbaseKycRequest({
  userAddress: '0x1234567890abcdef...'
}, {
  dappName: 'My Dapp',
  message: 'Coinbase 본인인증을 증명해주세요.'
});

const qrDataUrl = await sdk.generateQRCode(request);
```

### 4. Proof 응답 처리

앱에서 proof를 생성하면 `callbackUrl`로 리다이렉트됩니다:

```
https://your-app.com/verify?
  requestId=req-xxx&
  status=completed&
  proof=0x...&
  publicInputs=0x...,0x...&
  numPublicInputs=2
```

```typescript
// URL에서 응답 파싱
const response = sdk.parseResponse(window.location.href);

if (response?.status === 'completed') {
  console.log('Proof:', response.proof);
  console.log('Public Inputs:', response.publicInputs);

  // On-chain 검증
  const result = await sdk.verifyOnChain(
    response.circuit,
    response.proof,
    response.publicInputs
  );

  console.log('Valid:', result.valid);
}
```

## Deep Link 프로토콜

### 요청 URL 형식

```
zkproofport://proof-request?data={base64url encoded request}
```

### Request 구조

```typescript
interface ProofRequest {
  requestId: string;        // 고유 요청 ID
  circuit: 'age_verifier' | 'zk_coinbase_attestor';
  inputs: CircuitInputs;    // 서킷별 입력값
  callbackUrl: string;      // 응답 받을 URL
  message?: string;         // 사용자에게 표시할 메시지
  dappName?: string;        // Dapp 이름
  dappIcon?: string;        // Dapp 아이콘 URL
  createdAt: number;        // 요청 생성 시간
  expiresAt?: number;       // 요청 만료 시간
}
```

### Response 구조

```typescript
interface ProofResponse {
  requestId: string;
  circuit: CircuitType;
  status: 'completed' | 'error' | 'cancelled';
  proof?: string;           // hex encoded proof
  publicInputs?: string[];  // hex encoded public inputs
  numPublicInputs?: number;
  error?: string;
  timestamp?: number;
}
```

## On-chain 검증

### Sepolia Testnet

| Circuit | Verifier Contract |
|---------|-------------------|
| Age Verifier | `0x33316f0A1F6638AbC8D5a6aCce5a1cF13427A0c9` |
| Coinbase KYC | `0x121632902482B658e0F2D055126dBe977deb9FC1` |

```typescript
import { ethers } from 'ethers';

// SDK로 검증
const result = await sdk.verifyOnChain('age_verifier', proof, publicInputs);

// 또는 직접 컨트랙트 호출
const provider = new ethers.providers.Web3Provider(window.ethereum);
const contract = new ethers.Contract(
  '0x33316f0A1F6638AbC8D5a6aCce5a1cF13427A0c9',
  ['function verify(bytes calldata _proof, bytes32[] calldata _publicInputs) external view returns (bool)'],
  provider
);

const isValid = await contract.verify(proof, publicInputs);
```

## QR 코드 옵션

```typescript
const qrDataUrl = await sdk.generateQRCode(request, {
  width: 300,
  errorCorrectionLevel: 'M',  // L, M, Q, H
  margin: 2,
  darkColor: '#000000',
  lightColor: '#ffffff'
});

// SVG로 생성
const qrSvg = await sdk.generateQRCodeSVG(request);

// Canvas에 렌더링
await sdk.renderQRCodeToCanvas(canvasElement, request);
```

## API Reference

### ProofPortSDK

```typescript
class ProofPortSDK {
  constructor(config?: ProofPortConfig);

  // Request 생성
  createAgeVerificationRequest(inputs, options?): ProofRequest;
  createCoinbaseKycRequest(inputs, options?): ProofRequest;
  createProofRequest(circuit, inputs, options?): ProofRequest;

  // Deep Link
  getDeepLinkUrl(request): string;
  openProofRequest(request): void;

  // QR 코드
  generateQRCode(request, options?): Promise<string>;
  generateQRCodeSVG(request, options?): Promise<string>;
  renderQRCodeToCanvas(canvas, request, options?): Promise<void>;

  // 응답 처리
  parseResponse(url): ProofResponse | null;
  isProofPortResponse(url): boolean;

  // 검증
  verifyOnChain(circuit, proof, publicInputs, provider?): Promise<{valid, error?}>;
  verifyResponseOnChain(response, provider?): Promise<{valid, error?}>;

  // 유틸리티
  getVerifierAddress(circuit): string;
  getVerifierChainId(circuit): number;
  getCircuitMetadata(circuit): CircuitMetadata;
  getSupportedCircuits(): CircuitType[];
  validateRequest(request): {valid, error?};
}
```

## 데모

로컬에서 데모 실행:

```bash
cd sdk/demo
npx serve -l 3000
```

브라우저에서 `http://localhost:3000` 접속

## 라이선스

MIT
