# Privy Expo SDK 완벽 가이드

## 목차

1. [개요](#개요)
2. [WebSocket 사용 여부](#websocket-사용-여부)
3. [설치 및 의존성](#설치-및-의존성)
4. [프로젝트 설정](#프로젝트-설정)
5. [인증 방식별 구현](#인증-방식별-구현)
6. [지갑 기능](#지갑-기능)
7. [외부 지갑 연결 (WalletConnect)](#외부-지갑-연결-walletconnect)
8. [ProofPortApp 마이그레이션 가이드](#proofportapp-마이그레이션-가이드)
9. [트러블슈팅](#트러블슈팅)
10. [참고 자료](#참고-자료)

---

## 개요

[Privy](https://www.privy.io)는 Stripe에 인수된 엔터프라이즈급 Web3 인증 및 지갑 인프라입니다.

### 주요 특징

- **Embedded Wallet**: 앱 내에서 지갑 생성 (외부 앱 전환 불필요)
- **다양한 인증**: 이메일, SMS, 소셜 로그인, Passkey
- **외부 지갑 연결**: WalletConnect를 통한 MetaMask 등 연결
- **Account Abstraction**: ERC-4337 기반 가스리스 트랜잭션
- **크로스 플랫폼**: 웹과 모바일에서 동일한 지갑 주소

### React Native 채택률

| 패키지 | 주간 다운로드 |
|--------|-------------|
| `@privy-io/expo` | ~19,000 |
| 기타 React Native 지갑 SDK | ~100~1,400 |

> Privy가 React Native 지갑 SDK 중 **압도적 1위**

---

## WebSocket 사용 여부

### Privy 자체

**Privy SDK는 WebSocket을 직접 사용하지 않습니다.**

Privy는 다음 방식으로 통신합니다:
- **REST API**: 인증, 지갑 생성, 사용자 관리
- **WebView**: OAuth 소셜 로그인 플로우
- **expo-web-browser**: 외부 인증 플로우

### 외부 지갑 연결 시

외부 지갑(MetaMask, Rainbow 등)을 WalletConnect로 연결할 경우:
- **WalletConnect는 WebSocket 사용** (relay.walletconnect.com)
- Privy 내부에서 WalletConnect를 통합하여 처리
- Reown AppKit처럼 직접 WebSocket 관리 불필요

### 비교

| 항목 | Privy | Reown AppKit |
|------|-------|--------------|
| 기본 통신 | REST API | WebSocket (WalletConnect relay) |
| 외부 지갑 연결 | WalletConnect (내부 처리) | WalletConnect (직접 처리) |
| iOS WebSocket 이슈 | 해당 없음 (Embedded Wallet 사용 시) | 있음 |
| 재연결 안정성 | 높음 | 낮음 ("User rejected" 에러) |

### 결론

**Privy의 Embedded Wallet을 사용하면 WebSocket 관련 문제를 완전히 회피할 수 있습니다.**

---

## 설치 및 의존성

### Step 1: 핵심 패키지

```bash
npx expo install @privy-io/expo @privy-io/expo-native-extensions
```

### Step 2: Expo 의존성

```bash
npx expo install \
  expo-application \
  expo-constants \
  expo-web-browser \
  expo-linking \
  expo-secure-store \
  expo-crypto \
  react-native-webview
```

### Step 3: 폴리필

```bash
npm install --save \
  fast-text-encoding \
  react-native-get-random-values \
  @ethersproject/shims
```

### Step 4: UI 컴포넌트 (선택)

`@privy-io/expo/ui`를 사용하는 경우:

```bash
npx expo install \
  react-native-svg \
  expo-clipboard \
  react-native-qrcode-styled \
  react-native-safe-area-context \
  viem
```

### 전체 의존성 목록

```json
{
  "dependencies": {
    "@privy-io/expo": "^0.x.x",
    "@privy-io/expo-native-extensions": "^0.x.x",
    "@ethersproject/shims": "^5.x.x",
    "expo-application": "~6.x.x",
    "expo-constants": "~17.x.x",
    "expo-crypto": "~14.x.x",
    "expo-linking": "~7.x.x",
    "expo-secure-store": "~14.x.x",
    "expo-web-browser": "~14.x.x",
    "fast-text-encoding": "^1.x.x",
    "react-native-get-random-values": "~1.x.x",
    "react-native-webview": "13.x.x"
  }
}
```

---

## 프로젝트 설정

### 1. Privy 대시보드 설정

1. [Privy Dashboard](https://dashboard.privy.io) 접속
2. 새 앱 생성 또는 기존 앱 선택
3. **Home → Retrieve API keys**에서 App ID와 Client ID 복사

### 2. 앱 식별자 등록

Dashboard → App Settings → Clients:

```
Allowed app identifiers:
- com.yourcompany.yourapp (iOS Bundle ID)
- com.yourcompany.yourapp (Android Package Name)
- host.exp.Exponent (Expo Go 개발용 - 선택)
```

### 3. URL Scheme 등록 (소셜 로그인용)

Dashboard → App Settings → Clients → Allowed URL schemes:

```
myapp://
```

### 4. app.json 설정

```json
{
  "expo": {
    "name": "MyApp",
    "slug": "myapp",
    "scheme": "myapp",
    "ios": {
      "bundleIdentifier": "com.yourcompany.myapp",
      "deploymentTarget": "17.5"
    },
    "android": {
      "package": "com.yourcompany.myapp"
    },
    "extra": {
      "privyAppId": "YOUR_PRIVY_APP_ID",
      "privyClientId": "YOUR_PRIVY_CLIENT_ID"
    }
  }
}
```

### 5. Metro 설정 (React Native 0.79+ / Expo 53+)

```javascript
// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// 패키지 exports 호환성 문제 해결
config.resolver.unstable_enablePackageExports = true;
config.resolver.unstable_conditionNames = [
  "react-native",
  "browser",
  "require",
];

// 특정 패키지 exports 비활성화
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
```

### 6. 폴리필 import (index.js)

```javascript
// 반드시 최상단에 import!
import 'fast-text-encoding';
import 'react-native-get-random-values';
import '@ethersproject/shims';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
```

**expo-router 사용 시** (`app/_layout.tsx` 이전에 import):

```javascript
// entrypoint.js
import 'fast-text-encoding';
import 'react-native-get-random-values';
import '@ethersproject/shims';

import 'expo-router/entry';
```

### 7. PrivyProvider 설정

```tsx
// App.tsx
import { PrivyProvider } from '@privy-io/expo';
import Constants from 'expo-constants';

const privyAppId = Constants.expoConfig?.extra?.privyAppId;
const privyClientId = Constants.expoConfig?.extra?.privyClientId;

export default function App() {
  return (
    <PrivyProvider
      appId={privyAppId}
      clientId={privyClientId}
      config={{
        // 로그인 방식 설정 (선택)
        loginMethods: ['email', 'google', 'apple'],
        // Embedded Wallet 자동 생성 (선택)
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <YourApp />
    </PrivyProvider>
  );
}
```

### 8. Prebuild 실행

```bash
# Expo Go 사용 불가 - 반드시 prebuild 필요
npx expo prebuild

# iOS 실행
npx expo run:ios

# Android 실행
npx expo run:android
```

---

## 인증 방식별 구현

### SDK 초기화 확인

```tsx
import { usePrivy } from '@privy-io/expo';

function App() {
  const { isReady, isAuthenticated, user } = usePrivy();

  if (!isReady) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <MainScreen user={user} />;
  }

  return <LoginScreen />;
}
```

### 이메일 인증

```tsx
import { useLoginWithEmail } from '@privy-io/expo';
import { useState } from 'react';

function EmailLogin() {
  const { sendCode, loginWithCode, state } = useLoginWithEmail();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const handleSendCode = async () => {
    try {
      await sendCode({ email });
      // state.status가 'awaiting-code-input'으로 변경됨
    } catch (error) {
      console.error('Failed to send code:', error);
    }
  };

  const handleVerifyCode = async () => {
    try {
      await loginWithCode({ email, code });
      // 로그인 성공!
    } catch (error) {
      console.error('Failed to verify code:', error);
    }
  };

  return (
    <View>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="이메일 주소"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <Button
        title="인증 코드 발송"
        onPress={handleSendCode}
        disabled={state.status === 'sending-code'}
      />

      {state.status === 'awaiting-code-input' && (
        <>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="6자리 인증 코드"
            keyboardType="number-pad"
            maxLength={6}
          />
          <Button
            title="로그인"
            onPress={handleVerifyCode}
            disabled={state.status === 'submitting-code'}
          />
        </>
      )}
    </View>
  );
}
```

### SMS 인증

```tsx
import { useLoginWithSMS } from '@privy-io/expo';

function SMSLogin() {
  const { sendCode, loginWithCode, state } = useLoginWithSMS();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  const handleSendCode = async () => {
    await sendCode({ phone }); // 예: '+821012345678'
  };

  const handleVerifyCode = async () => {
    await loginWithCode({ phone, code });
  };

  // 이메일과 동일한 UI 패턴
}
```

### OAuth 소셜 로그인

```tsx
import { useLoginWithOAuth } from '@privy-io/expo';

function SocialLogin() {
  const { login, state } = useLoginWithOAuth();

  const loginWithGoogle = async () => {
    try {
      await login({ provider: 'google' });
    } catch (error) {
      console.error('Google login failed:', error);
    }
  };

  const loginWithApple = async () => {
    try {
      await login({ provider: 'apple' });
    } catch (error) {
      console.error('Apple login failed:', error);
    }
  };

  return (
    <View>
      <Button
        title="Google로 로그인"
        onPress={loginWithGoogle}
        disabled={state.status !== 'idle'}
      />
      <Button
        title="Apple로 로그인"
        onPress={loginWithApple}
        disabled={state.status !== 'idle'}
      />
    </View>
  );
}
```

**지원 OAuth Provider:**
- `google`
- `apple`
- `twitter`
- `discord`
- `github`
- `linkedin`
- `tiktok`
- `spotify`
- `telegram`
- `farcaster`

### Passkey 인증

**사전 요구사항:**
- iOS: Associated Domains 설정 필요
- Android: Digital Asset Links 설정 필요

**app.json 설정:**

```json
{
  "expo": {
    "ios": {
      "associatedDomains": ["webcredentials:yourdomain.com"],
      "deploymentTarget": "17.5"
    },
    "extra": {
      "passkeyAssociatedDomain": "https://yourdomain.com"
    }
  }
}
```

**iOS - apple-app-site-association 호스팅:**

```json
// https://yourdomain.com/.well-known/apple-app-site-association
{
  "webcredentials": {
    "apps": ["TEAM_ID.com.yourcompany.myapp"]
  }
}
```

**Android - Digital Asset Links:**

```json
// https://yourdomain.com/.well-known/assetlinks.json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.yourcompany.myapp",
    "sha256_cert_fingerprints": ["YOUR_SHA256_FINGERPRINT"]
  }
}]
```

**Passkey 로그인 구현:**

```tsx
import { useLoginWithPasskey, useSignupWithPasskey } from '@privy-io/expo/passkey';
import Constants from 'expo-constants';

function PasskeyAuth() {
  const { loginWithPasskey } = useLoginWithPasskey();
  const { signupWithPasskey } = useSignupWithPasskey();

  const relyingParty = Constants.expoConfig?.extra?.passkeyAssociatedDomain;

  const handleLogin = async () => {
    await loginWithPasskey({ relyingParty });
  };

  const handleSignup = async () => {
    await signupWithPasskey({ relyingParty });
  };

  return (
    <View>
      <Button title="Passkey로 로그인" onPress={handleLogin} />
      <Button title="새 Passkey 등록" onPress={handleSignup} />
    </View>
  );
}
```

### 로그아웃

```tsx
import { usePrivy } from '@privy-io/expo';

function LogoutButton() {
  const { logout } = usePrivy();

  const handleLogout = async () => {
    await logout();
  };

  return <Button title="로그아웃" onPress={handleLogout} />;
}
```

---

## 지갑 기능

### Embedded Wallet 사용

```tsx
import { useEmbeddedWallet, needsRecovery } from '@privy-io/expo';
import { usePrivy } from '@privy-io/expo';

function WalletManager() {
  const { user } = usePrivy();
  const wallet = useEmbeddedWallet();

  // 지갑 상태 확인
  if (wallet.status === 'not-created') {
    return (
      <Button
        title="지갑 생성"
        onPress={() => wallet.create()}
      />
    );
  }

  if (needsRecovery(wallet)) {
    return (
      <Button
        title="지갑 복구"
        onPress={() => wallet.recover()}
      />
    );
  }

  if (wallet.status === 'connected') {
    return (
      <View>
        <Text>주소: {wallet.account.address}</Text>
      </View>
    );
  }

  return <Text>Loading wallet...</Text>;
}
```

### 메시지 서명

```tsx
import { useEmbeddedWallet } from '@privy-io/expo';
import { ethers } from 'ethers';

function SignMessage() {
  const wallet = useEmbeddedWallet();

  const signMessage = async (message: string) => {
    if (wallet.status !== 'connected') {
      throw new Error('Wallet not connected');
    }

    const provider = await wallet.getProvider();
    const ethersProvider = new ethers.providers.Web3Provider(provider);
    const signer = ethersProvider.getSigner();

    const signature = await signer.signMessage(message);
    return signature;
  };

  return (
    <Button
      title="서명하기"
      onPress={async () => {
        const sig = await signMessage('Hello, World!');
        console.log('Signature:', sig);
      }}
    />
  );
}
```

### 트랜잭션 전송

```tsx
import { useEmbeddedWallet } from '@privy-io/expo';
import { ethers } from 'ethers';

function SendTransaction() {
  const wallet = useEmbeddedWallet();

  const sendTx = async () => {
    if (wallet.status !== 'connected') return;

    const provider = await wallet.getProvider();
    const ethersProvider = new ethers.providers.Web3Provider(provider);
    const signer = ethersProvider.getSigner();

    const tx = await signer.sendTransaction({
      to: '0x...',
      value: ethers.utils.parseEther('0.01'),
    });

    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.transactionHash);
  };

  return <Button title="0.01 ETH 전송" onPress={sendTx} />;
}
```

### Smart Wallet (Account Abstraction)

**1. Dashboard에서 활성화:**

Dashboard → Embedded wallets → Smart wallets → Configure

**2. SmartWalletsProvider 추가:**

```tsx
import { PrivyProvider } from '@privy-io/expo';
import { SmartWalletsProvider } from '@privy-io/expo/smart-wallets';

export default function App() {
  return (
    <PrivyProvider appId="YOUR_APP_ID" clientId="YOUR_CLIENT_ID">
      <SmartWalletsProvider>
        <YourApp />
      </SmartWalletsProvider>
    </PrivyProvider>
  );
}
```

**3. 가스리스 트랜잭션:**

```tsx
import { useSmartWallets } from '@privy-io/expo/smart-wallets';

function GaslessTransaction() {
  const { client } = useSmartWallets();

  const sendGaslessTx = async () => {
    if (!client) return;

    // 가스비를 Privy가 스폰서링
    const txHash = await client.sendTransaction({
      to: '0x...',
      value: 0n,
      data: '0x...',
    });

    console.log('Gasless tx:', txHash);
  };

  return <Button title="가스리스 트랜잭션" onPress={sendGaslessTx} />;
}
```

---

## 외부 지갑 연결

> **⚠️ 중요: 웹 SDK vs Expo SDK 차이점**
>
> GPT/Gemini 등 AI가 제공하는 정보는 **웹용 `@privy-io/react-auth`** 문서를 기반으로 합니다.
> React Native용 **`@privy-io/expo`**는 API가 다릅니다!
>
> | 기능 | `@privy-io/react-auth` (웹) | `@privy-io/expo` (RN) |
> |------|----------------------------|----------------------|
> | `useConnectWallet` | ✅ 있음 | ❌ **없음** |
> | `useWallets` | ✅ 있음 | ❌ **없음** |
> | EVM 외부 지갑 UI | ✅ 내장 | ❌ **없음** |
> | Solana 딥링크 | ✅ 있음 | ✅ 있음 (connectors) |
> | SIWE 로그인 | ✅ 있음 | ✅ 있음 |
> | Embedded Wallet | ✅ 있음 | ✅ 있음 |
>
> **`@privy-io/expo`에서 사용 가능한 주요 hooks:**
> - `usePrivy` - 기본 인증 상태
> - `useLoginWithSiwe` / `useLinkWithSiwe` - SIWE 인증
> - `useEmbeddedWallet` / `useEmbeddedEthereumWallet` - 임베디드 지갑
> - `useLoginWithEmail`, `useLoginWithOAuth` 등 - 인증
> - `usePhantomDeeplinkWalletConnector` 등 - Solana 딥링크 (from `@privy-io/expo/connectors`)
>
> **결론**: React Native에서 MetaMask/Rainbow 같은 EVM 외부 지갑을 연결하려면:
> 1. **별도 지갑 연결 라이브러리** (Reown AppKit, MetaMask SDK 등) 사용 후
> 2. **Privy의 `useLoginWithSiwe`**로 SIWE 인증
>
> 또는 **Embedded Wallet만 사용**하면 외부 지갑 없이도 안정적인 지갑 기능 구현 가능

---

### 옵션 1: AppKit + Privy SIWE (권장)

Reown AppKit으로 지갑 연결 → Privy SIWE로 인증하는 하이브리드 방식입니다.

**장점:**
- AppKit의 안정적인 WalletConnect 지원
- Privy의 사용자 관리 및 세션 관리

**구현:**

```tsx
// App.tsx
import { PrivyProvider } from '@privy-io/expo';
import { AppKitProvider, AppKit, createAppKit } from '@reown/appkit-react-native';

// AppKit 설정
const appKit = createAppKit({
  projectId: 'YOUR_WALLETCONNECT_PROJECT_ID',
  metadata: {
    name: 'MyApp',
    description: 'My App Description',
    url: 'https://myapp.com',
    icons: ['https://myapp.com/icon.png'],
  },
});

export default function App() {
  return (
    <PrivyProvider appId="YOUR_PRIVY_APP_ID" clientId="YOUR_PRIVY_CLIENT_ID">
      <AppKitProvider instance={appKit}>
        <YourApp />
        <AppKit />
      </AppKitProvider>
    </PrivyProvider>
  );
}
```

```tsx
// WalletScreen.tsx
import { useLoginWithSiwe, usePrivy } from '@privy-io/expo';
import { useAppKit, useAccount, useProvider } from '@reown/appkit-react-native';

function ExternalWalletScreen() {
  const { user, logout } = usePrivy();
  const isAuthenticated = !!user;

  // AppKit hooks
  const { open, disconnect } = useAppKit();
  const { address, isConnected, chainId } = useAccount();
  const { provider } = useProvider();

  // Privy SIWE
  const { generateSiweMessage, loginWithSiwe } = useLoginWithSiwe({
    onSuccess: (user) => console.log('Privy login success:', user.id),
    onError: (error) => console.error('Privy error:', error),
  });

  const handleConnectWallet = async () => {
    await open(); // AppKit 지갑 선택 UI 표시
  };

  const handleSignInWithWallet = async () => {
    if (!address || !provider) return;

    // 1. SIWE 메시지 생성
    const chainIdValue = chainId ? Number(chainId) : 1;
    const message = await generateSiweMessage({
      wallet: {
        address,
        chainId: `eip155:${chainIdValue}`,
      },
      from: {
        domain: 'myapp.com',
        uri: 'https://myapp.com',
      },
    });

    // 2. 지갑으로 서명 요청
    const signature = await provider.request({
      method: 'personal_sign',
      params: [message, address],
    });

    // 3. Privy 인증
    await loginWithSiwe({ signature });
  };

  return (
    <View>
      {!isConnected ? (
        <Button title="지갑 연결" onPress={handleConnectWallet} />
      ) : !isAuthenticated ? (
        <Button title="Privy로 로그인" onPress={handleSignInWithWallet} />
      ) : (
        <>
          <Text>로그인됨: {address}</Text>
          <Button title="로그아웃" onPress={() => { logout(); disconnect(); }} />
        </>
      )}
    </View>
  );
}
```

---

### 옵션 2: MetaMask SDK + Privy SIWE

MetaMask SDK를 직접 사용하는 방식입니다.

**설치:**

```bash
npm install @metamask/sdk-react ethers@5
npx expo install expo-crypto @react-native-async-storage/async-storage
```

**구현:**

```tsx
import { useSDK } from '@metamask/sdk-react';
import { useLoginWithSiwe, usePrivy } from '@privy-io/expo';

function MetaMaskWalletScreen() {
  const { sdk, connected, account } = useSDK();
  const { user } = usePrivy();
  const { generateSiweMessage, loginWithSiwe } = useLoginWithSiwe();

  const handleConnect = async () => {
    await sdk?.connect();
  };

  const handleSignIn = async () => {
    if (!account) return;

    const message = await generateSiweMessage({
      wallet: { address: account, chainId: 'eip155:1' },
      from: { domain: 'myapp.com', uri: 'https://myapp.com' },
    });

    // MetaMask SDK로 서명
    const signature = await sdk?.connectWith({
      method: 'personal_sign',
      params: [message, account],
    });

    await loginWithSiwe({ signature });
  };

  return (
    <View>
      {!connected ? (
        <Button title="MetaMask 연결" onPress={handleConnect} />
      ) : !user ? (
        <Button title="로그인" onPress={handleSignIn} />
      ) : (
        <Text>로그인됨: {account}</Text>
      )}
    </View>
  );
}
```

---

### 옵션 3: Embedded Wallet만 사용 (가장 안정적)

외부 지갑 없이 Privy Embedded Wallet만 사용합니다.

**장점:**
- WebSocket 문제 없음
- 앱 전환 불필요
- 가장 안정적인 UX

```tsx
import { usePrivy, useEmbeddedWallet, useLoginWithEmail } from '@privy-io/expo';

function EmbeddedWalletScreen() {
  const { user } = usePrivy();
  const wallet = useEmbeddedWallet();
  const { sendCode, loginWithCode, state } = useLoginWithEmail();

  // 로그인 후 자동으로 Embedded Wallet 생성
  // (PrivyProvider config에서 createOnLogin: 'users-without-wallets' 설정 시)

  if (!user) {
    return <EmailLoginForm sendCode={sendCode} loginWithCode={loginWithCode} />;
  }

  if (wallet.status === 'connected') {
    return <Text>지갑 주소: {wallet.account.address}</Text>;
  }

  return <Text>지갑 생성 중...</Text>;
}
```

---

### Solana 외부 지갑 (Deeplink 방식)

Solana 지갑(Phantom, Backpack 등)은 **Deeplink 방식**으로 연결합니다.

```tsx
import {
  usePhantomDeeplinkWalletConnector,
  useBackpackDeeplinkWalletConnector,
} from '@privy-io/expo/connectors';

function SolanaWalletConnect() {
  const phantom = usePhantomDeeplinkWalletConnector({
    appUrl: 'https://yourapp.com',
    redirectUri: '/callback',
  });

  const handleConnect = async () => {
    await phantom.connect();
  };

  const handleSignMessage = async () => {
    if (!phantom.isConnected) return;

    const signature = await phantom.signMessage('Hello, Solana!');
    console.log('Signature:', signature);
  };

  return (
    <View>
      {phantom.isConnected ? (
        <>
          <Text>주소: {phantom.address}</Text>
          <Button title="메시지 서명" onPress={handleSignMessage} />
          <Button title="연결 해제" onPress={phantom.disconnect} />
        </>
      ) : (
        <Button title="Phantom 연결" onPress={handleConnect} />
      )}
    </View>
  );
}
```

**Deeplink Connector 반환 값:**

| 속성/메서드 | 설명 |
|------------|------|
| `address` | 연결된 지갑 주소 |
| `isConnected` | 연결 상태 |
| `connect()` | 지갑 연결 |
| `disconnect()` | 연결 해제 |
| `signMessage(msg)` | 메시지 서명 |
| `signTransaction(tx)` | 트랜잭션 서명 |
| `signAndSendTransaction(tx)` | 서명 및 전송 |

### Privy 사용자의 linked_accounts 확인

Privy에 로그인한 사용자의 연결된 지갑 정보는 `user.linked_accounts`에서 확인할 수 있습니다.

```tsx
import { usePrivy } from '@privy-io/expo';

function LinkedWallets() {
  const { user } = usePrivy();

  // SIWE로 연결된 지갑들
  const linkedWallets = user?.linked_accounts?.filter(
    (account) => account.type === 'wallet'
  ) || [];

  return (
    <View>
      <Text>연결된 지갑 ({linkedWallets.length}개)</Text>
      {linkedWallets.map((wallet, index) => (
        <View key={index}>
          <Text>{wallet.address}</Text>
          <Text>Chain: {wallet.chain_type}</Text>
        </View>
      ))}
    </View>
  );
}
```

### Embedded + External 하이브리드 사용

Privy Embedded Wallet과 외부 지갑(AppKit 연동)을 함께 사용하는 예시입니다.

```tsx
import { usePrivy, useEmbeddedWallet, useLoginWithSiwe } from '@privy-io/expo';
import { useAppKit, useAccount, useProvider } from '@reown/appkit-react-native';

function HybridWalletScreen() {
  const { user, logout } = usePrivy();
  const embeddedWallet = useEmbeddedWallet();

  // AppKit for external wallet
  const { open, disconnect } = useAppKit();
  const { address: externalAddress, isConnected: externalConnected } = useAccount();
  const { provider } = useProvider();

  // SIWE for linking external wallet to Privy
  const { generateSiweMessage, loginWithSiwe } = useLoginWithSiwe();

  // 외부 지갑 연결 후 Privy에 링크
  const linkExternalWallet = async () => {
    if (!externalAddress || !provider) return;

    const message = await generateSiweMessage({
      wallet: { address: externalAddress, chainId: 'eip155:1' },
      from: { domain: 'myapp.com', uri: 'https://myapp.com' },
    });

    const signature = await provider.request({
      method: 'personal_sign',
      params: [message, externalAddress],
    });

    await loginWithSiwe({ signature });
  };

  return (
    <View>
      {/* Embedded Wallet */}
      <View>
        <Text>Privy Embedded Wallet</Text>
        {embeddedWallet.status === 'connected' ? (
          <Text>{embeddedWallet.account.address}</Text>
        ) : (
          <Button title="지갑 생성" onPress={() => embeddedWallet.create()} />
        )}
      </View>

      {/* External Wallet via AppKit */}
      <View>
        <Text>외부 지갑</Text>
        {externalConnected ? (
          <>
            <Text>{externalAddress}</Text>
            {!user && (
              <Button title="Privy에 연결" onPress={linkExternalWallet} />
            )}
          </>
        ) : (
          <Button title="외부 지갑 연결" onPress={() => open()} />
        )}
      </View>
    </View>
  );
}
```

### Android 딥링크 설정

외부 지갑에서 앱으로 돌아오기 위한 딥링크 설정:

**AndroidManifest.xml:**

```xml
<activity
  android:name=".MainActivity"
  android:launchMode="singleTask">
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="myapp" />
  </intent-filter>
</activity>

<!-- WalletConnect 지원 지갑 탐지 -->
<queries>
  <intent>
    <action android:name="android.intent.action.VIEW" />
    <data android:scheme="wc" />
  </intent>
  <intent>
    <action android:name="android.intent.action.VIEW" />
    <data android:scheme="metamask" />
  </intent>
  <intent>
    <action android:name="android.intent.action.VIEW" />
    <data android:scheme="rainbow" />
  </intent>
  <intent>
    <action android:name="android.intent.action.VIEW" />
    <data android:scheme="cbwallet" />
  </intent>
</queries>
```

### iOS 딥링크 설정

**Info.plist:**

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>myapp</string>
    </array>
  </dict>
</array>

<key>LSApplicationQueriesSchemes</key>
<array>
  <string>metamask</string>
  <string>rainbow</string>
  <string>cbwallet</string>
  <string>trust</string>
  <string>wc</string>
</array>
```

### 외부 지갑 연결 시 주의사항

| 항목 | 설명 |
|------|------|
| **WalletConnect Project ID** | 필수 - Cloud에서 발급 |
| **앱 전환** | 서명 요청 시 MetaMask 등 외부 앱으로 전환됨 |
| **세션 유지** | Privy가 WalletConnect 세션을 자동 관리 |
| **프로그래매틱 연결 해제** | 일부 지갑(MetaMask, Phantom)은 지원 안 함 |
| **체인 변경** | `wallet.switchChain(chainId)`로 변경 가능 |

---

## ProofPortApp 마이그레이션 가이드

### 현재 상태

- Reown AppKit 사용 중
- "User rejected methods" 에러 발생
- 외부 지갑(MetaMask) 연결만 지원

### 마이그레이션 장점

1. **안정성**: WebSocket 의존도 감소 (Embedded Wallet 사용 시)
2. **UX**: 이메일 로그인으로 앱 전환 불필요
3. **재연결**: 세션 관리가 더 안정적

### Step 1: 의존성 교체

```bash
# 기존 패키지 제거
npm uninstall @reown/appkit-react-native @reown/appkit-ethers-react-native

# Privy 패키지 설치
npx expo install @privy-io/expo @privy-io/expo-native-extensions

# 필수 의존성
npx expo install \
  expo-application \
  expo-constants \
  expo-web-browser \
  expo-linking \
  expo-secure-store \
  expo-crypto \
  react-native-webview

# 폴리필
npm install --save \
  fast-text-encoding \
  react-native-get-random-values \
  @ethersproject/shims
```

### Step 2: 설정 파일 수정

**index.js:**

```javascript
import 'fast-text-encoding';
import 'react-native-get-random-values';
import '@ethersproject/shims';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
```

**App.tsx:**

```tsx
import { PrivyProvider } from '@privy-io/expo';
import { NavigationContainer } from '@react-navigation/native';

const PRIVY_APP_ID = 'YOUR_PRIVY_APP_ID';
const PRIVY_CLIENT_ID = 'YOUR_PRIVY_CLIENT_ID';

export default function App() {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      clientId={PRIVY_CLIENT_ID}
      config={{
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </PrivyProvider>
  );
}
```

### Step 3: Hook 교체

**기존 (useWalletConnect.ts):**

```typescript
import { useAppKit, useAccount, useProvider } from '@reown/appkit-react-native';

export const useWalletConnect = () => {
  const { open, disconnect } = useAppKit();
  const { address, isConnected } = useAccount();
  const { provider } = useProvider();
  // ...
};
```

**변경 후 (usePrivyWallet.ts):**

```typescript
import { usePrivy, useEmbeddedWallet, useWallets } from '@privy-io/expo';
import { ethers } from 'ethers';

export const usePrivyWallet = (addLog?: (msg: string) => void) => {
  const { isReady, isAuthenticated, logout } = usePrivy();
  const embeddedWallet = useEmbeddedWallet();
  const { wallets } = useWallets();

  const log = (msg: string) => {
    console.log(`🔐 ${msg}`);
    addLog?.(msg);
  };

  // 활성 지갑 (embedded 우선, 없으면 첫 번째 external)
  const activeWallet = wallets.find(w => w.walletClientType === 'privy') || wallets[0];
  const account = activeWallet?.address ?? null;
  const isConnected = isAuthenticated && !!activeWallet;

  const getProvider = async () => {
    if (embeddedWallet.status !== 'connected') return null;
    const provider = await embeddedWallet.getProvider();
    return new ethers.providers.Web3Provider(provider);
  };

  const getSigner = async () => {
    const provider = await getProvider();
    if (!provider) return null;
    return provider.getSigner();
  };

  const signMessage = async (message: string) => {
    log(`Signing message: ${message.slice(0, 30)}...`);
    const signer = await getSigner();
    if (!signer) throw new Error('Wallet not connected');
    const signature = await signer.signMessage(message);
    log(`Signature received: ${signature.slice(0, 20)}...`);
    return signature;
  };

  const formatAddress = (addr: string | undefined) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return {
    account,
    isReady,
    isConnected,
    formattedAddress: formatAddress(account),
    signMessage,
    getProvider,
    getSigner,
    disconnect: logout,
  };
};
```

### Step 4: 화면 컴포넌트 수정

**기존 WalletScreen:**

```tsx
const { connect, disconnect, isConnected } = useWalletConnect();
// ...
<TouchableOpacity onPress={connect}>
  <Text>Connect Wallet</Text>
</TouchableOpacity>
```

**변경 후:**

```tsx
import { useLoginWithEmail, usePrivy } from '@privy-io/expo';
import { usePrivyWallet } from '../hooks/usePrivyWallet';

export const WalletScreen = () => {
  const { isAuthenticated } = usePrivy();
  const { sendCode, loginWithCode, state } = useLoginWithEmail();
  const { account, signMessage, disconnect, formattedAddress } = usePrivyWallet();

  if (!isAuthenticated) {
    return <EmailLoginForm sendCode={sendCode} loginWithCode={loginWithCode} />;
  }

  return (
    <View>
      <Text>Connected: {formattedAddress}</Text>
      <Button title="Sign Message" onPress={() => signMessage('test')} />
      <Button title="Disconnect" onPress={disconnect} />
    </View>
  );
};
```

---

## 트러블슈팅

### 1. "Module not found" 에러

```
Error: Cannot find module '@privy-io/expo'
```

**해결:**
```bash
npx expo prebuild --clean
npm install
```

### 2. 폴리필 순서 오류

**증상:** `TextEncoder is not defined` 또는 `crypto.getRandomValues` 에러

**해결:** `index.js`에서 폴리필 순서 확인:

```javascript
// 이 순서대로!
import 'fast-text-encoding';      // 1번
import 'react-native-get-random-values';  // 2번
import '@ethersproject/shims';    // 3번
```

### 3. Metro bundler 호환성

**증상:** React Native 0.79+에서 패키지 resolve 실패

**해결:** `metro.config.js` 수정:

```javascript
config.resolver.unstable_enablePackageExports = true;
```

### 4. iOS Passkey 실패

**증상:** Passkey 생성/인증 실패

**체크리스트:**
- [ ] iOS deployment target 17.5 이상
- [ ] `associatedDomains` 설정됨
- [ ] `apple-app-site-association` 파일 올바르게 호스팅됨
- [ ] HTTPS 도메인 사용

### 5. 세션 유지 안됨

**증상:** 앱 재시작 시 로그아웃됨

**해결:** `expo-secure-store` 설치 확인:

```bash
npx expo install expo-secure-store
```

### 6. OAuth 콜백 실패

**증상:** 소셜 로그인 후 앱으로 돌아오지 않음

**체크리스트:**
- [ ] `app.json`에 `scheme` 설정됨
- [ ] Dashboard에 URL scheme 등록됨
- [ ] `expo-linking` 설치됨

---

## 참고 자료

### 공식 문서

- [Privy Expo SDK 문서](https://docs.privy.io/guide/expo/)
- [Privy Quickstart](https://docs.privy.io/guide/expo/quickstart)
- [Privy 설정 가이드](https://docs.privy.io/guide/expo/setup/)
- [Passkey 설정](https://docs.privy.io/guide/expo/setup/passkey)

### 외부 지갑 연결 문서

- [외부 지갑 연결하기](https://docs.privy.io/wallets/connectors/usage/connecting-external-wallets)
- [외부 지갑 설정](https://docs.privy.io/wallets/connectors/setup/configuring-external-connector-wallets)
- [Solana 지갑 딥링킹](https://docs.privy.io/recipes/react-native/deeplinking-wallets)
- [연결된 지갑 사용하기](https://docs.privy.io/guide/react/wallets/use-wallets)
- [WalletConnect v2 마이그레이션](https://docs.privy.io/guide/guides/walletconnect-v2)

### 예제 프로젝트

- [Privy Expo Starter](https://github.com/privy-io/expo-starter)
- [Privy Expo Bare Starter](https://github.com/privy-io/expo-bare-starter)
- [React Native Privy Template](https://github.com/monad-developers/react-native-privy-embedded-wallet-template)

### NPM 패키지

- [@privy-io/expo](https://www.npmjs.com/package/@privy-io/expo)
- [@privy-io/expo-native-extensions](https://www.npmjs.com/package/@privy-io/expo-native-extensions)

### API 참조

- [usePrivy Hook](https://docs.privy.io/reference/sdk/expo/hooks/usePrivy)
- [useLoginWithEmail Hook](https://docs.privy.io/reference/sdk/expo/hooks/useLoginWithEmail)
- [useEmbeddedWallet Hook](https://docs.privy.io/reference/sdk/expo/hooks/useEmbeddedWallet)
- [useConnectWallet Hook](https://docs.privy.io/wallets/connectors/usage/connecting-external-wallets)
- [useWallets Hook](https://docs.privy.io/guide/react/wallets/use-wallets)
- [ConnectedWallet Interface](https://docs.privy.io/reference/sdk/react-auth/interfaces/ConnectedWallet)

### WalletConnect

- [WalletConnect Cloud](https://cloud.walletconnect.com/) - Project ID 발급
- [Phantom 연동 가이드](https://docs.phantom.app/library-integrations/privy)

---

## 요약

| 항목 | 내용 |
|-----|------|
| **WebSocket 사용** | Embedded Wallet: 없음 / 외부 지갑: WalletConnect 내부 처리 |
| **설치 복잡도** | 중간 (폴리필 및 prebuild 필요) |
| **Expo Go** | 미지원 (`npx expo prebuild` 필수) |
| **인증 방식** | 이메일, SMS, OAuth, Passkey |
| **지갑 타입** | Embedded (내장) + External (WalletConnect) |
| **외부 지갑** | MetaMask, Rainbow, Coinbase, Trust, 500+ WalletConnect 지갑 |
| **Account Abstraction** | 지원 (SmartWalletsProvider) |
| **React Native 채택률** | 1위 (~19,000 downloads/week) |
