# MetaMask Integration Guide for React Native

React Native 앱에서 MetaMask 지갑을 연동하는 방법을 정리한 문서입니다.

---

## 연동 방법 비교

| 기능          | MetaMask SDK | WalletConnect |
| ------------- | ------------ | ------------- |
| MetaMask 전용 | O            | X (다중 지갑) |
| 설정 복잡도   | 중간         | 높음          |
| Deep Link     | 자동         | 수동 설정     |
| 지원 지갑     | MetaMask만   | 300+ 지갑     |
| SDK 버전      | 0.3.12       | v2            |

---

## 방법 1: MetaMask SDK (공식 권장)

MetaMask에서 제공하는 공식 SDK로, MetaMask 앱과 직접 연동됩니다.

### 1.1 설치

```bash
npm install eciesjs @metamask/sdk-react ethers@5.7.2 \
  @react-native-async-storage/async-storage \
  node-libs-react-native \
  react-native-background-timer \
  react-native-randombytes \
  react-native-url-polyfill \
  react-native-get-random-values
```

### 1.2 Metro 설정

`metro.config.js` 업데이트:

```javascript
const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");

const config = {
  resolver: {
    extraNodeModules: require("node-libs-react-native"),
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
```

### 1.3 엔트리 파일 설정

`index.js` 상단에 polyfill 추가:

```javascript
import "node-libs-react-native/globals";
import "react-native-url-polyfill/auto";
import "react-native-get-random-values";

import { AppRegistry } from "react-native";
import App from "./App";
import { name as appName } from "./app.json";
import { uniffiInitAsync } from "mopro-ffi";

uniffiInitAsync().then(() => {
  AppRegistry.registerComponent(appName, () => App);
});
```

### 1.4 Provider 설정

`App.tsx` 또는 상위 컴포넌트에서 Provider 설정:

```tsx
import React from "react";
import { MetaMaskProvider } from "@metamask/sdk-react";
import { HomeScreen } from "./src/screens";

const App: React.FC = () => {
  return (
    <MetaMaskProvider
      sdkOptions={{
        dappMetadata: {
          name: "AgeVerifierApp",
          url: "https://ageverifier.app",
          iconUrl: "https://ageverifier.app/icon.png",
        },
        // Infura API key (선택사항, RPC 요청용)
        // infuraAPIKey: 'YOUR_INFURA_KEY',
      }}
    >
      <HomeScreen />
    </MetaMaskProvider>
  );
};

export default App;
```

### 1.5 Hook 사용 예시

```tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSDK } from "@metamask/sdk-react";

export const WalletConnect: React.FC = () => {
  const { sdk, connected, connecting, account, chainId, provider } = useSDK();

  const connect = async () => {
    try {
      await sdk?.connect();
    } catch (err) {
      console.warn("Failed to connect:", err);
    }
  };

  const disconnect = () => {
    sdk?.terminate();
  };

  // 메시지 서명 예시
  const signMessage = async () => {
    if (!provider || !account) return;

    try {
      const message = "Hello from AgeVerifierApp!";
      const signature = await provider.request({
        method: "personal_sign",
        params: [message, account],
      });
      console.log("Signature:", signature);
    } catch (err) {
      console.error("Sign failed:", err);
    }
  };

  return (
    <View style={styles.container}>
      {connected ? (
        <>
          <Text style={styles.text}>Connected!</Text>
          <Text style={styles.address}>
            {account?.slice(0, 6)}...{account?.slice(-4)}
          </Text>
          <Text style={styles.chain}>Chain ID: {chainId}</Text>
          <TouchableOpacity style={styles.button} onPress={signMessage}>
            <Text style={styles.buttonText}>Sign Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buttonSecondary} onPress={disconnect}>
            <Text style={styles.buttonTextSecondary}>Disconnect</Text>
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={styles.button}
          onPress={connect}
          disabled={connecting}
        >
          <Text style={styles.buttonText}>
            {connecting ? "Connecting..." : "Connect MetaMask"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: "center",
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  address: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    fontFamily: "monospace",
  },
  chain: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  button: {
    backgroundColor: "#F6851B",
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    minWidth: 200,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonSecondary: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    minWidth: 200,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  buttonTextSecondary: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});
```

### 1.6 iOS 설정 (Deep Link)

`ios/AgeVerifierApp/Info.plist`에 URL scheme 추가:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>ageverifierapp</string>
    </array>
  </dict>
