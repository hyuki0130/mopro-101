# TEE Attestor 개발 및 AWS 구성 가이드

ProofPort에서 자체 zkTLS Attestor 서비스를 구축하기 위한 TEE(Trusted Execution Environment) 개발 가이드.

## 목차

1. [TEE 기본 개념](#1-tee-기본-개념)
2. [Attestor 아키텍처](#2-attestor-아키텍처)
3. [AWS Nitro Enclaves 구성](#3-aws-nitro-enclaves-구성)
4. [개발해야 할 컴포넌트](#4-개발해야-할-컴포넌트)
5. [구현 예제 코드](#5-구현-예제-코드)
6. [배포 아키텍처](#6-배포-아키텍처)
7. [비용 분석](#7-비용-분석)
8. [보안 고려사항](#8-보안-고려사항)

---

## 1. TEE 기본 개념

### 1.1 TEE란?

**Trusted Execution Environment (TEE)**는 메인 프로세서 내의 격리된 보안 영역으로, 코드와 데이터의 기밀성과 무결성을 보호합니다.

```
┌─────────────────────────────────────────────────────────────┐
│                      EC2 Instance (Host)                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                    일반 실행 영역                         ││
│  │  - 애플리케이션 코드                                      ││
│  │  - 운영체제                                               ││
│  │  - 네트워크 스택                                          ││
│  └─────────────────────────────────────────────────────────┘│
│                           │ vsock                            │
│                           ▼                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              TEE (Nitro Enclave)                         ││
│  │  ┌─────────────────────────────────────────────────────┐││
│  │  │  - 개인키 보관                                       │││
│  │  │  - TLS 복호화                                        │││
│  │  │  - Attestation 문서 생성                             │││
│  │  │  - 서명 작업                                         │││
│  │  └─────────────────────────────────────────────────────┘││
│  │  ⚠️ 외부 네트워크 접근 불가, vsock만 사용               ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Attestation 프로세스

TEE의 핵심 기능은 **Attestation(증명)**입니다:

1. **증거 생성**: TEE 내부에서 실행 중인 코드의 해시 + 플랫폼 상태
2. **서명**: 하드웨어(Nitro Hypervisor)가 증거에 서명
3. **검증**: 외부 검증자가 서명과 증거를 검증

```
[Enclave 내부]                    [AWS Nitro Hypervisor]
     │                                    │
     │  1. get-attestation-document       │
     │ ─────────────────────────────────► │
     │                                    │
     │  2. PCRs + Nonce + 추가 데이터     │
     │ ◄───────────────────────────────── │
     │       (서명된 CBOR/COSE)           │
     ▼                                    │
[Attestation Document]                    │
  - PCR0: Enclave 이미지 해시             │
  - PCR1: Linux 커널 + 부팅 램디스크      │
  - PCR2: 애플리케이션                    │
  - PCR8: 서명 인증서 (선택)              │
  - Public Key (암호화용)                 │
  - User Data (커스텀)                    │
```

### 1.3 Platform Configuration Registers (PCRs)

| PCR | 내용 | 용도 |
|-----|------|------|
| PCR0 | Enclave 이미지 파일 (EIF) 해시 | 코드 무결성 검증 |
| PCR1 | Linux 커널 + 부트스트랩 | 런타임 환경 검증 |
| PCR2 | 애플리케이션 | 앱 코드 검증 |
| PCR8 | 서명 인증서 | 서명된 빌드 검증 |

---

## 2. Attestor 아키텍처

### 2.1 zkTLS Attestor의 역할

```
┌──────────┐         ┌──────────────────┐         ┌──────────────┐
│  Client  │◄───────►│    Attestor      │◄───────►│  Data Source │
│  (User)  │   TLS   │    (TEE)         │   TLS   │  (Website)   │
└──────────┘         └──────────────────┘         └──────────────┘
     │                       │
     │                       │
     ▼                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     Attestor의 역할                               │
│                                                                  │
│  1. TLS 프록시: Client ↔ Data Source 간 TLS 트래픽 중계         │
│  2. 데이터 관찰: 복호화된 요청/응답 관찰 (읽기만)               │
│  3. 증명 생성: "이 데이터가 특정 서버에서 왔음"을 증명          │
│  4. 서명: TEE의 Attestation으로 신뢰성 보장                      │
└──────────────────────────────────────────────────────────────────┘
```

### 2.2 두 가지 구현 방식

#### 방식 1: MPC-TLS (TLSNotary 스타일)

```
┌────────┐     ┌──────────┐     ┌────────────┐
│ Prover │◄───►│ Notary   │◄───►│ Data Source│
│(Client)│ MPC │ (TEE)    │ TLS │            │
└────────┘     └──────────┘     └────────────┘

- 2PC (Two-Party Computation)로 TLS 세션 키 분할
- Notary는 전체 데이터를 볼 수 없음 (프라이버시 강화)
- 복잡하고 느림 (2PC 오버헤드)
```

#### 방식 2: Proxy 모델 (zkPass/Reclaim 스타일)

```
┌────────┐     ┌──────────┐     ┌────────────┐
│ Client │◄───►│ Attestor │◄───►│ Data Source│
│        │ TLS │ (TEE)    │ TLS │            │
└────────┘     └──────────┘     └────────────┘

- Attestor가 전체 TLS 트래픽을 관찰
- TEE 내부에서만 복호화 → 외부 노출 없음
- 간단하고 빠름
- TEE 신뢰 필요
```

**ProofPort 권장: Proxy 모델** (구현 복잡도 ↓, 성능 ↑)

---

## 3. AWS Nitro Enclaves 구성

### 3.1 사전 요구사항

#### 지원 인스턴스 타입

| 카테고리 | 인스턴스 타입 | 최소 사양 |
|---------|--------------|----------|
| 범용 | M5, M5a, M5d, M5n, M5zn, M6i, M6a | 4+ vCPUs |
| 컴퓨팅 최적화 | C5, C5a, C5d, C5n, C6i, C6a | 4+ vCPUs |
| 메모리 최적화 | R5, R5a, R5d, R5n, R6i | 4+ vCPUs |

**⚠️ 제한사항:**
- Bare metal 인스턴스 ❌
- Burstable 인스턴스 (T3, T4g 등) ❌
- 1 vCPU 인스턴스 ❌

**권장 시작 인스턴스:** `c6a.xlarge` (가장 저렴한 4 vCPU)

### 3.2 AWS 인프라 구성

```
┌─────────────────────────────────────────────────────────────────────┐
│                           AWS VPC                                    │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                      Public Subnet                             │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │              Application Load Balancer                   │  │  │
│  │  │                    (HTTPS:443)                          │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                           │                                    │  │
│  └───────────────────────────┼────────────────────────────────────┘  │
│                              │                                       │
│  ┌───────────────────────────┼────────────────────────────────────┐  │
│  │                      Private Subnet                            │  │
│  │                           ▼                                    │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │          EC2 Instance (c6a.xlarge)                       │  │  │
│  │  │          - Nitro Enclave 활성화                          │  │  │
│  │  │                                                          │  │  │
│  │  │  ┌────────────────────────────────────────────────────┐ │  │  │
│  │  │  │              Parent Instance                        │ │  │  │
│  │  │  │  ┌──────────────┐  ┌──────────────────────────┐   │ │  │  │
│  │  │  │  │ vsock-proxy  │  │ HTTPS Reverse Proxy      │   │ │  │  │
│  │  │  │  │ (CID: 3)     │  │ (nginx/envoy)            │   │ │  │  │
│  │  │  │  └──────┬───────┘  └──────────────────────────┘   │ │  │  │
│  │  │  │         │ vsock                                    │ │  │  │
│  │  │  │         ▼                                          │ │  │  │
│  │  │  │  ┌──────────────────────────────────────────────┐ │ │  │  │
│  │  │  │  │            Nitro Enclave                      │ │ │  │  │
│  │  │  │  │  ┌────────────────────────────────────────┐  │ │ │  │  │
│  │  │  │  │  │         Attestor Server                │  │ │ │  │  │
│  │  │  │  │  │  - TLS 프록시                          │  │ │ │  │  │
│  │  │  │  │  │  - Attestation 생성                    │  │ │ │  │  │
│  │  │  │  │  │  - 서명                                │  │ │ │  │  │
│  │  │  │  │  └────────────────────────────────────────┘  │ │ │  │  │
│  │  │  │  │  vCPU: 2, Memory: 2GB                        │ │ │  │  │
│  │  │  │  └──────────────────────────────────────────────┘ │ │  │  │
│  │  │  └────────────────────────────────────────────────────┘ │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  │                           │                                    │  │
│  │                           ▼                                    │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │              NAT Gateway (외부 통신용)                   │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.3 단계별 설정 가이드

#### Step 1: EC2 인스턴스 생성

```bash
# AWS CLI로 Nitro Enclave 활성화된 인스턴스 생성
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \  # Amazon Linux 2023
  --instance-type c6a.xlarge \
  --key-name my-key \
  --subnet-id subnet-xxxxxxxx \
  --security-group-ids sg-xxxxxxxx \
  --enclave-options 'Enabled=true' \
  --block-device-mappings '[{"DeviceName":"/dev/xvda","Ebs":{"VolumeSize":50}}]' \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=attestor-server}]'
```

#### Step 2: Nitro Enclaves CLI 설치

```bash
# Amazon Linux 2023
sudo dnf install -y aws-nitro-enclaves-cli aws-nitro-enclaves-cli-devel

# 사용자 그룹 추가
sudo usermod -aG ne ec2-user
sudo usermod -aG docker ec2-user

# Nitro Enclaves allocator 서비스 시작
sudo systemctl enable nitro-enclaves-allocator.service
sudo systemctl start nitro-enclaves-allocator.service
```

#### Step 3: 리소스 할당 설정

```bash
# /etc/nitro_enclaves/allocator.yaml 편집
sudo vim /etc/nitro_enclaves/allocator.yaml
```

```yaml
# allocator.yaml
---
# Enclave에 할당할 메모리 (MiB)
memory_mib: 2048

# Enclave에 할당할 CPU 수
cpu_count: 2
```

```bash
# 설정 적용
sudo systemctl restart nitro-enclaves-allocator.service
```

#### Step 4: Docker 빌드 환경 설정

```bash
# Docker 설치 및 시작
sudo dnf install -y docker
sudo systemctl enable docker
sudo systemctl start docker
```

---

## 4. 개발해야 할 컴포넌트

### 4.1 컴포넌트 개요

```
┌─────────────────────────────────────────────────────────────────────┐
│                    ProofPort Attestor Service                        │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Parent Instance                             │  │
│  │                                                                │  │
│  │  1. API Gateway (Express/FastAPI)                             │  │
│  │     - /api/session/start                                      │  │
│  │     - /api/session/attest                                     │  │
│  │     - /api/verify                                             │  │
│  │                                                                │  │
│  │  2. vsock Proxy                                               │  │
│  │     - TCP ↔ vsock 변환                                        │  │
│  │     - 외부 HTTPS 요청 → Enclave로 전달                        │  │
│  │                                                                │  │
│  │  3. Session Manager                                           │  │
│  │     - 세션 상태 관리                                          │  │
│  │     - Redis/In-memory 캐시                                    │  │
│  │                                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │ vsock                                 │
│                              ▼                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     Nitro Enclave                              │  │
│  │                                                                │  │
│  │  4. TLS Proxy Engine                                          │  │
│  │     - TLS 핸드셰이크 처리                                     │  │
│  │     - 요청/응답 복호화 및 관찰                                │  │
│  │     - SNI 기반 라우팅                                         │  │
│  │                                                                │  │
│  │  5. Attestation Generator                                     │  │
│  │     - Nitro NSM API 호출                                      │  │
│  │     - Attestation Document 생성                               │  │
│  │     - 데이터 해시 포함                                        │  │
│  │                                                                │  │
│  │  6. Signature Service                                         │  │
│  │     - ECDSA 서명 (secp256k1)                                  │  │
│  │     - 개인키는 Enclave 내부에서만 존재                        │  │
│  │                                                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 각 컴포넌트 상세

#### 컴포넌트 1: API Gateway

**기능:**
- 클라이언트 요청 수신
- 인증/인가
- Rate limiting
- 요청 검증

**엔드포인트:**
```
POST /api/v1/session/create
  - 새 attestation 세션 생성
  - Returns: session_id, enclave_public_key

POST /api/v1/session/{id}/request
  - TLS 프록시 요청 (target URL, headers, body)
  - Enclave에서 처리 후 결과 반환

POST /api/v1/session/{id}/attest
  - 특정 데이터에 대한 attestation 생성
  - Returns: attestation_document, signature

GET /api/v1/verify
  - Attestation document 검증
  - Returns: verification_result
```

#### 컴포넌트 2: vsock Proxy

**기능:**
- TCP 소켓 ↔ vsock 변환
- 외부 HTTPS 요청을 Enclave로 전달
- 응답을 클라이언트로 반환

**구현:**
```rust
// AWS 공식 vsock-proxy 사용 또는 커스텀 구현
// https://github.com/aws/aws-nitro-enclaves-cli/tree/main/vsock_proxy
```

#### 컴포넌트 3: TLS Proxy Engine (Enclave 내부)

**기능:**
- Client ↔ Target 간 TLS 프록시
- 복호화된 데이터 관찰
- 특정 필드 추출 (XPath, JSONPath)

**구현 고려사항:**
```
1. TLS 라이브러리: rustls (순수 Rust, OpenSSL 의존성 없음)
2. SNI 추출: TLS ClientHello에서 서버 이름 추출
3. 데이터 파싱: JSON, HTML 응답 파싱
4. 필드 추출: 사용자 정의 스키마 기반
```

#### 컴포넌트 4: Attestation Generator (Enclave 내부)

**기능:**
- Nitro NSM API 호출
- Attestation Document 생성
- 커스텀 데이터 포함

**API 호출:**
```rust
use aws_nitro_enclaves_nsm_api::api::Request;

// Attestation 문서 요청
let request = Request::Attestation {
    user_data: Some(user_data_bytes),  // 관찰된 데이터 해시
    nonce: Some(nonce_bytes),          // 리플레이 방지
    public_key: Some(public_key_bytes), // 암호화용 공개키
};

let response = nsm_driver.process_request(request)?;
```

#### 컴포넌트 5: Signature Service (Enclave 내부)

**기능:**
- ECDSA 서명 생성
- 개인키 관리 (Enclave 부팅 시 생성)
- 서명 검증용 공개키 제공

---

## 5. 구현 예제 코드

### 5.1 프로젝트 구조

```
proofport-attestor/
├── parent/                      # Parent Instance 코드
│   ├── src/
│   │   ├── main.rs             # API 서버 진입점
│   │   ├── api/
│   │   │   ├── mod.rs
│   │   │   ├── session.rs      # 세션 API
│   │   │   └── verify.rs       # 검증 API
│   │   ├── proxy/
│   │   │   └── vsock_proxy.rs  # vsock 프록시
│   │   └── config.rs
│   ├── Cargo.toml
│   └── Dockerfile
│
├── enclave/                     # Enclave 코드
│   ├── src/
│   │   ├── main.rs             # Enclave 진입점
│   │   ├── tls_proxy.rs        # TLS 프록시 엔진
│   │   ├── attestation.rs      # Attestation 생성
│   │   ├── signature.rs        # 서명 서비스
│   │   └── nsm.rs              # Nitro NSM API 래퍼
│   ├── Cargo.toml
│   └── Dockerfile.enclave
│
├── shared/                      # 공유 코드
│   ├── src/
│   │   ├── lib.rs
│   │   ├── protocol.rs         # vsock 프로토콜 정의
│   │   └── types.rs            # 공통 타입
│   └── Cargo.toml
│
├── scripts/
│   ├── build-enclave.sh        # Enclave 빌드
│   ├── run-enclave.sh          # Enclave 실행
│   └── deploy.sh               # 배포 스크립트
│
└── terraform/                   # 인프라 코드
    ├── main.tf
    ├── ec2.tf
    ├── vpc.tf
    └── alb.tf
```

### 5.2 Enclave 코드 예제

#### main.rs (Enclave 진입점)

```rust
use aws_nitro_enclaves_nsm_api::driver::NsmDriver;
use tokio::net::UnixListener;
use std::os::unix::net::UnixStream;

mod tls_proxy;
mod attestation;
mod signature;

const VSOCK_PORT: u32 = 5000;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // NSM 드라이버 초기화
    let nsm = NsmDriver::new()?;

    // 서명용 키페어 생성 (Enclave 부팅 시)
    let keypair = signature::generate_keypair()?;

    // vsock 리스너 시작
    let listener = vsock::VsockListener::bind(vsock::VMADDR_CID_ANY, VSOCK_PORT)?;

    println!("Enclave started on vsock port {}", VSOCK_PORT);

    loop {
        let (stream, addr) = listener.accept()?;
        let nsm = nsm.clone();
        let keypair = keypair.clone();

        tokio::spawn(async move {
            handle_connection(stream, nsm, keypair).await
        });
    }
}

async fn handle_connection(
    stream: vsock::VsockStream,
    nsm: NsmDriver,
    keypair: signature::KeyPair,
) -> Result<(), Box<dyn std::error::Error>> {
    // 프로토콜 메시지 파싱
    let request: shared::protocol::Request = read_message(&stream)?;

    match request {
        Request::TlsProxy { target_url, method, headers, body } => {
            // TLS 프록시 처리
            let response = tls_proxy::proxy_request(target_url, method, headers, body).await?;

            // 응답 데이터 해시
            let data_hash = sha256(&response.body);

            write_message(&stream, Response::TlsProxy {
                status: response.status,
                headers: response.headers,
                body: response.body,
                data_hash,
            })?;
        }

        Request::Attest { data_hash, nonce } => {
            // Attestation 문서 생성
            let attestation_doc = attestation::generate(&nsm, data_hash, nonce, &keypair.public)?;

            // 서명 생성
            let signature = signature::sign(&keypair, &attestation_doc)?;

            write_message(&stream, Response::Attest {
                attestation_document: attestation_doc,
                signature,
                public_key: keypair.public.to_bytes(),
            })?;
        }

        Request::GetPublicKey => {
            write_message(&stream, Response::PublicKey {
                public_key: keypair.public.to_bytes(),
            })?;
        }
    }

    Ok(())
}
```

#### attestation.rs

```rust
use aws_nitro_enclaves_nsm_api::{
    api::{Request, Response},
    driver::NsmDriver,
};

pub fn generate(
    nsm: &NsmDriver,
    data_hash: [u8; 32],
    nonce: [u8; 32],
    public_key: &[u8],
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    // user_data에 관찰된 데이터의 해시 포함
    let user_data = serde_cbor::to_vec(&AttestationUserData {
        data_hash,
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)?
            .as_secs(),
        version: "1.0".to_string(),
    })?;

    let request = Request::Attestation {
        user_data: Some(user_data.into()),
        nonce: Some(nonce.to_vec().into()),
        public_key: Some(public_key.to_vec().into()),
    };

    let response = nsm.process_request(request)?;

    match response {
        Response::Attestation { document } => Ok(document),
        Response::Error(e) => Err(format!("NSM error: {:?}", e).into()),
        _ => Err("Unexpected response".into()),
    }
}

#[derive(serde::Serialize)]
struct AttestationUserData {
    data_hash: [u8; 32],
    timestamp: u64,
    version: String,
}
```

#### tls_proxy.rs

```rust
use rustls::{ClientConfig, RootCertStore};
use tokio::net::TcpStream;
use tokio_rustls::TlsConnector;

pub struct TlsProxyResponse {
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

pub async fn proxy_request(
    target_url: &str,
    method: &str,
    headers: Vec<(String, String)>,
    body: Option<Vec<u8>>,
) -> Result<TlsProxyResponse, Box<dyn std::error::Error>> {
    let url = url::Url::parse(target_url)?;
    let host = url.host_str().ok_or("Invalid host")?;
    let port = url.port().unwrap_or(443);

    // TLS 설정 (시스템 루트 인증서 사용)
    let mut root_store = RootCertStore::empty();
    root_store.add_trust_anchors(
        webpki_roots::TLS_SERVER_ROOTS.iter().cloned()
    );

    let config = ClientConfig::builder()
        .with_safe_defaults()
        .with_root_certificates(root_store)
        .with_no_client_auth();

    let connector = TlsConnector::from(Arc::new(config));

    // TCP 연결 (vsock을 통해 외부로)
    let stream = TcpStream::connect(format!("{}:{}", host, port)).await?;

    // TLS 핸드셰이크
    let domain = rustls::ServerName::try_from(host)?;
    let mut tls_stream = connector.connect(domain, stream).await?;

    // HTTP 요청 전송
    let request = format!(
        "{} {} HTTP/1.1\r\nHost: {}\r\n{}\r\n\r\n",
        method,
        url.path(),
        host,
        headers.iter()
            .map(|(k, v)| format!("{}: {}", k, v))
            .collect::<Vec<_>>()
            .join("\r\n")
    );

    tls_stream.write_all(request.as_bytes()).await?;

    if let Some(body) = body {
        tls_stream.write_all(&body).await?;
    }

    // 응답 읽기 및 파싱
    let mut response_data = Vec::new();
    tls_stream.read_to_end(&mut response_data).await?;

    // HTTP 응답 파싱
    parse_http_response(&response_data)
}
```

### 5.3 Parent Instance 코드 예제

#### API 서버

```rust
use actix_web::{web, App, HttpServer, HttpResponse};
use vsock::VsockStream;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new()
            .route("/api/v1/session/create", web::post().to(create_session))
            .route("/api/v1/session/{id}/request", web::post().to(proxy_request))
            .route("/api/v1/session/{id}/attest", web::post().to(attest))
            .route("/api/v1/verify", web::post().to(verify))
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}

async fn create_session() -> HttpResponse {
    // Enclave에 연결하여 공개키 획득
    let stream = VsockStream::connect(ENCLAVE_CID, ENCLAVE_PORT)?;

    let request = shared::protocol::Request::GetPublicKey;
    send_message(&stream, &request)?;

    let response: shared::protocol::Response = receive_message(&stream)?;

    match response {
        Response::PublicKey { public_key } => {
            let session_id = generate_session_id();

            // 세션 저장
            save_session(&session_id, &public_key);

            HttpResponse::Ok().json(CreateSessionResponse {
                session_id,
                enclave_public_key: hex::encode(&public_key),
            })
        }
        _ => HttpResponse::InternalServerError().finish()
    }
}

async fn attest(path: web::Path<String>, body: web::Json<AttestRequest>) -> HttpResponse {
    let session_id = path.into_inner();

    // Enclave에 attestation 요청
    let stream = VsockStream::connect(ENCLAVE_CID, ENCLAVE_PORT)?;

    let request = shared::protocol::Request::Attest {
        data_hash: body.data_hash,
        nonce: body.nonce,
    };

    send_message(&stream, &request)?;

    let response: shared::protocol::Response = receive_message(&stream)?;

    match response {
        Response::Attest { attestation_document, signature, public_key } => {
            HttpResponse::Ok().json(AttestResponse {
                attestation_document: base64::encode(&attestation_document),
                signature: hex::encode(&signature),
                public_key: hex::encode(&public_key),
            })
        }
        _ => HttpResponse::InternalServerError().finish()
    }
}
```

### 5.4 Dockerfile (Enclave)

```dockerfile
# Enclave 빌드용 Dockerfile
FROM amazonlinux:2023 as builder

RUN dnf install -y gcc make openssl-devel

# Rust 설치
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

WORKDIR /app
COPY enclave/ .
COPY shared/ ../shared/

RUN cargo build --release

# 최종 이미지 (최소화)
FROM amazonlinux:2023-minimal

COPY --from=builder /app/target/release/enclave /app/enclave

# Enclave 시작 스크립트
COPY enclave/start.sh /app/start.sh
RUN chmod +x /app/start.sh

ENTRYPOINT ["/app/start.sh"]
```

### 5.5 빌드 및 실행 스크립트

```bash
#!/bin/bash
# scripts/build-enclave.sh

set -e

# Docker 이미지 빌드
docker build -t proofport-enclave -f enclave/Dockerfile.enclave .

# Enclave 이미지 파일 생성
nitro-cli build-enclave \
    --docker-uri proofport-enclave:latest \
    --output-file proofport-enclave.eif

# PCR 값 확인 (배포 시 사용)
echo "PCR values:"
nitro-cli describe-eif --eif-path proofport-enclave.eif
```

```bash
#!/bin/bash
# scripts/run-enclave.sh

set -e

# 기존 Enclave 종료
nitro-cli terminate-enclave --all 2>/dev/null || true

# Enclave 실행
nitro-cli run-enclave \
    --cpu-count 2 \
    --memory 2048 \
    --eif-path proofport-enclave.eif \
    --enclave-cid 16

echo "Enclave started with CID 16"

# Enclave 상태 확인
nitro-cli describe-enclaves
```

---

## 6. 배포 아키텍처

### 6.1 Terraform 인프라 코드

```hcl
# terraform/main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-northeast-2"  # 서울 리전
}

# VPC
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"

  name = "proofport-attestor-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["ap-northeast-2a", "ap-northeast-2c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = true  # 비용 절감
}

# Security Group
resource "aws_security_group" "attestor" {
  name        = "proofport-attestor-sg"
  description = "Security group for Attestor instances"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# EC2 Instance (Nitro Enclave 활성화)
resource "aws_instance" "attestor" {
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = "c6a.xlarge"

  subnet_id                   = module.vpc.private_subnets[0]
  vpc_security_group_ids      = [aws_security_group.attestor.id]
  associate_public_ip_address = false

  enclave_options {
    enabled = true
  }

  root_block_device {
    volume_size = 50
    volume_type = "gp3"
  }

  user_data = base64encode(file("${path.module}/user_data.sh"))

  tags = {
    Name = "proofport-attestor"
  }
}

# Application Load Balancer
resource "aws_lb" "attestor" {
  name               = "proofport-attestor-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets           = module.vpc.public_subnets
}

resource "aws_lb_target_group" "attestor" {
  name     = "proofport-attestor-tg"
  port     = 8080
  protocol = "HTTP"
  vpc_id   = module.vpc.vpc_id

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 10
  }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.attestor.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate.attestor.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.attestor.arn
  }
}
```

### 6.2 Auto Scaling (선택)

```hcl
# terraform/autoscaling.tf

resource "aws_launch_template" "attestor" {
  name_prefix   = "proofport-attestor-"
  image_id      = data.aws_ami.amazon_linux_2023.id
  instance_type = "c6a.xlarge"

  enclave_options {
    enabled = true
  }

  network_interfaces {
    associate_public_ip_address = false
    security_groups            = [aws_security_group.attestor.id]
  }

  user_data = base64encode(file("${path.module}/user_data.sh"))
}

resource "aws_autoscaling_group" "attestor" {
  name                = "proofport-attestor-asg"
  desired_capacity    = 2
  min_size           = 1
  max_size           = 10
  target_group_arns  = [aws_lb_target_group.attestor.arn]
  vpc_zone_identifier = module.vpc.private_subnets

  launch_template {
    id      = aws_launch_template.attestor.id
    version = "$Latest"
  }
}
```

---

## 7. 비용 분석

### 7.1 AWS 비용 구성

| 항목 | 사양 | 월 비용 (서울 리전) |
|-----|------|-------------------|
| EC2 (c6a.xlarge) | 4 vCPU, 8GB RAM | ~$100/월 |
| ALB | 기본 | ~$20/월 |
| NAT Gateway | 기본 | ~$35/월 |
| 데이터 전송 | 100GB/월 가정 | ~$9/월 |
| **Nitro Enclaves** | **추가 비용 없음** | **$0** |
| **합계** | | **~$164/월** |

### 7.2 vs 외부 서비스 비용 비교

| 서비스 | 비용 모델 | 예상 비용 (10만 건/월) |
|-------|---------|---------------------|
| **자체 운영 (AWS Nitro)** | 인프라만 | ~$164/월 (고정) |
| zkPass | API 호출당 | 비공개 (추정 $500+) |
| Reclaim Protocol | 네트워크 수수료 | 비공개 (토큰 기반) |
| TLSNotary (Self-hosted) | 인프라만 | ~$50/월 (작은 인스턴스) |

**결론:** 대량 처리 시 자체 운영이 비용 효율적

### 7.3 확장 비용

| 처리량 | 인스턴스 수 | 월 비용 |
|-------|-----------|--------|
| ~10만 건/월 | 1 | ~$164 |
| ~100만 건/월 | 3 | ~$400 |
| ~1000만 건/월 | 10 | ~$1,200 |

---

## 8. 보안 고려사항

### 8.1 TEE 보안 모델

```
┌─────────────────────────────────────────────────────────────────┐
│                     신뢰 경계 (Trust Boundary)                   │
│                                                                  │
│  ┌───────────────────┐       ┌───────────────────────────────┐  │
│  │   신뢰하지 않음    │       │        신뢰함                  │  │
│  │                   │       │                               │  │
│  │  - Host OS        │       │  - Nitro Hypervisor          │  │
│  │  - AWS Operator   │       │  - Enclave 내부 코드          │  │
│  │  - 네트워크       │       │  - AWS Root of Trust         │  │
│  │  - Parent App     │       │                               │  │
│  └───────────────────┘       └───────────────────────────────┘  │
│                                                                  │
│  🔒 Enclave 내부:                                               │
│  - 메모리 암호화                                                │
│  - 디버거 접근 불가                                              │
│  - 외부 네트워크 불가 (vsock만)                                  │
│  - 영구 저장소 없음                                              │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 주요 보안 조치

1. **코드 무결성**
   - PCR 값으로 Enclave 코드 검증
   - 서명된 EIF 사용 (PCR8)
   - CI/CD에서 자동 빌드 및 해시 기록

2. **키 관리**
   - 개인키는 Enclave 내부에서만 생성/사용
   - 부팅 시마다 새 키페어 생성 (세션 키)
   - AWS KMS 연동 옵션 (장기 키)

3. **통신 보안**
   - Parent ↔ Enclave: vsock (암호화 권장)
   - Client ↔ Parent: TLS 1.3
   - Enclave ↔ Target: TLS (원래 연결)

4. **Attestation 검증**
   - 클라이언트 측에서 Attestation Document 검증
   - AWS Root Certificate 체인 확인
   - PCR 값 비교 (허용 목록)

### 8.3 위협 모델

| 위협 | 완화 방법 |
|-----|---------|
| 악의적인 Host OS | TEE 격리, 메모리 암호화 |
| MITM 공격 | TLS, Attestation |
| 리플레이 공격 | Nonce 사용 |
| 사이드채널 공격 | 시간 기반 공격 완화 코드 |
| 코드 변조 | PCR 검증, 서명된 빌드 |

---

## 참고 자료

### AWS 공식 문서
- [AWS Nitro Enclaves User Guide](https://docs.aws.amazon.com/enclaves/latest/user/nitro-enclave.html)
- [Cryptographic Attestation](https://docs.aws.amazon.com/enclaves/latest/user/set-up-attestation.html)
- [AWS Nitro Enclaves NSM API](https://github.com/aws/aws-nitro-enclaves-nsm-api)

### 구현 참고
- [AWS Nitro Enclaves ACM](https://github.com/aws/aws-nitro-enclaves-acm)
- [Marlin Blog - Networking in Enclaves](https://blog.marlin.org/networking-within-aws-nitro-enclaves-a-tale-of-two-proxies)
- [TLSNotary Protocol](https://docs.tlsnotary.org/)

### 관련 프로젝트
- [primus-labs/otls](https://github.com/primus-labs/otls) - zkTLS 구현
- [TLSNotary Server](https://github.com/tlsnotary/tlsn)

---

*최종 업데이트: 2026-01-26*
