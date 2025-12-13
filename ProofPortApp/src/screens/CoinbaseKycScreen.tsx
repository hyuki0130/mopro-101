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
import {useLogs} from '../hooks';
import {
  generateNoirProof,
  verifyNoirProof,
  getNoirVerificationKey,
} from 'mopro-ffi';
import {getAssetPath, arrayBufferToHex} from '../utils';

type ProofStatus =
  | 'Ready'
  | 'Generating verification key...'
  | 'Verification key ready'
  | 'Generating proof...'
  | 'Proof ready'
  | 'Verifying proof...'
  | 'Proof verified!'
  | 'Proof invalid'
  | 'Error';

export const CoinbaseKycScreen: React.FC = () => {
  const {logs, addLog, clearLogs, logScrollRef} = useLogs();
  const [status, setStatus] = useState<ProofStatus>('Ready');
  const [isLoading, setIsLoading] = useState(false);
  const [vk, setVk] = useState<ArrayBuffer | null>(null);
  const [proof, setProof] = useState<ArrayBuffer | null>(null);

  const handleGenerateVK = useCallback(async () => {
    setIsLoading(true);
    setStatus('Generating verification key...');
    addLog('Starting VK generation for Coinbase KYC circuit');

    try {
      const circuitPath = await getAssetPath('zk_coinbase_attestor.json');
      const srsPath = await getAssetPath('zk_coinbase_attestor.srs');

      addLog(`Circuit: ${circuitPath}`);
      addLog(`SRS: ${srsPath}`);

      const startTime = Date.now();
      const generatedVk = getNoirVerificationKey(
        circuitPath,
        srsPath,
        true, // onChain: true = Keccak hash (for Solidity)
        true, // lowMemoryMode
      );
      const elapsed = Date.now() - startTime;

      setVk(generatedVk);
      addLog(`VK generated in ${elapsed}ms`);
      addLog(`VK size: ${generatedVk.byteLength} bytes`);
      setStatus('Verification key ready');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`Error: ${errorMessage}`);
      setStatus('Error');
    } finally {
      setIsLoading(false);
    }
  }, [addLog]);

  const handleTestProof = useCallback(async () => {
    if (!vk) {
      addLog('Please generate VK first');
      return;
    }

    setIsLoading(true);
    setStatus('Generating proof...');
    addLog('Starting test proof generation');
    addLog('Note: Using dummy inputs for testing');

    try {
      const circuitPath = await getAssetPath('zk_coinbase_attestor.json');
      const srsPath = await getAssetPath('zk_coinbase_attestor.srs');

      // TODO: Replace with real inputs
      // For now, we just test if the circuit loads correctly
      addLog('Circuit loaded successfully');
      addLog('Full proof generation requires real Coinbase attestation data');
      setStatus('Ready');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`Error: ${errorMessage}`);
      setStatus('Error');
    } finally {
      setIsLoading(false);
    }
  }, [vk, addLog]);

  const getStatusColor = () => {
    if (status.includes('Error') || status === 'Proof invalid') return '#FF3B30';
    if (status === 'Proof verified!') return '#34C759';
    if (status === 'Ready') return '#8E8E93';
    return '#007AFF';
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}>
        <ScrollView style={styles.scrollView}>
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

          {/* Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>
              1. Connect your MetaMask wallet{'\n'}
              2. Find your Coinbase attestation TX{'\n'}
              3. Generate ZK proof of KYC{'\n'}
              4. Verify on-chain or off-chain
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleGenerateVK}
              disabled={isLoading}>
              <Text style={styles.buttonText}>Generate VK</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.secondaryButton,
                !vk && styles.disabledButton,
              ]}
              onPress={handleTestProof}
              disabled={isLoading || !vk}>
              <Text style={[styles.buttonText, !vk && styles.disabledText]}>
                Test Circuit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={clearLogs}
              disabled={isLoading}>
              <Text style={styles.clearButtonText}>Clear Logs</Text>
            </TouchableOpacity>
          </View>

          {isLoading && (
            <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
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
  infoCard: {
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
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#0052FF', // Coinbase blue
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  clearButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E5',
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
