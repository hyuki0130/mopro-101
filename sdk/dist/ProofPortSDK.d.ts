/**
 * ProofPort SDK - Main class
 */
import type { ProofRequest, ProofResponse, CircuitType, CircuitInputs, AgeVerifierInputs, CoinbaseKycInputs, ProofPortConfig, QRCodeOptions } from './types';
import { ethers } from 'ethers';
/**
 * ProofPort SDK for requesting and verifying ZK proofs
 */
export declare class ProofPortSDK {
    private config;
    private pendingRequests;
    constructor(config?: ProofPortConfig);
    /**
     * Create an age verification request
     */
    createAgeVerificationRequest(inputs: AgeVerifierInputs, options?: {
        callbackUrl?: string;
        message?: string;
        dappName?: string;
        dappIcon?: string;
        expiresInMs?: number;
    }): ProofRequest;
    /**
     * Create a Coinbase KYC verification request
     */
    createCoinbaseKycRequest(inputs: CoinbaseKycInputs, options?: {
        callbackUrl?: string;
        message?: string;
        dappName?: string;
        dappIcon?: string;
        expiresInMs?: number;
    }): ProofRequest;
    /**
     * Create a generic proof request
     */
    createProofRequest(circuit: CircuitType, inputs: CircuitInputs, options?: {
        callbackUrl?: string;
        message?: string;
        dappName?: string;
        dappIcon?: string;
        expiresInMs?: number;
    }): ProofRequest;
    /**
     * Generate deep link URL for a proof request
     */
    getDeepLinkUrl(request: ProofRequest): string;
    /**
     * Open ProofPort app with a proof request (browser)
     */
    openProofRequest(request: ProofRequest): void;
    /**
     * Generate QR code as data URL
     */
    generateQRCode(request: ProofRequest, options?: QRCodeOptions): Promise<string>;
    /**
     * Generate QR code as SVG string
     */
    generateQRCodeSVG(request: ProofRequest, options?: QRCodeOptions): Promise<string>;
    /**
     * Render QR code to canvas element
     */
    renderQRCodeToCanvas(canvas: HTMLCanvasElement, request: ProofRequest, options?: QRCodeOptions): Promise<void>;
    /**
     * Check if request data fits in QR code
     */
    checkQRCodeSize(request: ProofRequest): {
        size: number;
        withinLimit: boolean;
    };
    /**
     * Parse proof response from callback URL
     */
    parseResponse(url: string): ProofResponse | null;
    /**
     * Check if a URL is a ProofPort response
     */
    isProofPortResponse(url: string): boolean;
    /**
     * Get pending request by ID
     */
    getPendingRequest(requestId: string): ProofRequest | undefined;
    /**
     * Clear pending request
     */
    clearPendingRequest(requestId: string): void;
    /**
     * Verify proof on-chain
     */
    verifyOnChain(circuit: CircuitType, proof: string, publicInputs: string[], providerOrSigner?: ethers.providers.Provider | ethers.Signer): Promise<{
        valid: boolean;
        error?: string;
    }>;
    /**
     * Verify proof from response on-chain
     */
    verifyResponseOnChain(response: ProofResponse, providerOrSigner?: ethers.providers.Provider | ethers.Signer): Promise<{
        valid: boolean;
        error?: string;
    }>;
    /**
     * Get verifier contract address
     */
    getVerifierAddress(circuit: CircuitType): string;
    /**
     * Get verifier chain ID
     */
    getVerifierChainId(circuit: CircuitType): number;
    /**
     * Get circuit metadata
     */
    getCircuitMetadata(circuit: CircuitType): {
        name: string;
        description: string;
        publicInputsCount: number;
        publicInputNames: string[];
    };
    /**
     * Get all supported circuits
     */
    getSupportedCircuits(): CircuitType[];
    /**
     * Validate a proof request
     */
    validateRequest(request: ProofRequest): {
        valid: boolean;
        error?: string;
    };
    /**
     * Check if URL is a ProofPort deep link
     */
    isProofPortDeepLink(url: string): boolean;
    /**
     * Parse proof request from deep link URL
     */
    parseDeepLink(url: string): ProofRequest | null;
    /**
     * Create SDK with default configuration
     */
    static create(config?: ProofPortConfig): ProofPortSDK;
}
export default ProofPortSDK;
