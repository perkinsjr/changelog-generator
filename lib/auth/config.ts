import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "../db";
import { user, session, account, verification } from "../db/better-auth-schema";

// Validate required environment variables
const requiredEnvVars = {
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
};

// Helper to get auth URL with production validation
function getAuthUrl() {
  const url = process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL;
  if (!url && process.env.NODE_ENV === "production") {
    throw new Error(
      "BETTER_AUTH_URL or NEXTAUTH_URL must be set in production",
    );
  }
  return url || "http://localhost:3000";
}

for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const auth = betterAuth({
  database: drizzleAdapter(getDb(), {
    provider: "pg",
    schema: {
      user: user,
      session: session,
      account: account,
      verification: verification,
    },
  }),

  emailAndPassword: {
    enabled: false, // We only want GitHub OAuth
  },
  socialProviders: {
    github: {
      clientId: requiredEnvVars.GITHUB_CLIENT_ID!,
      clientSecret: requiredEnvVars.GITHUB_CLIENT_SECRET!,
      scope: ["user:email", "repo"], // Full repo access including private repos
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  user: {
    additionalFields: {
      githubId: {
        type: "string",
        required: false,
      },
      login: {
        type: "string",
        required: false,
      },
      avatarUrl: {
        type: "string",
        required: false,
      },
    },
  },
  trustedOrigins: [getAuthUrl()],
  secret: requiredEnvVars.BETTER_AUTH_SECRET!,
  baseURL: getAuthUrl(),
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
    cookiePrefix: "changelog-auth",
  },
});

export type Auth = typeof auth;

// Helper functions for authentication
export const getSession = async (headers: Headers) => {
  try {
    return await auth.api.getSession({
      headers,
    });
  } catch (error) {
    console.error("Failed to get session:", error);
    return null;
  }
};

export const signOut = async (headers: Headers) => {
  try {
    return await auth.api.signOut({
      headers,
    });
  } catch (error) {
    console.error("Failed to sign out:", error);
    throw error;
  }
};

// Type exports for client usage
export type Session = Awaited<ReturnType<typeof getSession>>;
export type User = NonNullable<Session> extends { user: infer U } ? U : never;
