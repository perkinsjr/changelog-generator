"use client";

import { createAuthClient } from "better-auth/react";
import { useCallback } from "react";

// Create the auth client for React
const baseURL =
  process.env.NEXT_PUBLIC_BETTER_AUTH_URL ??
  (() => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_BETTER_AUTH_URL must be set in production");
    }
    return "http://localhost:3000";
  })();

export const authClient = createAuthClient({
  baseURL,
});

// Export auth methods
export const signIn = authClient.signIn;
export const signOut = authClient.signOut;
export const getSession = authClient.getSession;
export const useSession = authClient.useSession;

// Custom hook for better integration
export function useAuth() {
  const session = useSession();

  const handleSignIn = useCallback(async () => {
    return signIn.social({
      provider: "github",
      callbackURL: window.location.pathname,
    });
  }, []);

  const handleSignOut = useCallback(async () => {
    return signOut();
  }, []);

  return {
    user: session.data?.user ?? null,
    session: session.data?.session ?? null,
    isLoading: session.isPending,
    isAuthenticated: !!session.data?.user,
    error: session.error,
    signIn: handleSignIn,
    signOut: handleSignOut,
  };
}

// Type exports
export type AuthSession = Awaited<ReturnType<typeof getSession>>;
export type AuthUser = NonNullable<AuthSession>["user"];
