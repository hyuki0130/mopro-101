/**
 * On-chain verification utilities for ProofPort SDK
 */
import { ethers } from 'ethers';
import type { CircuitType, ParsedProof, VerifierContract } from './types';
/**
 * Get verifier contract instance
 */
export declare function getVerifierContract(circuit: CircuitType, providerOrSigner: ethers.providers.Provider | ethers.Signer, customVerifier?: VerifierContract): ethers.Contract;
/**
 * Get default provider for a chain
 */
export declare function getDefaultProvider(chainId: number): ethers.providers.JsonRpcProvider;
/**
 * Verify proof on-chain
 */
export declare function verifyProofOnChain(circuit: CircuitType, parsedProof: ParsedProof, providerOrSigner?: ethers.providers.Provider | ethers.Signer, customVerifier?: VerifierContract): Promise<{
    valid: boolean;
    error?: string;
}>;
/**
 * Parse proof response into format suitable for on-chain verification
 */
export declare function parseProofForOnChain(proof: string, publicInputs: string[], numPublicInputs: number): ParsedProof;
/**
 * Get verifier contract address for a circuit
 */
export declare function getVerifierAddress(circuit: CircuitType, customVerifier?: VerifierContract): string;
/**
 * Get chain ID for a circuit's default verifier
 */
export declare function getVerifierChainId(circuit: CircuitType, customVerifier?: VerifierContract): number;
