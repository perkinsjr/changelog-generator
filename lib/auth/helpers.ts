import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { getDb } from "@/lib/db";
import { session, account, verification } from "@/lib/db/better-auth-schema";
import { eq, and, lt, gt } from "drizzle-orm";

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
