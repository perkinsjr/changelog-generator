import { headers } from "next/headers";
import { auth, type Session } from "@/lib/auth/config";

// Authentication helper utilities for server components
export async function getServerSession(): Promise<Session | null> {
  try {
    const headersList = await headers();
    return await auth.api.getSession({
      headers: headersList,
    });
  } catch (error) {
    console.error("Failed to get server session:", error);
    return null;
  }
}

export async function requireAuth(): Promise<NonNullable<Session>> {
  try {
    const session = await getServerSession();
    if (!session || !session.user) {
      throw new Error("Authentication required");
    }
    return session;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Authentication required") {
        throw error;
      }
      if (error.message === "Session system error") {
        throw new Error(`Authentication system error: ${error.message}`);
      }
    }
    throw new Error(
      `Authentication system error: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function getGitHubToken(userId: string): Promise<string | null> {
  try {
    const { getDb } = await import("@/lib/db");
    const { account } = await import("@/lib/db/better-auth-schema");
    const { eq, and } = await import("drizzle-orm");

    const accountData = await getDb()
      .select({
        accessToken: account.accessToken,
        accessTokenExpiresAt: account.accessTokenExpiresAt,
      })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, "github")))
      .limit(1);

    if (!accountData[0]) {
      console.warn("No GitHub account found for user");
      return null;
    }

    const accessToken = accountData[0]?.accessToken;
    const expiresAt = accountData[0]?.accessTokenExpiresAt;

    // Check if token exists
    if (!accessToken) {
      console.warn("No access token found in account data");
      return null;
    }

    // Check if token is expired
    if (expiresAt && new Date() > expiresAt) {
      console.warn("GitHub token expired");
      return null;
    }

    // Better Auth stores tokens unencrypted by default
    return accessToken;
  } catch (error) {
    console.error("GitHub token retrieval failed", {
      type: error instanceof Error ? error.name : "Error",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
    return null;
  }
}
