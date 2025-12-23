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
import {LogViewer, StepProgress} from '../components';
import {useLogs, useCoinbaseKyc, usePrivyWallet} from '../hooks';
import {findAttestationTransaction} from '../utils';

export const CoinbaseKycScreen: React.FC = () => {
  const [rawTransaction, setRawTransaction] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const {logs, addLog, clearLogs, logScrollRef} = useLogs();
  const {
    status,
    isLoading,
    parsedProof,
    proofSteps,
    generateProofWithSteps,
    verifyProofOffChain,
    verifyProofOnChain,
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

  // Combined: Search Attestation → Generate Proof (with steps)
  const handleGenerateProof = useCallback(async () => {
    if (!account) {
      addLog('Please connect wallet first');
      return;
    }

    clearLogs();
    setIsSearching(true);

    try {
      // Step 0: Search for attestation (before proof generation steps)
      addLog('=== Searching for Coinbase Attestation ===');
      const result = await findAttestationTransaction(account, addLog);

      if (!result) {
        addLog('No valid attestation found for this wallet');
        return;
      }

      setRawTransaction(result.rawTransaction);
      addLog('Attestation transaction found!');
      addLog(`TX length: ${result.rawTransaction.length} characters`);

      // Get provider for signing
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

      // Generate proof with step tracking
      await generateProofWithSteps(
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
  }, [account, addLog, clearLogs, getProvider, generateProofWithSteps]);

  const handleVerifyOffChain = useCallback(() => {
    verifyProofOffChain(addLog);
  }, [verifyProofOffChain, addLog]);

  const handleVerifyOnChain = useCallback(() => {
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
      signInWithWallet();
    } else {
      connectWallet();
    }
  };

  const isProcessing = isLoading || isSearching;
  const hasProof = !!parsedProof;
  const hasAnyStepStarted = proofSteps.some(s => s.status !== 'pending');

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
            <Text style={styles.sectionTitle}>Wallet Connection</Text>
            <TouchableOpacity
              style={[styles.walletButton, getWalletButtonStyle()]}
              onPress={handleWalletPress}
              disabled={walletStatus === 'connecting' || !isPrivyReady}>
              <Text style={styles.walletButtonText}>{getWalletButtonText()}</Text>
            </TouchableOpacity>
          </View>

          {/* Main Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>

            {/* Button 1: Generate Proof */}
            <TouchableOpacity
              style={[
                styles.button,
                styles.generateButton,
                (!isWalletConnected || isProcessing) && styles.disabledButton,
              ]}
              onPress={handleGenerateProof}
              disabled={isProcessing || !isWalletConnected}>
              <Text style={[styles.buttonText, !isWalletConnected && styles.disabledText]}>
                {isSearching ? 'Searching Attestation...' : isLoading ? 'Generating...' : '1. Generate Proof'}
              </Text>
            </TouchableOpacity>

            {/* Attestation Info */}
            {rawTransaction ? (
              <View style={styles.txInfo}>
                <Text style={styles.txInfoText}>
                  Attestation loaded ({rawTransaction.length} chars)
                </Text>
              </View>
            ) : null}

            {/* Step Progress (shown when generating) */}
            {hasAnyStepStarted && (
              <View style={styles.stepProgressContainer}>
                <StepProgress steps={proofSteps} />
              </View>
            )}

            {/* Button 2: Off-chain Verification */}
            <TouchableOpacity
              style={[
                styles.button,
                styles.verifyButton,
                (!hasProof || isProcessing) && styles.disabledButton,
              ]}
              onPress={handleVerifyOffChain}
              disabled={!hasProof || isProcessing}>
              <Text style={[styles.buttonText, (!hasProof || isProcessing) && styles.disabledText]}>
                2. Verify Off-Chain
              </Text>
            </TouchableOpacity>

            {/* Button 3: On-chain Verification */}
            <TouchableOpacity
              style={[
                styles.button,
                styles.onChainButton,
                (!hasProof || isProcessing) && styles.disabledButton,
              ]}
              onPress={handleVerifyOnChain}
              disabled={!hasProof || isProcessing}>
              <Text style={[styles.onChainButtonText, (!hasProof || isProcessing) && styles.disabledText]}>
                3. Verify On-Chain (Sepolia)
              </Text>
            </TouchableOpacity>
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
    marginBottom: 16,
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
    backgroundColor: '#6366F1',
  },
  connectingButton: {
    backgroundColor: '#FF9500',
  },
  disconnectedButton: {
    backgroundColor: '#6366F1',
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
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  generateButton: {
    backgroundColor: '#0052FF',
  },
  verifyButton: {
    backgroundColor: '#5856D6',
  },
  onChainButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#34C759',
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
    borderColor: '#E5E5E5',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  onChainButtonText: {
    color: '#34C759',
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
  stepProgressContainer: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    marginBottom: 12,
  },
  loader: {
    marginVertical: 10,
  },
});
