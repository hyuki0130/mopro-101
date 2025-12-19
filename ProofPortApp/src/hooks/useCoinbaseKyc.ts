import {useState, useCallback, useRef} from 'react';
import {ethers} from 'ethers';
import {
  generateNoirProof,
  verifyNoirProof,
  getNoirVerificationKey,
} from 'mopro-ffi';
import {
  getAssetPath,
  preloadCircuitAssets,
  arrayBufferToHex,
  prepareCircuitInputs,
  flattenCircuitInputs,
  verifyAttestationTx,
  recoverPublicKey,
  AUTHORIZED_SIGNERS,
  clearProofCache,
  ensureStorageAvailable,
} from '../utils';
import type {ProofState, ProofStatus} from '../types';

// Circuit file names
const CIRCUIT_NAME = 'zk_coinbase_attestor';

// On-chain Verifier contract on Base Mainnet
// From zkproofport SDK: https://github.com/zkproofport/proofport-sdk
const VERIFIER_CONTRACT_ADDRESS = '0x4C163fa6756244e7f29Cb5BEA0458eA993Eb0F6d';

// Minimal ABI for UltraVerifier contract (Noir generated)
const VERIFIER_ABI = [
  'function verify(bytes calldata _proof, bytes32[] calldata _publicInputs) external view returns (bool)',
];

// Base Mainnet RPC for read-only calls
const BASE_RPC_URL = 'https://mainnet.base.org';

export interface CoinbaseKycInputs {
  // User's wallet address
  userAddress: string;
  // Raw attestation transaction hex
  rawTransaction: string;
  // Index of the Coinbase signer in AUTHORIZED_SIGNERS (0-3)
  signerIndex: number;
}

// Generic EIP-1193 compatible provider interface
// Works with both MetaMask SDK and WalletConnect
export interface EthereumProvider {
  request: (args: {method: string; params?: unknown[]}) => Promise<unknown>;
  getSelectedAddress?: () => Promise<string | undefined>;
  getChainId?: () => Promise<string | undefined>;
}

// MetaMask SDK type for terminate operations (optional, for MetaMask-specific error handling)
export interface MetaMaskSDK {
  terminate: () => Promise<void>;
  connect: () => Promise<unknown>;
  connectWith: (request: {method: string; params?: unknown[]}) => Promise<unknown>;
}

export interface UseCoinbaseKycReturn {
  status: ProofStatus;
  isLoading: boolean;
  vk: ArrayBuffer | null;
  proof: ArrayBuffer | null;
  signalHash: Uint8Array | null;
  publicInputs: string[] | null;
  generateVK: (addLog: (msg: string) => void) => Promise<void>;
  generateProofWithSignature: (
    inputs: CoinbaseKycInputs,
    ethereum: EthereumProvider | null,
    sdk: MetaMaskSDK | null,
    addLog: (msg: string) => void,
  ) => Promise<void>;
  verifyProof: (addLog: (msg: string) => void) => Promise<void>;
  verifyProofOnChain: (addLog: (msg: string) => void) => Promise<void>;
  validateTransaction: (
    rawTx: string,
    userAddress: string,
    addLog: (msg: string) => void,
  ) => boolean;
}

/**
 * Custom hook for managing Coinbase KYC ZK proof generation and verification
 */
