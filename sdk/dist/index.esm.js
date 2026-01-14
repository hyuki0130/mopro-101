import QRCode from 'qrcode';
import { ethers } from 'ethers';

/**
 * ProofPort SDK Constants
 */
/**
 * Default deep link scheme
 */
const DEFAULT_SCHEME = 'zkproofport';
/**
 * Deep link hosts
 */
const DEEP_LINK_HOSTS = {
    PROOF_REQUEST: 'proof-request',
    PROOF_RESPONSE: 'proof-response',
};
/**
 * Circuit metadata
 */
const CIRCUIT_METADATA = {
    age_verifier: {
        name: 'Age Verifier',
        description: 'Verify age without revealing birth year',
        publicInputsCount: 2,
        publicInputNames: ['current_year', 'min_age'],
    },
    zk_coinbase_attestor: {
        name: 'Coinbase KYC',
        description: 'Prove Coinbase identity verification',
        publicInputsCount: 2,
        publicInputNames: ['signal_hash', 'signer_list_merkle_root'],
    },
};
/**
 * Default verifier contracts on Sepolia
 */
const DEFAULT_VERIFIERS = {
    age_verifier: {
        address: '0x33316f0A1F6638AbC8D5a6aCce5a1cF13427A0c9',
        chainId: 11155111, // Sepolia
        abi: [
            'function verify(bytes calldata _proof, bytes32[] calldata _publicInputs) external view returns (bool)',
        ],
    },
    zk_coinbase_attestor: {
        address: '0x121632902482B658e0F2D055126dBe977deb9FC1',
        chainId: 11155111, // Sepolia
        abi: [
            'function verify(bytes calldata _proof, bytes32[] calldata _publicInputs) external view returns (bool)',
        ],
    },
};
/**
 * RPC endpoints by chain ID
 */
const RPC_ENDPOINTS = {
    11155111: 'https://sepolia.infura.io/v3/2fe2d28467784ababcae918bb18b4bf6',
    84532: 'https://sepolia.base.org', // Base Sepolia
};
/**
 * Request expiry time (default: 10 minutes)
 */
const DEFAULT_REQUEST_EXPIRY_MS = 10 * 60 * 1000;
/**
 * Maximum QR code data size (bytes)
 */
const MAX_QR_DATA_SIZE = 2953; // Version 40 with L error correction

/**
 * Deep Link utilities for ProofPort SDK
 */
/**
 * Generate a unique request ID
 */
function generateRequestId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `req-${timestamp}-${random}`;
}
/**
 * Encode data for URL transmission (base64url with UTF-8 support)
 */
function encodeData(data) {
    const json = JSON.stringify(data);
    // Use base64url encoding (URL-safe) with UTF-8 support
    if (typeof btoa === 'function') {
        // Browser: UTF-8 encode first, then base64
        const utf8Encoded = encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16)));
        return btoa(utf8Encoded)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }
    // Node.js environment
    return Buffer.from(json, 'utf-8')
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
/**
 * Decode URL-transmitted data (base64url with UTF-8 support)
 */
