/**
 * Cryptographic utilities for token encryption
 *
 * SECURITY IMPLEMENTATION: AES-256-GCM ENCRYPTION ACTIVE
 * This module provides working AES-256-GCM encryption for OAuth tokens.
 * This is a reference implementation that requires security review before production use.
 *
 * PRODUCTION HARDENING REQUIRED:
 * - Secure key management: Use AWS KMS, Azure Key Vault, or similar for key storage
 * - Key rotation: Implement automated key rotation procedures
 * - Audit logging: Add comprehensive audit logs for all encryption/decryption operations
 * - Security monitoring: Monitor for token usage anomalies and decryption failures
 * - Environment security: Ensure TOKEN_ENCRYPTION_KEY is stored securely in production
 *
 * CURRENT IMPLEMENTATION:
 * - Uses Web Crypto API (crypto.subtle) for AES-256-GCM encryption
 * - 96-bit random nonce generation for each encryption operation
 * - Base64 encoding for database storage
 * - Constant-time token comparison utilities
 *
 * SECURITY FEATURES:
 * - Authenticated encryption (AEAD) prevents tampering
 * - Random nonce ensures unique ciphertext for identical plaintexts
 * - Safe token comparison prevents timing attacks
 * - Secure random token generation for verification
 */

import { randomBytes, timingSafeEqual } from "crypto";

// Environment variable for encryption key (must be 32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY;

// Cached crypto keys for better performance
let cachedEncryptKey: CryptoKey | null = null;
let cachedDecryptKey: CryptoKey | null = null;

if (!ENCRYPTION_KEY) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "CRITICAL: TOKEN_ENCRYPTION_KEY must be set in production. " +
        "Token encryption is required for security.",
    );
  }
  console.warn(
    "WARNING: TOKEN_ENCRYPTION_KEY not set. Token encryption is disabled. " +
      "This is acceptable in development but a CRITICAL SECURITY VULNERABILITY in production.",
  );
}

/**
 * Helper to import a crypto key for specific usage
 */
async function importKey(usage: KeyUsage): Promise<CryptoKey> {
  if (!ENCRYPTION_KEY) {
    throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  }
  const keyBuffer = Uint8Array.from(Buffer.from(ENCRYPTION_KEY, "base64"));
  if (keyBuffer.length !== 32) {
    throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes for AES-256");
  }
  return await globalThis.crypto.subtle.importKey(
    "raw",
    keyBuffer,
    "AES-GCM",
    false,
    [usage],
  );
}

/**
 * Gets or creates a cached encryption key
 */
async function getEncryptKey(): Promise<CryptoKey> {
  if (!cachedEncryptKey) {
    cachedEncryptKey = await importKey("encrypt");
  }
  if (!cachedEncryptKey) {
    throw new Error("Failed to import encryption key");
  }
  return cachedEncryptKey;
}

/**
 * Gets or creates a cached decryption key
 */
async function getDecryptKey(): Promise<CryptoKey> {
  if (!cachedDecryptKey) {
    cachedDecryptKey = await importKey("decrypt");
  }
  if (!cachedDecryptKey) {
    throw new Error("Failed to import decryption key");
  }
  return cachedDecryptKey;
}

/**
 * Encrypts a token using AES-256-GCM
 *
 * @param plaintext - The token to encrypt
 * @returns Promise<string> - Base64 encoded encrypted data with nonce
 */
export async function encryptToken(plaintext: string): Promise<string> {
  if (!ENCRYPTION_KEY) {
    throw new Error(
      "Cannot encrypt token: TOKEN_ENCRYPTION_KEY is not configured",
    );
  }

  // Generate random 96-bit (12-byte) nonce
  const nonce = new Uint8Array(12);
  globalThis.crypto.getRandomValues(nonce);

  // Get cached encryption key
  const key = await getEncryptKey();

  // Encrypt the plaintext
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await globalThis.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: nonce,
    },
    key,
    encoded,
  );

  // Combine nonce + ciphertext
  const combined = new Uint8Array(nonce.length + ciphertext.byteLength);
  combined.set(nonce);
  combined.set(new Uint8Array(ciphertext), nonce.length);

  // Return base64 encoded result
  return Buffer.from(combined).toString("base64");
}

/**
 * Decrypts a token encrypted with encryptToken
 *
 * @param encrypted - Base64 encoded encrypted data with nonce
 * @returns Promise<string> - The decrypted plaintext token
 */
export async function decryptToken(encrypted: string): Promise<string> {
  if (!ENCRYPTION_KEY) {
    throw new Error(
      "Cannot decrypt token: TOKEN_ENCRYPTION_KEY is not configured",
    );
  }

  // Base64 decode the encrypted data
  const combined = new Uint8Array(Buffer.from(encrypted, "base64"));

  if (combined.length < 28) {
    // At least 12 bytes nonce + 16 bytes auth tag (minimum 28 bytes)
    throw new Error(
      "Invalid encrypted data: too short (must be at least 28 bytes)",
    );
  }

  // Extract nonce (first 12 bytes) and ciphertext (remaining bytes)
  const nonce = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  // Get cached decryption key
  const key = await getDecryptKey();

  // Decrypt the ciphertext
  const decrypted = await globalThis.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: nonce,
    },
    key,
    ciphertext,
  );

  // Return plaintext string
  return new TextDecoder().decode(decrypted);
}

/**
 * Helper function to safely compare tokens without timing attacks
 * Uses Node.js crypto.timingSafeEqual for constant-time comparison
 *
 * @param a - First token
 * @param b - Second token
 * @returns boolean - True if tokens match
 */
export function safeCompareTokens(a: string, b: string): boolean {
  // Length check is not timing-sensitive for token comparison
  if (a.length !== b.length) {
    return false;
  }

  const bufferA = new Uint8Array(Buffer.from(a, "utf8"));
  const bufferB = new Uint8Array(Buffer.from(b, "utf8"));

  // timingSafeEqual requires equal-length buffers and provides constant-time comparison
  return timingSafeEqual(bufferA, bufferB);
}

/**
 * Generates a secure random token for verification purposes
 *
 * @param length - Length in bytes (default 32)
 * @returns string - Base64url (URL-safe) encoded random token
 */
export function generateSecureToken(length: number = 32): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    globalThis.crypto.getRandomValues
  ) {
    const buffer = new Uint8Array(length);
    globalThis.crypto.getRandomValues(buffer);
    return Buffer.from(buffer).toString("base64url");
  }

  // Fallback for Node.js environments
  return randomBytes(length).toString("base64url");
}
