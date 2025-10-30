// Re-export client utilities for backward compatibility
export {
  cn,
  isValidGitHubRepo,
  extractOwnerAndRepo,
  getRateLimitKey,
  isAuthError,
  handleAuthError,
} from "./client-utils";

// Client-safe utilities only
export function formatDate(date: Date | string, locale?: string): string {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";

  // Use provided locale or detect from environment
  const resolvedLocale =
    locale ||
    (typeof navigator !== "undefined"
      ? navigator.language
      : Intl.DateTimeFormat().resolvedOptions().locale);

  return d.toLocaleDateString(resolvedLocale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatTimeAgo(date: Date | string): string {
  if (!date) return "";
  const now = new Date();
  const then = new Date(date);
  if (isNaN(then.getTime())) return "";

  const diffInMs = now.getTime() - then.getTime();

  if (diffInMs < 0) {
    const absDiffInMs = Math.abs(diffInMs);
    const diffInSeconds = Math.floor(absDiffInMs / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) {
      return "in a few seconds";
    } else if (diffInMinutes < 60) {
      return `in ${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"}`;
    } else if (diffInHours < 24) {
      return `in ${diffInHours} hour${diffInHours === 1 ? "" : "s"}`;
    } else if (diffInDays < 30) {
      return `in ${diffInDays} day${diffInDays === 1 ? "" : "s"}`;
    } else {
      return formatDate(date);
    }
  }

  const diffInSeconds = Math.floor(diffInMs / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInSeconds < 60) {
    return "just now";
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
  } else if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
  } else {
    return formatDate(date);
  }
}

/**
 * Truncates text to maxLength characters, adding ellipsis for longer strings.
 * For maxLength < 4, returns truncated text without ellipsis for consistency.
 */
export function truncateText(text: string, maxLength: number): string {
  if (maxLength < 0) return "";
  if (text.length <= maxLength) return text;
  if (maxLength < 4) return text.slice(0, maxLength);
  return text.slice(0, maxLength - 3) + "...";
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with dashes
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing dashes
}

export function parseGitHubUrl(
  url: string,
): { owner: string; repo: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "github.com") return null;

    const pathParts = parsed.pathname.split("/").filter(Boolean);
    if (pathParts.length < 2) return null;

    return {
      owner: pathParts[0],
      repo: pathParts[1],
    };
  } catch {
    return null;
  }
}
