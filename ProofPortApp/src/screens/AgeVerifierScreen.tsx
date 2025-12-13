import React, {useState, useCallback} from 'react';
import {
  SafeAreaView,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import {Header, InputForm, ActionButtons, LogViewer} from '../components';
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
  const {status, isLoading, vk, proof, generateVK, generateProof, verifyProof, runAll} =
    useAgeVerifier();

  // Input change handler
  const handleInputChange = useCallback(
    (field: keyof AgeVerifierInputs, value: string) => {
      setInputs(prev => ({...prev, [field]: value}));
    },
    [],
  );

  // Action handlers
  const handleGenerateVK = useCallback(() => {
    generateVK(addLog);
  }, [generateVK, addLog]);

  const handleGenerateProof = useCallback(() => {
    generateProof(inputs, addLog);
  }, [generateProof, inputs, addLog]);

  const handleVerifyProof = useCallback(() => {
    verifyProof(addLog);
  }, [verifyProof, addLog]);

  const handleRunAll = useCallback(() => {
    clearLogs();
    runAll(inputs, addLog);
  }, [runAll, inputs, addLog, clearLogs]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}>
        <ScrollView style={styles.scrollView}>
          <Header status={status} />

          <InputForm inputs={inputs} onInputChange={handleInputChange} />

          <ActionButtons
            isLoading={isLoading}
            hasVk={!!vk}
            hasProof={!!proof}
            onGenerateVK={handleGenerateVK}
            onGenerateProof={handleGenerateProof}
            onVerifyProof={handleVerifyProof}
            onRunAll={handleRunAll}
          />

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
  loader: {
    marginVertical: 10,
  },
});
