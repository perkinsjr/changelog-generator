import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidGitHubRepo(repo: string): boolean {
  // Split into owner and repo parts
  const parts = repo.split("/");
  if (parts.length !== 2) {
    return false;
  }

  const [owner, repoName] = parts;

  // Check if either part is empty, or is reserved names
  if (
    !owner ||
    !repoName ||
    owner === "." ||
    owner === ".." ||
    repoName === "." ||
    repoName === ".."
  ) {
    return false;
  }

  // Check if repo name ends with .git (GitHub reserved)
  if (repoName.endsWith(".git")) {
    return false;
  }

  // Check valid characters (letters, digits, hyphens, underscores, periods)
  const validChars = /^[a-zA-Z0-9._-]+$/;
  if (!validChars.test(owner) || !validChars.test(repoName)) {
    return false;
  }

  // Check length limits (~100 code points for repo name)
  if (repoName.length > 100 || owner.length > 100) {
    return false;
  }

  return true;
}

export function extractOwnerAndRepo(
  fullName: string,
): { owner: string; repo: string } | null {
  if (!isValidGitHubRepo(fullName)) {
    return null;
  }

  const [owner, repo] = fullName.split("/");
  return { owner, repo };
}

// Rate limiting helpers
export function getRateLimitKey(
  identifier: string,
  type: "anonymous" | "authenticated" = "anonymous",
): string {
  if (!identifier.trim()) {
    throw new Error("Identifier cannot be empty");
  }
  if (identifier.includes(":")) {
    throw new Error("Identifier cannot contain colons");
  }
  return `changelog:${type}:${identifier}`;
}

// Error handling helpers
export function isAuthError(
  error: unknown,
): error is { code: string; message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as any).code === "string" &&
    typeof (error as any).message === "string"
  );
}

export function handleAuthError(error: unknown): {
  error: string;
  status: number;
} {
  if (isAuthError(error)) {
    switch (error.code) {
      case "UNAUTHORIZED":
        return { error: "Authentication required", status: 401 };
      case "FORBIDDEN":
        return { error: "Access denied", status: 403 };
      case "TOKEN_EXPIRED":
        return { error: "Token expired, please sign in again", status: 401 };
      default:
        return { error: "Authentication failed", status: 400 };
    }
  }

  return { error: "An unexpected error occurred", status: 500 };
}
