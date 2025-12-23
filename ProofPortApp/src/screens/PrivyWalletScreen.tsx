import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePrivy } from '@privy-io/expo';
import {
  useAppKit,
  useAccount,
  useWalletInfo,
} from '@reown/appkit-react-native';
import { useLogs } from '../hooks';
import { LogViewer } from '../components';

export const PrivyWalletScreen: React.FC = () => {
  const { logs, addLog, clearLogs, logScrollRef } = useLogs();
  const { isReady, user, logout: privyLogout } = usePrivy();
  const isAuthenticated = !!user;

  // AppKit hooks for wallet connection
  const { open, disconnect } = useAppKit();
  const { address, isConnected } = useAccount();
  const { walletInfo } = useWalletInfo();

  const [isConnecting, setIsConnecting] = useState(false);

  // Get wallet address from Privy user
  const privyWalletAddress = user?.linked_accounts?.find(
    account => account.type === 'wallet',
  )?.address;

  const handleConnectWallet = useCallback(async () => {
    clearLogs();
    addLog('Opening wallet selector...');
    setIsConnecting(true);
    try {
      await open();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Connect error: ${msg}`);
    } finally {
      setIsConnecting(false);
    }
  }, [open, addLog, clearLogs]);

  const handleDisconnect = useCallback(async () => {
    addLog('Disconnecting...');
    try {
      if (isAuthenticated) {
        await privyLogout();
        addLog('Privy logged out');
      }
      if (isConnected) {
        await disconnect();
        addLog('Wallet disconnected');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Disconnect error: ${msg}`);
    }
  }, [isAuthenticated, isConnected, privyLogout, disconnect, addLog]);

  const formatAddress = (addr: string): string => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getStatusColor = (): string => {
    if (!isReady) return '#9E9E9E';
    if (isAuthenticated) return '#4CAF50';
    if (isConnected) return '#FF9800';
    return '#9E9E9E';
  };

  const getStatusText = (): string => {
    if (!isReady) return 'Initializing';
    if (isAuthenticated) return 'Authenticated with Privy';
    if (isConnected) return 'Wallet Connected';
    return 'Not connected';
  };

  // Log wallet connection changes
  useEffect(() => {
    if (isConnected && address) {
      addLog(`Wallet connected: ${formatAddress(address)}`);
      if (walletInfo?.name) {
        addLog(`Wallet: ${walletInfo.name}`);
      }
    }
  }, [isConnected, address, walletInfo]);

  if (!isReady) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Initializing Privy...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>P</Text>
          </View>

          <Text style={styles.title}>Privy Wallet</Text>
          <Text style={styles.subtitle}>Connect external wallet via Privy</Text>

          <View style={styles.statusRow}>
            <View
              style={[styles.statusDot, { backgroundColor: getStatusColor() }]}
            />
            <Text style={styles.statusText}>{getStatusText()}</Text>
          </View>

          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Connected Wallet</Text>
              <Text
                style={
                  isConnected ? styles.infoValue : styles.infoValueDisabled
                }
              >
                {isConnected && address
                  ? formatAddress(address)
                  : 'Not connected'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Wallet Name</Text>
              <Text
                style={
                  isConnected ? styles.infoValue : styles.infoValueDisabled
                }
              >
                {walletInfo?.name || 'N/A'}
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Privy User</Text>
              <Text
                style={
                  isAuthenticated ? styles.infoValue : styles.infoValueDisabled
                }
              >
                {isAuthenticated && privyWalletAddress
                  ? formatAddress(privyWalletAddress)
                  : 'Not isAuthenticated'}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {!isConnected ? (
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleConnectWallet}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Connect Wallet</Text>
                )}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.secondaryButton]}
                onPress={handleDisconnect}
              >
                <Text style={styles.buttonText}>Disconnect</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Full Address */}
          {isConnected && address && (
            <View style={styles.fullAddressContainer}>
              <Text style={styles.fullAddressLabel}>Full Address</Text>
              <Text style={styles.fullAddressValue} selectable>
                {address}
              </Text>
            </View>
          )}
        </View>

        <LogViewer logs={logs} scrollRef={logScrollRef} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  icon: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  statusText: {
    fontSize: 16,
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  infoValueDisabled: {
    fontSize: 16,
    color: '#9E9E9E',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#6366F1',
  },
  secondaryButton: {
    backgroundColor: '#757575',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fullAddressContainer: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  fullAddressLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  fullAddressValue: {
    fontSize: 12,
    color: '#333',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
});