function decodeData(encoded) {
    // Restore base64 padding
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    let json;
    if (typeof atob === 'function') {
        // Browser: decode base64, then UTF-8 decode
        const decoded = atob(base64);
        json = decodeURIComponent(decoded.split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
    }
    else {
        json = Buffer.from(base64, 'base64').toString('utf-8');
    }
    return JSON.parse(json);
}
/**
 * Build a proof request deep link URL
 */
function buildProofRequestUrl(request, scheme = DEFAULT_SCHEME) {
    const encodedRequest = encodeData(request);
    return `${scheme}://${DEEP_LINK_HOSTS.PROOF_REQUEST}?data=${encodedRequest}`;
}
/**
 * Build a callback URL with proof response
 */
function buildCallbackUrl(callbackUrl, response) {
    const url = new URL(callbackUrl);
    url.searchParams.set('requestId', response.requestId);
    url.searchParams.set('status', response.status);
    if (response.status === 'completed' && response.proof) {
        url.searchParams.set('proof', response.proof);
        if (response.publicInputs) {
            url.searchParams.set('publicInputs', response.publicInputs.join(','));
        }
        if (response.numPublicInputs !== undefined) {
            url.searchParams.set('numPublicInputs', response.numPublicInputs.toString());
        }
        if (response.timestamp) {
            url.searchParams.set('timestamp', response.timestamp.toString());
        }
    }
    else if (response.status === 'error' && response.error) {
        url.searchParams.set('error', response.error);
    }
    return url.toString();
}
/**
 * Parse a proof request from deep link URL
 */
function parseProofRequestUrl(url) {
    try {
        const urlObj = new URL(url);
        const data = urlObj.searchParams.get('data');
        if (!data) {
            return null;
        }
        return decodeData(data);
    }
    catch (error) {
        console.error('Failed to parse proof request URL:', error);
        return null;
    }
}
/**
 * Parse a proof response from callback URL
 */
function parseProofResponseUrl(url) {
    try {
        const urlObj = new URL(url);
        const requestId = urlObj.searchParams.get('requestId');
        const status = urlObj.searchParams.get('status');
        if (!requestId || !status) {
            return null;
        }
        const response = {
            requestId,
            circuit: urlObj.searchParams.get('circuit') || 'age_verifier',
            status,
        };
        if (status === 'completed') {
            response.proof = urlObj.searchParams.get('proof') || undefined;
            const publicInputsStr = urlObj.searchParams.get('publicInputs');
            if (publicInputsStr) {
                response.publicInputs = publicInputsStr.split(',');
            }
            const numPublicInputs = urlObj.searchParams.get('numPublicInputs');
            if (numPublicInputs) {
                response.numPublicInputs = parseInt(numPublicInputs, 10);
            }
            const timestamp = urlObj.searchParams.get('timestamp');
            if (timestamp) {
                response.timestamp = parseInt(timestamp, 10);
            }
        }
        else if (status === 'error') {
            response.error = urlObj.searchParams.get('error') || undefined;
        }
        return response;
    }
    catch (error) {
        console.error('Failed to parse proof response URL:', error);
        return null;
    }
}
/**
 * Parse deep link URL into components
 */
function parseDeepLink(url) {
    try {
        // Handle custom scheme URLs
        const schemeMatch = url.match(/^([a-z][a-z0-9+.-]*):\/\/(.+)$/i);
        if (!schemeMatch) {
            return null;
        }
        const scheme = schemeMatch[1];
        const rest = schemeMatch[2];
        // Parse host and path
        const [hostPath, queryString] = rest.split('?');
        const [host, ...pathParts] = hostPath.split('/');
        const path = '/' + pathParts.join('/');
        // Parse query parameters
        const params = {};
        if (queryString) {
            const searchParams = new URLSearchParams(queryString);
            searchParams.forEach((value, key) => {
                params[key] = value;
            });
        }
        return { scheme, host, path, params };
    }
    catch (error) {
        console.error('Failed to parse deep link:', error);
        return null;
    }
}
/**
 * Check if URL is a ProofPort deep link
 */
function isProofPortDeepLink(url, scheme = DEFAULT_SCHEME) {
    return url.toLowerCase().startsWith(`${scheme.toLowerCase()}://`);
}
/**
 * Validate proof request
 */
function validateProofRequest(request) {
    if (!request.requestId) {
        return { valid: false, error: 'Missing requestId' };
    }
    if (!request.circuit) {
        return { valid: false, error: 'Missing circuit type' };
    }
    if (!['age_verifier', 'zk_coinbase_attestor'].includes(request.circuit)) {
        return { valid: false, error: `Invalid circuit type: ${request.circuit}` };
    }
    if (!request.callbackUrl) {
        return { valid: false, error: 'Missing callbackUrl' };
    }
    // Validate circuit-specific inputs
    if (request.circuit === 'age_verifier') {
        const inputs = request.inputs;
        if (typeof inputs.birthYear !== 'number' || inputs.birthYear < 1900 || inputs.birthYear > 2100) {
            return { valid: false, error: 'Invalid birthYear' };
        }
        if (typeof inputs.currentYear !== 'number' || inputs.currentYear < 2000 || inputs.currentYear > 2100) {
            return { valid: false, error: 'Invalid currentYear' };
        }
        if (typeof inputs.minAge !== 'number' || inputs.minAge < 0 || inputs.minAge > 150) {
            return { valid: false, error: 'Invalid minAge' };
        }
    }
    else if (request.circuit === 'zk_coinbase_attestor') {
        // Coinbase KYC: userAddress is optional - app will connect wallet if not provided
        const inputs = request.inputs;
        if (inputs.userAddress && !/^0x[a-fA-F0-9]{40}$/.test(inputs.userAddress)) {
            return { valid: false, error: 'Invalid userAddress format' };
        }
        // If userAddress is not provided, app will prompt wallet connection - this is valid
    }
    // Check expiry
    if (request.expiresAt && Date.now() > request.expiresAt) {
        return { valid: false, error: 'Request has expired' };
    }
    return { valid: true };
}

/**
 * QR Code utilities for ProofPort SDK
 */
/**
 * Default QR code options
 */
const DEFAULT_QR_OPTIONS = {
    width: 300,
    errorCorrectionLevel: 'M',
    margin: 2,
    darkColor: '#000000',
    lightColor: '#ffffff',
};
/**
 * Generate QR code as data URL (base64 PNG)
 */
async function generateQRCodeDataUrl(request, options = {}, scheme = DEFAULT_SCHEME) {
    const url = buildProofRequestUrl(request, scheme);
    // Check data size
    if (url.length > MAX_QR_DATA_SIZE) {
        throw new Error(`QR code data too large (${url.length} bytes). Maximum is ${MAX_QR_DATA_SIZE} bytes.`);
    }
    const mergedOptions = { ...DEFAULT_QR_OPTIONS, ...options };
    return QRCode.toDataURL(url, {
        width: mergedOptions.width,
        errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
        margin: mergedOptions.margin,
        color: {
            dark: mergedOptions.darkColor,
            light: mergedOptions.lightColor,
        },
    });
}
/**
 * Generate QR code as SVG string
 */
async function generateQRCodeSVG(request, options = {}, scheme = DEFAULT_SCHEME) {
    const url = buildProofRequestUrl(request, scheme);
    if (url.length > MAX_QR_DATA_SIZE) {
        throw new Error(`QR code data too large (${url.length} bytes). Maximum is ${MAX_QR_DATA_SIZE} bytes.`);
    }
    const mergedOptions = { ...DEFAULT_QR_OPTIONS, ...options };
    return QRCode.toString(url, {
        type: 'svg',
        width: mergedOptions.width,
        errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
        margin: mergedOptions.margin,
        color: {
            dark: mergedOptions.darkColor,
            light: mergedOptions.lightColor,
        },
    });
}
/**
 * Generate QR code to canvas element (browser only)
 */
async function generateQRCodeToCanvas(canvas, request, options = {}, scheme = DEFAULT_SCHEME) {
    const url = buildProofRequestUrl(request, scheme);
    if (url.length > MAX_QR_DATA_SIZE) {
        throw new Error(`QR code data too large (${url.length} bytes). Maximum is ${MAX_QR_DATA_SIZE} bytes.`);
    }
    const mergedOptions = { ...DEFAULT_QR_OPTIONS, ...options };
    await QRCode.toCanvas(canvas, url, {
        width: mergedOptions.width,
        errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
        margin: mergedOptions.margin,
        color: {
            dark: mergedOptions.darkColor,
            light: mergedOptions.lightColor,
        },
    });
}
/**
 * Estimate QR code data size for a request
 */
function estimateQRDataSize(request, scheme = DEFAULT_SCHEME) {
    const url = buildProofRequestUrl(request, scheme);
    return {
        size: url.length,
        withinLimit: url.length <= MAX_QR_DATA_SIZE,
    };
}

/**
 * On-chain verification utilities for ProofPort SDK
 */
/**
 * Get verifier contract instance
 */
function getVerifierContract(circuit, providerOrSigner, customVerifier) {
    const verifier = customVerifier || DEFAULT_VERIFIERS[circuit];
    return new ethers.Contract(verifier.address, verifier.abi, providerOrSigner);
}
/**
 * Get default provider for a chain
 */
function getDefaultProvider(chainId) {
    const rpcUrl = RPC_ENDPOINTS[chainId];
    if (!rpcUrl) {
        throw new Error(`No RPC endpoint configured for chain ${chainId}`);
    }
    return new ethers.providers.JsonRpcProvider(rpcUrl);
}
/**
 * Verify proof on-chain
 */
async function verifyProofOnChain(circuit, parsedProof, providerOrSigner, customVerifier) {
    try {
        const verifier = customVerifier || DEFAULT_VERIFIERS[circuit];
        const provider = providerOrSigner || getDefaultProvider(verifier.chainId);
        const contract = getVerifierContract(circuit, provider, customVerifier);
        // Convert public inputs to bytes32 array
        const publicInputsBytes32 = parsedProof.publicInputsHex.map((input) => {
            // Ensure proper padding to 32 bytes
            const hex = input.startsWith('0x') ? input : `0x${input}`;
            return ethers.utils.hexZeroPad(hex, 32);
        });
        // Call verify function
        const isValid = await contract.verify(parsedProof.proofHex, publicInputsBytes32);
        return { valid: isValid };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { valid: false, error: errorMessage };
    }
}
/**
 * Parse proof response into format suitable for on-chain verification
 */
function parseProofForOnChain(proof, publicInputs, numPublicInputs) {
    // Ensure proof has 0x prefix
    const proofHex = proof.startsWith('0x') ? proof : `0x${proof}`;
    // Ensure all public inputs have 0x prefix and are properly padded
    const publicInputsHex = publicInputs.map((input) => {
        const hex = input.startsWith('0x') ? input : `0x${input}`;
        // Pad to 32 bytes if needed
        if (hex.length < 66) { // 0x + 64 hex chars = 32 bytes
            return ethers.utils.hexZeroPad(hex, 32);
        }
        return hex;
    });
    return {
        proofHex,
        publicInputsHex,
        numPublicInputs,
    };
}
/**
 * Get verifier contract address for a circuit
 */
function getVerifierAddress(circuit, customVerifier) {
    return customVerifier?.address || DEFAULT_VERIFIERS[circuit].address;
}
/**
 * Get chain ID for a circuit's default verifier
 */
function getVerifierChainId(circuit, customVerifier) {
    return customVerifier?.chainId || DEFAULT_VERIFIERS[circuit].chainId;
}

/**
 * ProofPort SDK - Main class
 */
/**
 * ProofPort SDK for requesting and verifying ZK proofs
 */
class ProofPortSDK {
    constructor(config = {}) {
        this.pendingRequests = new Map();
        this.config = {
            scheme: config.scheme || DEFAULT_SCHEME,
            defaultCallbackUrl: config.defaultCallbackUrl || '',
            verifiers: config.verifiers || {},
        };
    }
    // ============ Request Creation ============
    /**
     * Create an age verification request
     */
    createAgeVerificationRequest(inputs, options = {}) {
        const request = {
            requestId: generateRequestId(),
            circuit: 'age_verifier',
            inputs,
            callbackUrl: options.callbackUrl || this.config.defaultCallbackUrl,
            message: options.message,
            dappName: options.dappName,
            dappIcon: options.dappIcon,
            createdAt: Date.now(),
            expiresAt: Date.now() + (options.expiresInMs || DEFAULT_REQUEST_EXPIRY_MS),
        };
        this.pendingRequests.set(request.requestId, request);
        return request;
    }
    /**
     * Create a Coinbase KYC verification request
     */
    createCoinbaseKycRequest(inputs, options = {}) {
        const request = {
            requestId: generateRequestId(),
            circuit: 'zk_coinbase_attestor',
            inputs,
            callbackUrl: options.callbackUrl || this.config.defaultCallbackUrl,
            message: options.message,
            dappName: options.dappName,
            dappIcon: options.dappIcon,
            createdAt: Date.now(),
            expiresAt: Date.now() + (options.expiresInMs || DEFAULT_REQUEST_EXPIRY_MS),
        };
        this.pendingRequests.set(request.requestId, request);
        return request;
    }
    /**
     * Create a generic proof request
     */
    createProofRequest(circuit, inputs, options = {}) {
        if (circuit === 'age_verifier') {
            return this.createAgeVerificationRequest(inputs, options);
        }
        else {
            return this.createCoinbaseKycRequest(inputs, options);
        }
    }
    // ============ Deep Link Generation ============
    /**
     * Generate deep link URL for a proof request
     */
    getDeepLinkUrl(request) {
        return buildProofRequestUrl(request, this.config.scheme);
    }
    /**
     * Open ProofPort app with a proof request (browser)
     */
    openProofRequest(request) {
        const url = this.getDeepLinkUrl(request);
        window.location.href = url;
    }
    // ============ QR Code Generation ============
    /**
     * Generate QR code as data URL
     */
    async generateQRCode(request, options) {
        return generateQRCodeDataUrl(request, options, this.config.scheme);
    }
    /**
     * Generate QR code as SVG string
     */
    async generateQRCodeSVG(request, options) {
        return generateQRCodeSVG(request, options, this.config.scheme);
    }
    /**
     * Render QR code to canvas element
     */
    async renderQRCodeToCanvas(canvas, request, options) {
        return generateQRCodeToCanvas(canvas, request, options, this.config.scheme);
    }
    /**
     * Check if request data fits in QR code
     */
    checkQRCodeSize(request) {
        return estimateQRDataSize(request, this.config.scheme);
    }
    // ============ Response Handling ============
    /**
     * Parse proof response from callback URL
     */
    parseResponse(url) {
        return parseProofResponseUrl(url);
    }
    /**
     * Check if a URL is a ProofPort response
     */
    isProofPortResponse(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.searchParams.has('requestId') && urlObj.searchParams.has('status');
        }
        catch {
            return false;
        }
    }
    /**
     * Get pending request by ID
     */
    getPendingRequest(requestId) {
        return this.pendingRequests.get(requestId);
    }
    /**
     * Clear pending request
     */
    clearPendingRequest(requestId) {
        this.pendingRequests.delete(requestId);
    }
    // ============ Verification ============
    /**
     * Verify proof on-chain
     */
    async verifyOnChain(circuit, proof, publicInputs, providerOrSigner) {
        const parsedProof = parseProofForOnChain(proof, publicInputs, publicInputs.length);
        const customVerifier = this.config.verifiers[circuit];
        return verifyProofOnChain(circuit, parsedProof, providerOrSigner, customVerifier);
    }
    /**
     * Verify proof from response on-chain
     */
    async verifyResponseOnChain(response, providerOrSigner) {
        if (response.status !== 'completed' || !response.proof || !response.publicInputs) {
            return { valid: false, error: 'Invalid or incomplete response' };
        }
        return this.verifyOnChain(response.circuit, response.proof, response.publicInputs, providerOrSigner);
    }
    // ============ Utility Methods ============
    /**
     * Get verifier contract address
     */
    getVerifierAddress(circuit) {
        const customVerifier = this.config.verifiers[circuit];
        return getVerifierAddress(circuit, customVerifier);
    }
    /**
     * Get verifier chain ID
     */
    getVerifierChainId(circuit) {
        const customVerifier = this.config.verifiers[circuit];
        return getVerifierChainId(circuit, customVerifier);
    }
    /**
     * Get circuit metadata
     */
    getCircuitMetadata(circuit) {
        return CIRCUIT_METADATA[circuit];
    }
    /**
     * Get all supported circuits
     */
    getSupportedCircuits() {
        return Object.keys(CIRCUIT_METADATA);
    }
    /**
     * Validate a proof request
     */
    validateRequest(request) {
        return validateProofRequest(request);
    }
    /**
     * Check if URL is a ProofPort deep link
     */
    isProofPortDeepLink(url) {
        return isProofPortDeepLink(url, this.config.scheme);
    }
    /**
     * Parse proof request from deep link URL
     */
    parseDeepLink(url) {
        return parseProofRequestUrl(url);
    }
    // ============ Static Factory ============
    /**
     * Create SDK with default configuration
     */
    static create(config) {
        return new ProofPortSDK(config);
    }
}

export { CIRCUIT_METADATA, DEEP_LINK_HOSTS, DEFAULT_REQUEST_EXPIRY_MS, DEFAULT_SCHEME, DEFAULT_VERIFIERS, MAX_QR_DATA_SIZE, ProofPortSDK, RPC_ENDPOINTS, buildCallbackUrl, buildProofRequestUrl, decodeData, ProofPortSDK as default, encodeData, estimateQRDataSize, generateQRCodeDataUrl, generateQRCodeSVG, generateQRCodeToCanvas, generateRequestId, getDefaultProvider, getVerifierAddress, getVerifierChainId, getVerifierContract, isProofPortDeepLink, parseDeepLink, parseProofForOnChain, parseProofRequestUrl, parseProofResponseUrl, validateProofRequest, verifyProofOnChain };
//# sourceMappingURL=index.esm.js.map
