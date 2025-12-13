import {useState, useCallback, useEffect, useRef} from 'react';
import {useSDK} from '@metamask/sdk-react-native';
import {Linking, AppState, AppStateStatus} from 'react-native';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseMetamaskReturn {
  account: string | null;
  chainId: string | null;
  status: ConnectionStatus;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  formattedAddress: string;
}

export const useMetamask = (addLog?: (msg: string) => void): UseMetamaskReturn => {
  const {sdk, connected, account: sdkAccount, chainId} = useSDK();
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  // Local state to store account from sdk.connect() return value
  const [localAccount, setLocalAccount] = useState<string | null>(null);

  // Use local account if available, otherwise fall back to SDK account
  const account = localAccount || sdkAccount || null;

  // 로그 헬퍼
  const log = useCallback((msg: string) => {
    console.log(`🦊 ${msg}`);
    addLog?.(msg);
  }, [addLog]);

  // 최신 값을 참조하기 위한 ref
  const connectedRef = useRef(connected);
  const accountRef = useRef(account);
  const logRef = useRef(log);

  // ref 업데이트
  useEffect(() => {
    connectedRef.current = connected;
    accountRef.current = account;
    logRef.current = log;

    // 연결이 완료되면 isConnecting을 false로
    if (connected && account) {
      log(`Connection complete! Account: ${account.slice(0, 10)}...`);
      setIsConnecting(false);
    }
  }, [connected, account, log]);

  // Deep link 및 앱 상태 변경 감지
  useEffect(() => {
    // 딥링크 콜백 처리
    const handleDeepLink = ({url}: {url: string}) => {
      logRef.current(`Deep link received: ${url}`);
      // 딥링크 수신 시 약간의 지연 후 상태 체크
      setTimeout(() => {
        logRef.current(`After deeplink - connected: ${connectedRef.current}, account: ${accountRef.current ? 'yes' : 'null'}`);
        if (connectedRef.current && accountRef.current) {
          setIsConnecting(false);
        }
      }, 500);
    };

    // 앱 상태 변경 감지 (메타마스크에서 돌아올 때)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      logRef.current(`AppState changed to: ${nextAppState}`);
      if (nextAppState === 'active') {
        // 앱이 활성화되면 약간의 지연 후 연결 상태 체크
        setTimeout(() => {
          logRef.current(`After active - connected: ${connectedRef.current}, account: ${accountRef.current ? 'yes' : 'null'}`);
          if (connectedRef.current && accountRef.current) {
            setIsConnecting(false);
          }
        }, 1000);
      }
    };

    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);
    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      linkingSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

  const getStatus = (): ConnectionStatus => {
    // 로컬 계정이 있으면 연결된 것으로 판단 (sdk.connect() 반환값)
    if (localAccount) return 'connected';
    // SDK 상태로도 연결 확인
    if (connected && account) return 'connected';
    if (isConnecting) return 'connecting';
    if (error) return 'error';
    return 'disconnected';
  };

  const connect = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    setLocalAccount(null); // Reset local account on new connection attempt
    try {
      if (!sdk) {
        throw new Error('SDK not initialized');
      }

      // Clear any pending sessions before connecting
      log('Terminating any existing session...');
      try {
        await sdk.terminate();
        log('Session terminated');
      } catch {
        log('No existing session to terminate');
      }

      // In deeplink mode, sdk.connect() does NOT send eth_requestAccounts automatically
      // We must use connectWith to explicitly request accounts
      log('Calling sdk.connectWith(eth_requestAccounts)...');
      const result = await sdk.connectWith({
        method: 'eth_requestAccounts',
        params: [],
      });
      log(`sdk.connectWith() returned: ${JSON.stringify(result)}`);

      // connectWith returns the result of the RPC call (array of accounts as string)
      // Parse the result - it could be a string (JSON) or already an array
      let accounts: string[] = [];
      if (typeof result === 'string') {
        try {
          // Result might be JSON string of accounts array
          const parsed = JSON.parse(result);
          if (Array.isArray(parsed)) {
            accounts = parsed;
          } else if (parsed && typeof parsed === 'object' && parsed.accounts) {
            accounts = parsed.accounts;
          }
        } catch {
          // If parsing fails, result might be a single account address
          if (result.startsWith('0x')) {
            accounts = [result];
          }
        }
      } else if (Array.isArray(result)) {
        accounts = result;
      }

      log(`Parsed accounts: ${JSON.stringify(accounts)}`);

      if (accounts.length > 0) {
        const connectedAccount = accounts[0];
        log(`Account from connectWith(): ${connectedAccount}`);
        setLocalAccount(connectedAccount);
        setIsConnecting(false);
      } else {
        log('No accounts returned from connectWith');
        setIsConnecting(false);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
      log(`Connect error: ${errorMessage}`);
      setError(errorMessage);
      setIsConnecting(false);

      // If Metamask is not installed, open app store
      if (errorMessage.includes('not installed') || errorMessage.includes('not found')) {
        Linking.openURL('https://metamask.io/download/');
      }
    }
  }, [sdk, log]);

  const disconnect = useCallback(async () => {
    try {
      log('Calling sdk.terminate()...');
      if (sdk) {
        // Use terminate instead of disconnect to fully clear the session
        await sdk.terminate();
      }
      log('Session terminated');
      setLocalAccount(null); // Clear local account on disconnect
      setError(null);
      setIsConnecting(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect';
      log(`Disconnect error: ${errorMessage}`);
      setError(errorMessage);
    }
  }, [sdk, log]);

  const formatAddress = (address: string | null): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Consider connected if we have a local account OR SDK says connected with account
  const isConnected = !!account || (connected && !!sdkAccount);

  return {
    account: account ?? null,
    chainId: chainId ?? null,
    status: getStatus(),
    error,
    connect,
    disconnect,
    isConnected,
    formattedAddress: formatAddress(account ?? null),
  };
};
