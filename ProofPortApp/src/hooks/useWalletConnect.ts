import {useState, useCallback} from 'react';
import {
  useAppKit,
  useAccount,
  useProvider,
} from '@reown/appkit-react-native';
import {ethers} from 'ethers';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseWalletConnectReturn {
  account: string | null;
  chainId: number | null;
  status: ConnectionStatus;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
  formattedAddress: string;
  signMessage: (message: string) => Promise<string>;
  getProvider: () => Promise<ethers.providers.Web3Provider | null>;
  getSigner: () => Promise<ethers.Signer | null>;
}

export const useWalletConnect = (addLog?: (msg: string) => void): UseWalletConnectReturn => {
  const {open, disconnect: appKitDisconnect} = useAppKit();
  const {address, isConnected, chainId: accountChainId} = useAccount();
  const {provider: walletProvider} = useProvider();
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const log = useCallback((msg: string) => {
    console.log(`🔗 ${msg}`);
    addLog?.(msg);
  }, [addLog]);

  // chainId from useAccount - may be number or undefined
  const chainId = accountChainId ? Number(accountChainId) : null;

  const getStatus = (): ConnectionStatus => {
    if (isConnected && address) return 'connected';
    if (isConnecting) return 'connecting';
    if (error) return 'error';
    return 'disconnected';
  };

  const connect = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      log('Opening WalletConnect modal...');
      await open();
      log('Modal opened - waiting for connection...');
      // Modal handles the connection flow
      // isConnected will update automatically via useAppKitAccount
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect';
      log(`Connect error: ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setIsConnecting(false);
    }
  }, [open, log]);

  const disconnect = useCallback(async () => {
    try {
      log('Disconnecting wallet...');
      await appKitDisconnect();
      setError(null);
      log('Disconnected');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect';
      log(`Disconnect error: ${errorMessage}`);
      setError(errorMessage);
    }
  }, [appKitDisconnect, log]);

  const getProvider = useCallback(async (): Promise<ethers.providers.Web3Provider | null> => {
    if (!walletProvider) {
      log('No wallet provider available');
      return null;
    }
    return new ethers.providers.Web3Provider(walletProvider as ethers.providers.ExternalProvider);
  }, [walletProvider, log]);

  const getSigner = useCallback(async (): Promise<ethers.Signer | null> => {
    if (!walletProvider || !address) {
      log('No provider or address available');
      return null;
    }
    const provider = new ethers.providers.Web3Provider(walletProvider as ethers.providers.ExternalProvider);
    return provider.getSigner(address);
  }, [walletProvider, address, log]);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!isConnected || !walletProvider || !address) {
      throw new Error('Wallet not connected');
    }

    log(`Signing message: ${message.slice(0, 30)}...`);

    const provider = new ethers.providers.Web3Provider(walletProvider as ethers.providers.ExternalProvider);
    const signer = provider.getSigner(address);
    const signature = await signer.signMessage(message);

    log(`Signature received: ${signature.slice(0, 20)}...`);
    return signature;
  }, [isConnected, walletProvider, address, log]);

  const formatAddress = (addr: string | undefined): string => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return {
    account: address ?? null,
    chainId,
    status: getStatus(),
    error,
    connect,
    disconnect,
    isConnected: isConnected && !!address,
    formattedAddress: formatAddress(address),
    signMessage,
    getProvider,
    getSigner,
  };
};