export const useCoinbaseKyc = (): UseCoinbaseKycReturn => {
  const [status, setStatus] = useState<ProofStatus>('Ready');
  const [isLoading, setIsLoading] = useState(false);
  const [proofState, setProofState] = useState<ProofState>({
    vk: null,
    proof: null,
  });
  // Full proof for off-chain verification (includes public inputs)
  const [fullProof, setFullProof] = useState<ArrayBuffer | null>(null);
  const [signalHash, setSignalHash] = useState<Uint8Array | null>(null);

  // Gate to prevent duplicate signing requests (iOS deep link race condition fix)
  const isSigningRef = useRef(false);
  const [publicInputs, setPublicInputs] = useState<string[] | null>(null);

  const generateVK = useCallback(async (addLog: (msg: string) => void) => {
    setIsLoading(true);
    setStatus('Generating verification key...');
    addLog('Starting verification key generation for Coinbase KYC circuit');

    try {
      // Preload assets first (ensures files are copied on Android before use)
      const {circuitPath, srsPath} = await preloadCircuitAssets(
        CIRCUIT_NAME,
        addLog,
      );

      addLog(`Circuit path: ${circuitPath}`);
      addLog(`SRS path: ${srsPath}`);

      const startTime = Date.now();
      const generatedVk = getNoirVerificationKey(
        circuitPath,
        srsPath,
        true, // onChain: true = Keccak hash (for Solidity verification)
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

  /**
   * Validate attestation transaction before proof generation
   */
  const validateTransaction = useCallback(
    (rawTx: string, userAddress: string, addLog: (msg: string) => void): boolean => {
      addLog('Validating attestation transaction...');

      const result = verifyAttestationTx(rawTx, userAddress);

      if (!result.valid) {
        addLog(`Validation failed: ${result.error}`);
        return false;
      }

      addLog(`Transaction is valid!`);
      addLog(`Coinbase signer: ${result.signerAddress}`);

      // Find signer index
      const signerIndex = AUTHORIZED_SIGNERS.findIndex(
        addr => addr.toLowerCase() === result.signerAddress?.toLowerCase(),
      );
      addLog(`Signer index in authorized list: ${signerIndex}`);

      return true;
    },
    [],
  );

  /**
   * Generate proof with MetaMask signature
   * Uses ethereum.request() pattern from MetaMask SDK examples
   * Reference: https://github.com/MetaMask/metamask-sdk/blob/main/packages/examples/reactNativeDemo/src/views/DappView.tsx
   */
  const generateProofWithSignature = useCallback(
    async (
      inputs: CoinbaseKycInputs,
      ethereum: EthereumProvider | null,
      sdk: MetaMaskSDK | null,
      addLog: (msg: string) => void,
    ) => {
      if (!proofState.vk) {
        addLog('Please generate verification key first');
        return;
      }

      if (!inputs.userAddress) {
        addLog('Please connect wallet first');
        return;
      }

      if (!inputs.rawTransaction) {
        addLog('Please provide attestation transaction');
        return;
      }

      setIsLoading(true);
      setStatus('Generating proof...');

      try {
        // Step 1: Validate transaction
        addLog('Step 1: Validating attestation transaction...');
        const validation = verifyAttestationTx(inputs.rawTransaction, inputs.userAddress);

        if (!validation.valid) {
          throw new Error(validation.error || 'Invalid transaction');
        }
        addLog(`Coinbase signer verified: ${validation.signerAddress}`);

        // Find signer index
        const signerIndex = AUTHORIZED_SIGNERS.findIndex(
          addr => addr.toLowerCase() === validation.signerAddress?.toLowerCase(),
        );

        if (signerIndex === -1) {
          throw new Error('Signer not found in authorized list');
        }
        addLog(`Signer index: ${signerIndex}`);

        // Step 2: Generate random signal hash
        addLog('Step 2: Generating signal hash...');
        const newSignalHash = ethers.utils.randomBytes(32);
        setSignalHash(newSignalHash);
        const signalHashHex = Buffer.from(newSignalHash).toString('hex');
        addLog(`Signal hash (full): 0x${signalHashHex}`);
        addLog(`Signal hash bytes: [${Array.from(newSignalHash).map(b => '0x' + b.toString(16).padStart(2, '0')).join(', ')}]`);

        // Step 3: Sign signal hash with MetaMask
        // Using ethereum.request() pattern from MetaMask SDK examples
        addLog('Step 3: Requesting signature from MetaMask...');
        const messageHex = ethers.utils.hexlify(newSignalHash);

        if (!ethereum) {
          throw new Error('MetaMask ethereum provider not available');
        }

        // Get the current selected address from the provider
        // This follows the MetaMask SDK DappView.tsx pattern
        // Note: MetaMask SDK returns Promise for getSelectedAddress()
        const selectedAddr = await ethereum.getSelectedAddress?.();
        const from = selectedAddr || inputs.userAddress;
        addLog(`Signing address: ${from}`);
        addLog(`Message: ${messageHex.slice(0, 20)}...`);

        // Gate to prevent duplicate signing requests (iOS deep link race condition fix)
        if (isSigningRef.current) {
          addLog('Signing already in progress, skipping duplicate request');
          throw new Error('Signing already in progress');
        }

        let userSignature: string | undefined;
        try {
          // Set gate before signing
          isSigningRef.current = true;

          // iOS uses socket transport (patched), so no app switching occurs
          // Use ethereum.request() pattern from MetaMask SDK examples
          // Reference: DappView.tsx sign() function
          const result = await ethereum.request({
            method: 'personal_sign',
            params: [messageHex, from],
          });

          userSignature = result as string;
          if (!userSignature) {
            throw new Error('Empty signature returned');
          }
          addLog(`Signature received: ${userSignature.slice(0, 20)}...`);
        } catch (signError) {
          const signErrorMsg = signError instanceof Error ? signError.message : String(signError);

          // Check for "already pending" error (code -32002)
          // This happens when a previous request wasn't fully processed
          const errorCode = (signError as {code?: number})?.code;
          if (errorCode === -32002 || signErrorMsg.includes('already pending')) {
            addLog('⚠️ Request already pending - attempting to reset session...');

            // Terminate SDK session to clear pending requests
            if (sdk) {
              try {
                addLog('Terminating MetaMask session...');
                await sdk.terminate();
                addLog('Session terminated. Please reconnect wallet and try again.');
              } catch (terminateError) {
                addLog(`Terminate failed: ${terminateError}`);
              }
            }

            throw new Error('Session reset due to pending request. Please reconnect wallet.');
          }

          addLog(`Sign error: ${signErrorMsg}`);
          throw new Error(`Signature failed: ${signErrorMsg}`);
        } finally {
          // Always release gate
          isSigningRef.current = false;
        }

        // Step 4: Recover user's public key
        addLog('Step 4: Recovering public key from signature...');
        const userPubkey = recoverPublicKey(messageHex, userSignature);
        addLog(`Public key recovered: ${userPubkey.slice(0, 20)}...`);

        // Step 5: Prepare circuit inputs
        addLog('Step 5: Preparing circuit inputs...');
        const circuitInputs = prepareCircuitInputs(
          newSignalHash,
          inputs.userAddress,
          userSignature,
          userPubkey,
          inputs.rawTransaction,
          signerIndex,
        );

        const flatInputs = flattenCircuitInputs(circuitInputs);
        addLog(`Total circuit inputs: ${flatInputs.length}`);

        // Step 6: Ensure sufficient storage before proof generation
        addLog('Step 6: Checking storage availability...');
        const hasSpace = await ensureStorageAvailable(500, addLog);
        if (!hasSpace) {
          throw new Error('Insufficient storage for proof generation. Please free up space and try again.');
        }

        // Step 7: Generate proof
        addLog('Step 7: Generating ZK proof...');
        const circuitPath = await getAssetPath(`${CIRCUIT_NAME}.json`);
        const srsPath = await getAssetPath(`${CIRCUIT_NAME}.srs`);

        const startTime = Date.now();
        const generatedProof = generateNoirProof(
          circuitPath,
          srsPath,
          flatInputs,
          true, // onChain
          proofState.vk,
          true, // lowMemoryMode
        );
        const elapsed = Date.now() - startTime;

        addLog(`Proof generated in ${elapsed}ms`);

        // Store public inputs for on-chain verification
        // Noir circuit has 64 field elements as public inputs:
        // - signal_hash: [u8; 32] -> 32 field elements (each u8 is one field)
        // - signer_list_merkle_root: [u8; 32] -> 32 field elements
        //
        // IMPORTANT: mopro/noir-rs returns proof WITH public inputs prepended at the beginning!
        // Format: [public_inputs (64 * 32 bytes)] + [pure_proof (16256 bytes)]
        //
        // The on-chain verifier expects 64 bytes32 values, each containing
        // a single u8 value in the last byte with leading zeros (big-endian).
        // We extract each 32-byte field as-is from the proof.

        const NUM_PUBLIC_INPUTS = 64; // 32 for signal_hash + 32 for merkle_root
        const BYTES_PER_FIELD = 32; // Each field element is 32 bytes
        const PUBLIC_INPUTS_SIZE = NUM_PUBLIC_INPUTS * BYTES_PER_FIELD; // 2048 bytes

        addLog(`Raw proof size: ${generatedProof.byteLength} bytes`);
        addLog(`Public inputs region: ${PUBLIC_INPUTS_SIZE} bytes (${NUM_PUBLIC_INPUTS} fields)`);
        addLog(`Pure proof size: ${generatedProof.byteLength - PUBLIC_INPUTS_SIZE} bytes`);

        const proofBytes = new Uint8Array(generatedProof);

        // Extract all 64 public inputs as separate bytes32 values
        // Each field is 32 bytes, kept as-is (big-endian, u8 value in last byte)
        const publicInputsArray: string[] = [];
        for (let i = 0; i < NUM_PUBLIC_INPUTS; i++) {
          const fieldStart = i * BYTES_PER_FIELD;
          const fieldBytes = proofBytes.slice(fieldStart, fieldStart + BYTES_PER_FIELD);

          // Convert to hex string with 0x prefix
          let hex = '0x';
          for (let j = 0; j < fieldBytes.length; j++) {
            hex += fieldBytes[j].toString(16).padStart(2, '0');
          }
          publicInputsArray.push(hex.toLowerCase());
        }

        addLog(`Extracted ${publicInputsArray.length} public inputs for on-chain verification`);

        // Log all 64 public inputs for debugging (signal_hash[0-31] + merkle_root[0-31])
        addLog('=== PUBLIC INPUTS (signal_hash[0-31]) ===');
        for (let i = 0; i < 32; i++) {
          addLog(`  [${i}]: ${publicInputsArray[i]}`);
        }
        addLog('=== PUBLIC INPUTS (merkle_root[0-31]) ===');
        for (let i = 32; i < 64; i++) {
          addLog(`  [${i}]: ${publicInputsArray[i]}`);
        }

        // Extract pure proof (everything after public inputs)
        const pureProofBytes = proofBytes.slice(PUBLIC_INPUTS_SIZE);
        const pureProof = pureProofBytes.buffer.slice(
          pureProofBytes.byteOffset,
          pureProofBytes.byteOffset + pureProofBytes.byteLength,
        );

        addLog(`Pure proof size: ${pureProof.byteLength} bytes`);
        addLog(
          `Pure proof (first 64 chars): ${arrayBufferToHex(pureProof).substring(0, 64)}...`,
        );

        // Store full proof for off-chain verification (includes public inputs)
        setFullProof(generatedProof);
        // Store pure proof for on-chain verification (without public inputs)
        setProofState(prev => ({...prev, proof: pureProof}));
        setPublicInputs(publicInputsArray);
        addLog(`Prepared proof and ${publicInputsArray.length} public inputs for on-chain verification`);

        // Step 8: Clean up cache after proof generation
        addLog('Step 8: Cleaning up cache...');
        await clearProofCache(addLog);

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
      if (!proofState.vk || !fullProof) {
        addLog('Please generate VK and proof first');
        return;
      }

      setIsLoading(true);
      setStatus('Verifying proof (off-chain)...');
      addLog('Starting off-chain proof verification');

      try {
        const circuitPath = await getAssetPath(`${CIRCUIT_NAME}.json`);

        const startTime = Date.now();
        // Use fullProof (includes public inputs) for mopro off-chain verification
        const isValid = verifyNoirProof(
          circuitPath,
          fullProof,
          true, // onChain format (Keccak hash)
          proofState.vk,
          true, // lowMemoryMode
        );
        const elapsed = Date.now() - startTime;

        addLog(`Off-chain verification completed in ${elapsed}ms`);
        addLog(`Result: ${isValid ? 'VALID' : 'INVALID'}`);
        setStatus(isValid ? 'Proof verified (off-chain)!' : 'Proof invalid');
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog(`Error: ${errorMessage}`);
        setStatus('Error verifying proof');
      } finally {
        setIsLoading(false);
      }
    },
    [proofState.vk, fullProof],
  );

  /**
   * Verify proof on-chain using the deployed Verifier contract on Base
   */
  const verifyProofOnChain = useCallback(
    async (addLog: (msg: string) => void) => {
      if (!proofState.proof) {
        addLog('Please generate proof first');
        return;
      }

      if (!publicInputs) {
        addLog('Public inputs not available');
        return;
      }

      setIsLoading(true);
      setStatus('Verifying proof on-chain...');
      addLog('=== Starting On-Chain Verification ===');
      addLog(`Verifier contract: ${VERIFIER_CONTRACT_ADDRESS}`);
      addLog(`Chain: Base Mainnet (8453)`);

      try {
        // Create provider for Base chain
        const provider = new ethers.providers.JsonRpcProvider(BASE_RPC_URL);
        addLog('Connected to Base RPC');

        // Create contract instance
        const verifierContract = new ethers.Contract(
          VERIFIER_CONTRACT_ADDRESS,
          VERIFIER_ABI,
          provider,
        );

        // Convert proof ArrayBuffer to hex string
        const proofHex = '0x' + arrayBufferToHex(proofState.proof);
        addLog(`Proof size: ${proofState.proof.byteLength} bytes`);
        addLog(`Proof hex (first 40 chars): ${proofHex.substring(0, 42)}...`);

        // Public inputs as bytes32 array (64 elements) - full log for debugging
        addLog(`Public inputs: ${publicInputs.length} element(s)`);
        addLog('=== ALL PUBLIC INPUTS FOR ON-CHAIN ===');
        for (let i = 0; i < publicInputs.length; i++) {
          addLog(`  [${i}]: ${publicInputs[i]}`);
        }

        // Call verify function (view function, no gas needed)
        addLog('Calling verifier contract...');
        const startTime = Date.now();

        const isValid = await verifierContract.verify(proofHex, publicInputs);

        const elapsed = Date.now() - startTime;
        addLog(`On-chain verification completed in ${elapsed}ms`);
        addLog(`Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);

        if (isValid) {
          addLog('🎉 Proof verified on Base blockchain!');
          setStatus('Proof verified on-chain!');
        } else {
          addLog('Proof rejected by on-chain verifier');
          setStatus('Proof invalid (on-chain)');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addLog(`On-chain verification error: ${errorMessage}`);

        // Provide more helpful error messages
        if (errorMessage.includes('call revert')) {
          addLog('Contract call reverted - proof may be invalid or wrong format');
        } else if (errorMessage.includes('network')) {
          addLog('Network error - check internet connection');
        }

        setStatus('Error: on-chain verification failed');
      } finally {
        setIsLoading(false);
      }
    },
    [proofState.proof, publicInputs],
  );

  return {
    status,
    isLoading,
    vk: proofState.vk,
    proof: proofState.proof,
    signalHash,
    publicInputs,
    generateVK,
    generateProofWithSignature,
    verifyProof,
    verifyProofOnChain,
    validateTransaction,
  };
};
