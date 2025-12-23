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
import {Header, InputForm, LogViewer, StepProgress} from '../components';
import {useLogs, useAgeVerifier} from '../hooks';
import type {AgeVerifierInputs} from '../types';

export const AgeVerifierScreen: React.FC = () => {
  // Input state
  const [inputs, setInputs] = useState<AgeVerifierInputs>({
    birthYear: '2000',
    currentYear: new Date().getFullYear().toString(),
    minAge: '18',
  });

  // Custom hooks
  const {logs, addLog, clearLogs, logScrollRef} = useLogs();
  const {
    status,
    isLoading,
    parsedProof,
    proofSteps,
    generateProofWithSteps,
    verifyProofOffChain,
    verifyProofOnChain,
  } = useAgeVerifier();

  // Input change handler
  const handleInputChange = useCallback(
    (field: keyof AgeVerifierInputs, value: string) => {
      setInputs(prev => ({...prev, [field]: value}));
    },
    [],
  );

  // Action handlers
  const handleGenerateProof = useCallback(() => {
    clearLogs();
    generateProofWithSteps(inputs, addLog);
  }, [generateProofWithSteps, inputs, addLog, clearLogs]);

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
    return '#007AFF';
  };

  const hasProof = !!parsedProof;
  const hasAnyStepStarted = proofSteps.some(s => s.status !== 'pending');

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}>
        <ScrollView style={styles.scrollView}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Age Verifier</Text>
            <Text style={styles.subtitle}>
              Prove you meet the minimum age requirement without revealing your birth year
            </Text>
            <View style={[styles.statusBadge, {backgroundColor: getStatusColor()}]}>
              <Text style={styles.statusText}>{status}</Text>
            </View>
          </View>

          {/* Input Form */}
          <InputForm inputs={inputs} onInputChange={handleInputChange} />

          {/* Main Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>

            {/* Button 1: Generate Proof */}
            <TouchableOpacity
              style={[styles.button, styles.generateButton, isLoading && styles.disabledButton]}
              onPress={handleGenerateProof}
              disabled={isLoading}>
              <Text style={styles.buttonText}>
                {isLoading && !hasProof ? 'Generating...' : '1. Generate Proof'}
              </Text>
            </TouchableOpacity>

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
                (!hasProof || isLoading) && styles.disabledButton,
              ]}
              onPress={handleVerifyOffChain}
              disabled={!hasProof || isLoading}>
              <Text style={[styles.buttonText, (!hasProof || isLoading) && styles.disabledText]}>
                2. Verify Off-Chain
              </Text>
            </TouchableOpacity>

            {/* Button 3: On-chain Verification */}
            <TouchableOpacity
              style={[
                styles.button,
                styles.onChainButton,
                (!hasProof || isLoading) && styles.disabledButton,
              ]}
              onPress={handleVerifyOnChain}
              disabled={!hasProof || isLoading}>
              <Text style={[styles.onChainButtonText, (!hasProof || isLoading) && styles.disabledText]}>
                3. Verify On-Chain (Sepolia)
              </Text>
            </TouchableOpacity>
          </View>

          {/* Clear Logs */}
          <TouchableOpacity
            style={[styles.button, styles.clearButton]}
            onPress={clearLogs}
            disabled={isLoading}>
            <Text style={styles.clearButtonText}>Clear Logs</Text>
          </TouchableOpacity>

          {isLoading && (
            <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
          )}

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
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  generateButton: {
    backgroundColor: '#007AFF',
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
    marginTop: -4,
  },
  loader: {
    marginVertical: 10,
  },
});
