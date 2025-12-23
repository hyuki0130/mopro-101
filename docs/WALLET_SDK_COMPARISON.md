# Web3 지갑 SDK 비교: React Native 완벽 가이드

## 목차

1. [개요](#개요)
2. [NPM 다운로드 통계](#npm-다운로드-통계)
3. [React Native 지원 현황](#react-native-지원-현황)
4. [기능 비교](#기능-비교)
5. [Privy 연동 가이드](#privy-연동-가이드)
6. [기타 SDK 소개](#기타-sdk-소개)
7. [SDK별 상세 비교](#sdk별-상세-비교)
8. [결론 및 권장사항](#결론-및-권장사항)

---

## 개요

React Native에서 Web3 지갑 연동을 위한 주요 SDK들을 비교합니다.

| SDK | 개발사 | React Native | 특징 |
|-----|--------|:------------:|------|
| **Privy** | Privy (Stripe 인수) | ✅ | 엔터프라이즈급 지갑 인프라, 소셜 로그인 특화 |
| **Thirdweb** | Thirdweb | ✅ | 종합 Web3 개발 플랫폼, 스마트 컨트랙트 포함 |
| **Reown AppKit** | Reown (구 WalletConnect) | ✅ | WalletConnect 프로토콜 공식 SDK |
| **Web3Auth** | Web3Auth | ✅ | MPC 기반 소셜 로그인, 다양한 체인 지원 |
| **Dynamic** | Dynamic.xyz | ✅ | 2024년 RN 지원 추가, 멀티체인 |
| **Magic** | Magic Labs | ✅ | 이메일/소셜 로그인 특화 |
| **Sequence** | Sequence | ✅ | 게임 특화, AWS Nitro 보안 |
| **Particle** | Particle Network | ✅ | MPC-TSS 기반, 체인 추상화 |
| **Coinbase** | Coinbase | ✅ | CDP Embedded Wallet |
| **RainbowKit** | Rainbow | ❌ | 웹 전용 |
| **ConnectKit** | Family | ❌ | 웹 전용 |

### 회사 배경

- **Privy**: 2021년 설립, 2024년 Stripe에 인수됨. $40M+ 투자 유치. Sequoia, Ribbit Capital, Coinbase 투자
- **Thirdweb**: 2021년 설립, 종합 Web3 개발 플랫폼 제공
- **Reown**: WalletConnect 리브랜딩, 지갑 연결 프로토콜 표준
- **Web3Auth**: Torus Labs 개발, MPC 기반 키 관리
- **Dynamic**: 2024년 React Native 지원 추가, 멀티체인 지갑 인프라
- **Magic**: 2018년 설립, 이메일 기반 지갑 선구자
- **Sequence**: Horizon 개발, Web3 게임 특화
- **Particle**: MPC-TSS 기반 체인 추상화 솔루션

---

## NPM 다운로드 통계

### React 패키지 (웹)

| 패키지 | 주간 다운로드 | 비고 |
|--------|--------------|------|
| `@privy-io/react-auth` | **~90,000** | 가장 높음 |
| `thirdweb` | ~30,000 | 스마트 컨트랙트 기능 포함 |

> 📊 Privy가 약 **3배** 더 많은 다운로드 수를 기록

### React Native 패키지 (모바일)

| 패키지 | 주간 다운로드 | 최근 업데이트 |
|--------|--------------|--------------|
| `@privy-io/expo` | **~19,000** | 15시간 전 |
| `@thirdweb-dev/react-native-adapter` | ~184 | 1개월 전 |

> 📊 React Native에서 Privy가 약 **100배** 더 많은 다운로드

### 전체 React Native SDK 비교

| 패키지 | 주간 다운로드 | 비고 |
|--------|--------------|------|
| `@privy-io/expo` | **~19,000** | 1위 - 압도적 |
| `@0xsequence/waas` | ~1,400 | 게임 특화 |
| `@web3auth/react-native-sdk` | ~1,000 | MPC 기반 |
| `@magic-sdk/react-native-expo` | ~370 | 이메일 특화 |
| `@thirdweb-dev/react-native-adapter` | ~180 | 종합 플랫폼 |
| `@particle-network/rn-auth-core` | ~100 | 체인 추상화 |

### 트렌드 분석

```
Privy:      ████████████████████████████████████████ (19,000)
Sequence:   ███ (1,400)
Web3Auth:   ██ (1,000)
Magic:      █ (370)
Thirdweb:   ▌ (180)
Particle:   ▌ (100)
```

**결론**: 모바일(React Native) 개발에서는 **Privy가 압도적으로 많이 사용**됨

---

## React Native 지원 현황

### ✅ 지원하는 SDK

| SDK | 패키지 | Expo Go | 비고 |
|-----|--------|:-------:|------|
| **Privy** | `@privy-io/expo` | ❌ | 가장 활발한 개발 |
| **Thirdweb** | `thirdweb` + `@thirdweb-dev/react-native-adapter` | ❌ | 의존성 많음 |
| **Reown AppKit** | `@reown/appkit-react-native` | ❌ | WalletConnect 공식 |
| **Web3Auth** | `@web3auth/react-native-sdk` | ❌ | Bare/Expo 지원 |
| **Dynamic** | `@dynamic-labs/react-native-extension` | ❌ | 2024년 추가 (alpha) |
| **Magic** | `@magic-sdk/react-native-expo` | ❌ | v19부터 OTP 방식 |
| **Sequence** | `@0xsequence/waas` | ❌ | 게임 특화 |
| **Particle** | `@particle-network/rn-auth-core` | ❌ | MPC-TSS |
| **Coinbase** | CDP Embedded Wallet | ❌ | EOA + Smart Account |

> ⚠️ **모든 SDK가 Expo Go를 지원하지 않음** - `npx expo prebuild` 필요

### ❌ 지원하지 않는 SDK

| SDK | 이유 |
|-----|------|
| **RainbowKit** | React 웹 전용 라이브러리. [GitHub Discussion #708](https://github.com/rainbow-me/rainbowkit/discussions/708)에서 RN 지원 요청 있으나 미구현 |
| **ConnectKit** | Family에서 만든 React 웹 전용. wagmi/viem 기반 |
| **wagmi** | React 웹 전용 hooks 라이브러리 |

---

## 기능 비교

### 인증 방식

| 기능 | Privy | Thirdweb | Web3Auth | Magic | Dynamic | Reown |
|------|:-----:|:--------:|:--------:|:-----:|:-------:|:-----:|
| 외부 지갑 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| 이메일 | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| SMS | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Google | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Apple | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Twitter/X | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Discord | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| GitHub | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Telegram | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| TikTok | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| LinkedIn | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ |
| Farcaster | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Passkey | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| 게스트 계정 | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

### 지갑 기능

| 기능 | Privy | Thirdweb | Web3Auth | Magic | Sequence | Reown |
|------|:-----:|:--------:|:--------:|:-----:|:--------:|:-----:|
| Embedded Wallet | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Account Abstraction | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| 가스 스폰서링 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| 크로스 플랫폼 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| MPC 키 관리 | ✅ | ❌ | ✅ | ❌ | ✅ | ❌ |
| 스마트 컨트랙트 | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |

### 지원 체인

| SDK | EVM | Solana | 기타 |
|-----|:---:|:------:|------|
| **Privy** | ✅ | ✅ | - |
| **Thirdweb** | ✅ | ❌ | - |
| **Web3Auth** | ✅ | ✅ | Tezos, StarkEx, 등 |
| **Magic** | ✅ | ❌ | Flow, Polygon, Optimism |
| **Dynamic** | ✅ | ✅ | Sui, Cosmos |
| **Sequence** | ✅ | ❌ | - |
| **Particle** | ✅ | ✅ | BTC, Sui, Cosmos |

### 개발 경험

| 항목 | Privy | Thirdweb | Web3Auth | Magic | Reown |
|------|:-----:|:--------:|:--------:|:-----:|:-----:|
| 설정 복잡도 | 중간 | 높음 | 중간 | 낮음 | 낮음 |
| 의존성 수 | 많음 | 매우 많음 | 많음 | 적음 | 적음 |
| 문서 품질 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| 커뮤니티 | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ | ⭐⭐ |

### 보안 & 규정

| 항목 | Privy | Web3Auth | Sequence |
|------|:-----:|:--------:|:--------:|
| SOC 2 Type II | ✅ | - | - |
| Bug Bounty | ✅ | - | - |
| MPC/TEE | ✅ | ✅ (MPC) | ✅ (AWS Nitro) |
| 대형 인수 | Stripe | - | - |

### 가격

| SDK | 무료 티어 | 유료 시작가 |
|-----|----------|------------|
| **Privy** | 500 MAU | $299/월 (2,500 MAU) |
| **Thirdweb** | 무제한 (지갑) | 스마트 컨트랙트 사용량 기반 |
| **Web3Auth** | 1,000 MAU | $49/월 |
| **Magic** | 1,000 MAU | $99/월 |
| **Dynamic** | 문의 | 엔터프라이즈 |
| **Sequence** | 무료 | - |
| **Reown AppKit** | 무료 | - |

---

## Privy 연동 가이드

### 설치

```bash
# 핵심 패키지
npx expo install @privy-io/expo

# 필수 의존성
npx expo install \
  expo-application \
  expo-constants \
  expo-linking \
  expo-secure-store \
  react-native-webview

# 폴리필
npm i --save \
  react-native-get-random-values \
  @ethersproject/shims \
  fast-text-encoding

# UI 컴포넌트 (선택)
npx expo install \
  react-native-svg \
  expo-clipboard \
  react-native-qrcode-styled \
  react-native-safe-area-context \
  viem
```

### 기본 설정

**1. Privy 대시보드에서 App ID 발급**

[Privy Dashboard](https://dashboard.privy.io) → Home → "Retrieve API keys"

**2. 앱 번들 ID 등록**

Dashboard → Clients → Edit → "Allowed app identifiers"에 번들 ID 추가

**3. PrivyProvider 설정**

```tsx
// App.tsx
import 'react-native-get-random-values';
import '@ethersproject/shims';

import { PrivyProvider } from '@privy-io/expo';

export default function App() {
  return (
    <PrivyProvider
      appId="YOUR_PRIVY_APP_ID"
      clientId="YOUR_PRIVY_CLIENT_ID"
    >
      <YourApp />
    </PrivyProvider>
  );
}
```

### 이메일 인증 구현

```tsx
import { useLoginWithEmail } from '@privy-io/expo';

function EmailLogin() {
  const { sendCode, loginWithCode, state } = useLoginWithEmail();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const handleSendCode = async () => {
    await sendCode({ email });
  };

  const handleLogin = async () => {
    await loginWithCode({ email, code });
  };

  return (
    <View>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="이메일 입력"
      />
      <Button title="인증 코드 발송" onPress={handleSendCode} />

      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="인증 코드"
      />
      <Button title="로그인" onPress={handleLogin} />
    </View>
  );
}
```

### 소셜 로그인 구현

```tsx
import { useOAuthFlow } from '@privy-io/expo';

function SocialLogin() {
  const { start } = useOAuthFlow();

  const loginWithGoogle = () => {
    start({ provider: 'google' });
  };

  const loginWithApple = () => {
    start({ provider: 'apple' });
  };

  return (
    <View>
      <Button title="Google로 로그인" onPress={loginWithGoogle} />
      <Button title="Apple로 로그인" onPress={loginWithApple} />
    </View>
  );
}
```

### Embedded Wallet 사용

```tsx
import { useEmbeddedEthereumWallet } from '@privy-io/expo';
import { ethers } from 'ethers';

function WalletActions() {
  const { wallets } = useEmbeddedEthereumWallet();

  const signMessage = async (message: string) => {
    if (!wallets.length) return;

    const provider = await wallets[0].getProvider();
    const ethersProvider = new ethers.providers.Web3Provider(provider);
    const signer = ethersProvider.getSigner();

    const signature = await signer.signMessage(message);
    return signature;
  };

  return (
    <View>
      <Text>지갑 주소: {wallets[0]?.address}</Text>
      <Button
        title="메시지 서명"
        onPress={() => signMessage('Hello')}
      />
    </View>
  );
}
```

### Smart Wallet (Account Abstraction)

**1. Dashboard에서 Smart Wallet 활성화**

Dashboard → Embedded wallets → Smart wallets → Configure

**2. SmartWalletsProvider 추가**

```tsx
import { PrivyProvider } from '@privy-io/expo';
import { SmartWalletsProvider } from '@privy-io/expo/smart-wallets';

export default function App() {
  return (
    <PrivyProvider appId="YOUR_APP_ID">
      <SmartWalletsProvider>
        <YourApp />
      </SmartWalletsProvider>
    </PrivyProvider>
  );
}
```

### Passkey 설정

**iOS - Universal Links 설정 필요**

```
// apple-app-site-association 파일 호스팅 필요
{
  "webcredentials": {
    "apps": ["TEAM_ID.com.yourapp.bundle"]
  }
}
```

**Android - Digital Asset Links 설정 필요**

```json
// /.well-known/assetlinks.json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.yourapp",
    "sha256_cert_fingerprints": ["YOUR_FINGERPRINT"]
  }
}]
```

---

## 기타 SDK 소개

### Web3Auth

MPC(Multi-Party Computation) 기반 키 관리로 소셜 로그인을 통한 지갑 생성을 제공합니다.

**설치:**
```bash
# Expo Managed Workflow
npm install @web3auth/react-native-sdk
npx expo install expo-web-browser expo-secure-store
```

**특징:**
- MPC-TSS로 키를 여러 조각으로 분산 저장
- 30+ 체인 지원 (EVM, Solana, Tezos 등)
- 세션 관리 (최대 30일)
- Custom JWT/OIDC 지원

**문서:** [Web3Auth React Native SDK](https://web3auth.io/docs/sdk/react-native/)

---

### Dynamic

2024년에 React Native 지원을 추가한 멀티체인 지갑 인프라입니다.

**설치:**
```bash
npm i @dynamic-labs/client@alpha \
  @dynamic-labs/react-native-extension@alpha \
  @dynamic-labs/viem-extension@alpha \
  react-native-webview expo-web-browser expo-linking expo-secure-store
```

**기본 설정:**
```typescript
import { createClient } from "@dynamic-labs/client";
import { ReactNativeExtension } from "@dynamic-labs/react-native-extension";
import { ViemExtension } from "@dynamic-labs/viem-extension";

export const dynamicClient = createClient({
  environmentId: "YOUR_ENVIRONMENT_ID",
  appName: "My App",
})
  .extend(ReactNativeExtension())
  .extend(ViemExtension());
```

**특징:**
- EVM + Solana + Sui + Cosmos 지원
- Session Keys로 추가 인증 없이 트랜잭션
- Enterprise 기능 (Third-party JWT 인증)

**문서:** [Dynamic React Native SDK](https://docs.dynamic.xyz/sdks/react-native/embedded-wallets)

---

### Magic (Magic Link)

이메일 기반 지갑의 선구자로, OTP(One-Time Password) 방식으로 간편한 로그인을 제공합니다.

**설치:**
```bash
npm install @magic-sdk/react-native-expo
npm install react-native-webview react-native-safe-area-context @react-native-community/netinfo
```

**기본 설정:**
```typescript
import { Magic } from '@magic-sdk/react-native-expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const magic = new Magic('YOUR_API_KEY');

export default function App() {
  return (
    <SafeAreaProvider>
      <magic.Relayer />
      {/* Your app */}
    </SafeAreaProvider>
  );
}

// 로그인
await magic.auth.loginWithEmailOTP({ email: 'user@example.com' });
```

**특징:**
- v19부터 Magic Link 대신 OTP 방식 사용
- Wallet UI 내장 (`wallet.showUI()`)
- OAuth v1 확장으로 소셜 로그인 지원
- Ethereum, Polygon, Flow, Optimism 지원

**문서:** [Magic React Native SDK](https://magic.link/docs/api/client-side-sdks/react-native)

---

### Sequence

Web3 게임에 특화된 지갑 솔루션으로, AWS Nitro 보안 환경을 사용합니다.

**설치:**
```bash
npm install @0xsequence/waas ethers
```

**특징:**
- AWS Nitro Secure Enclaves 기반 키 관리
- Quantstamp, CoinCover 보안 감사
- Google, Apple, 이메일, Passkey 지원
- 가스 스폰서링 내장
- 게임 특화 기능 (NFT, 인벤토리)

**사용 예:**
```typescript
const signature = await sequenceWaas.signMessage({ message: "Hello" });
const txn = await sequenceWaas.sendTransaction({ transactions: [...] });
```

**문서:** [Sequence Mobile SDK](https://docs.sequence.xyz/sdk/mobile)

---

### Particle Network

MPC-TSS 기반 체인 추상화 솔루션으로, 여러 체인을 통합 관리합니다.

**설치:**
```bash
npm install @particle-network/rn-auth-core @particle-network/rn-base
```

**기본 설정:**
```typescript
import { LoginType, SocialLoginPrompt } from '@particle-network/rn-base';
import * as particleAuthCore from '@particle-network/rn-auth-core';

// Google 로그인
const userInfo = await particleAuthCore.connect(
  LoginType.Google,
  null,
  [],
  SocialLoginPrompt.SelectAccount
);

// 이메일 로그인
const userInfo = await particleAuthCore.connect(
  LoginType.Email,
  null,
  supportAuthTypes,
  SocialLoginPrompt.SelectAccount
);
```

**특징:**
- MPC-TSS로 키 분산 저장
- Particle Connect (외부 지갑 연결)
- Particle Wallet (통합 지갑 UI)
- Chain Abstraction (체인 추상화)
- Android: Gradle 8.9+, Java 17 필요

**문서:** [Particle React Native SDK](https://developers.particle.network/api-reference/wallet/mobile/react)

---

### Coinbase (CDP Embedded Wallet)

Coinbase Developer Platform의 Embedded Wallet로, EOA와 Smart Account를 모두 지원합니다.

**주의:** Coinbase WaaS SDK for React Native는 2024년 4월 아카이브됨

**현재 권장:** CDP Embedded Wallet 사용

**특징:**
- EVM EOA + Smart Account 지원
- Solana Account 지원
- 5분 내 빠른 연동
- Coinbase Wallet Mobile SDK로 외부 지갑 연결 가능

**문서:** [CDP React Native Quickstart](https://docs.cdp.coinbase.com/embedded-wallets/react-native/quickstart)

---

## SDK별 상세 비교

### Privy 장단점

**장점:**
- Stripe 인수로 안정성 보장
- 75M+ 계정, 1,000+ 개발팀 사용
- SOC 2 Type II 인증
- 가장 많은 소셜 로그인 옵션
- React Native 채택률 1위
- Hyperliquid, OpenSea, Farcaster 등 대형 프로젝트 사용

**단점:**
- 유료 전환 빠름 (500 MAU 초과 시)
- 스마트 컨트랙트 기능 없음
- Privy 전용 기능에 종속

### Thirdweb 장단점

**장점:**
- 종합 Web3 플랫폼 (지갑 + 컨트랙트 + RPC)
- 관대한 무료 티어
- EIP-7702 지원 (주소 유지하면서 스마트 계정)
- Privy와 함께 사용 가능

**단점:**
- 의존성 매우 많음
- React Native 채택률 낮음
- 설정 복잡

### Reown AppKit 장단점

**장점:**
- WalletConnect 공식 SDK
- 설정 간단
- 무료

**단점:**
- 외부 지갑 연결만 지원
- In-App Wallet 없음
- 재연결 안정성 문제 (User rejected 에러)

---

## 결론 및 권장사항

### 사용 사례별 권장

| 사용 사례 | 권장 SDK | 이유 |
|----------|---------|------|
| **간단한 지갑 연결** | Reown AppKit | 무료, 간단 |
| **이메일/소셜 로그인** | **Privy** | 채택률 1위, 안정성 |
| **가스리스 트랜잭션** | Thirdweb 또는 Privy | 둘 다 지원 |
| **엔터프라이즈** | **Privy** | SOC 2, Stripe 백업 |
| **스마트 컨트랙트 통합** | Thirdweb | 올인원 솔루션 |

### ProofPortApp 권장사항

현재 상황:
- Reown AppKit 사용 중
- 재연결 시 "User rejected methods" 에러 발생
- Coinbase KYC 증명에 지갑 서명 필요

**권장: Privy로 전환**

이유:
1. **안정성**: Stripe 인수, 대형 프로젝트 검증
2. **채택률**: React Native에서 100배 높은 사용률
3. **UX**: 이메일 로그인으로 외부 앱 전환 불필요
4. **재연결 안정성**: WalletConnect 직접 사용보다 안정적

### 마이그레이션 우선순위

```
1순위: Privy (안정성, 채택률)
2순위: Thirdweb (종합 기능 필요시)
3순위: Reown AppKit 유지 (최소 변경)
```

---

## 참고 자료

### Privy
- [Privy 공식 사이트](https://www.privy.io/)
- [Privy Expo SDK 문서](https://docs.privy.io/guide/expo/)
- [Privy Quickstart](https://docs.privy.io/basics/react-native/quickstart)
- [Privy npm 패키지](https://www.npmjs.com/package/@privy-io/expo)
- [Privy Expo Starter (GitHub)](https://github.com/privy-io/expo-starter)
- [React Native Privy Template](https://github.com/monad-developers/react-native-privy-embedded-wallet-template)

### Thirdweb
- [Thirdweb React Native SDK](https://portal.thirdweb.com/react-native/v5)
- [Thirdweb + Privy 연동](https://solutions.thirdweb.com/products/how-to-use-thirdweb-with-privy)
- [Thirdweb Expo Starter](https://github.com/thirdweb-example/expo-starter)

### Web3Auth
- [Web3Auth React Native SDK](https://web3auth.io/docs/sdk/react-native/)
- [Web3Auth Expo Guide](https://web3auth.io/docs/guides/react-native-expo)
- [Web3Auth GitHub](https://github.com/Web3Auth/web3auth-react-native-sdk)

### Dynamic
- [Dynamic React Native SDK](https://docs.dynamic.xyz/sdks/react-native/embedded-wallets)
- [Dynamic 2024 Year in Review](https://www.dynamic.xyz/blog/dynamic-year-in-review-2024)

### Magic
- [Magic React Native SDK](https://magic.link/docs/api/client-side-sdks/react-native)
- [Magic npm 패키지](https://www.npmjs.com/package/@magic-sdk/react-native-expo)
- [Magic GitHub](https://github.com/magiclabs/magic-js)

### Sequence
- [Sequence Mobile SDK](https://docs.sequence.xyz/sdk/mobile)
- [Sequence Embedded Wallet](https://docs.sequence.xyz/solutions/wallets/embedded-wallet/quickstart/)

### Particle Network
- [Particle React Native SDK](https://developers.particle.network/api-reference/wallet/mobile/react)
- [Particle Auth Guide](https://developers.particle.network/guides/integrations/waas/auth)

### Coinbase
- [CDP Embedded Wallet Quickstart](https://docs.cdp.coinbase.com/embedded-wallets/react-native/quickstart)
- [Coinbase Wallet Mobile SDK](https://www.npmjs.com/package/@coinbase/wallet-mobile-sdk)
- [Coinbase WaaS SDK (Archived)](https://github.com/coinbase/waas-sdk-react-native)

### RainbowKit & ConnectKit (웹 전용)
- [RainbowKit](https://rainbowkit.com/) - React 웹 전용
- [RainbowKit RN 요청 Discussion](https://github.com/rainbow-me/rainbowkit/discussions/708)
- [ConnectKit](https://docs.family.co/connectkit) - React 웹 전용

### 비교 & 분석
- [NPM Trends 비교](https://npmtrends.com/thirdweb-vs-@privy-io/react-auth)
- [Privy Alternatives 2025](https://www.openfort.io/blog/privy-alternatives)
- [WaaS Wallet Comparison](https://blog.web3auth.io/waas-wallet-comparison/)
- [Stripe의 Privy 인수](https://www.ledgerinsights.com/stripe-acquires-crypto-wallet-privy/)
