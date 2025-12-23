#!/usr/bin/env node

/**
 * WalletConnect Relay 연결 테스트 스크립트
 *
 * 사용법:
 *   node scripts/test-walletconnect.js <projectId>
 *   node scripts/test-walletconnect.js  # 기본 projectId 사용
 */

const { generateKeyPair, signJWT } = require('@walletconnect/relay-auth');
const { execSync } = require('child_process');

const DEFAULT_PROJECT_ID = '9a54a0419fc6c86a2bde3d44c4f1615c';
const RELAY_URL = 'relay.walletconnect.com';

async function testWalletConnect(projectId) {
  console.log('='.repeat(60));
  console.log('WalletConnect Relay 연결 테스트');
  console.log('='.repeat(60));
  console.log(`Project ID: ${projectId}`);
  console.log(`Relay URL: wss://${RELAY_URL}`);
  console.log('');

  // 1. JWT 생성
  console.log('[1/3] JWT 생성 중...');
  const keyPair = generateKeyPair();
  const jwt = await signJWT(projectId, `wss://${RELAY_URL}`, 3600, keyPair);
  console.log(`✓ JWT 생성 완료 (1시간 유효)`);
  console.log(`  Length: ${jwt.length} chars`);
  console.log('');

  // 2. 현재 IP 확인
  console.log('[2/3] 현재 IP 확인 중...');
  try {
    const ipInfo = execSync('curl -s https://ipinfo.io/json', {
      encoding: 'utf-8',
    });
    const ip = JSON.parse(ipInfo);
    console.log(`✓ IP: ${ip.ip}`);
    console.log(`  Location: ${ip.city}, ${ip.region}, ${ip.country}`);
    console.log(`  Org: ${ip.org}`);
  } catch (e) {
    console.log('✗ IP 확인 실패');
  }
  console.log('');

  // 3. Relay 연결 테스트
  console.log('[3/3] Relay 연결 테스트 중...');

  const curlCommand = `curl -s -w "\\n__HTTP_CODE__:%{http_code}" \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    -H "Authorization: Bearer ${jwt}" \
    "https://${RELAY_URL}/?projectId=${projectId}"`;

  console.log(`${curlCommand}`);

  try {
    const result = execSync(curlCommand, { encoding: 'utf-8' });
    const lines = result.split('__HTTP_CODE__:');
    const body = lines[0].trim();
    const httpCode = lines[1]?.trim();

    console.log(`HTTP Status: ${httpCode}`);
    console.log(`Response: ${body}`);
    console.log('');

    // 결과 해석
    console.log('='.repeat(60));
    console.log('결과 분석:');
    console.log('='.repeat(60));

    if (httpCode === '101') {
      console.log('✅ 성공! WebSocket 업그레이드 완료');
      console.log('   프로젝트가 정상적으로 활성화되어 있습니다.');
    } else if (httpCode === '401') {
      const error = JSON.parse(body);
      if (error.error?.includes('JWT')) {
        console.log('❌ JWT 인증 실패');
        console.log('   - JWT가 누락되었거나 만료됨');
        console.log('   - Project ID가 존재하지 않을 수 있음');
      } else {
        console.log(`❌ 인증 실패: ${error.error}`);
      }
    } else if (httpCode === '403') {
      const error = JSON.parse(body);
      if (error.error === 'Project not found') {
        console.log('❌ 프로젝트를 찾을 수 없음 (Project not found)');
        console.log('   가능한 원인:');
        console.log('   - 프로젝트가 Reown Cloud에 제대로 등록되지 않음');
        console.log('   - 프로젝트 설정이 잘못됨 (App ID, 도메인 등)');
        console.log('   - Reown 인프라 문제');
      } else {
        console.log(`❌ 접근 거부: ${error.error}`);
      }
    } else {
      console.log(`⚠️ 예상치 못한 응답: HTTP ${httpCode}`);
    }
  } catch (e) {
    console.log('✗ 연결 실패:', e.message);
  }

  console.log('');
  console.log('='.repeat(60));

  // JWT 출력 (디버깅용)
  console.log('');
  console.log('디버깅용 curl 명령어:');
  console.log('-'.repeat(60));
  console.log(
    `curl -v -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" -H "Authorization: Bearer ${jwt}" "https://${RELAY_URL}/?projectId=${projectId}"`,
  );
}

// 실행
const projectId = process.argv[2] || DEFAULT_PROJECT_ID;
testWalletConnect(projectId).catch(console.error);
