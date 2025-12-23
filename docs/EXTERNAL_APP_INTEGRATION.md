# 외부 앱/웹 연동 가이드

ZKProofPort 앱을 외부 dApp(웹/모바일)과 연동하여 ZK 인증 및 검증 서비스를 제공하는 방법을 정리한 문서입니다.

---

## 목차

1. [개요](#개요)
2. [웹 dApp 연동 (QR Code 방식)](#웹-dapp-연동-qr-code-방식)
3. [모바일 앱 연동](#모바일-앱-연동)
4. [실시간 통신 방식](#실시간-통신-방식)
5. [SDK 제공 방식](#sdk-제공-방식)
6. [구현 권장 사항](#구현-권장-사항)
7. [참고 자료](#참고-자료)

---

## 개요

### 연동 시나리오

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   외부 dApp     │         │  ZKProofPort    │         │   Blockchain    │
│  (Web/Mobile)   │ ──────► │     App         │ ──────► │   (Verifier)    │
│                 │ ◄────── │                 │ ◄────── │                 │
│  검증 요청/결과  │         │  ZK 증명 생성   │         │  On-chain 검증  │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

### 지원 가능한 연동 방식

| 방식 | 웹 dApp | 모바일 dApp | 실시간성 | 구현 복잡도 |
|------|---------|-------------|----------|-------------|
| QR Code + WebSocket | O | - | 실시간 | 중 |
| Deep Link / Universal Link | - | O | 즉시 | 하 |
| x-callback-url | - | O | 즉시 | 하 |
| WalletConnect Protocol | O | O | 실시간 | 상 |
| Push Notification + API | O | O | 준실시간 | 중 |
| SDK 임베딩 | O | O | 즉시 | 상 |

---

## 웹 dApp 연동 (QR Code 방식)

웹 브라우저에서 ZKProofPort 앱과 연동하는 가장 일반적인 방법입니다.

### 1. QR Code + WebSocket 방식 (권장)

[WalletConnect](https://docs.walletconnect.network/) 프로토콜과 유사한 방식으로, QR 코드 스캔 후 WebSocket을 통해 실시간 통신합니다.

#### 아키텍처

```
┌──────────────────────────────────────────────────────────────────┐
│                        Relay Server                              │
│                    (WebSocket Bridge)                            │
└──────────────────────────────────────────────────────────────────┘
          ▲                                        ▲
          │ WebSocket                              │ WebSocket
          │                                        │
┌─────────┴─────────┐                    ┌─────────┴─────────┐
│    Web dApp       │                    │   ZKProofPort     │
│                   │                    │      App          │
│  1. 세션 생성     │                    │                   │
│  2. QR 코드 표시  │   ───QR 스캔───►   │  3. 세션 연결     │
│                   │                    │  4. ZK 증명 생성  │
│  6. 결과 수신     │   ◄───결과───      │  5. 결과 전송     │
└───────────────────┘                    └───────────────────┘
```

#### 플로우

1. **세션 생성**: Web dApp이 고유 세션 ID와 암호화 키 생성
2. **QR 코드 표시**: 세션 정보를 담은 URI를 QR 코드로 표시
   ```
   zkproofport://verify?
     sessionId=abc123&
     relay=wss://relay.zkproofport.com&
     key=0x1234...&
     type=coinbase_kyc&
     callback=https://dapp.example.com/callback
   ```
3. **앱에서 스캔**: 사용자가 ZKProofPort 앱으로 QR 코드 스캔
4. **WebSocket 연결**: 앱이 Relay 서버에 연결
5. **ZK 증명 생성**: 앱에서 Coinbase KYC 증명 생성
6. **결과 전송**: 암호화된 증명을 WebSocket으로 전송
7. **Web dApp 수신**: 결과를 복호화하여 처리

#### Web dApp 구현 예시

```typescript
// Web dApp (React)
import { io } from 'socket.io-client';
import QRCode from 'qrcode.react';

const ZKVerificationRequest = () => {
  const [sessionId] = useState(generateSessionId());
  const [result, setResult] = useState(null);

  useEffect(() => {
    // WebSocket 연결
    const socket = io('wss://relay.zkproofport.com');

    socket.emit('join', { sessionId });

    socket.on('proof_result', (data) => {
      // 증명 결과 수신
      const { proof, publicInputs, verified } = data;
      setResult({ proof, publicInputs, verified });
    });

    return () => socket.disconnect();
  }, [sessionId]);

  const qrData = JSON.stringify({
    protocol: 'zkproofport',
    version: '1.0',
    sessionId,
    relay: 'wss://relay.zkproofport.com',
    request: {
      type: 'coinbase_kyc',
      chainId: 11155111, // Sepolia
    }
  });

  return (
    <div>
      <h2>Coinbase KYC 인증</h2>
      <QRCode value={qrData} size={256} />
      <p>ZKProofPort 앱으로 스캔하세요</p>

      {result && (
        <div>
          <p>검증 결과: {result.verified ? '성공' : '실패'}</p>
        </div>
      )}
    </div>
  );
};
```

#### ZKProofPort 앱 구현 예시

```typescript
// ZKProofPort App (React Native)
import { io } from 'socket.io-client';

const handleQRScan = async (qrData: string) => {
  const { sessionId, relay, request } = JSON.parse(qrData);

  // Relay 서버 연결
  const socket = io(relay);
  socket.emit('join', { sessionId });

  // ZK 증명 생성
  const { proof, publicInputs } = await generateCoinbaseKycProof();

  // 결과 전송
  socket.emit('proof_result', {
    sessionId,
    proof,
    publicInputs,
    verified: true,
  });
};
```

### 2. HTTP Callback 방식 (단순)

QR 코드 스캔 후 HTTP POST로 결과를 전송하는 방식입니다.

#### 플로우

```
Web dApp                    ZKProofPort App              Callback Server
   │                              │                            │
   │──── QR 표시 ────►            │                            │
   │     (callback URL 포함)      │                            │
   │                              │                            │
   │                    QR 스캔   │                            │
   │                              │                            │
   │                    증명 생성 │                            │
   │                              │                            │
   │                              │────── POST /callback ─────►│
   │                              │       (proof, inputs)      │
   │                              │                            │
   │◄─────────────────── Polling 또는 WebSocket ───────────────│
```

#### QR 코드 데이터

```json
{
  "protocol": "zkproofport",
  "version": "1.0",
  "request": {
    "type": "coinbase_kyc",
    "callback": "https://dapp.example.com/api/verify-callback",
    "nonce": "random-nonce-12345",
    "chainId": 11155111
  }
}
```

---

## 모바일 앱 연동

### 1. Deep Link / URL Scheme 방식

가장 간단한 앱 간 통신 방법입니다.

#### iOS/Android URL Scheme 등록

**iOS (Info.plist)**
```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>zkproofport</string>
    </array>
  </dict>
</array>
```

**Android (AndroidManifest.xml)**
```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="zkproofport" />
</intent-filter>
```

#### 호출 URL 형식

```
zkproofport://verify?
  type=coinbase_kyc&
  callback=myapp://zkproof-result&
  nonce=abc123&
  chainId=11155111
```

#### 외부 앱에서 호출 (React Native)

```typescript
import { Linking } from 'react-native';

const requestZKVerification = async () => {
  const params = new URLSearchParams({
    type: 'coinbase_kyc',
    callback: 'myapp://zkproof-result',
    nonce: generateNonce(),
    chainId: '11155111',
  });

  const url = `zkproofport://verify?${params.toString()}`;

  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    // ZKProofPort 앱 미설치 → 스토어로 이동
    Alert.alert('앱 설치 필요', 'ZKProofPort 앱을 설치해주세요.');
  }
};
```

#### 결과 수신 (외부 앱)

```typescript
useEffect(() => {
  const handleDeepLink = (event: { url: string }) => {
    const url = new URL(event.url);
    if (url.host === 'zkproof-result') {
      const proof = url.searchParams.get('proof');
      const verified = url.searchParams.get('verified') === 'true';
      // 결과 처리
    }
  };

  Linking.addEventListener('url', handleDeepLink);
  return () => Linking.removeAllListeners('url');
}, []);
```

### 2. x-callback-url 방식 (권장)

[x-callback-url](https://x-callback-url.com/) 스펙을 따르는 표준화된 방식입니다.

#### URL 형식

```
zkproofport://x-callback-url/verify?
  type=coinbase_kyc&
  chainId=11155111&
  x-success=myapp://callback/success&
  x-error=myapp://callback/error&
  x-cancel=myapp://callback/cancel
```

#### 파라미터 설명

| 파라미터 | 설명 |
|----------|------|
| `x-success` | 성공 시 호출할 URL (proof, publicInputs 포함) |
| `x-error` | 에러 발생 시 호출할 URL (errorCode, errorMessage 포함) |
| `x-cancel` | 사용자가 취소 시 호출할 URL |

#### 성공 응답 예시

```
myapp://callback/success?
  proof=0x1234...&
  publicInputs=["0xabc...", "0xdef..."]&
  verified=true&
  txHash=0x789...
```

#### 에러 응답 예시

```
myapp://callback/error?
  errorCode=WALLET_NOT_CONNECTED&
  errorMessage=Please connect your wallet first
```

### 3. Universal Links / App Links 방식

HTTPS URL을 통해 앱을 실행하는 보안 강화 방식입니다. 앱이 설치되지 않은 경우 웹 페이지로 폴백됩니다.

#### 설정

**iOS (apple-app-site-association)**
```json
{
  "applinks": {
    "apps": [],
    "details": [{
      "appID": "TEAMID.com.zkproofport.app",
      "paths": ["/verify/*", "/callback/*"]
    }]
  }
}
```

**Android (assetlinks.json)**
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.zkproofport.app",
    "sha256_cert_fingerprints": ["..."]
  }
}]
```

#### 호출 URL

```
https://zkproofport.com/verify?
  type=coinbase_kyc&
  callback=https://dapp.example.com/callback
```

---

## 실시간 통신 방식

### 1. WebSocket 기반 통신

실시간 양방향 통신이 필요한 경우 사용합니다.

#### 아키텍처

```typescript
// Relay Server (Node.js)
const io = require('socket.io')(server);

io.on('connection', (socket) => {
  socket.on('join', ({ sessionId }) => {
    socket.join(sessionId);
  });

  socket.on('proof_request', ({ sessionId, request }) => {
    // 해당 세션의 앱에 요청 전달
    io.to(sessionId).emit('verification_request', request);
  });

  socket.on('proof_result', ({ sessionId, result }) => {
    // 해당 세션의 Web dApp에 결과 전달
    io.to(sessionId).emit('verification_result', result);
  });
});
```

### 2. Push Notification + API 방식

앱이 백그라운드 상태일 때도 알림을 보낼 수 있습니다.

#### 플로우

```
Web dApp              Backend Server           FCM/APNs          ZKProofPort App
   │                       │                      │                    │
   │── 검증 요청 ──────────►│                      │                    │
   │   (userToken)         │                      │                    │
   │                       │── Push 알림 ────────►│                    │
   │                       │                      │────────────────────►│
   │                       │                      │                    │
   │                       │◄──────────── 증명 결과 POST ──────────────│
   │                       │                      │                    │
   │◄── 결과 Polling/WS ───│                      │                    │
```

#### Push Notification 페이로드

```json
{
  "notification": {
    "title": "KYC 인증 요청",
    "body": "example.com에서 Coinbase KYC 인증을 요청했습니다."
  },
  "data": {
    "type": "verification_request",
    "requestId": "req-12345",
    "dappName": "Example dApp",
    "verifyType": "coinbase_kyc",
    "callbackUrl": "https://api.zkproofport.com/callback/req-12345"
  }
}
```

---

## SDK 제공 방식

외부 앱에 직접 ZK 증명 기능을 임베드하는 방식입니다.

### 1. React Native SDK

```typescript
// @zkproofport/react-native-sdk

import { ZKProofPort } from '@zkproofport/react-native-sdk';

// 초기화
const zkp = new ZKProofPort({
  projectId: 'your-project-id',
  chainId: 11155111,
});

// Coinbase KYC 증명 생성
const result = await zkp.generateProof({
  type: 'coinbase_kyc',
  userAddress: '0x...',
});

// 오프체인 검증
const isValid = await zkp.verifyOffChain(result.proof, result.publicInputs);

// 온체인 검증
const txHash = await zkp.verifyOnChain(result.proof, result.publicInputs);
```

### 2. Web SDK (JavaScript)

```typescript
// @zkproofport/web-sdk

import { ZKProofPort } from '@zkproofport/web-sdk';

const zkp = new ZKProofPort({
  projectId: 'your-project-id',
});

// QR 코드 기반 연동 (모바일 앱 필요)
const { qrCodeUrl, waitForResult } = await zkp.requestVerification({
  type: 'coinbase_kyc',
});

// QR 코드 표시
document.getElementById('qr').src = qrCodeUrl;

// 결과 대기
const result = await waitForResult();
console.log('Verified:', result.verified);
```

### 3. REST API

```bash
# 검증 세션 생성
POST /api/v1/sessions
{
  "type": "coinbase_kyc",
  "callbackUrl": "https://your-dapp.com/callback"
}

# 응답
{
  "sessionId": "sess-12345",
  "qrCodeData": "zkproofport://verify?sessionId=sess-12345&...",
  "expiresAt": "2025-12-24T00:00:00Z"
}

# 결과 조회
GET /api/v1/sessions/sess-12345/result

# 응답
{
  "status": "completed",
  "verified": true,
  "proof": "0x...",
  "publicInputs": ["0x..."],
  "txHash": "0x..."
}
```

---

## 구현 권장 사항

### 단계별 구현 로드맵

| 단계 | 기능 | 우선순위 | 예상 복잡도 |
|------|------|----------|-------------|
| 1 | Deep Link 기본 연동 | 높음 | 낮음 |
| 2 | x-callback-url 지원 | 높음 | 낮음 |
| 3 | QR Code + WebSocket (웹 연동) | 높음 | 중간 |
| 4 | Universal Links / App Links | 중간 | 중간 |
| 5 | Push Notification 연동 | 중간 | 중간 |
| 6 | SDK 패키지 제공 | 낮음 | 높음 |

### 보안 고려사항

1. **세션 암호화**: QR 코드에 포함된 키로 증명 데이터 암호화
2. **Nonce 사용**: 리플레이 공격 방지를 위한 일회성 토큰
3. **만료 시간**: 세션/요청에 TTL 설정
4. **Origin 검증**: 콜백 URL 화이트리스트 관리
5. **HTTPS 강제**: 모든 HTTP 통신은 TLS 필수

### ZKProofPort 앱 수정 필요 사항

```typescript
// src/navigation/linking.ts
export const linking = {
  prefixes: ['zkproofport://', 'https://zkproofport.com'],
  config: {
    screens: {
      Verify: {
        path: 'verify',
        parse: {
          type: (type: string) => type,
          callback: (callback: string) => decodeURIComponent(callback),
          nonce: (nonce: string) => nonce,
        },
      },
      XCallback: {
        path: 'x-callback-url/verify',
        // x-callback-url 파라미터 파싱
      },
    },
  },
};
```

---

## 참고 자료

### 프로토콜 및 스펙
- [WalletConnect Docs](https://docs.walletconnect.network/)
- [x-callback-url Specification](https://x-callback-url.com/specification/)
- [React Navigation Deep Linking](https://reactnavigation.org/docs/deep-linking/)
- [React Native Linking](https://reactnative.dev/docs/linking)
- [Expo Linking](https://docs.expo.dev/linking/into-your-app/)

### ZK 인증 참고 구현
- [Rarimo ZK Passport](https://docs.rarimo.com/zk-passport/guide-proof-of-citizenship/)
- [Iden3 Login Protocol](https://docs.iden3.io/protocol/zklogin/)
- [zkVerify Workflow](https://docs.zkverify.io/overview/getting-started/workflow)

### 모바일 SDK 참고
- [Onfido Android SDK](https://github.com/onfido/onfido-android-sdk)
- [Persona Mobile SDK](https://withpersona.com/blog/mobile-sdk-announcement)
- [EZKL iOS Package](https://blog.ezkl.xyz/post/ios/)

### 실시간 통신
- [Socket.io](https://socket.io/)
- [React Native Push Notifications](https://www.curiosum.com/blog/push-notifications-and-web-sockets-in-react-native)
