import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../types';

type MainScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Main'>;
};

export const MainScreen: React.FC<MainScreenProps> = ({navigation}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>ProofPort</Text>
        <Text style={styles.subtitle}>Select a feature to explore</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.ageVerifierButton]}
            onPress={() => navigation.navigate('AgeVerifier')}>
            <Text style={styles.buttonText}>Age Verifier</Text>
            <Text style={styles.buttonDescription}>
              Zero-knowledge age proof
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.metamaskButton]}
            onPress={() => navigation.navigate('Metamask')}>
            <Text style={styles.buttonText}>Metamask</Text>
            <Text style={styles.buttonDescription}>
              Connect wallet & get address
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  button: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ageVerifierButton: {
    backgroundColor: '#007AFF',
  },
  metamaskButton: {
    backgroundColor: '#F6851B',
  },
  buttonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  buttonDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
