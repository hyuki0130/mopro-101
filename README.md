# ProofPort - ZK Proof Mobile App

React Native 기반 ZK Proof 모바일 앱. Noir 서킷을 mopro를 통해 iOS/Android에서 실행합니다.

## 목차

- [필수 요구사항](#필수-요구사항)
- [설치](#설치)
- [프로젝트 구조](#프로젝트-구조)
- [빌드 플로우](#빌드-플로우)
- [서킷 개발](#서킷-개발)
- [앱 빌드 및 실행](#앱-빌드-및-실행)
- [배포된 컨트랙트](#배포된-컨트랙트)
- [문제 해결](#문제-해결)

## 필수 요구사항

### 버전 정보

| 도구 | 버전 | 설치 방법 |
|------|------|-----------|
| **nargo** | 1.0.0-beta.8 | `noirup -v 1.0.0-beta.8` |
| **bb** (Barretenberg) | 1.0.0-nightly.20250723 | `bbup -v 1.0.0-nightly.20250723` |
| **mopro-cli** | 0.3.2 | `cargo install mopro-cli` |
| **Rust** | 1.91+ | [rustup.rs](https://rustup.rs) |
| **Node.js** | 24.x | [nodejs.org](https://nodejs.org) |
| **Foundry** | latest | [getfoundry.sh](https://getfoundry.sh) |

### iOS 개발 (macOS만 해당)
- Xcode 15+
- CocoaPods (`gem install cocoapods`)
- iOS 17.0+ 타겟

### Android 개발
- Android Studio
- Android SDK 34+
- NDK 27.1.12297006

## 설치

### 1. Noir 툴체인 설치

```bash
# noirup 설치
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
source ~/.bashrc  # 또는 ~/.zshrc

# nargo 설치 (버전 중요!)
noirup -v 1.0.0-beta.8
nargo --version
```

### 2. Barretenberg 설치

```bash
# bbup 설치
curl -L https://raw.githubusercontent.com/AztecProtocol/aztec-packages/master/barretenberg/bbup/install | bash
source ~/.bashrc

# bb 설치 (버전 중요!)
bbup -v 1.0.0-nightly.20250723
bb --version
```

### 3. mopro-cli 설치

```bash
cargo install mopro-cli
mopro --version
```

### 4. 프로젝트 초기화

```bash
git clone <repository-url>
cd mopro-101

# 서브모듈 초기화
git submodule update --init --recursive

# Node 의존성 설치
cd ProofPortApp && npm install && cd ..

# iOS 의존성 설치 (macOS)
cd ProofPortApp/ios && pod install && cd ../..
```

## 프로젝트 구조

```
mopro-101/
├── circuits/                    # Noir 서킷 소스
│   ├── age_verifier/           # 나이 검증 서킷
│   │   ├── src/main.nr
│   │   └── Nargo.toml
│   └── coinbase-kyc/           # Coinbase KYC 검증 서킷
│       ├── src/main.nr
│       └── Nargo.toml
├── contracts/                   # Solidity Verifier 컨트랙트
│   ├── AgeVerifier.sol
│   └── ZkCoinbaseAttestor.sol
├── mopro/                       # mopro 빌드 프로젝트
│   ├── src/
│   │   ├── lib.rs              # 메인 - 서킷 함수 export
│   │   └── noir.rs             # Noir 증명/검증 로직
│   ├── test-vectors/noir/      # 컴파일된 서킷 + SRS + VK
│   ├── Config.toml             # mopro 설정
│   └── MoproReactNativeBindings/  # 빌드 결과 (자동 생성)
├── ProofPortApp/                # React Native 앱
│   ├── assets/circuits/        # 앱 번들 서킷 파일
│   ├── mopro_bindings/         # mopro 바인딩 (자동 복사)
│   ├── ios/                    # iOS 프로젝트
│   ├── android/                # Android 프로젝트
│   └── src/                    # React Native 소스
├── scripts/                     # 빌드/배포 스크립트
└── docs/                        # 문서
```

## 빌드 플로우

### 전체 빌드 (권장)

```bash
# 1. 모든 서킷 컴파일 + VK + Solidity Verifier 생성
./scripts/build_all_circuits.sh

# 2. SRS 생성 + JSON/VK를 mopro/test-vectors/noir/로 복사
./scripts/generate_all_srs.sh

# 3. mopro 빌드 + 앱에 자동 복사
./scripts/mopro_build.sh
```

### 개별 명령어

```bash
# 단일 서킷 컴파일
cd circuits/age_verifier && nargo compile

# 단일 서킷 SRS 생성
./scripts/generate_srs.sh age_verifier

# 서킷 파일만 앱에 복사
./scripts/copy_circuit.sh
```

## 서킷 개발

### 새 서킷 추가하기

1. **서킷 생성**
   ```bash
   cd circuits
   nargo new my_circuit
   cd my_circuit
   # src/main.nr 작성
   ```

2. **서킷 컴파일**
   ```bash
   cd circuits/my_circuit
   nargo compile
   # target/my_circuit.json 생성됨
   ```

3. **SRS 생성**
   ```bash
   ./scripts/generate_srs.sh my_circuit
   # mopro/test-vectors/noir/my_circuit.json, .srs, .vk 생성
   ```

4. **앱에 복사**
   ```bash
   ./scripts/copy_circuit.sh
   # ProofPortApp/assets/circuits/에 복사됨
   ```

5. **React Native에서 사용**
   ```typescript
   import { generateNoirProof } from 'mopro-ffi';

   const proof = generateNoirProof(
     circuitPath,   // my_circuit.json
     srsPath,       // my_circuit.srs
     inputs,        // 입력값 배열
     true,          // onChain (Keccak hash)
     vk,            // VK ArrayBuffer
     true           // lowMemoryMode
   );
   ```

### 서킷 파일 구조

| 파일 | 설명 | 생성 시점 |
|------|------|-----------|
| `{name}.json` | 컴파일된 서킷 (ACIR) | `nargo compile` |
| `{name}.srs` | Structured Reference String | `./scripts/generate_srs.sh` |
| `{name}.vk` | Verification Key | `bb write_vk` |
| `{name}_HonkVerifier.sol` | Solidity Verifier | `bb contract` |

### mopro 빌드가 필요한 경우

- `mopro/src/lib.rs`의 함수 시그니처가 변경될 때만
- 새 서킷 추가는 mopro 빌드 **불필요** (경로만 변경)

## 앱 빌드 및 실행

### iOS

```bash
cd ProofPortApp

# 시뮬레이터
npm run ios

# 실제 디바이스
npm run ios:device

# 캐시 클리어 + 빌드
npm run ios:device:clean
```

### Android

```bash
cd ProofPortApp

# 에뮬레이터
npm run android

# 실제 디바이스
npm run android:device

# 캐시 클리어 + 빌드
npm run android:device:clean
```

### 캐시 클리어

```bash
# iOS 캐시만
npm run clean:ios

# Android 캐시만
npm run clean:android

# 모든 캐시
npm run clean:all
```

## Verifier 배포

### Sepolia 테스트넷 배포

```bash
# .env 파일 설정 필요
cp .env.example .env
# PRIVATE_KEY, SEPOLIA_RPC_URL 설정

# ZKTranscriptLib 배포 (최초 1회)
./scripts/deploy_verifier.sh lib sepolia

# AgeVerifier 배포
./scripts/deploy_verifier.sh age sepolia

# ZkCoinbaseAttestor 배포
./scripts/deploy_verifier.sh coinbase sepolia
```

## 배포된 컨트랙트

### Sepolia Testnet

| 컨트랙트 | 주소 |
|----------|------|
| ZKTranscriptLib | `0xF239e24B6B1749A525AfA8741E29c482778a1ac8` |
| AgeVerifier | `0x33316f0A1F6638AbC8D5a6aCce5a1cF13427A0c9` |
| ZkCoinbaseAttestor | `0x121632902482B658e0F2D055126dBe977deb9FC1` |

## 서킷 정보

### age_verifier

간단한 나이 검증 서킷.

```noir
fn main(birth_year: u16, current_year: pub u16, min_age: pub u16) {
    let age = current_year - birth_year;
    assert(age >= min_age);
}
```

**Public Inputs**: `current_year`, `min_age`

### zk_coinbase_attestor

Coinbase KYC 인증을 ZK로 증명하는 서킷.

**Public Inputs**:
- `signal_hash: [u8; 32]` - 리플레이 방지용
- `signer_list_merkle_root: [u8; 32]` - 유효한 서명자 목록

**Private Inputs**: user_address, user_signature, raw_transaction, merkle_proof 등

## 문제 해결

### nargo/bb 버전 불일치

```bash
# 현재 버전 확인
nargo --version
bb --version

# 버전 맞추기
noirup -v 1.0.0-beta.8
bbup -v 1.0.0-nightly.20250723
```

### iOS 빌드 실패

```bash
# DerivedData 삭제
rm -rf ~/Library/Developer/Xcode/DerivedData/ProofPortApp-*

# Pods 재설치
cd ProofPortApp/ios
rm -rf Pods Podfile.lock
pod install
```

### Android 저장 공간 부족

```bash
cd ProofPortApp
npm run clean:android
```

### Metro 번들러 연결 실패

```bash
# Metro 캐시 삭제
rm -rf /tmp/metro-*
rm -rf /tmp/haste-map-*

# Watchman 캐시 삭제
watchman watch-del-all
```

### mopro 바인딩 누락

```bash
# mopro 빌드 재실행
./scripts/mopro_build.sh
```

## 기술 스택

- **ZK 프레임워크**: Noir (Aztec)
- **증명 시스템**: Ultra Honk (Barretenberg)
- **모바일 바인딩**: mopro
- **앱 프레임워크**: React Native (Expo)
- **스마트 컨트랙트**: Solidity (Foundry)

## 라이선스

MIT
