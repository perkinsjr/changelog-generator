import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import { getDb } from "@/lib/db";
import { session, account, verification } from "@/lib/db/better-auth-schema";
import { eq, and, lt, gt } from "drizzle-orm";

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }
  if (key.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  return Buffer.from(key, "hex");
}

/**
 * Hash a token using SHA-256
 */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Verify a token against its hash
 */
function verifyTokenHash(token: string, hash: string): boolean {
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
function encryptToken(token: string): string {
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
function decryptToken(encryptedToken: string): string {
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
 * Create a new session with hashed token
 */
export async function createSession(
  userId: string,
  token: string,
  expiresAt: Date,
  ipAddress?: string,
  userAgent?: string,
) {
  const tokenHash = hashToken(token);

  const [newSession] = await getDb()
    .insert(session)
    .values({
      id: crypto.randomUUID(),
      userId,
      token: tokenHash,
      expiresAt,
      ipAddress,
      userAgent,
    })
    .returning();

  return newSession;
}

/**
 * Find session by token (hashes the token for lookup)
 */
export async function findSessionByToken(token: string) {
  const tokenHash = hashToken(token);
  const now = new Date();

  const [foundSession] = await getDb()
    .select()
    .from(session)
    .where(
      and(
        eq(session.token, tokenHash),
        gt(session.expiresAt, now), // Session not expired
      ),
    )
    .limit(1);

  return foundSession;
}

/**
 * Store encrypted OAuth tokens
 */
export async function storeOAuthTokens(
  userId: string,
  accountId: string,
  providerId: string,
  tokens: {
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
  },
  expiresAt?: Date,
  scope?: string,
) {
  const encryptedTokens = {
    accessTokenEncrypted: tokens.accessToken
      ? encryptToken(tokens.accessToken)
      : null,
    refreshTokenEncrypted: tokens.refreshToken
      ? encryptToken(tokens.refreshToken)
      : null,
    idTokenEncrypted: tokens.idToken ? encryptToken(tokens.idToken) : null,
  };

  const [accountRecord] = await getDb()
    .insert(account)
    .values({
      id: crypto.randomUUID(),
      userId,
      accountId,
      providerId,
      ...encryptedTokens,
      accessTokenExpiresAt: expiresAt,
      scope,
    })
    .onConflictDoUpdate({
      target: [account.accountId, account.providerId],
      set: {
        ...encryptedTokens,
        accessTokenExpiresAt: expiresAt,
        scope,
        updatedAt: new Date(),
      },
    })
    .returning();

  return accountRecord;
}

/**
 * Retrieve and decrypt OAuth tokens
 */
export async function getOAuthTokens(userId: string, providerId: string) {
  const [accountRecord] = await getDb()
    .select()
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, providerId)))
    .limit(1);

  if (!accountRecord) {
    return null;
  }

  return {
    ...accountRecord,
    accessToken: accountRecord.accessToken
      ? decryptToken(accountRecord.accessToken)
      : null,
    refreshToken: accountRecord.refreshToken
      ? decryptToken(accountRecord.refreshToken)
      : null,
    idToken: accountRecord.idToken ? decryptToken(accountRecord.idToken) : null,
  };
}

/**
 * Create verification code with hashed value
 */
export async function createVerification(
  identifier: string,
  value: string,
  expiresAt: Date,
) {
  const valueHash = hashToken(value);

  const [newVerification] = await getDb()
    .insert(verification)
    .values({
      id: crypto.randomUUID(),
      identifier,
      value: valueHash,
      expiresAt,
    })
    .returning();

  return newVerification;
}

/**
 * Verify a verification code
 */
export async function verifyCode(identifier: string, value: string) {
  return await getDb().transaction(async (tx) => {
    const [record] = await tx
      .select()
      .from(verification)
      .where(eq(verification.identifier, identifier))
      .limit(1);

    if (!record) {
      return false;
    }

    // Check if expired
    if (record.expiresAt < new Date()) {
      // Clean up expired record
      await tx.delete(verification).where(eq(verification.id, record.id));
      return false;
    }

    // Verify the hash
    const isValid = verifyTokenHash(value, record.value);

    if (isValid) {
      // Clean up used verification code atomically
      await tx.delete(verification).where(eq(verification.id, record.id));
    }

    return isValid;
  });
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions() {
  const now = new Date();

  const result = await getDb()
    .delete(session)
    .where(lt(session.expiresAt, now))
    .returning({ count: session.id });

  return result.length;
}

/**
 * Clean up expired verification codes
 */
export async function cleanupExpiredVerifications() {
  const now = new Date();

  const result = await getDb()
    .delete(verification)
    .where(lt(verification.expiresAt, now))
    .returning({ count: verification.id });

  return result.length;
}