</array>
```

`ios/AgeVerifierApp/AppDelegate.mm`에 deep link 핸들러 추가:

```objc
#import <React/RCTLinkingManager.h>

// application:openURL:options: 메서드 추가
- (BOOL)application:(UIApplication *)application
   openURL:(NSURL *)url
   options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:application openURL:url options:options];
}
```

### 1.7 Android 설정 (Deep Link)

`android/app/src/main/AndroidManifest.xml`에 intent-filter 추가:

```xml
<activity
  android:name=".MainActivity"
  ...>
  <intent-filter>
    <action android:name="android.intent.action.MAIN" />
    <category android:name="android.intent.category.LAUNCHER" />
  </intent-filter>

  <!-- Deep Link 설정 -->
  <intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="ageverifierapp" />
  </intent-filter>
</activity>
```

---

## 방법 2: WalletConnect (Web3Modal)

WalletConnect는 MetaMask 외에도 다양한 지갑을 지원합니다.

### 2.1 사전 준비

1. [WalletConnect Cloud](https://cloud.walletconnect.com/)에서 계정 생성
2. 새 프로젝트 생성 후 **Project ID** 발급

### 2.2 설치

```bash
npm install @web3modal/wagmi-react-native wagmi viem \
  @react-native-async-storage/async-storage \
  react-native-get-random-values \
  react-native-svg \
  react-native-modal \
  @react-native-community/netinfo \
  @walletconnect/react-native-compat
```

### 2.3 설정

```tsx
import {
  createWeb3Modal,
  defaultWagmiConfig,
} from "@web3modal/wagmi-react-native";
import { WagmiConfig } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

const projectId = "YOUR_WALLETCONNECT_PROJECT_ID";

const metadata = {
  name: "AgeVerifierApp",
  description: "ZK Age Verification App",
  url: "https://ageverifier.app",
  icons: ["https://ageverifier.app/icon.png"],
};

const chains = [mainnet, sepolia];

const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata });

createWeb3Modal({
  projectId,
  chains,
  wagmiConfig,
});

const App = () => {
  return (
    <WagmiConfig config={wagmiConfig}>{/* Your app content */}</WagmiConfig>
  );
};
```

---

## AgeVerifierApp 통합 시 고려사항

### 주의사항

1. **Polyfill 충돌 가능성**

   - `node-libs-react-native`가 mopro의 native 모듈과 충돌할 수 있음
   - 테스트 후 문제 발생 시 polyfill 순서 조정 필요

2. **ethers 버전**

   - MetaMask SDK는 `ethers@5.7.2`를 권장
   - ethers v6와 호환되지 않을 수 있음

3. **iOS Simulator 제한**
   - MetaMask 앱은 실제 기기에서만 테스트 가능
   - Simulator에서는 Deep Link가 작동하지 않음

### 권장 통합 방식

```
┌─────────────────────────────────────────────────────────────┐
│                        App.tsx                               │
│                           │                                  │
│                  ┌────────▼────────┐                        │
│                  │ MetaMaskProvider │                        │
│                  └────────┬────────┘                        │
│                           │                                  │
│                  ┌────────▼────────┐                        │
│                  │   HomeScreen    │                        │
│                  └────────┬────────┘                        │
│            ┌──────────────┼──────────────┐                  │
│            │              │              │                  │
│     ┌──────▼──────┐ ┌─────▼─────┐ ┌─────▼─────┐            │
│     │WalletConnect│ │ ZK Proof  │ │  Verifier │            │
│     │  Component  │ │ Generator │ │  Submit   │            │
│     └─────────────┘ └───────────┘ └───────────┘            │
└─────────────────────────────────────────────────────────────┘
```

---

## 참고 자료

- [MetaMask SDK React Native 공식 문서](https://docs.metamask.io/wallet/how-to/use-sdk/react-native/)
- [MetaMask SDK Connect Guide](https://docs.metamask.io/sdk/connect/react-native/)
- [MetaMask SDK npm](https://www.npmjs.com/package/@metamask/sdk-react-native)
- [WalletConnect React Native](https://docs.walletconnect.network/wallet-sdk/react-native/mobile-linking)
- [WalletConnect Modal React Native GitHub](https://github.com/WalletConnect/modal-react-native)
- [Wagmi Documentation](https://wagmi.sh/)
