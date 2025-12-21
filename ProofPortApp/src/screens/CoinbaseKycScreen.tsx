import React, {useState, useCallback} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import {LogViewer} from '../components';
import {useLogs, useCoinbaseKyc, usePrivyWallet} from '../hooks';
import {findAttestationTransaction} from '../utils';

export const CoinbaseKycScreen: React.FC = () => {
  const [rawTransaction, setRawTransaction] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const {logs, addLog, clearLogs, logScrollRef} = useLogs();
  const {
    status,
    isLoading,
    proof,
    generateVK,
    generateProofWithSignature,
    verifyProof,
    verifyProofOnChain,
    validateTransaction,
  } = useCoinbaseKyc();

  // Get wallet connection from Privy hook
  const {
    account,
    status: walletStatus,
    isReady: isPrivyReady,
    isWalletConnected,
    isAuthenticated,
    connect: connectWallet,
    signInWithWallet,
    disconnect: disconnectWallet,
    formattedAddress,
    getProvider,
  } = usePrivyWallet(addLog);

  // Combined: Search Attestation → Generate VK → Generate Proof
  const handleGenerateProof = useCallback(async () => {
    if (!account) {
      addLog('Please connect wallet first');
      return;
    }

    setIsSearching(true);

    try {
      // Step 1: Search for attestation
      addLog('=== Step 1: Searching for Coinbase Attestation ===');
      const result = await findAttestationTransaction(account, addLog);

      if (!result) {
        addLog('No valid attestation found for this wallet');
        return;
      }

      setRawTransaction(result.rawTransaction);
      addLog('Attestation transaction found!');
      addLog(`TX length: ${result.rawTransaction.length} characters`);

      // Validate transaction
      addLog('--- Validating transaction ---');
      const isValid = validateTransaction(result.rawTransaction, account, addLog);
      if (!isValid) {
        addLog('Transaction validation failed');
        return;
      }

      // Step 2: Generate VK
      addLog('=== Step 2: Generating Verification Key ===');
      await generateVK(addLog);

      // Step 3: Generate Proof
      addLog('=== Step 3: Generating Proof ===');
      const provider = await getProvider();
      if (!provider) {
        addLog('No wallet provider available');
        return;
      }

      const ethereumProvider = {
        request: async (args: {method: string; params?: unknown[]}) => {
          return provider.send(args.method, args.params || []);
        },
      };

      await generateProofWithSignature(
        {
          userAddress: account,
          rawTransaction: result.rawTransaction,
          signerIndex: 0,
        },
        ethereumProvider,
        null,
        addLog,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`Error: ${errorMessage}`);
    } finally {
      setIsSearching(false);
    }
  }, [account, addLog, validateTransaction, generateVK, getProvider, generateProofWithSignature]);

  const handleVerifyProof = useCallback(() => {
    verifyProof(addLog);
  }, [verifyProof, addLog]);

  const handleVerifyProofOnChain = useCallback(() => {
    verifyProofOnChain(addLog);
  }, [verifyProofOnChain, addLog]);

  const getStatusColor = () => {
    if (status.includes('Error') || status.includes('invalid')) return '#FF3B30';
    if (status.includes('verified')) return '#34C759';
    if (status === 'Ready') return '#8E8E93';
    return '#0052FF';
  };

  const getWalletButtonStyle = () => {
    if (isAuthenticated) return styles.connectedButton;
    if (isWalletConnected) return styles.walletConnectedButton;
    if (walletStatus === 'connecting') return styles.connectingButton;
    return styles.disconnectedButton;
  };

  const getWalletButtonText = () => {
    if (isAuthenticated) return `${formattedAddress} (Disconnect)`;
    if (isWalletConnected) return `${formattedAddress} - Sign In`;
    if (walletStatus === 'connecting') return 'Connecting...';
    if (!isPrivyReady) return 'Initializing...';
    return 'Connect Wallet';
  };

  const handleWalletPress = () => {
    if (isAuthenticated) {
      disconnectWallet();
    } else if (isWalletConnected) {
      // Wallet connected but not authenticated - sign in with SIWE
      signInWithWallet();
    } else {
      connectWallet();
    }
  };

  const isProcessing = isLoading || isSearching;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}>
        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Coinbase KYC Verifier</Text>
            <Text style={styles.subtitle}>
              Prove your Coinbase identity verification without revealing personal data
            </Text>
            <View style={[styles.statusBadge, {backgroundColor: getStatusColor()}]}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          </View>

          {/* Wallet Connection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step 1: Connect Wallet</Text>
            <TouchableOpacity
              style={[styles.walletButton, getWalletButtonStyle()]}
              onPress={handleWalletPress}
              disabled={walletStatus === 'connecting' || !isPrivyReady}>
              <Text style={styles.walletButtonText}>{getWalletButtonText()}</Text>
            </TouchableOpacity>
          </View>

          {/* Proof Generation */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step 2: Generate Proof</Text>
            <Text style={styles.sectionDesc}>
              Search attestation, generate VK & proof in one step
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.proofButton,
                  !isWalletConnected && styles.disabledButton,
                ]}
                onPress={handleGenerateProof}
                disabled={isProcessing || !isWalletConnected}>
                <Text style={[styles.buttonText, !isWalletConnected && styles.disabledText]}>
                  {isSearching ? 'Processing...' : 'Generate Proof'}
                </Text>
              </TouchableOpacity>

              {rawTransaction ? (
                <View style={styles.txInfo}>
                  <Text style={styles.txInfoText}>
                    Attestation loaded ({rawTransaction.length} chars)
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Verify Proof */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step 3: Verify Proof</Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.verifyButton,
                  !proof && styles.disabledButton,
                ]}
                onPress={handleVerifyProof}
                disabled={isProcessing || !proof}>
                <Text style={[styles.buttonText, !proof && styles.disabledText]}>
                  Verify (Off-chain)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.onChainButton,
                  !proof && styles.disabledButton,
                ]}
                onPress={handleVerifyProofOnChain}
                disabled={isProcessing || !proof}>
                <Text style={[styles.buttonText, !proof && styles.disabledText]}>
                  Verify On-Chain (Base)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Clear Logs */}
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={clearLogs}
            disabled={isProcessing}>
            <Text style={styles.clearButtonText}>Clear Logs</Text>
          </TouchableOpacity>

          {isProcessing && (
            <ActivityIndicator size="large" color="#0052FF" style={styles.loader} />
          )}

          {/* Logs */}
          <LogViewer logs={logs} scrollRef={logScrollRef} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  sectionDesc: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  walletButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  connectedButton: {
    backgroundColor: '#34C759',
  },
  walletConnectedButton: {
    backgroundColor: '#6366F1', // Privy purple - wallet connected, needs SIWE
  },
  connectingButton: {
    backgroundColor: '#FF9500',
  },
  disconnectedButton: {
    backgroundColor: '#6366F1', // Privy purple
  },
  walletButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  txInfo: {
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  txInfoText: {
    color: '#2E7D32',
    fontSize: 12,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  proofButton: {
    backgroundColor: '#34C759',
  },
  verifyButton: {
    backgroundColor: '#5856D6',
  },
  onChainButton: {
    backgroundColor: '#0052FF',
  },
  clearButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#E5E5E5',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  clearButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledText: {
    color: '#999',
  },
  loader: {
    marginVertical: 10,
  },
});
