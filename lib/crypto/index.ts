import {
  createHash,
  timingSafeEqual,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from "crypto";

// Environment variable for encryption key
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const HASH_ALGORITHM = "sha256";

/**
 * Get and validate encryption key
 */
function getEncryptionKey(): Buffer {
  if (!ENCRYPTION_KEY) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }
  if (ENCRYPTION_KEY.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  return Buffer.from(ENCRYPTION_KEY, "hex");
}

/**
 * Hash a token using SHA-256
 * Used for session tokens and verification codes
 */
export function hashToken(token: string): string {
  return createHash(HASH_ALGORITHM).update(token).digest("hex");
}

/**
 * Verify a token against its hash
 */
export function verifyTokenHash(token: string, hash: string): boolean {
  const tokenHash = hashToken(token);
  // Use timing-safe comparison to prevent timing attacks
  if (tokenHash.length !== hash.length) {
    return false;
  }
  const tokenHashBuffer = new Uint8Array(Buffer.from(tokenHash));
  const hashBuffer = new Uint8Array(Buffer.from(hash));
  return timingSafeEqual(tokenHashBuffer, hashBuffer);
}

/**
 * Encrypt a token using AES-256-GCM
 */
export function encryptToken(token: string): string {
  try {
    const key = getEncryptionKey();
    const iv = randomBytes(12); // 12 bytes for GCM
    const cipher = createCipheriv(
      "aes-256-gcm",
      new Uint8Array(key),
      new Uint8Array(iv),
    );

    let encrypted = cipher.update(token, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:encrypted
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
  } catch (error) {
    throw new Error("Token encryption failed");
  }
}

/**
 * Decrypt a token using AES-256-GCM
 */
export function decryptToken(encryptedToken: string): string {
  try {
    const key = getEncryptionKey();
    const [ivHex, authTagHex, encrypted] = encryptedToken.split(":");

    if (!ivHex || !authTagHex || !encrypted) {
      throw new Error("Invalid encrypted token format");
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      new Uint8Array(key),
      new Uint8Array(Buffer.from(ivHex, "hex")),
    );
    decipher.setAuthTag(new Uint8Array(Buffer.from(authTagHex, "hex")));

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error("Token decryption failed");
  }
}

/**
 * Generate a secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString("hex");
}
