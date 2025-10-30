"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoginButton } from "@/components/auth/login-button";
import {
  AlertTriangleIcon,
  RefreshCwIcon,
  ClockIcon,
  KeyIcon,
  GitBranchIcon,
  WifiOffIcon,
  ServerIcon,
  ShieldIcon,
} from "lucide-react";

export interface GitHubError {
  type:
    | "rate_limit"
    | "auth"
    | "not_found"
    | "forbidden"
    | "network"
    | "server"
    | "token_expired"
    | "unknown";
  message: string;
  status?: number;
  resetTime?: Date;
  remaining?: number;
  limit?: number;
}

export interface EnhancedErrorHandlerProps {
  error: GitHubError | Error | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  isRetrying?: boolean;
}

export function EnhancedErrorHandler({
  error,
  onRetry,
  onDismiss,
  isRetrying = false,
}: EnhancedErrorHandlerProps) {
  const { isAuthenticated, signOut } = useAuth();
  const [timeUntilReset, setTimeUntilReset] = useState<string>("");

  const isGitHubError = (err: any): err is GitHubError => {
    return err && typeof err === "object" && "type" in err;
  };

  // Update countdown for rate limit reset
  useEffect(() => {
    if (
      !error ||
      !isGitHubError(error) ||
      error.type !== "rate_limit" ||
      !error.resetTime
    ) {
      return;
    }

    const interval = setInterval(() => {
      const now = new Date();
      const diff = error.resetTime!.getTime() - now.getTime();

      if (diff <= 0) {
        clearInterval(interval);
        setTimeUntilReset("Ready to retry");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeUntilReset(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [error]);

  if (!error) return null;

  const getErrorConfig = (error: GitHubError | Error) => {
    if (!isGitHubError(error)) {
      return {
        icon: AlertTriangleIcon,
        title: "Unexpected Error",
        description: error.message,
        variant: "destructive" as const,
        canRetry: true,
        actions: [],
      };
    }

    switch (error.type) {
      case "rate_limit":
        return {
          icon: ClockIcon,
          title: isAuthenticated
            ? "Rate Limit Reached"
            : "Anonymous Rate Limit Exceeded",
          description: isAuthenticated
            ? `You've reached the GitHub API rate limit${error.limit ? ` (${error.limit} requests/hour)` : ""}. Please wait for the limit to reset.`
            : "You've exceeded the anonymous rate limit (60 requests/hour). Sign in for higher limits.",
          variant: "default" as const,
          canRetry: true,
          badge:
            error.remaining !== undefined && error.limit !== undefined
              ? `${error.remaining}/${error.limit}`
              : undefined,
          countdown: timeUntilReset,
          actions: isAuthenticated
            ? []
            : [
                <LoginButton key="login" variant="outline" size="sm">
                  Sign in for 5,000/hour
                </LoginButton>,
              ],
        };

      case "auth":
        return {
          icon: KeyIcon,
          title: "Authentication Required",
          description:
            "This repository requires authentication to access. Please sign in with GitHub.",
          variant: "default" as const,
          canRetry: false,
          actions: [
            <LoginButton key="login" variant="outline" size="sm">
              Sign in with GitHub
            </LoginButton>,
          ],
        };

      case "token_expired":
        return {
          icon: ShieldIcon,
          title: "Session Expired",
          description:
            "Your GitHub session has expired. Please sign in again to continue.",
          variant: "default" as const,
          canRetry: false,
          actions: [
            <Button
              key="signout"
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await signOut();
                } catch (err) {
                  console.error("Sign out failed:", err);
                }
              }}
            >
              Sign out and try again
            </Button>,
          ],
        };

      case "forbidden":
        return {
          icon: ShieldIcon,
          title: "Access Forbidden",
          description:
            "You don't have permission to access this repository. Make sure you have the correct permissions and try again.",
          variant: "destructive" as const,
          canRetry: true,
          actions: [],
        };

      case "not_found":
        return {
          icon: GitBranchIcon,
          title: "Repository Not Found",
          description:
            "The repository couldn't be found. Please check the repository name and ensure it exists.",
          variant: "destructive" as const,
          canRetry: true,
          actions: [],
        };

      case "network":
        return {
          icon: WifiOffIcon,
          title: "Network Error",
          description:
            "Unable to connect to GitHub. Please check your internet connection and try again.",
          variant: "destructive" as const,
          canRetry: true,
          actions: [],
        };

      case "server":
        return {
          icon: ServerIcon,
          title: "GitHub Server Error",
          description:
            "GitHub is experiencing issues. Please try again in a few moments.",
          variant: "destructive" as const,
          canRetry: true,
          actions: [],
        };

      case "unknown":
        return {
          icon: AlertTriangleIcon,
          title: "Unknown Error",
          description: error.message || "An unexpected error occurred",
          variant: "destructive" as const,
          canRetry: true,
          actions: [],
        };

      default:
        return {
          icon: AlertTriangleIcon,
          title: "Unknown Error",
          description: error.message || "An unexpected error occurred.",
          variant: "destructive" as const,
          canRetry: true,
          actions: [],
        };
    }
  };

  const config = getErrorConfig(error);
  const IconComponent = config.icon;

  return (
    <Card
      className={`border-l-4 ${
        config.variant === "destructive"
          ? "border-l-red-500 bg-red-50/50 dark:bg-red-950/20"
          : "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <IconComponent
              className={`w-5 h-5 ${
                config.variant === "destructive"
                  ? "text-red-600 dark:text-red-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            />
            <CardTitle
              className={`text-base ${
                config.variant === "destructive"
                  ? "text-red-900 dark:text-red-100"
                  : "text-amber-900 dark:text-amber-100"
              }`}
            >
              {config.title}
            </CardTitle>
            {config.badge && (
              <Badge variant="outline" className="text-xs">
                {config.badge}
              </Badge>
            )}
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              ×
            </Button>
          )}
        </div>
        <CardDescription
          className={
            config.variant === "destructive"
              ? "text-red-700 dark:text-red-300"
              : "text-amber-700 dark:text-amber-300"
          }
        >
          {config.description}
        </CardDescription>
      </CardHeader>

      {(config.countdown || config.canRetry || config.actions.length > 0) && (
        <CardContent className="pt-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {config.countdown && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ClockIcon className="w-4 h-4" />
                  Reset in:{" "}
                  <span className="font-mono">{config.countdown}</span>
                </div>
              )}
              {config.actions}
            </div>

            {config.canRetry && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <RefreshCwIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCwIcon className="w-4 h-4" />
                )}
                {isRetrying ? "Retrying..." : "Retry"}
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// Helper function to create GitHub errors
export function createGitHubError(
  type: GitHubError["type"],
  message: string,
  options: Partial<Omit<GitHubError, "type" | "message">> = {},
): GitHubError {
  return {
    type,
    message,
    ...options,
  };
}

// Helper function to parse GitHub API errors
export function parseGitHubError(error: any): GitHubError {
  if (error?.response) {
    const { status, data, headers } = error.response;

    switch (status) {
      case 401:
        return createGitHubError(
          "auth",
          "Authentication required to access this repository",
        );

      case 403:
        const remaining = headers?.["x-ratelimit-remaining"];
        if (remaining !== undefined && String(remaining) === "0") {
          const resetTimestamp = headers?.["x-ratelimit-reset"];
          const resetTime = resetTimestamp
            ? new Date(parseInt(String(resetTimestamp), 10) * 1000)
            : undefined;

          const limitHeader = headers?.["x-ratelimit-limit"];
          const limit = limitHeader ? parseInt(String(limitHeader), 10) : 60;

          return createGitHubError("rate_limit", "API rate limit exceeded", {
            status,
            resetTime:
              resetTime && !isNaN(resetTime.getTime()) ? resetTime : undefined,
            remaining: 0,
            limit: !isNaN(limit) ? limit : 60,
          });
        }
        return createGitHubError(
          "forbidden",
          data?.message || "Access forbidden",
        );

      case 404:
        return createGitHubError("not_found", "Repository not found");

      case 422:
        if (
          data?.message?.toLowerCase().includes("expired") ||
          data?.message?.toLowerCase().includes("token has expired")
        ) {
          return createGitHubError(
            "token_expired",
            "Your GitHub token has expired",
          );
        }
        break;

      case 500:
      case 502:
      case 503:
      case 504:
        return createGitHubError(
          "server",
          "GitHub server error. Please try again later.",
        );
    }
  }

  if (error?.code === "NETWORK_ERROR" || error?.name === "NetworkError") {
    return createGitHubError("network", "Network connection failed");
  }

  return createGitHubError(
    "unknown",
    error?.message || "An unexpected error occurred",
  );
}
