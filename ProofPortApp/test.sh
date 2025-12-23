cd /Users/nhn/Workspace/mopro-101/ProofPortApp && node -e "
const { generateKeyPair, signJWT } = require('@walletconnect/relay-auth');

async function test() {
  const keyPair = generateKeyPair();
  // 1시간 유효
  const jwt = await signJWT('9a54a0419fc6c86a2bde3d44c4f1615c', 'wss://relay.walletconnect.com', 3600, keyPair);

  // 전체 curl 명령어 출력
  console.log('curl -s -w \"\\nHTTP_CODE:%{http_code}\" -H \"Connection: Upgrade\" -H \"Upgrade: websocket\" -H \"Sec-WebSocket-Version: 13\" -H \"Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\" -H \"Authorization: Bearer ' + jwt + '\" \"https://relay.walletconnect.com/?projectId=9a54a0419fc6c86a2bde3d44c4f1615c\"');
}

test();
"
