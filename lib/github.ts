export interface PullRequest {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  merged_at: string | null;
  user: {
    login: string;
  };
  labels: Array<{
    name: string;
  }>;
}

export interface GitHubPRsResponse {
  prs: PullRequest[];
  totalCount: number;
}

export async function fetchGitHubPRs(
  repository: string,
  startDate: Date,
  endDate: Date,
): Promise<GitHubPRsResponse> {
  const [owner, repo] = repository.split("/");

  if (!owner || !repo) {
    throw new Error("Invalid repository format. Use 'owner/repository'");
  }

  const query = `repo:${owner}/${repo} is:pr is:merged merged:${startDate.toISOString().split("T")[0]}..${endDate.toISOString().split("T")[0]}`;
  const searchUrl = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=100&sort=updated`;

  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Changelog-Generator",
  };

  // Add GitHub token if available (optional but recommended for higher rate limits)
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const allPRs: PullRequest[] = [];
  let page = 1;
  let hasMore = true;

  const TIMEOUT_MS = 30000; // 30 seconds timeout for fetching
  const startTime = Date.now();

  // Fetch all pages of PRs (GitHub limits to 100 per page)
  while (hasMore && page <= 10) {
    // Limit to 10 pages (1000 PRs max) to prevent infinite loops
    if (Date.now() - startTime > TIMEOUT_MS) {
      console.warn(`[v0] Timeout reached after fetching ${allPRs.length} PRs`);
      break;
    }

    const url = `${searchUrl}&page=${page}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 403) {
          const rateLimitReset = response.headers.get("X-RateLimit-Reset");
          const resetTime = rateLimitReset
            ? new Date(
                Number.parseInt(rateLimitReset) * 1000,
              ).toLocaleTimeString()
            : "unknown";
          throw new Error(
            `GitHub API rate limit exceeded. Rate limit resets at ${resetTime}. Please add a GITHUB_TOKEN environment variable for higher limits.`,
          );
        }
        if (response.status === 404) {
          throw new Error(
            `Repository '${repository}' not found. Please check the repository name.`,
          );
        }
        if (response.status === 422) {
          throw new Error(
            `Invalid query parameters. Please check your date range.`,
          );
        }
        throw new Error(
          `GitHub API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        allPRs.push(...data.items);
        hasMore = data.items.length === 100;
        page++;
      } else {
        hasMore = false;
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(
            `Request timeout while fetching PRs from GitHub. The repository may be too large or GitHub API is slow.`,
          );
        }
        throw error;
      }
      throw new Error(`Failed to fetch PRs: ${String(error)}`);
    }
  }

  return {
    prs: allPRs,
    totalCount: allPRs.length,
  };
}

export function calculateDateRange(
  dateMode: "days" | "range",
  days?: number,
  startDate?: string,
  endDate?: string,
) {
  let start: Date;
  let end: Date;

  if (dateMode === "days" && days) {
    end = new Date();
    start = new Date();
    start.setDate(start.getDate() - days);
  } else if (dateMode === "range" && startDate && endDate) {
    start = new Date(startDate);
    end = new Date(endDate);

    if (start > end) {
      throw new Error("Start date must be before end date");
    }

    const daysDiff = Math.floor(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysDiff > 365) {
      console.warn(
        `Large date range detected: ${daysDiff} days. This may result in many PRs and longer processing time.`,
      );
    }
  } else {
    throw new Error("Invalid date configuration");
  }

  return { start, end };
}
