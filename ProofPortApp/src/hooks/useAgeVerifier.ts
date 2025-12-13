import {useState, useCallback} from 'react';
import {
  generateNoirProof,
  verifyNoirProof,
  getNoirVerificationKey,
} from 'mopro-ffi';
import {getAssetPath, arrayBufferToHex, validateInputs} from '../utils';
import type {ProofState, ProofStatus, AgeVerifierInputs} from '../types';

export interface UseAgeVerifierReturn {
  status: ProofStatus;
  isLoading: boolean;
  vk: ArrayBuffer | null;
  proof: ArrayBuffer | null;
  generateVK: (addLog: (msg: string) => void) => Promise<void>;
  generateProof: (
    inputs: AgeVerifierInputs,
    addLog: (msg: string) => void,
  ) => Promise<void>;
  verifyProof: (addLog: (msg: string) => void) => Promise<void>;
  runAll: (
    inputs: AgeVerifierInputs,
    addLog: (msg: string) => void,
  ) => Promise<void>;
}

/**
 * Custom hook for managing ZK proof generation and verification
 */
export const useAgeVerifier = (): UseAgeVerifierReturn => {
  const [status, setStatus] = useState<ProofStatus>('Ready');
  const [isLoading, setIsLoading] = useState(false);
  const [proofState, setProofState] = useState<ProofState>({
    vk: null,
    proof: null,
  });

  const generateVK = useCallback(async (addLog: (msg: string) => void) => {
    setIsLoading(true);
    setStatus('Generating verification key...');
    addLog('Starting verification key generation');

    try {
      const circuitPath = await getAssetPath('age_verifier.json');
      const srsPath = await getAssetPath('age_verifier.srs');

      addLog(`Circuit path: ${circuitPath}`);
      addLog(`SRS path: ${srsPath}`);

      const startTime = Date.now();
      const generatedVk = getNoirVerificationKey(
        circuitPath,
        srsPath,
        false, // onChain: false = Poseidon hash (faster)
        true, // lowMemoryMode
      );
      const elapsed = Date.now() - startTime;

      setProofState(prev => ({...prev, vk: generatedVk}));
      addLog(`VK generated in ${elapsed}ms`);
      addLog(`VK size: ${generatedVk.byteLength} bytes`);
      setStatus('Verification key ready');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      addLog(`Error: ${errorMessage}`);
      setStatus('Error generating VK');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateProof = useCallback(
    async (inputs: AgeVerifierInputs, addLog: (msg: string) => void) => {
      if (!proofState.vk) {
        addLog('Please generate verification key first');
        return;
      }

      // Validate inputs
      const validation = validateInputs(
        inputs.birthYear,
        inputs.currentYear,
        inputs.minAge,
      );

      if (!validation.isValid) {
        addLog(`Error: ${validation.error}`);
        setStatus('Invalid input');
        return;
      }

      setIsLoading(true);
      setStatus('Generating proof...');
      addLog('Starting proof generation');

      try {
        const circuitPath = await getAssetPath('age_verifier.json');
        const srsPath = await getAssetPath('age_verifier.srs');
        const inputArray = [
          inputs.birthYear,
          inputs.currentYear,
          inputs.minAge,
        ];

        addLog(
          `Inputs: birth_year=${inputs.birthYear}, current_year=${inputs.currentYear}, min_age=${inputs.minAge}`,
        );

        const startTime = Date.now();
        const generatedProof = generateNoirProof(
          circuitPath,
          srsPath,
          inputArray,
          false, // onChain
          proofState.vk,
          true, // lowMemoryMode
        );
        const elapsed = Date.now() - startTime;

        setProofState(prev => ({...prev, proof: generatedProof}));
        addLog(`Proof generated in ${elapsed}ms`);
        addLog(`Proof size: ${generatedProof.byteLength} bytes`);
        addLog(
          `Proof (first 64 chars): ${arrayBufferToHex(generatedProof).substring(
            0,
            64,
          )}...`,
        );
        setStatus('Proof ready');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog(`Error: ${errorMessage}`);
        setStatus('Error generating proof');
      } finally {
        setIsLoading(false);
      }
    },
    [proofState.vk],
  );

  const verifyProof = useCallback(
    async (addLog: (msg: string) => void) => {
      if (!proofState.vk || !proofState.proof) {
        addLog('Please generate VK and proof first');
        return;
      }

      setIsLoading(true);
      setStatus('Verifying proof...');
      addLog('Starting proof verification');

      try {
        const circuitPath = await getAssetPath('age_verifier.json');

        const startTime = Date.now();
        const isValid = verifyNoirProof(
          circuitPath,
          proofState.proof,
          false, // onChain
          proofState.vk,
          true, // lowMemoryMode
        );
        const elapsed = Date.now() - startTime;

        addLog(`Verification completed in ${elapsed}ms`);
        addLog(`Result: ${isValid ? 'VALID' : 'INVALID'}`);
        setStatus(isValid ? 'Proof verified!' : 'Proof invalid');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog(`Error: ${errorMessage}`);
        setStatus('Error verifying proof');
      } finally {
        setIsLoading(false);
      }
    },
    [proofState.vk, proofState.proof],
  );

  const runAll = useCallback(
    async (inputs: AgeVerifierInputs, addLog: (msg: string) => void) => {
      addLog('=== Running Full Flow ===');

      // Generate VK
      setIsLoading(true);
      setStatus('Generating verification key...');
      addLog('Starting verification key generation');

      let currentVk: ArrayBuffer | null = null;

      try {
        const circuitPath = await getAssetPath('age_verifier.json');
        const srsPath = await getAssetPath('age_verifier.srs');

        addLog(`Circuit path: ${circuitPath}`);
        addLog(`SRS path: ${srsPath}`);

        const startTime = Date.now();
        currentVk = getNoirVerificationKey(circuitPath, srsPath, false, true);
        const elapsed = Date.now() - startTime;

        setProofState(prev => ({...prev, vk: currentVk}));
        addLog(`VK generated in ${elapsed}ms`);
        addLog(`VK size: ${currentVk!.byteLength} bytes`);
        setStatus('Verification key ready');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog(`Error: ${errorMessage}`);
        setStatus('Error generating VK');
        setIsLoading(false);
        return;
      }

      // Generate Proof
      const validation = validateInputs(
        inputs.birthYear,
        inputs.currentYear,
        inputs.minAge,
      );

      if (!validation.isValid) {
        addLog(`Error: ${validation.error}`);
        setStatus('Invalid input');
        setIsLoading(false);
        return;
      }

      setStatus('Generating proof...');
      addLog('Starting proof generation');

      let currentProof: ArrayBuffer | null = null;

      try {
        const circuitPath = await getAssetPath('age_verifier.json');
        const srsPath = await getAssetPath('age_verifier.srs');
        const inputArray = [
          inputs.birthYear,
          inputs.currentYear,
          inputs.minAge,
        ];

        addLog(
          `Inputs: birth_year=${inputs.birthYear}, current_year=${inputs.currentYear}, min_age=${inputs.minAge}`,
        );

        const startTime = Date.now();
        currentProof = generateNoirProof(
          circuitPath,
          srsPath,
          inputArray,
          false,
          currentVk!,
          true,
        );
        const elapsed = Date.now() - startTime;

        setProofState(prev => ({...prev, proof: currentProof}));
        addLog(`Proof generated in ${elapsed}ms`);
        addLog(`Proof size: ${currentProof!.byteLength} bytes`);
        addLog(
          `Proof (first 64 chars): ${arrayBufferToHex(currentProof!).substring(
            0,
            64,
          )}...`,
        );
        setStatus('Proof ready');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog(`Error: ${errorMessage}`);
        setStatus('Error generating proof');
        setIsLoading(false);
        return;
      }

      // Verify Proof
      setStatus('Verifying proof...');
      addLog('Starting proof verification');

      try {
        const circuitPath = await getAssetPath('age_verifier.json');

        const startTime = Date.now();
        const isValid = verifyNoirProof(
          circuitPath,
          currentProof!,
          false,
          currentVk!,
          true,
        );
        const elapsed = Date.now() - startTime;

        addLog(`Verification completed in ${elapsed}ms`);
        addLog(`Result: ${isValid ? 'VALID' : 'INVALID'}`);
        setStatus(isValid ? 'Proof verified!' : 'Proof invalid');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog(`Error: ${errorMessage}`);
        setStatus('Error verifying proof');
      } finally {
        setIsLoading(false);
        addLog('=== Flow Complete ===');
      }
    },
    [],
  );

  return {
    status,
    isLoading,
    vk: proofState.vk,
    proof: proofState.proof,
    generateVK,
    generateProof,
    verifyProof,
    runAll,
  };
};
