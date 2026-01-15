# 서버 없는 화이트리스트 관리 가이드

ZKProofPort 앱에서 서버 개입 없이 특정 유저들만 화이트리스트로 관리하고 외부 dApp과 연동하는 방법을 정리한 문서입니다.

---

## 목차

1. [개요](#개요)
2. [서버리스 화이트리스트 방식 비교](#서버리스-화이트리스트-방식-비교)
3. [방식 1: Merkle Tree 기반 화이트리스트](#방식-1-merkle-tree-기반-화이트리스트)
4. [방식 2: SBT (Soulbound Token) 기반](#방식-2-sbt-soulbound-token-기반)
5. [방식 3: Semaphore 프로토콜 (ZK 그룹 멤버십)](#방식-3-semaphore-프로토콜-zk-그룹-멤버십)
6. [방식 4: 서명 기반 오프체인 화이트리스트](#방식-4-서명-기반-오프체인-화이트리스트)
7. [B2B 비즈니스 모델: 업체 클라이언트 검증](#b2b-비즈니스-모델-업체-클라이언트-검증)
8. [IPFS vs 온체인 저장소 보안 비교](#ipfs-vs-온체인-저장소-보안-비교)
9. [P2P 직접 통신 (완전 서버리스)](#p2p-직접-통신-완전-서버리스)
10. [구현 권장 사항](#구현-권장-사항)
11. [참고 자료](#참고-자료)

---

## 개요

### 목표

```
┌─────────────────────────────────────────────────────────────────────┐
│                        서버 없는 아키텍처                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────┐         ┌──────────────┐         ┌──────────┐       │
│   │ 외부 dApp │ ◄─────► │ ZKProofPort  │ ◄─────► │Blockchain│       │
│   │(Web/Mobile)│        │     App      │         │(Verifier)│       │
│   └──────────┘         └──────────────┘         └──────────┘       │
│        │                      │                       │             │
│        │     QR/Deep Link     │    ZK Proof 생성      │             │
│        │◄─────────────────────┤                       │             │
│        │                      │   화이트리스트 검증    │             │
│        │                      ├──────────────────────►│             │
│        │         결과         │                       │             │
│        │◄─────────────────────┤◄──────────────────────│             │
│                                                                     │
│   ❌ 중앙 서버 없음                                                  │
│   ✅ 온체인 검증만 사용                                              │
│   ✅ P2P 직접 통신                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 핵심 요구사항

1. **서버 최소화**: 중앙 서버 없이 화이트리스트 관리
2. **프라이버시**: 화이트리스트 멤버 주소 노출 최소화
3. **검증 가능성**: 누구나 멤버십 검증 가능
4. **업데이트 용이성**: 화이트리스트 변경이 용이해야 함

---

## 서버리스 화이트리스트 방식 비교

| 방식 | 서버 필요 | 가스 비용 | 프라이버시 | 업데이트 | 구현 복잡도 |
|------|----------|----------|-----------|----------|-------------|
| Merkle Tree | ❌ | 낮음 | 중간 | 어려움 | 낮음 |
| SBT (Soulbound Token) | ❌ | 중간 | 낮음 | 쉬움 | 낮음 |
| Semaphore (ZK) | ❌ | 중간 | 높음 | 쉬움 | 높음 |
| 서명 기반 | 최소 | 없음 | 중간 | 쉬움 | 낮음 |
| NFT Token Gating | ❌ | 중간 | 낮음 | 쉬움 | 낮음 |

---

## 방식 1: Merkle Tree 기반 화이트리스트

가장 가스 효율적인 방식으로, 대규모 화이트리스트에 적합합니다.

### 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Merkle Tree 화이트리스트                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   화이트리스트 주소들                     Merkle Root               │
│   ┌─────────────────┐                    (온체인 저장)              │
│   │ 0xAAA...        │                         │                     │
│   │ 0xBBB...        │     해싱 & 트리 구성     │                     │
│   │ 0xCCC...        │ ──────────────────────► ┌┴┐                   │
│   │ 0xDDD...        │                        │R│ Root Hash         │
│   │ ...             │                        └┬┘                   │
│   └─────────────────┘                       ┌─┴─┐                  │
│                                            │   │                   │
│   오프체인 저장 (IPFS/GitHub)             ┌┴┐ ┌┴┐                  │
│                                          │H│ │H│ Branch Hashes    │
│                                          └┬┘ └┬┘                  │
│                                         ┌─┴─┐─┴─┐                 │
│                                        │A│B│C│D│ Leaf Hashes      │
│                                        └─┴─┴─┴─┘                  │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  검증 플로우:                                                        │
│                                                                     │
│  1. 사용자가 자신의 Merkle Proof 제출                                │
│  2. 스마트 컨트랙트가 Root Hash와 비교하여 검증                       │
│  3. 포함 여부 확인 → 접근 허용/거부                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 스마트 컨트랙트

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MerkleWhitelist is Ownable {
    bytes32 public merkleRoot;

    // 화이트리스트 root 업데이트 (관리자만)
    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }

    // 화이트리스트 멤버십 검증
    function isWhitelisted(
        address account,
        bytes32[] calldata merkleProof
    ) public view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(account));
        return MerkleProof.verify(merkleProof, merkleRoot, leaf);
    }

    // 화이트리스트 멤버만 호출 가능한 함수
    modifier onlyWhitelisted(bytes32[] calldata merkleProof) {
        require(isWhitelisted(msg.sender, merkleProof), "Not whitelisted");
        _;
    }

    // ZK 증명 검증 요청 (화이트리스트 멤버만)
    function requestVerification(
        bytes32[] calldata merkleProof,
        bytes calldata zkProof,
        bytes32[] calldata publicInputs
    ) external onlyWhitelisted(merkleProof) {
        // ZK 증명 검증 로직
    }
}
```

### 프론트엔드 (Merkle Proof 생성)

```typescript
// merkle-whitelist.ts
import { MerkleTree } from 'merkletreejs';
import { keccak256 } from 'ethers';

// 화이트리스트 주소 목록 (IPFS 또는 GitHub에서 로드)
const WHITELIST_URL = 'ipfs://Qm.../whitelist.json';
// 또는 GitHub: 'https://raw.githubusercontent.com/org/repo/main/whitelist.json'

export class MerkleWhitelist {
  private tree: MerkleTree;
  private addresses: string[];

  constructor(addresses: string[]) {
    this.addresses = addresses.map(addr => addr.toLowerCase());
    const leaves = this.addresses.map(addr => keccak256(addr));
    this.tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  }

  // Merkle Root 가져오기
  getRoot(): string {
    return this.tree.getHexRoot();
  }

  // 특정 주소의 Merkle Proof 생성
  getProof(address: string): string[] {
    const leaf = keccak256(address.toLowerCase());
    return this.tree.getHexProof(leaf);
  }

  // 로컬에서 검증
  verify(address: string, proof: string[]): boolean {
    const leaf = keccak256(address.toLowerCase());
    return this.tree.verify(proof, leaf, this.tree.getRoot());
  }

  // 화이트리스트 포함 여부 확인
  isWhitelisted(address: string): boolean {
    return this.addresses.includes(address.toLowerCase());
  }
}

// 사용 예시
async function checkWhitelist(userAddress: string) {
  // IPFS에서 화이트리스트 로드
  const response = await fetch(WHITELIST_URL);
  const whitelist = await response.json();

  const merkle = new MerkleWhitelist(whitelist.addresses);

  if (merkle.isWhitelisted(userAddress)) {
    const proof = merkle.getProof(userAddress);
    console.log('Merkle Proof:', proof);
    return { isWhitelisted: true, proof };
  }

  return { isWhitelisted: false, proof: [] };
}
```

### 화이트리스트 저장 (IPFS)

```json
// whitelist.json (IPFS에 업로드)
{
  "version": "1.0",
  "updatedAt": "2025-12-23T00:00:00Z",
  "merkleRoot": "0x1234567890abcdef...",
  "addresses": [
    "0xAAA...",
    "0xBBB...",
    "0xCCC..."
  ]
}
```

```bash
# IPFS에 업로드
ipfs add whitelist.json
# 결과: QmXXX... (CID)
```

### 장단점

**장점:**
- 가스 비용 최소 (Root만 온체인 저장)
- 대규모 화이트리스트 지원 (수만 개)
- 오프체인 데이터는 IPFS/GitHub에 무료 저장

**단점:**
- 화이트리스트 변경 시 Root 업데이트 필요 (가스 비용)
- 기존 Proof가 무효화됨
- 실시간 추가/제거 어려움

---

## 방식 2: SBT (Soulbound Token) 기반

양도 불가능한 NFT를 사용하여 멤버십을 표현합니다.

### 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SBT 기반 화이트리스트                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   관리자                     SBT 컨트랙트                 사용자     │
│   ┌─────┐                   ┌───────────┐               ┌─────┐    │
│   │Admin│ ── mint ────────► │   SBT     │ ◄─── 보유 ────│User │    │
│   └─────┘                   │ Contract  │               └─────┘    │
│                             └───────────┘                          │
│                                   │                                 │
│                                   │ balanceOf > 0?                  │
│                                   ▼                                 │
│                             ┌───────────┐                          │
│                             │  외부 dApp │                          │
│                             │  Verifier  │                          │
│                             └───────────┘                          │
│                                                                     │
│   특징:                                                             │
│   - 토큰 전송 불가 (Soulbound)                                       │
│   - 관리자가 mint/burn 가능                                          │
│   - 온체인에서 직접 조회 가능                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 스마트 컨트랙트

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ZKProofPortSBT is ERC721, Ownable {
    uint256 private _tokenIdCounter;

    // 토큰 ID → 만료 시간 (선택적)
    mapping(uint256 => uint256) public expiresAt;

    constructor() ERC721("ZKProofPort Membership", "ZKPM") Ownable(msg.sender) {}

    // 멤버십 발급 (관리자만)
    function mint(address to) external onlyOwner {
        require(balanceOf(to) == 0, "Already has membership");
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
    }

    // 만료 시간과 함께 발급
    function mintWithExpiry(address to, uint256 duration) external onlyOwner {
        require(balanceOf(to) == 0, "Already has membership");
        uint256 tokenId = _tokenIdCounter++;
        _safeMint(to, tokenId);
        expiresAt[tokenId] = block.timestamp + duration;
    }

    // 멤버십 취소 (관리자만)
    function revoke(uint256 tokenId) external onlyOwner {
        _burn(tokenId);
    }

    // 전송 금지 (Soulbound)
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);
        // mint와 burn만 허용, 전송은 금지
        require(from == address(0) || to == address(0), "Soulbound: Transfer disabled");
        return super._update(to, tokenId, auth);
    }

    // 유효한 멤버십 확인
    function hasValidMembership(address account) public view returns (bool) {
        if (balanceOf(account) == 0) return false;

        // 만료 시간 체크 (설정된 경우)
        uint256 tokenId = tokenOfOwnerByIndex(account, 0);
        if (expiresAt[tokenId] > 0 && block.timestamp > expiresAt[tokenId]) {
            return false;
        }

        return true;
    }
}
```

### 외부 dApp에서 검증

```typescript
// 외부 dApp에서 SBT 멤버십 확인
import { ethers } from 'ethers';

const SBT_CONTRACT = '0x...'; // ZKProofPortSBT 주소
const SBT_ABI = ['function hasValidMembership(address) view returns (bool)'];

async function checkMembership(userAddress: string): Promise<boolean> {
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(SBT_CONTRACT, SBT_ABI, provider);

  return await contract.hasValidMembership(userAddress);
}
```

### 장단점

**장점:**
- 실시간 추가/제거 가능
- 온체인에서 직접 조회 가능 (서버 불필요)
- 만료 시간, 등급 등 메타데이터 추가 가능

**단점:**
- mint/burn 시 가스 비용 발생
- 멤버 주소가 온체인에 공개됨 (프라이버시 낮음)

---

## 방식 3: Semaphore 프로토콜 (ZK 그룹 멤버십)

**프라이버시를 최우선**으로 하는 경우 권장하는 방식입니다.

### 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Semaphore 프로토콜 기반 화이트리스트                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    Semaphore Group                          │    │
│  │                                                             │    │
│  │   Identity Commitment (익명)                                │    │
│  │   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                      │    │
│  │   │ IC₁  │ │ IC₂  │ │ IC₃  │ │ IC₄  │  ...                 │    │
│  │   └──────┘ └──────┘ └──────┘ └──────┘                      │    │
│  │       │         │         │         │                       │    │
│  │       └─────────┴─────────┴─────────┘                       │    │
│  │                       │                                     │    │
│  │                 Merkle Root                                 │    │
│  │                 (온체인 저장)                                │    │
│  │                                                             │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  검증 플로우:                                                        │
│  ┌─────────┐                                                        │
│  │  User   │                                                        │
│  │ (IC₂)   │                                                        │
│  └────┬────┘                                                        │
│       │                                                             │
│       │ 1. ZK Proof 생성                                            │
│       │    - "나는 이 그룹의 멤버다"                                  │
│       │    - 어떤 IC인지는 공개하지 않음                              │
│       ▼                                                             │
│  ┌─────────┐         ┌─────────────┐                               │
│  │ZK Proof │ ──────► │  Verifier   │                               │
│  │(익명)   │         │  Contract   │                               │
│  └─────────┘         └─────────────┘                               │
│                            │                                        │
│                            │ 2. Proof 검증                          │
│                            │    - Merkle Root와 비교                 │
│                            │    - Nullifier로 중복 방지              │
│                            ▼                                        │
│                      ✅ 멤버십 확인됨                                 │
│                      (누가 검증했는지는 알 수 없음)                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Semaphore 구현

```typescript
// semaphore-whitelist.ts
import { Identity } from '@semaphore-protocol/identity';
import { Group } from '@semaphore-protocol/group';
import { generateProof, verifyProof } from '@semaphore-protocol/proof';

const GROUP_ID = 1; // ZKProofPort 화이트리스트 그룹

// 1. 사용자 Identity 생성 (최초 1회)
function createIdentity(): Identity {
  // 사용자별 고유 Identity 생성
  const identity = new Identity();

  // identity.commitment를 관리자에게 제출하여 그룹에 추가
  console.log('Identity Commitment:', identity.commitment);

  // Private key는 사용자가 안전하게 보관
  return identity;
}

// 2. 그룹 관리 (관리자)
async function addMemberToGroup(identityCommitment: bigint) {
  // 온체인 Semaphore 컨트랙트에 멤버 추가
  const semaphore = new ethers.Contract(SEMAPHORE_ADDRESS, SEMAPHORE_ABI, signer);
  await semaphore.addMember(GROUP_ID, identityCommitment);
}

// 3. 멤버십 증명 생성 (사용자)
async function proveGroupMembership(
  identity: Identity,
  groupMembers: bigint[], // 그룹 전체 멤버 목록 (오프체인에서 로드)
  signal: string // 검증하려는 신호 (예: dApp 주소)
) {
  const group = new Group(GROUP_ID, 20, groupMembers);

  const proof = await generateProof(
    identity,
    group,
    signal,
    GROUP_ID
  );

  return proof;
}

// 4. 증명 검증 (외부 dApp)
async function verifyMembership(proof: any) {
  const isValid = await verifyProof(proof);

  // 또는 온체인 검증
  const semaphore = new ethers.Contract(SEMAPHORE_ADDRESS, SEMAPHORE_ABI, provider);
  const onChainValid = await semaphore.verifyProof(
    GROUP_ID,
    proof.merkleTreeRoot,
    proof.signal,
    proof.nullifierHash,
    proof.externalNullifier,
    proof.proof
  );

  return { isValid, onChainValid };
}
```

### Semaphore 스마트 컨트랙트 연동

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";

contract ZKProofPortVerifier {
    ISemaphore public semaphore;
    uint256 public groupId;

    // 이미 사용된 nullifier 추적 (중복 검증 방지)
    mapping(uint256 => bool) public nullifierUsed;

    constructor(address _semaphore, uint256 _groupId) {
        semaphore = ISemaphore(_semaphore);
        groupId = _groupId;
    }

    // 그룹 멤버만 ZK 증명 제출 가능
    function submitProof(
        uint256 merkleTreeRoot,
        uint256 signal,
        uint256 nullifierHash,
        uint256 externalNullifier,
        uint256[8] calldata proof,
        bytes calldata zkCoinbaseProof,
        bytes32[] calldata publicInputs
    ) external {
        // 1. Semaphore로 그룹 멤버십 검증
        require(!nullifierUsed[nullifierHash], "Proof already used");

        semaphore.verifyProof(
            groupId,
            merkleTreeRoot,
            signal,
            nullifierHash,
            externalNullifier,
            proof
        );

        nullifierUsed[nullifierHash] = true;

        // 2. Coinbase KYC ZK 증명 검증
        // ... 기존 검증 로직
    }
}
```

### 장단점

**장점:**
- **완전한 프라이버시**: 누가 검증했는지 알 수 없음
- Nullifier로 중복 검증 방지
- 멤버 주소가 온체인에 노출되지 않음

**단점:**
- 구현 복잡도 높음
- 그룹 멤버 목록을 오프체인에서 동기화해야 함
- 증명 생성에 시간 소요

---

## 방식 4: 서명 기반 오프체인 화이트리스트

관리자 서명을 통해 화이트리스트 멤버십을 증명하는 방식입니다.

### 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                   서명 기반 화이트리스트                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐                                                       │
│  │  Admin   │ (오프라인 서명 가능)                                   │
│  │  Wallet  │                                                       │
│  └────┬─────┘                                                       │
│       │                                                             │
│       │ 1. 화이트리스트 주소에 대한 서명 생성                         │
│       │    sign(keccak256(contract, userAddress, nonce))            │
│       │                                                             │
│       ▼                                                             │
│  ┌──────────┐                                                       │
│  │ Signature│ ─────► 사용자에게 전달 (이메일, DM 등)                  │
│  │  (v,r,s) │        또는 IPFS/GitHub에 저장                         │
│  └──────────┘                                                       │
│                                                                     │
│                                                                     │
│  ┌──────────┐         ┌─────────────┐         ┌─────────────┐      │
│  │   User   │ ──────► │   Smart     │ ──────► │   ecrecover │      │
│  │ + 서명   │         │  Contract   │         │   (검증)    │      │
│  └──────────┘         └─────────────┘         └─────────────┘      │
│                             │                                       │
│                             │ 서명자 == 관리자 주소?                 │
│                             ▼                                       │
│                       ✅ 화이트리스트 확인                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 스마트 컨트랙트

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SignatureWhitelist is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public signer; // 화이트리스트 서명자 (관리자)
    mapping(address => uint256) public nonces; // 리플레이 방지

    constructor(address _signer) Ownable(msg.sender) {
        signer = _signer;
    }

    // 서명자 변경 (관리자만)
    function setSigner(address _signer) external onlyOwner {
        signer = _signer;
    }

    // 화이트리스트 검증
    function isWhitelisted(
        address account,
        uint256 nonce,
        bytes calldata signature
    ) public view returns (bool) {
        // 메시지 해시 생성
        bytes32 messageHash = keccak256(abi.encodePacked(
            address(this),  // 컨트랙트 주소 (다른 컨트랙트에서 재사용 방지)
            account,        // 사용자 주소
            nonce          // 논스
        ));

        // EIP-191 서명 형식으로 변환
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();

        // 서명자 복구
        address recoveredSigner = ethSignedMessageHash.recover(signature);

        // 서명자 검증
        return recoveredSigner == signer && nonce >= nonces[account];
    }

    // 화이트리스트 멤버용 함수
    function verifyAndExecute(
        uint256 nonce,
        bytes calldata signature,
        bytes calldata zkProof,
        bytes32[] calldata publicInputs
    ) external {
        require(isWhitelisted(msg.sender, nonce, signature), "Not whitelisted");

        // 논스 업데이트 (리플레이 방지)
        nonces[msg.sender] = nonce + 1;

        // ZK 증명 검증 로직
        // ...
    }
}
```

### 서명 생성 (관리자)

```typescript
// admin-sign.ts
import { ethers } from 'ethers';

const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY!;
const CONTRACT_ADDRESS = '0x...';

async function generateWhitelistSignature(
  userAddress: string,
  nonce: number
): Promise<string> {
  const wallet = new ethers.Wallet(ADMIN_PRIVATE_KEY);

  // 메시지 해시 생성 (컨트랙트와 동일한 방식)
  const messageHash = ethers.utils.solidityKeccak256(
    ['address', 'address', 'uint256'],
    [CONTRACT_ADDRESS, userAddress, nonce]
  );

  // 서명 생성
  const signature = await wallet.signMessage(
    ethers.utils.arrayify(messageHash)
  );

  return signature;
}

// 화이트리스트 일괄 생성
async function generateAllSignatures(addresses: string[]) {
  const signatures: Record<string, { nonce: number; signature: string }> = {};

  for (const address of addresses) {
    const signature = await generateWhitelistSignature(address, 0);
    signatures[address.toLowerCase()] = { nonce: 0, signature };
  }

  // IPFS 또는 GitHub에 저장
  return signatures;
}
```

### 장단점

**장점:**
- 가스 비용 없음 (서명은 오프체인)
- 화이트리스트 실시간 추가 가능
- 서명만 전달하면 됨 (서버 불필요)

**단점:**
- 관리자 개인키 관리 필요
- 서명 배포 방법 필요 (IPFS, 이메일 등)

---

## B2B 비즈니스 모델: 업체 클라이언트 검증

ZKProofPort를 **B2B SaaS**로 제공할 때, 개인이 아닌 **업체(Business)**가 클라이언트가 되고, 업체의 고객이 앱을 사용하는 모델입니다.

### 비즈니스 모델 개요

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       B2B 비즈니스 모델 구조                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │   ZKProofPort   │  ← 서비스 제공자 (우리)                                 │
│  │    운영팀       │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           │ 1. 업체 계약 & 클라이언트 ID 발급                                │
│           │    - clientId: "company_A"                                      │
│           │    - publicKey 등록                                             │
│           │    - privateKey 전달                                            │
│           │                                                                 │
│           ▼                                                                 │
│  ┌─────────────────┐         ┌─────────────────┐                           │
│  │    업체 A       │         │    업체 B       │  ← 유료 클라이언트 (B2B)   │
│  │ (게임회사 등)    │         │ (금융서비스 등)  │                           │
│  └────────┬────────┘         └────────┬────────┘                           │
│           │                           │                                     │
│           │ 2. 고객에게 서명된 요청 제공                                     │
│           │    (업체 privateKey로 서명)                                     │
│           │                                                                 │
│           ▼                           ▼                                     │
│  ┌─────────────────┐         ┌─────────────────┐                           │
│  │  업체 A의 고객  │         │  업체 B의 고객  │  ← 최종 사용자 (무료)       │
│  │  (게임 유저)    │         │  (금융 고객)    │                            │
│  └────────┬────────┘         └────────┬────────┘                           │
│           │                           │                                     │
│           │ 3. ZKProofPort 앱 실행                                          │
│           │    - 업체 서명 검증                                             │
│           │    - KYC 증명 생성                                              │
│           │                                                                 │
│           ▼                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        ZKProofPort App                               │   │
│  │                                                                       │   │
│  │  1. 업체 서명 검증 (온체인에서 publicKey 확인)                        │   │
│  │  2. 유효한 업체인지 확인 (활성화 상태, 만료일)                         │   │
│  │  3. KYC 증명 생성 허용                                                │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  💰 수익 모델:                                                              │
│  - 업체별 월정액 또는 증명 생성 횟수 기반 과금                               │
│  - 최종 사용자(고객)는 무료로 앱 사용                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 검증 플로우 상세

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       B2B 클라이언트 검증 플로우                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [1단계: 업체 등록 - ZKProofPort 운영]                                       │
│                                                                             │
│    업체 A 계약 → clientId: "company_A"                                      │
│                  publicKey 등록 (온체인)                                    │
│                  업체에게 privateKey 전달                                   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [2단계: 업체 서비스에서 고객이 인증 요청]                                    │
│                                                                             │
│    업체 A 웹사이트/앱                                                       │
│         ↓                                                                   │
│    "KYC 인증하기" 버튼 클릭                                                  │
│         ↓                                                                   │
│    업체 서버에서 서명 생성:                                                  │
│    {                                                                        │
│      clientId: "company_A",                                                 │
│      timestamp: 1703420000,                                                 │
│      nonce: "random123",                                                    │
│      signature: sign(clientId + timestamp + nonce, privateKey)              │
│    }                                                                        │
│         ↓                                                                   │
│    Deep Link로 ZKProofPort 앱 호출                                          │
│    zkproofport://verify?clientId=company_A&ts=...&nonce=...&sig=...         │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [3단계: ZKProofPort 앱에서 검증]                                            │
│                                                                             │
│    1. clientId로 온체인에서 publicKey 조회                                  │
│    2. signature 검증 (ecrecover로 서명자 확인)                              │
│    3. timestamp 유효성 검증 (예: 5분 이내)                                  │
│    4. 업체 상태 확인 (활성화, 만료일)                                        │
│    5. ✅ 검증 성공 → KYC 증명 생성 허용                                     │
│       ❌ 검증 실패 → "유효하지 않은 클라이언트" 에러                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 온체인 업체 화이트리스트 컨트랙트

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BusinessWhitelist
 * @notice B2B 클라이언트(업체) 화이트리스트 관리 컨트랙트
 * @dev 업체별 publicKey, 활성화 상태, 만료일 관리
 */
contract BusinessWhitelist is Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    struct Business {
        address publicKey;      // 업체의 서명용 주소
        bool isActive;          // 활성화 상태
        uint256 expiresAt;      // 계약 만료일 (timestamp)
        string name;            // 업체명 (optional)
        uint256 registeredAt;   // 등록일
    }

    // clientId (bytes32) → Business 정보
    mapping(bytes32 => Business) public businesses;

    // 등록된 업체 목록 (조회용)
    bytes32[] public businessIds;

    // 이벤트
    event BusinessRegistered(
        bytes32 indexed clientId,
        address publicKey,
        string name,
        uint256 expiresAt
    );
    event BusinessDeactivated(bytes32 indexed clientId);
    event BusinessReactivated(bytes32 indexed clientId);
    event BusinessExtended(bytes32 indexed clientId, uint256 newExpiresAt);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice 새 업체 등록 (ZKProofPort 운영팀만)
     * @param clientId 업체 식별자 (keccak256(업체명) 등)
     * @param publicKey 업체의 서명용 공개키 주소
     * @param name 업체명
     * @param validDays 계약 유효 기간 (일)
     */
    function registerBusiness(
        bytes32 clientId,
        address publicKey,
        string calldata name,
        uint256 validDays
    ) external onlyOwner {
        require(businesses[clientId].publicKey == address(0), "Already registered");
        require(publicKey != address(0), "Invalid public key");

        uint256 expiresAt = block.timestamp + (validDays * 1 days);

        businesses[clientId] = Business({
            publicKey: publicKey,
            isActive: true,
            expiresAt: expiresAt,
            name: name,
            registeredAt: block.timestamp
        });

        businessIds.push(clientId);

        emit BusinessRegistered(clientId, publicKey, name, expiresAt);
    }

    /**
     * @notice 업체 비활성화 (계약 해지 등)
     */
    function deactivateBusiness(bytes32 clientId) external onlyOwner {
        require(businesses[clientId].publicKey != address(0), "Not registered");
        businesses[clientId].isActive = false;
        emit BusinessDeactivated(clientId);
    }

    /**
     * @notice 업체 재활성화
     */
    function reactivateBusiness(bytes32 clientId) external onlyOwner {
        require(businesses[clientId].publicKey != address(0), "Not registered");
        businesses[clientId].isActive = true;
        emit BusinessReactivated(clientId);
    }

    /**
     * @notice 계약 연장
     */
    function extendContract(bytes32 clientId, uint256 additionalDays) external onlyOwner {
        require(businesses[clientId].publicKey != address(0), "Not registered");

        uint256 currentExpiry = businesses[clientId].expiresAt;
        uint256 baseTime = currentExpiry > block.timestamp ? currentExpiry : block.timestamp;
        uint256 newExpiresAt = baseTime + (additionalDays * 1 days);

        businesses[clientId].expiresAt = newExpiresAt;

        emit BusinessExtended(clientId, newExpiresAt);
    }

    /**
     * @notice 업체 유효성 확인
     * @return 업체가 유효한지 여부 (등록됨 + 활성화 + 만료되지 않음)
     */
    function isValidBusiness(bytes32 clientId) public view returns (bool) {
        Business memory b = businesses[clientId];
        return b.publicKey != address(0) &&
               b.isActive &&
               block.timestamp < b.expiresAt;
    }

    /**
     * @notice 업체 publicKey 조회
     */
    function getBusinessPublicKey(bytes32 clientId) external view returns (address) {
        return businesses[clientId].publicKey;
    }

    /**
     * @notice 업체 상세 정보 조회
     */
    function getBusinessInfo(bytes32 clientId) external view returns (
        address publicKey,
        bool isActive,
        uint256 expiresAt,
        string memory name,
        uint256 registeredAt,
        bool isCurrentlyValid
    ) {
        Business memory b = businesses[clientId];
        return (
            b.publicKey,
            b.isActive,
            b.expiresAt,
            b.name,
            b.registeredAt,
            isValidBusiness(clientId)
        );
    }

    /**
     * @notice 업체 서명 검증 (앱에서 호출)
     * @param clientId 업체 ID
     * @param timestamp 서명 시점
     * @param nonce 리플레이 방지용 난수
     * @param signature 업체의 서명
     * @return valid 서명이 유효한지 여부
     */
    function verifyBusinessSignature(
        bytes32 clientId,
        uint256 timestamp,
        bytes32 nonce,
        bytes calldata signature
    ) external view returns (bool valid) {
        // 1. 업체 유효성 확인
        if (!isValidBusiness(clientId)) {
            return false;
        }

        // 2. timestamp 유효성 (5분 이내)
        if (block.timestamp > timestamp + 5 minutes) {
            return false;
        }

        // 3. 서명 검증
        bytes32 messageHash = keccak256(abi.encodePacked(
            clientId,
            timestamp,
            nonce
        ));

        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(signature);

        // 4. 서명자가 등록된 publicKey와 일치하는지 확인
        return recoveredSigner == businesses[clientId].publicKey;
    }

    /**
     * @notice 등록된 업체 수 조회
     */
    function getBusinessCount() external view returns (uint256) {
        return businessIds.length;
    }
}
```

### 앱에서 업체 검증 로직 (TypeScript)

```typescript
// business-verification.ts
import { ethers } from 'ethers';

// Deep Link로 전달받는 파라미터
interface BusinessRequest {
  clientId: string;      // 업체 ID (예: "company_A")
  timestamp: number;     // 서명 시점 (Unix timestamp)
  nonce: string;         // 랜덤 문자열
  signature: string;     // 업체의 서명
}

const WHITELIST_CONTRACT = '0x...';  // BusinessWhitelist 컨트랙트 주소
const WHITELIST_ABI = [
  'function isValidBusiness(bytes32) view returns (bool)',
  'function getBusinessPublicKey(bytes32) view returns (address)',
  'function verifyBusinessSignature(bytes32, uint256, bytes32, bytes) view returns (bool)',
];

/**
 * 업체 요청 검증 (앱에서 호출)
 */
export async function verifyBusinessRequest(
  request: BusinessRequest,
  provider: ethers.Provider
): Promise<{ valid: boolean; error?: string }> {
  const { clientId, timestamp, nonce, signature } = request;

  try {
    // 1. timestamp 검증 (로컬에서 먼저 체크)
    const now = Math.floor(Date.now() / 1000);
    if (now - timestamp > 300) {  // 5분
      return { valid: false, error: 'Request expired' };
    }

    const contract = new ethers.Contract(
      WHITELIST_CONTRACT,
      WHITELIST_ABI,
      provider
    );

    // 2. clientId를 bytes32로 변환
    const clientIdHash = ethers.keccak256(ethers.toUtf8Bytes(clientId));

    // 3. 온체인에서 업체 유효성 확인
    const isValid = await contract.isValidBusiness(clientIdHash);
    if (!isValid) {
      return { valid: false, error: 'Invalid or expired business' };
    }

    // 4. 서명 검증 (온체인 또는 오프체인)
    // 방법 A: 온체인 검증 (가스 비용 없음, view 함수)
    const nonceHash = ethers.keccak256(ethers.toUtf8Bytes(nonce));
    const signatureValid = await contract.verifyBusinessSignature(
      clientIdHash,
      timestamp,
      nonceHash,
      signature
    );

    if (!signatureValid) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, error: msg };
  }
}

/**
 * 오프체인 서명 검증 (가스 비용 완전 제로)
 */
export async function verifyBusinessRequestOffchain(
  request: BusinessRequest,
  provider: ethers.Provider
): Promise<{ valid: boolean; error?: string }> {
  const { clientId, timestamp, nonce, signature } = request;

  try {
    // 1. timestamp 검증
    const now = Math.floor(Date.now() / 1000);
    if (now - timestamp > 300) {
      return { valid: false, error: 'Request expired' };
    }

    const contract = new ethers.Contract(
      WHITELIST_CONTRACT,
      WHITELIST_ABI,
      provider
    );

    const clientIdHash = ethers.keccak256(ethers.toUtf8Bytes(clientId));

    // 2. 업체 유효성 및 publicKey 조회
    const [isValid, publicKey] = await Promise.all([
      contract.isValidBusiness(clientIdHash),
      contract.getBusinessPublicKey(clientIdHash),
    ]);

    if (!isValid) {
      return { valid: false, error: 'Invalid or expired business' };
    }

    // 3. 오프체인 서명 검증
    const nonceHash = ethers.keccak256(ethers.toUtf8Bytes(nonce));
    const messageHash = ethers.keccak256(
      ethers.solidityPacked(
        ['bytes32', 'uint256', 'bytes32'],
        [clientIdHash, timestamp, nonceHash]
      )
    );

    const recoveredAddress = ethers.verifyMessage(
      ethers.getBytes(messageHash),
      signature
    );

    if (recoveredAddress.toLowerCase() !== publicKey.toLowerCase()) {
      return { valid: false, error: 'Invalid signature' };
    }

    return { valid: true };

  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return { valid: false, error: msg };
  }
}
```

### 업체 측 서명 생성 (업체 서버에서 실행)

```typescript
// business-server.ts (업체 서버 코드)
import { ethers } from 'ethers';

// 환경변수에서 로드 (절대 노출 금지!)
const BUSINESS_PRIVATE_KEY = process.env.BUSINESS_PRIVATE_KEY!;
const CLIENT_ID = process.env.CLIENT_ID!;  // "company_A"

interface SignedRequest {
  clientId: string;
  timestamp: number;
  nonce: string;
  signature: string;
  deepLink: string;
}

/**
 * ZKProofPort 앱 호출용 서명된 요청 생성
 */
export async function generateSignedRequest(): Promise<SignedRequest> {
  const wallet = new ethers.Wallet(BUSINESS_PRIVATE_KEY);

  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = ethers.hexlify(ethers.randomBytes(16));  // 랜덤 nonce

  // 메시지 해시 생성 (컨트랙트와 동일한 방식)
  const clientIdHash = ethers.keccak256(ethers.toUtf8Bytes(CLIENT_ID));
  const nonceHash = ethers.keccak256(ethers.toUtf8Bytes(nonce));

  const messageHash = ethers.keccak256(
    ethers.solidityPacked(
      ['bytes32', 'uint256', 'bytes32'],
      [clientIdHash, timestamp, nonceHash]
    )
  );

  // 서명 생성
  const signature = await wallet.signMessage(ethers.getBytes(messageHash));

  // Deep Link URL 생성
  const params = new URLSearchParams({
    clientId: CLIENT_ID,
    ts: timestamp.toString(),
    nonce: nonce,
    sig: signature,
  });

  const deepLink = `zkproofport://verify?${params.toString()}`;

  return {
    clientId: CLIENT_ID,
    timestamp,
    nonce,
    signature,
    deepLink,
  };
}

// Express.js 예시
import express from 'express';
const app = express();

app.get('/api/kyc-link', async (req, res) => {
  const signedRequest = await generateSignedRequest();

  // QR 코드 생성용 또는 직접 리다이렉트
  res.json({
    deepLink: signedRequest.deepLink,
    expiresIn: 300,  // 5분
  });
});
```

### Deep Link 처리 (React Native 앱)

```typescript
// useBusinessVerification.ts
import { useEffect } from 'react';
import { Linking } from 'react-native';
import { verifyBusinessRequestOffchain } from './business-verification';

export function useBusinessVerification(
  provider: ethers.Provider,
  onVerified: (clientId: string) => void,
  onError: (error: string) => void
) {
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = new URL(event.url);

      if (url.protocol !== 'zkproofport:' || url.pathname !== '//verify') {
        return;
      }

      const params = url.searchParams;
      const request = {
        clientId: params.get('clientId') || '',
        timestamp: parseInt(params.get('ts') || '0', 10),
        nonce: params.get('nonce') || '',
        signature: params.get('sig') || '',
      };

      // 업체 검증
      const result = await verifyBusinessRequestOffchain(request, provider);

      if (result.valid) {
        onVerified(request.clientId);
      } else {
        onError(result.error || 'Verification failed');
      }
    };

    // Deep Link 리스너 등록
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // 앱이 Deep Link로 시작된 경우 처리
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => subscription.remove();
  }, [provider, onVerified, onError]);
}
```

### B2B 모델 핵심 포인트

| 항목 | 설명 |
|------|------|
| **클라이언트** | 개인이 아닌 업체 (B2B) |
| **고객 인증** | 불필요 - 업체 서명으로 대체 |
| **업체 인증** | 서명 기반 (ECDSA) |
| **화이트리스트** | 온체인 저장 (더 신뢰성) |
| **리플레이 방지** | timestamp + nonce |
| **계약 관리** | 스마트 컨트랙트 (만료일, 활성화 상태) |
| **수익 모델** | 업체별 과금 (월정액 or 사용량 기반) |

---

## IPFS vs 온체인 저장소 보안 비교

화이트리스트 저장 위치에 따른 보안 특성을 비교합니다.

### IPFS 특성

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           IPFS 작동 방식                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │  whitelist.json │                                                        │
│  │  {              │                                                        │
│  │    "addresses": │                                                        │
│  │    ["0xAAA...", │                                                        │
│  │     "0xBBB..."] │                                                        │
│  │  }              │                                                        │
│  └────────┬────────┘                                                        │
│           │                                                                 │
│           │ 업로드 (ipfs add)                                               │
│           ▼                                                                 │
│  ┌─────────────────┐                                                        │
│  │   Content Hash  │  ← CID (Content Identifier)                           │
│  │   QmXYZ123...   │    파일 내용의 SHA-256 해시                            │
│  └─────────────────┘                                                        │
│                                                                             │
│  ✅ 장점:                                                                   │
│  - Content-addressed: 내용이 바뀌면 CID도 바뀜                              │
│  - Immutable: 한번 업로드된 내용은 변경 불가                                 │
│  - 변조 시 → CID 불일치 → 앱에서 검증 실패                                  │
│                                                                             │
│  ❌ 위험 요소:                                                              │
│  - Pinning 서비스 다운 시 파일 접근 불가                                    │
│  - 누구나 같은 CID로 파일 호스팅 가능 (검열 저항)                            │
│  - 네트워크 지연 발생 가능                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 온체인 저장 특성

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        온체인 저장 작동 방식                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │  Smart Contract │                                                        │
│  │                 │                                                        │
│  │  businesses:    │                                                        │
│  │  {              │                                                        │
│  │    "0xAAA...":  │                                                        │
│  │    { active,    │                                                        │
│  │      expiresAt, │                                                        │
│  │      publicKey }│                                                        │
│  │  }              │                                                        │
│  └─────────────────┘                                                        │
│                                                                             │
│  ✅ 장점:                                                                   │
│  - 블록체인 보안 보장 (51% 공격 외에는 변조 불가)                            │
│  - 항상 가용 (블록체인이 살아있는 한)                                        │
│  - 투명성: 누구나 검증 가능                                                  │
│  - 권한 관리: onlyOwner 등으로 수정 권한 제한                                │
│                                                                             │
│  ❌ 단점:                                                                   │
│  - 가스 비용 발생 (B2B라면 충분히 감당 가능)                                 │
│  - 대량 데이터 저장에 부적합 (비용 문제)                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 비교표

| 항목 | IPFS | 온체인 |
|------|------|--------|
| **변조 가능성** | 불가 (CID 변경됨) | 불가 (블록체인 보안) |
| **가용성** | Pinning 의존 | 항상 가용 |
| **비용** | 무료 (Pinning 제외) | 가스 비용 |
| **권한 관리** | 없음 | 스마트 컨트랙트로 관리 |
| **실시간 업데이트** | CID 변경 필요 | 즉시 반영 |
| **B2B 적합성** | 낮음 | **높음** |

### B2B에서 권장하는 방식

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      B2B 권장: 온체인 + 오프체인 하이브리드                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────┐     ┌───────────────────────────────┐   │
│  │         온체인 저장            │     │        오프체인 (서명)         │   │
│  ├───────────────────────────────┤     ├───────────────────────────────┤   │
│  │ - 업체 publicKey              │     │ - 업체가 생성하는 서명         │   │
│  │ - 활성화 상태                 │     │ - timestamp + nonce            │   │
│  │ - 만료일                      │     │ - Deep Link로 전달             │   │
│  │ - 업체명 (optional)           │     │                                │   │
│  └───────────────────────────────┘     └───────────────────────────────┘   │
│                 │                                    │                      │
│                 └────────────────┬───────────────────┘                      │
│                                  │                                          │
│                                  ▼                                          │
│                    ┌───────────────────────────────┐                       │
│                    │       ZKProofPort App          │                       │
│                    │                                │                       │
│                    │  1. 온체인에서 publicKey 조회  │                       │
│                    │  2. 오프체인 서명 검증         │                       │
│                    │  3. 가스 비용 = 0              │                       │
│                    │                                │                       │
│                    └───────────────────────────────┘                       │
│                                                                             │
│  💡 이 방식의 장점:                                                         │
│  - 업체 정보는 온체인 (신뢰성, 투명성)                                       │
│  - 검증은 오프체인 (가스 비용 제로)                                          │
│  - IPFS 불필요 (다운타임 위험 제거)                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### IPFS "해킹"에 대한 오해

IPFS는 전통적인 의미의 "해킹"이 어렵습니다:

1. **파일 변조 불가**:
   - IPFS 파일은 내용 해시(CID)로 식별
   - 내용을 바꾸면 CID도 바뀜
   - 앱이 특정 CID를 요청하면, 변조된 파일은 CID가 다르므로 무시됨

2. **실제 위험 요소**:
   - **Pinning 서비스 장애**: Pinata, Infura 등이 다운되면 파일 접근 불가
   - **네트워크 지연**: P2P 특성상 파일 조회가 느릴 수 있음
   - **키 관리**: 업데이트 권한을 가진 키가 탈취되면 새 CID로 교체 가능

3. **B2B에서 IPFS를 피하는 이유**:
   - 가용성 보장이 어려움
   - 업체 계약 상태 변경 시 CID 업데이트 필요
   - 온체인이 더 신뢰성 있고 실시간 업데이트 가능

---

## P2P 직접 통신 (완전 서버리스)

서버 없이 앱 간 직접 통신하는 방법입니다.

### 방법 1: QR 코드 + Deep Link (가장 간단)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    QR + Deep Link 완전 서버리스                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────┐                              ┌──────────────┐        │
│   │ 외부 dApp │                              │ ZKProofPort  │        │
│   │  (Web)   │                              │     App      │        │
│   └────┬─────┘                              └──────┬───────┘        │
│        │                                           │                │
│        │ 1. QR 코드 표시                           │                │
│        │    (callback URL 포함)                    │                │
│        │                                           │                │
│        │            ◄─── QR 스캔 ───               │                │
│        │                                           │                │
│        │                              2. ZK 증명 생성                │
│        │                              3. Merkle Proof 확인          │
│        │                              4. 온체인 검증 (직접)          │
│        │                                           │                │
│        │            ◄─── Deep Link ───             │                │
│        │    (proof + txHash 포함)                  │                │
│        │                                           │                │
│        │ 5. 결과 수신                               │                │
│        │    (URL 파라미터에서 추출)                  │                │
│        ▼                                           │                │
│   ┌──────────┐                                     │                │
│   │ 결과 표시 │                                     │                │
│   └──────────┘                                     │                │
│                                                                     │
│   ✅ 서버 완전 불필요                                                │
│   ✅ 블록체인만 사용                                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 방법 2: libp2p WebRTC Direct

브라우저와 모바일 앱 간 직접 P2P 연결을 지원합니다.

```typescript
// libp2p-direct.ts
import { createLibp2p } from 'libp2p';
import { webRTCDirect } from '@libp2p/webrtc-direct';

// P2P 노드 생성
const node = await createLibp2p({
  transports: [webRTCDirect()],
  // ...
});

// 다른 피어에 직접 연결
await node.dial('/ip4/127.0.0.1/tcp/9090/http/p2p-webrtc-direct/p2p/QmXXX');
```

**주의**: libp2p는 초기 연결을 위해 최소한의 시그널링이 필요합니다.

### 방법 3: 블록체인 이벤트 기반

스마트 컨트랙트 이벤트를 통해 통신합니다.

```
┌─────────────────────────────────────────────────────────────────────┐
│                   블록체인 이벤트 기반 통신                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────┐         ┌─────────────┐         ┌──────────────┐    │
│   │ 외부 dApp │         │  Smart      │         │ ZKProofPort  │    │
│   │          │         │ Contract    │         │     App      │    │
│   └────┬─────┘         └──────┬──────┘         └──────┬───────┘    │
│        │                      │                       │             │
│        │ 1. 검증 요청 TX      │                       │             │
│        │ (requestId, dApp)   │                       │             │
│        │─────────────────────►│                       │             │
│        │                      │                       │             │
│        │                      │ Event: VerifyRequest  │             │
│        │                      │──────────────────────►│             │
│        │                      │                       │             │
│        │                      │    2. ZK 증명 생성    │             │
│        │                      │    3. 결과 TX 제출    │             │
│        │                      │◄──────────────────────│             │
│        │                      │                       │             │
│        │ Event: ProofSubmitted│                       │             │
│        │◄─────────────────────│                       │             │
│        │                      │                       │             │
│        │ 4. 결과 조회         │                       │             │
│        │─────────────────────►│                       │             │
│        │◄─────────────────────│                       │             │
│        │                      │                       │             │
└─────────────────────────────────────────────────────────────────────┘
```

```solidity
// 이벤트 기반 통신 컨트랙트
contract EventBasedVerifier {
    event VerifyRequest(
        bytes32 indexed requestId,
        address indexed requester,
        address targetUser,
        uint256 timestamp
    );

    event ProofSubmitted(
        bytes32 indexed requestId,
        bool verified,
        bytes32 txHash
    );

    function requestVerification(address targetUser) external returns (bytes32) {
        bytes32 requestId = keccak256(abi.encodePacked(
            msg.sender, targetUser, block.timestamp
        ));

        emit VerifyRequest(requestId, msg.sender, targetUser, block.timestamp);
        return requestId;
    }

    function submitProof(
        bytes32 requestId,
        bytes calldata proof,
        bytes32[] calldata publicInputs
    ) external {
        // 검증 로직...
        bool verified = true;

        emit ProofSubmitted(requestId, verified, bytes32(0));
    }
}
```

---

## 구현 권장 사항

### 시나리오별 권장 방식

| 시나리오 | 권장 방식 | 이유 |
|----------|----------|------|
| 소규모 (< 100명), 변경 적음 | Merkle Tree | 가스 효율적, 구현 간단 |
| 중규모, 실시간 추가/제거 | SBT | 유연한 관리 |
| 프라이버시 최우선 | Semaphore | 익명 검증 |
| 가스 비용 최소화 | 서명 기반 | 온체인 비용 없음 |
| 완전 탈중앙화 | Merkle + IPFS | 서버 불필요 |
| **B2B SaaS 모델** | **온체인 + 서명** | 신뢰성, 계약 관리 용이 |

### ZKProofPort 권장 구현

**🎯 B2B SaaS 모델 (권장)**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        B2B SaaS 모델 아키텍처                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [온체인: BusinessWhitelist Contract]                                       │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ businesses: {                                                        │   │
│  │   "company_A": { publicKey, isActive, expiresAt, name }             │   │
│  │   "company_B": { publicKey, isActive, expiresAt, name }             │   │
│  │ }                                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                          │                                                  │
│                          │ view 함수 (가스 비용 0)                          │
│                          ▼                                                  │
│  [ZKProofPort App]                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 1. Deep Link에서 clientId, signature 추출                           │   │
│  │ 2. 온체인에서 publicKey 조회                                         │   │
│  │ 3. 오프체인 서명 검증 (ecrecover)                                    │   │
│  │ 4. 유효한 업체면 KYC 증명 생성 허용                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  💰 수익 모델: 업체별 월정액 또는 사용량 기반 과금                           │
│  ✅ 서버 불필요 (온체인 + 서명만 사용)                                       │
│  ✅ 가스 비용 최소 (업체 등록 시에만 발생)                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Phase 1: Merkle Tree + IPFS (개인 화이트리스트용)**

```
화이트리스트 JSON (IPFS)
         │
         ▼
┌─────────────────┐
│ Merkle Root     │ ←── 온체인 저장 (1회)
│ (스마트 컨트랙트) │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ ZKProofPort App │ ←── IPFS에서 화이트리스트 로드
│ - Merkle Proof  │     Proof 생성하여 검증
└─────────────────┘
```

**Phase 2: Semaphore 통합 (프라이버시 강화)**

```
Identity Commitment (익명)
         │
         ▼
┌─────────────────┐
│ Semaphore Group │ ←── 그룹 멤버십
└─────────────────┘
         │
         ▼
┌─────────────────┐
│ ZK Proof        │ ←── 익명 멤버십 증명
│ (누가인지 모름)  │
└─────────────────┘
```

### 외부 dApp 연동 전체 플로우

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    서버 없는 전체 아키텍처                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────┐    QR/Deep Link    ┌──────────────┐                      │
│  │ 외부 dApp │ ◄───────────────► │ ZKProofPort  │                      │
│  │(Web/Mobile)│                  │     App      │                      │
│  └─────┬────┘                    └──────┬───────┘                      │
│        │                                │                               │
│        │                                │                               │
│        │                                ▼                               │
│        │                    ┌─────────────────────┐                    │
│        │                    │ 1. 화이트리스트 확인 │                    │
│        │                    │   - IPFS에서 로드    │                    │
│        │                    │   - Merkle Proof    │                    │
│        │                    └──────────┬──────────┘                    │
│        │                               │                               │
│        │                               ▼                               │
│        │                    ┌─────────────────────┐                    │
│        │                    │ 2. Coinbase KYC     │                    │
│        │                    │    ZK 증명 생성     │                    │
│        │                    └──────────┬──────────┘                    │
│        │                               │                               │
│        ▼                               ▼                               │
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │                        Blockchain                              │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │    │
│  │  │ MerkleWhitelist│  │  ZK Verifier   │  │ Result Storage │   │    │
│  │  │ (Root만 저장)  │  │ (증명 검증)    │  │ (검증 결과)    │   │    │
│  │  └────────────────┘  └────────────────┘  └────────────────┘   │    │
│  └───────────────────────────────────────────────────────────────┘    │
│                               │                                        │
│                               ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                         IPFS                                     │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │ whitelist.json                                              │ │  │
│  │  │ { addresses: [...], merkleRoot: "0x..." }                  │ │  │
│  │  └────────────────────────────────────────────────────────────┘ │  │
│  └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ❌ 중앙 서버 없음                                                      │
│  ✅ 블록체인 + IPFS만 사용                                              │
│  ✅ 완전 탈중앙화                                                       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 참고 자료

### Merkle Tree
- [OpenZeppelin MerkleProof](https://docs.openzeppelin.com/contracts/4.x/api/utils#MerkleProof)
- [Merkle Tree Whitelist Guide](https://medium.com/codex/creating-an-nft-whitelist-using-merkle-tree-proofs-9668fbe72cb4)
- [3 Whitelist Methods - GitHub](https://github.com/gapon2401/smartcontract-whitelist)

### Semaphore Protocol
- [Semaphore 공식 문서](https://semaphore.pse.dev/learn)
- [Semaphore GitHub](https://github.com/semaphore-protocol/semaphore)
- [World ID & Semaphore](https://world.org/blog/world/intro-zero-knowledge-proofs-semaphore-application-world-id)

### SBT (Soulbound Token)
- [SBT 개념 - Binance Academy](https://academy.binance.com/en/articles/what-are-soulbound-tokens-sbt)
- [EIP-5192: Minimal Soulbound NFTs](https://eips.ethereum.org/EIPS/eip-5192)

### Token Gating
- [NiftyGate - Serverless Token Gating](https://github.com/colstrom/niftygate)
- [Token Gating Tools](https://moralis.com/web3-wiki/top/token-gating-tools/)

### P2P Communication
- [libp2p WebRTC](https://docs.libp2p.io/concepts/transports/webrtc/)
- [libp2p WebRTC Direct](https://github.com/libp2p/js-libp2p-webrtc-direct)

### IPFS
- [IPFS 공식 사이트](https://ipfs.tech)
- [Pinata - IPFS Pinning](https://www.pinata.cloud/)
