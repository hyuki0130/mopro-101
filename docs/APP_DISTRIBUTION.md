# 앱 배포 가이드

ProofPort 앱의 개발자 배포 및 정식 릴리즈 방법을 정리한 문서입니다.

---

## 목차

1. [Android 배포](#android-배포)
   - [개발자 배포 (APK)](#1-개발자-배포-apk)
   - [정식 릴리즈 (Google Play)](#2-정식-릴리즈-google-play)
2. [iOS 배포](#ios-배포)
   - [개발자 배포 (Ad Hoc / Enterprise)](#1-개발자-배포-ad-hoc--enterprise)
   - [정식 릴리즈 (App Store)](#2-정식-릴리즈-app-store)
3. [배포 방식 비교표](#배포-방식-비교표)

---

## Android 배포

### 1. 개발자 배포 (APK)

가장 간단한 방법. APK 파일을 직접 공유하면 누구나 설치 가능합니다.

#### 사전 준비

```bash
# 프로젝트 루트에서
cd ProofPortApp
```

#### Release APK 빌드

```bash
cd android
./gradlew assembleRelease
```

#### 빌드 결과물

```
android/app/build/outputs/apk/release/app-release.apk
```

#### 배포 방법

1. **사내 저장소 업로드**: OBS, NAS, 사내 배포 시스템 등에 APK 업로드
2. **링크 공유**: 다운로드 링크를 Slack, 이메일 등으로 공유
3. **설치**: 사용자가 APK 다운로드 후 설치
   - "출처를 알 수 없는 앱 설치" 허용 필요 (최초 1회)
   - `설정 → 보안 → 출처를 알 수 없는 앱` 또는 설치 시 팝업에서 허용

#### 서명 키 설정 (선택사항)

현재는 debug keystore를 사용 중입니다. 프로덕션용 키가 필요하면:

```bash
# 키 생성
keytool -genkeypair -v -storetype PKCS12 -keystore proofport-release.keystore -alias proofport -keyalg RSA -keysize 2048 -validity 10000
```

`android/app/build.gradle` 수정:

```gradle
signingConfigs {
    release {
        storeFile file('proofport-release.keystore')
        storePassword 'YOUR_STORE_PASSWORD'
        keyAlias 'proofport'
        keyPassword 'YOUR_KEY_PASSWORD'
    }
}

buildTypes {
    release {
        signingConfig signingConfigs.release
        // ...
    }
}
```

> **주의**: 키 파일과 비밀번호는 절대 git에 커밋하지 마세요!

---

### 2. 정식 릴리즈 (Google Play)

#### 사전 준비

- [ ] Google Play Console 계정 ($25 일회성 등록비)
- [ ] 프로덕션 서명 키 (위에서 생성)
- [ ] 앱 아이콘, 스크린샷, 설명 등 스토어 에셋

#### AAB (Android App Bundle) 빌드

Google Play는 APK 대신 AAB 형식을 권장합니다.

```bash
cd android
./gradlew bundleRelease
```

#### 빌드 결과물

```
android/app/build/outputs/bundle/release/app-release.aab
```

#### 배포 절차

1. [Google Play Console](https://play.google.com/console) 접속
2. 앱 생성 → 앱 정보 입력
3. `프로덕션` → `새 버전 만들기`
4. AAB 파일 업로드
5. 버전 정보, 출시 노트 작성
6. 심사 제출 (보통 1-3일 소요)

#### 버전 관리

`android/app/build.gradle`:

```gradle
defaultConfig {
    versionCode 2        // 매 릴리즈마다 증가 (정수)
    versionName "1.1.0"  // 사용자에게 표시되는 버전
}
```

---

## iOS 배포

### 1. 개발자 배포 (Ad Hoc / Enterprise)

iOS는 서명 없이는 설치가 불가능합니다. 개발자 배포에는 두 가지 방법이 있습니다.

#### 방법 A: Ad Hoc 배포

테스터 기기의 UDID를 등록하고 배포하는 방식입니다.

**필요 조건:**
- Apple Developer 계정 ($99/년)
- 테스터 기기 UDID (최대 100대 등록 가능)

**절차:**

1. **UDID 수집**
   - 테스터가 Mac에 기기 연결 → Finder에서 기기 선택 → 일련번호 클릭하면 UDID 표시
   - 또는 https://udid.io 등의 서비스 이용

2. **Apple Developer Console에서 기기 등록**
   - https://developer.apple.com → Certificates, Identifiers & Profiles
   - Devices → + 버튼 → UDID 등록

3. **Provisioning Profile 생성**
   - Profiles → + 버튼 → Ad Hoc 선택
   - App ID 선택 → 등록한 기기 선택 → 다운로드

4. **Xcode에서 Archive**
   ```
   Xcode → Product → Archive → Distribute App → Ad Hoc → Export
   ```

5. **IPA 배포**
   - 생성된 `.ipa` 파일을 사내 저장소에 업로드
   - 또는 Diawi, Firebase App Distribution 등 사용

6. **설치**
   - 사용자가 IPA 다운로드 후 설치
   - `설정 → 일반 → VPN 및 기기 관리 → 개발자 앱` 에서 신뢰 허용

#### 방법 B: Enterprise 배포

UDID 등록 없이 사내 누구나 설치 가능한 방식입니다.

**필요 조건:**
- Apple Developer Enterprise Program ($299/년)
- 기업 자격 심사 통과 필요

**절차:**

1. **Enterprise 인증서 발급**
   - Apple Developer Enterprise Console에서 In-House 인증서 생성

2. **Provisioning Profile 생성**
   - In-House Distribution 선택

3. **Xcode에서 Archive**
   ```
   Xcode → Product → Archive → Distribute App → Enterprise → Export
   ```

4. **사내 배포 시스템에 업로드**
   - NHN의 경우: 2mgate 등 사내 시스템
   - manifest.plist와 함께 업로드하면 링크 클릭으로 설치 가능

**NHN 사내 배포 예시:**
```
https://2mgate.nhnent.com/app/connect/displayRelease.nhn
```

#### 방법 C: TestFlight

Apple 공식 베타 테스트 플랫폼입니다.

**장점:**
- UDID 등록 불필요
- 외부 테스터 최대 10,000명
- 앱 자동 업데이트

**절차:**

1. App Store Connect에 앱 등록
2. Xcode에서 Archive → Upload to App Store
3. TestFlight에서 테스터 초대 (이메일)
4. 테스터가 TestFlight 앱에서 설치

**주의:** 외부 테스터 배포 시 Apple 심사 필요 (1-2일)

---

### 2. 정식 릴리즈 (App Store)

#### 사전 준비

- [ ] Apple Developer 계정 ($99/년)
- [ ] App Store Connect에 앱 등록
- [ ] 앱 아이콘 (1024x1024), 스크린샷, 설명 등 준비
- [ ] 개인정보 처리방침 URL

#### Xcode 설정

1. **Bundle Identifier 확인**
   - `ios/ProofPortApp.xcodeproj` 열기
   - Signing & Capabilities에서 Team 선택
   - Bundle Identifier: `com.zkproofport.app`

2. **버전 설정**
   - Version: `1.0.0` (사용자에게 표시)
   - Build: `1` (매 업로드마다 증가)

#### Archive 및 업로드

```
Xcode → Product → Archive → Distribute App → App Store Connect → Upload
```

#### App Store Connect에서 제출

1. https://appstoreconnect.apple.com 접속
2. 앱 선택 → 새 버전 추가
3. 빌드 선택, 스크린샷/설명 입력
4. 심사 제출

#### 심사 기간

- 일반적으로 1-3일
- 리젝 시 사유 확인 후 수정하여 재제출

---

## 배포 방식 비교표

### Android

| 방식 | 비용 | 제한 | 용도 |
|------|------|------|------|
| APK 직접 배포 | 무료 | 없음 | 개발/테스트 |
| Google Play Internal Testing | $25 (일회성) | 100명 | 내부 테스트 |
| Google Play Closed Testing | $25 (일회성) | 무제한 | 베타 테스트 |
| Google Play 정식 출시 | $25 (일회성) | 없음 | 프로덕션 |

### iOS

| 방식 | 비용 | 제한 | 용도 |
|------|------|------|------|
| Ad Hoc | $99/년 | UDID 100대 | 소규모 테스트 |
| Enterprise | $299/년 | 사내 직원만 | 사내 배포 |
| TestFlight 내부 | $99/년 | 100명 | 내부 테스트 |
| TestFlight 외부 | $99/년 | 10,000명 | 베타 테스트 |
| App Store | $99/년 | 없음 | 프로덕션 |

---

## 빠른 시작 가이드

### 개발자 배포 (가장 빠른 방법)

**Android:**
```bash
cd ProofPortApp/android
./gradlew assembleRelease
# 결과: android/app/build/outputs/apk/release/app-release.apk
```

**iOS (Ad Hoc):**
1. 테스터 UDID를 Apple Developer Console에 등록
2. Ad Hoc Provisioning Profile 생성
3. Xcode → Archive → Ad Hoc Export
4. IPA 파일 배포

---

## 참고 자료

- [React Native 공식 배포 가이드](https://reactnative.dev/docs/signed-apk-android)
- [Apple Developer 문서](https://developer.apple.com/documentation/xcode/distributing-your-app-for-beta-testing-and-releases)
- [Google Play Console 도움말](https://support.google.com/googleplay/android-developer)
