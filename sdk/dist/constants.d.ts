/**
 * ProofPort SDK Constants
 */
import type { CircuitType, VerifierContract } from './types';
/**
 * Default deep link scheme
 */
export declare const DEFAULT_SCHEME = "zkproofport";
/**
 * Deep link hosts
 */
export declare const DEEP_LINK_HOSTS: {
    readonly PROOF_REQUEST: "proof-request";
    readonly PROOF_RESPONSE: "proof-response";
};
/**
 * Circuit metadata
 */
export declare const CIRCUIT_METADATA: Record<CircuitType, {
    name: string;
    description: string;
    publicInputsCount: number;
    publicInputNames: string[];
}>;
/**
 * Default verifier contracts on Sepolia
 */
export declare const DEFAULT_VERIFIERS: Record<CircuitType, VerifierContract>;
/**
 * RPC endpoints by chain ID
 */
export declare const RPC_ENDPOINTS: Record<number, string>;
/**
 * Request expiry time (default: 10 minutes)
 */
export declare const DEFAULT_REQUEST_EXPIRY_MS: number;
/**
 * Maximum QR code data size (bytes)
 */
export declare const MAX_QR_DATA_SIZE = 2953;
