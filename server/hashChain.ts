import crypto from 'crypto';
import QRCode from 'qrcode';

/**
 * Generate a cryptographic hash chain using SHA-256
 * @param seed - The secret seed value
 * @param length - Number of hashes to generate
 * @returns Array of hash values (hex strings)
 */
export function generateHashChain(seed: string, length: number): string[] {
  const chain: string[] = [];
  let currentHash = seed;

  for (let i = 0; i < length; i++) {
    const hash = crypto.createHash('sha256').update(currentHash).digest('hex');
    chain.push(hash);
    currentHash = hash;
  }

  return chain;
}

/**
 * Generate a random seed for a hash chain
 * @returns Hex string of random bytes
 */
export function generateSeed(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify that a hash is part of a chain by hashing it and comparing
 * @param hash - The hash to verify
 * @param nextHash - The expected next hash in the chain
 * @returns True if hash(hash) === nextHash
 */
export function verifyHash(hash: string, nextHash: string): boolean {
  const computed = crypto.createHash('sha256').update(hash).digest('hex');
  return computed === nextHash;
}

/**
 * Generate a QR code as a data URL
 * @param data - The data to encode (hash value)
 * @param options - QR code generation options
 * @returns Data URL string (image/png)
 */
export async function generateQRCode(
  data: string,
  options?: {
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
    width?: number;
    margin?: number;
  }
): Promise<string> {
  const qrOptions = {
    errorCorrectionLevel: options?.errorCorrectionLevel || 'M',
    width: options?.width || 512,
    margin: options?.margin || 4,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
  };

  return await QRCode.toDataURL(data, qrOptions);
}

/**
 * Create a full QR code payload with metadata
 * @param chainId - The chain ID
 * @param hashValue - The hash value
 * @param baseUrl - Base URL for the validation endpoint
 * @returns JSON string to encode in QR
 */
export function createQRPayload(chainId: number, hashValue: string, baseUrl: string): string {
  const payload = {
    chainId,
    hash: hashValue,
    url: `${baseUrl}/validate?chain=${chainId}&hash=${hashValue}`,
    timestamp: Date.now(),
  };
  return JSON.stringify(payload);
}

/**
 * Parse a QR code payload
 * @param payload - JSON string from QR code
 * @returns Parsed payload object
 */
export function parseQRPayload(payload: string): {
  chainId: number;
  hash: string;
  url: string;
  timestamp: number;
} | null {
  try {
    const parsed = JSON.parse(payload);
    if (parsed.chainId && parsed.hash && parsed.url) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
