# Thirdweb React Native 연동 가이드

## 목차

1. [개요](#개요)
2. [Reown AppKit vs Thirdweb 비교](#reown-appkit-vs-thirdweb-비교)
3. [설치 방법](#설치-방법)
4. [기본 설정](#기본-설정)
5. [지갑 연결 구현](#지갑-연결-구현)
6. [In-App Wallet (이메일/소셜 로그인)](#in-app-wallet-이메일소셜-로그인)
7. [Account Abstraction (가스리스 트랜잭션)](#account-abstraction-가스리스-트랜잭션)
8. [ProofPortApp 적용 방안](#proofportapp-적용-방안)
9. [참고 자료](#참고-자료)

---

## 개요

[Thirdweb](https://thirdweb.com)은 Web3 개발을 위한 종합 SDK로, React Native에서 다양한 지갑 연결 방식을 제공합니다.

### 주요 특징

- **500+ 외부 지갑 지원**: MetaMask, Coinbase, Rainbow, Trust 등
- **In-App Wallet**: 이메일, 전화번호, 소셜 로그인으로 지갑 생성
- **Account Abstraction**: ERC-4337/EIP-7702 기반 가스리스 트랜잭션
- **SIWE (Sign in with Ethereum)**: 이더리움 서명 기반 인증
- **크로스 플랫폼**: 웹과 모바일에서 동일한 지갑 주소 사용

---

## Reown AppKit vs Thirdweb 비교

| 기능 | Reown AppKit | Thirdweb |
|------|--------------|----------|
| 외부 지갑 연결 | WalletConnect 프로토콜 | WalletConnect + 자체 연결 |
| In-App Wallet | X | O (이메일, 소셜, 패스키) |
| Account Abstraction | X | O (EIP-4337, EIP-7702) |
| 가스 스폰서링 | X | O |
| 설정 복잡도 | 중간 | 높음 (의존성 많음) |
| Expo Go 지원 | X | X |
| 재연결 안정성 | 불안정 (User rejected 에러) | 더 안정적 |

### 결론

- **단순 지갑 연결만 필요**: Reown AppKit (현재 사용 중)
- **이메일/소셜 로그인, 가스리스 필요**: Thirdweb 권장

---

## 설치 방법

### 자동 설정 (권장)

```bash
npx thirdweb create app --react-native
```

또는 Expo 스타터 템플릿 클론:

```bash
git clone https://github.com/thirdweb-example/expo-starter
cd expo-starter
yarn install
```

### 수동 설치

**1. 핵심 패키지 설치**

```bash
npx expo install thirdweb @thirdweb-dev/react-native-adapter
```

**2. 피어 의존성 설치**

```bash
npx expo install \
  react-native-get-random-values \
  @react-native-community/netinfo \
  expo-application \
  @react-native-async-storage/async-storage \
  expo-web-browser \
  expo-linking \
  react-native-aes-gcm-crypto \
  react-native-quick-crypto \
  amazon-cognito-identity-js \
  @coinbase/wallet-mobile-sdk \
  react-native-mmkv \
  react-native-svg \
  @walletconnect/react-native-compat \
  react-native-passkey
```

---

## 기본 설정

### 1. Metro 설정 (metro.config.js)

```javascript
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = [
  "react-native",
  "browser",
  "require",
];

module.exports = config;
```

### 2. 폴리필 설정 (index.js)

```javascript
// 반드시 최상단에 import
import "@thirdweb-dev/react-native-adapter";
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
```

### 3. Client 생성 (src/config/thirdwebClient.ts)

```typescript
import { createThirdwebClient } from "thirdweb";

// thirdweb 대시보드에서 clientId 발급: https://thirdweb.com/dashboard
export const client = createThirdwebClient({
  clientId: "YOUR_CLIENT_ID",
});
```

### 4. 앱 빌드 (Expo Go 사용 불가)

```bash
# Prebuild 실행 (최초 1회)
npx expo prebuild

# iOS 실행
npx expo run:ios

# Android 실행
npx expo run:android
```

---

## 지갑 연결 구현

### 기본 ConnectButton

```tsx
import { ThirdwebProvider } from "thirdweb/react";
import { ConnectButton } from "thirdweb/react";
import { client } from "./config/thirdwebClient";

function App() {
  return (
    <ThirdwebProvider>
      <ConnectButton client={client} />
    </ThirdwebProvider>
  );
}
```

### 특정 지갑만 표시

```tsx
import { createWallet } from "thirdweb/wallets";

<ConnectButton
  client={client}
  wallets={[
    createWallet("io.metamask"),
    createWallet("com.coinbase.wallet"),
    createWallet("me.rainbow"),
  ]}
/>
```

### 특정 체인 설정

```tsx
import { defineChain } from "thirdweb";
import { base, ethereum } from "thirdweb/chains";

<ConnectButton
  client={client}
  chain={base}  // 기본 체인
  chains={[ethereum, base]}  // 지원 체인 목록
/>
```

### 연결 상태 확인 (Hook 사용)

```tsx
import { useActiveAccount, useActiveWallet } from "thirdweb/react";

function WalletInfo() {
  const account = useActiveAccount();
  const wallet = useActiveWallet();

  if (!account) {
    return <Text>지갑이 연결되지 않았습니다</Text>;
  }

  return (
    <View>
      <Text>주소: {account.address}</Text>
      <Text>지갑: {wallet?.id}</Text>
    </View>
  );
}
```

---

## In-App Wallet (이메일/소셜 로그인)

In-App Wallet은 외부 지갑 앱 없이 앱 내에서 지갑을 생성합니다.

### 기본 설정

```tsx
import { inAppWallet } from "thirdweb/wallets";

<ConnectButton
  client={client}
  wallets={[
    inAppWallet(),  // 기본: 이메일, Google, Apple, Facebook, 패스키
  ]}
/>
```

### 특정 인증 방식만 허용

```tsx
<ConnectButton
  client={client}
  wallets={[
    inAppWallet({
      auth: {
        options: ["email", "google", "apple"],
      },
    }),
  ]}
/>
```

### 지원 인증 방식

| 방식 | 설명 |
|------|------|
| `email` | 이메일 인증 코드 |
| `phone` | SMS 인증 코드 |
| `google` | Google OAuth |
| `apple` | Apple ID |
| `facebook` | Facebook OAuth |
| `discord` | Discord OAuth |
| `github` | GitHub OAuth |
| `telegram` | Telegram |
| `passkey` | 생체인증/PIN |
| `guest` | 게스트 계정 (나중에 업그레이드 가능) |

### 프로그래매틱 이메일 인증

```tsx
import { inAppWallet, preAuthenticate } from "thirdweb/wallets";

const wallet = inAppWallet();

// 1. 인증 코드 발송
await preAuthenticate({
  client,
  strategy: "email",
  email: "user@example.com",
});

// 2. 인증 코드로 연결
const account = await wallet.connect({
  client,
  strategy: "email",
  email: "user@example.com",
  verificationCode: "123456",
});
```

---

## Account Abstraction (가스리스 트랜잭션)

사용자가 가스비 없이 트랜잭션을 실행할 수 있게 합니다.

### EIP-7702 모드 (권장)

기존 지갑 주소를 유지하면서 스마트 계정으로 업그레이드:

```tsx
import { inAppWallet } from "thirdweb/wallets";

const wallet = inAppWallet({
  executionMode: {
    mode: "EIP7702",
    sponsorGas: true,  // 가스 스폰서링 활성화
  },
});

<ConnectButton
  client={client}
  wallets={[wallet]}
/>
```

### EIP-4337 모드

스마트 컨트랙트 지갑 생성 (새로운 주소):

```tsx
import { inAppWallet } from "thirdweb/wallets";
import { base } from "thirdweb/chains";

const wallet = inAppWallet({
  executionMode: {
    mode: "EIP4337",
    smartAccount: {
      chain: base,
      sponsorGas: true,
    },
  },
});
```

### ConnectButton에서 직접 설정

```tsx
<ConnectButton
  client={client}
  accountAbstraction={{
    chain: base,
    sponsorGas: true,
  }}
/>
```

---

## ProofPortApp 적용 방안

### 현재 상태

- Reown AppKit 사용 중
- MetaMask 등 외부 지갑 연결만 지원
- 재연결 시 "User rejected methods" 에러 발생

### Thirdweb 전환 시 장점

1. **In-App Wallet**: 이메일 로그인으로 지갑 생성 → 외부 앱 전환 불필요
2. **안정적인 세션 관리**: 재연결 문제 해결
3. **가스리스 트랜잭션**: Coinbase KYC 증명 생성 시 가스비 없이 서명 가능

### 전환 작업 순서

1. **의존성 교체**
   ```bash
   # 기존 패키지 제거
   npm uninstall @reown/appkit-react-native @reown/appkit-ethers-react-native

   # thirdweb 설치
   npx expo install thirdweb @thirdweb-dev/react-native-adapter
   # + 피어 의존성들
   ```

2. **설정 파일 수정**
   - `metro.config.js` 업데이트
   - `index.js`에 폴리필 추가
   - thirdweb client 생성

3. **훅 교체**
   - `useWalletConnect` → thirdweb hooks로 교체
   - `useActiveAccount`, `useActiveWallet` 사용

4. **UI 컴포넌트 교체**
   - 커스텀 버튼 → `ConnectButton` 또는 `ConnectEmbed`

### 마이그레이션 예시

**기존 (Reown AppKit):**

```tsx
import { useWalletConnect } from '../hooks';

function WalletScreen() {
  const { connect, disconnect, isConnected, account } = useWalletConnect();

  return (
    <TouchableOpacity onPress={connect}>
      <Text>{isConnected ? account : 'Connect'}</Text>
    </TouchableOpacity>
  );
}
```

**변경 후 (Thirdweb):**

```tsx
import { ConnectButton } from "thirdweb/react";
import { useActiveAccount } from "thirdweb/react";
import { client } from "../config/thirdwebClient";

function WalletScreen() {
  const account = useActiveAccount();

  return (
    <View>
      <ConnectButton client={client} />
      {account && <Text>Connected: {account.address}</Text>}
    </View>
  );
}
```

---

## 참고 자료

### 공식 문서

- [Thirdweb React Native SDK](https://portal.thirdweb.com/react-native/v5)
- [ConnectButton 문서](https://portal.thirdweb.com/react-native/v5/ConnectButton)
- [In-App Wallet 문서](https://portal.thirdweb.com/react/v5/inAppWallet)

### 가이드 & 튜토리얼

- [Getting Started with React Native and thirdweb](https://blog.thirdweb.com/guides/getting-started-with-react-native-and-thirdweb/)
- [Build Web3 Mobile Apps with React Native](https://blog.thirdweb.com/guides/build-web3-mobile-apps-react-native-thirdweb-guide/)

### 템플릿

- [Expo Starter Template](https://github.com/thirdweb-example/expo-starter)
- [thirdweb Templates](https://thirdweb.com/templates/expo-starter)

### 기타

- [WalletConnect 지원 공지](https://portal.thirdweb.com/changelog/walletconnect-and-coinbase-wallet-support-in-react-native)
- [Social Login 옵션](https://blog.thirdweb.com/changelog/more-social-options-reactnative-and-react/)

---

## 주의사항

1. **Expo Go 사용 불가**: 반드시 `npx expo prebuild` 후 네이티브 빌드 필요
2. **Xcode 16**: OpenSSL 버전을 "3.3.2000"으로 업데이트 필요
3. **clientId 필수**: [thirdweb 대시보드](https://thirdweb.com/dashboard)에서 발급
4. **패스키 도메인**: React Native에서 패스키 사용 시 Universal Links 설정 필요
