"use client";

import React from "react";

const MAX_RETRY_ATTEMPTS = 3;
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoginButton } from "@/components/auth/login-button";
import { useAuth } from "@/lib/auth/client";
import {
  AlertTriangleIcon,
  RefreshCwIcon,
  WifiOffIcon,
  ServerIcon,
  ShieldIcon,
} from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{
    error: Error;
    errorInfo?: React.ErrorInfo;
    resetError: () => void;
    retry: () => void;
  }>;
}

export class GlobalErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private retryTimer?: ReturnType<typeof setTimeout>;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Global Error Boundary caught an error:", error, errorInfo);
    this.setState({
      errorInfo,
    });

    // Report to error tracking service in production
    if (process.env.NODE_ENV === "production") {
      // TODO: Add error reporting service integration
      // reportError(error, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  }

  resetErrorState = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
    });
  };

  resetError = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
    });
  };

  retry = () => {
    const { retryCount } = this.state;

    // Limit retry attempts
    if (retryCount >= MAX_RETRY_ATTEMPTS) {
      return;
    }

    this.setState({
      retryCount: retryCount + 1,
    });

    // Clear any existing timer before setting a new one
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }

    // Delay retry to prevent rapid successive attempts
    this.retryTimer = setTimeout(() => {
      this.resetErrorState();
    }, 1000);
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { fallback: Fallback } = this.props;

      if (Fallback) {
        return (
          <Fallback
            error={this.state.error}
            errorInfo={this.state.errorInfo}
            resetError={this.resetError}
            retry={this.retry}
          />
        );
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          retry={this.retry}
          retryCount={this.state.retryCount}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo?: React.ErrorInfo;
  resetError: () => void;
  retry: () => void;
  retryCount: number;
}

function ErrorFallback({
  error,
  errorInfo,
  resetError,
  retry,
  retryCount,
}: ErrorFallbackProps) {
  const { isAuthenticated, signOut } = useAuth();

  const getErrorType = (error: Error) => {
    const message = (error.message || "").toLowerCase();

    if (message.includes("network") || message.includes("fetch")) {
      return "network";
    }
    if (
      message.includes("auth") ||
      message.includes("token") ||
      message.includes("unauthorized")
    ) {
      return "auth";
    }
    if (
      message.includes("server") ||
      message.includes("500") ||
      message.includes("502")
    ) {
      return "server";
    }
    if (message.includes("permission") || message.includes("forbidden")) {
      return "permission";
    }
    return "unknown";
  };

  const getErrorConfig = (errorType: string) => {
    switch (errorType) {
      case "network":
        return {
          icon: WifiOffIcon,
          title: "Network Connection Error",
          description:
            "Unable to connect to the server. Please check your internet connection.",
          canRetry: true,
          showAuth: false,
        };
      case "auth":
        return {
          icon: ShieldIcon,
          title: "Authentication Error",
          description:
            "There was a problem with your authentication. Please sign in again.",
          canRetry: false,
          showAuth: !isAuthenticated,
          showSignOut: isAuthenticated,
        };
      case "server":
        return {
          icon: ServerIcon,
          title: "Server Error",
          description:
            "The server is experiencing issues. Please try again in a few moments.",
          canRetry: true,
          showAuth: false,
        };
      case "permission":
        return {
          icon: ShieldIcon,
          title: "Permission Error",
          description: "You don't have permission to access this resource.",
          canRetry: false,
          showAuth: !isAuthenticated,
        };
      default:
        return {
          icon: AlertTriangleIcon,
          title: "Unexpected Error",
          description:
            "Something went wrong. We're sorry for the inconvenience.",
          canRetry: true,
          showAuth: false,
        };
    }
  };

  const errorType = getErrorType(error);
  const config = getErrorConfig(errorType);
  const IconComponent = config.icon;
  const maxRetries = MAX_RETRY_ATTEMPTS;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-l-4 border-l-red-500">
        <CardHeader>
          <div className="flex items-center gap-3">
            <IconComponent className="w-6 h-6 text-red-600 dark:text-red-400" />
            <div>
              <CardTitle className="text-red-900 dark:text-red-100">
                {config.title}
              </CardTitle>
              <CardDescription className="text-red-700 dark:text-red-300">
                {config.description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Error Details in Development */}
          {process.env.NODE_ENV === "development" && (
            <Alert variant="destructive">
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertTitle>Development Error Details</AlertTitle>
              <AlertDescription className="font-mono text-xs mt-2">
                <div className="space-y-1">
                  <div>
                    <strong>Error:</strong> {error.message}
                  </div>
                  {error.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer">Stack Trace</summary>
                      <pre className="whitespace-pre-wrap text-xs mt-1 max-h-40 overflow-y-auto">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {config.canRetry && retryCount < maxRetries && (
              <Button onClick={retry} className="w-full">
                <RefreshCwIcon className="w-4 h-4 mr-2" />
                Try Again ({maxRetries - retryCount} attempts left)
              </Button>
            )}

            {config.showAuth && (
              <LoginButton className="w-full" variant="outline">
                Sign in with GitHub
              </LoginButton>
            )}

            {config.showSignOut && (
              <Button
                onClick={async () => {
                  try {
                    await signOut();
                    resetError();
                  } catch (err) {
                    console.error("Sign out failed:", err);
                  }
                }}
                variant="outline"
                className="w-full"
              >
                <ShieldIcon className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            )}

            <Button onClick={resetError} variant="ghost" className="w-full">
              Dismiss Error
            </Button>
          </div>

          {/* Retry Limit Reached */}
          {retryCount >= maxRetries && (
            <Alert>
              <AlertTriangleIcon className="h-4 w-4" />
              <AlertTitle>Maximum Retries Reached</AlertTitle>
              <AlertDescription>
                The error persists after multiple attempts. Please refresh the
                page or contact support if the problem continues.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for imperative error boundary usage
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  return { captureError, resetError };
}
