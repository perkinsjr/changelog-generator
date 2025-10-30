"use client";

import { ReactNode } from "react";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/lib/auth/client";
import { LoginButton } from "./login-button";

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  loadingComponent?: ReactNode;
  showLoginPrompt?: boolean;
}

export function AuthGuard({
  children,
  fallback,
  requireAuth = true,
  loadingComponent,
  showLoginPrompt = true,
}: AuthGuardProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading state
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  // If auth is not required, always show children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // If authenticated, show children
  if (isAuthenticated && user) {
    return <>{children}</>;
  }

  // If not authenticated, show fallback or login prompt
  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showLoginPrompt) {
    return null;
  }

  return (
    <div className="flex items-center justify-center p-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Authentication Required</CardTitle>
          <CardDescription>
            Sign in with GitHub to access this feature and your private
            repositories.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Benefits of signing in:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center space-x-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span>Access your private repositories</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span>Higher API rate limits</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span>Repository selection dropdown</span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span>Faster changelog generation</span>
              </li>
            </ul>
          </div>
          <LoginButton className="w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// Simplified version that just hides content
export function RequireAuth({ children }: { children: ReactNode }) {
  return (
    <AuthGuard requireAuth={true} showLoginPrompt={false}>
      {children}
    </AuthGuard>
  );
}

// Component that shows different content based on auth state
interface ConditionalAuthContentProps {
  authenticated: ReactNode;
  unauthenticated: ReactNode;
  loading?: ReactNode;
}

export function ConditionalAuthContent({
  authenticated,
  unauthenticated,
  loading,
}: ConditionalAuthContentProps) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      loading || (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )
    );
  }

  return isAuthenticated && user ? (
    <>{authenticated}</>
  ) : (
    <>{unauthenticated}</>
  );
}

// Higher-order component for page-level auth protection
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    requireAuth?: boolean;
    fallback?: ReactNode;
    loadingComponent?: ReactNode;
  } = {},
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <AuthGuard
        requireAuth={options.requireAuth}
        fallback={options.fallback}
        loadingComponent={options.loadingComponent}
      >
        <Component {...props} />
      </AuthGuard>
    );
  };
}
