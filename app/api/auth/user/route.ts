import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";
import { getDb } from "@/lib/db";
import { user, account } from "@/lib/db/better-auth-schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Get session from Better Auth
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user data with access token
    const userData = await getDb()
      .select({
        id: user.id,
        githubId: user.githubId,
        login: user.login,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!userData[0]) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has GitHub account connected and get access token
    const accountData = await getDb()
      .select({
        scope: account.scope,
        accessTokenExpiresAt: account.accessTokenExpiresAt,
      })
      .from(account)
      .where(
        and(
          eq(account.userId, session.user.id),
          eq(account.providerId, "github"),
        ),
      )
      .limit(1);

    // Note: Access tokens are never exposed to client for security
    // All GitHub API operations should be performed server-side
    const userResponse = {
      ...userData[0],
      hasGitHubConnected: !!accountData[0],
      tokenScope: accountData[0]?.scope || null,
      tokenExpiresAt: accountData[0]?.accessTokenExpiresAt || null,
    };

    return NextResponse.json(userResponse);
  } catch (error) {
    // Sanitize error logging to prevent PII exposure
    const sanitizedError = {
      type: error instanceof Error ? error.name : "Error",
      message: "User data retrieval failed",
      timestamp: new Date().toISOString(),
    };
    console.error("Failed to get user data:", sanitizedError);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
