export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  created_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  permissions: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
  };
}

export interface GitHubRepositoriesResponse {
  repositories: GitHubRepository[];
  pageCount: number;
  hasNextPage: boolean;
}

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
  fetchedCount: number;
  totalCount: number;
}

export async function fetchUserRepositories(
  accessToken: string,
  options: {
    type?: "all" | "public" | "private";
    sort?: "created" | "updated" | "pushed" | "full_name";
    direction?: "asc" | "desc";
    per_page?: number;
    page?: number;
  } = {},
): Promise<GitHubRepositoriesResponse> {
  const {
    type = "all",
    sort = "updated",
    direction = "desc",
    per_page = 30,
    page = 1,
  } = options;

  const url = new URL("https://api.github.com/user/repos");
  url.searchParams.set("type", type);
  url.searchParams.set("sort", sort);
  url.searchParams.set("direction", direction);
  url.searchParams.set("per_page", per_page.toString());
  url.searchParams.set("page", page.toString());

  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": "Changelog-Generator",
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url.toString(), {
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          "GitHub access token is invalid or expired. Please login again.",
        );
      }
      if (response.status === 403) {
        const rateLimitReset = response.headers.get("X-RateLimit-Reset");
        const resetTime = rateLimitReset
          ? new Date(
              Number.parseInt(rateLimitReset) * 1000,
            ).toLocaleTimeString()
          : "unknown";
        throw new Error(
          `GitHub API rate limit exceeded. Rate limit resets at ${resetTime}.`,
        );
      }
      throw new Error(
        `GitHub API error: ${response.status} ${response.statusText}`,
      );
    }

    const repositories: GitHubRepository[] = await response.json();

    // Check if there are more pages
    const linkHeader = response.headers.get("Link");
    const hasNextPage = linkHeader ? linkHeader.includes('rel="next"') : false;

    // GitHub /user/repos doesn't provide total count, only current page count
    const pageCount = repositories.length;

    return {
      repositories,
      pageCount,
      hasNextPage,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error(
          "Request timeout while fetching repositories from GitHub.",
        );
      }
      throw error;
    }
    throw new Error(`Failed to fetch repositories: ${String(error)}`);
  }
}

export async function fetchAllUserRepositories(
  accessToken: string,
  options: {
    type?: "all" | "public" | "private";
    sort?: "created" | "updated" | "pushed" | "full_name";
    direction?: "asc" | "desc";
    maxRepos?: number;
  } = {},
): Promise<GitHubRepository[]> {
  const { maxRepos = 100 } = options;
  const allRepositories: GitHubRepository[] = [];
  let page = 1;
  let hasNextPage = true;

  const TIMEOUT_MS = 60000; // 60 seconds total timeout
  const startTime = Date.now();

  while (hasNextPage && allRepositories.length < maxRepos && page <= 10) {
    if (Date.now() - startTime > TIMEOUT_MS) {
      console.warn(
        `Timeout reached after fetching ${allRepositories.length} repositories`,
      );
      break;
    }

    const response = await fetchUserRepositories(accessToken, {
      ...options,
      page,
      per_page: Math.min(30, maxRepos - allRepositories.length),
    });

    allRepositories.push(...response.repositories);
    hasNextPage = response.hasNextPage;
    page++;
  }

  return allRepositories;
}

export async function fetchGitHubPRsAuthenticated(
  repository: string,
  startDate: Date,
  endDate: Date,
  accessToken: string,
): Promise<GitHubPRsResponse> {
  const [owner, repo] = repository.split("/");

  if (!owner || !repo || repository.split("/").length !== 2) {
    throw new Error("Invalid repository format. Use 'owner/repository'");
  }

  const query = `repo:${owner}/${repo} is:pr is:merged merged:${startDate.toISOString().split("T")[0]}..${endDate.toISOString().split("T")[0]}`;
  const searchUrl = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=100&sort=updated`;

  const headers: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": "Changelog-Generator",
  };

  const allPRs: PullRequest[] = [];
  let page = 1;
  let hasMore = true;
  let actualTotalCount = 0; // Store GitHub's actual total count

  const TIMEOUT_MS = 30000; // 30 seconds timeout for fetching
  const startTime = Date.now();

  // Fetch all pages of PRs (GitHub limits to 100 per page)
  while (hasMore && page <= 10) {
    if (Date.now() - startTime > TIMEOUT_MS) {
      console.warn(`Timeout reached after fetching ${allPRs.length} PRs`);
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
        if (response.status === 401) {
          throw new Error(
            "GitHub access token is invalid or expired. Please login again.",
          );
        }
        if (response.status === 403) {
          const rateLimitReset = response.headers.get("X-RateLimit-Reset");
          const resetTime = rateLimitReset
            ? new Date(
                Number.parseInt(rateLimitReset) * 1000,
              ).toLocaleTimeString()
            : "unknown";
          throw new Error(
            `GitHub API rate limit exceeded. Rate limit resets at ${resetTime}.`,
          );
        }
        if (response.status === 404) {
          throw new Error(
            `Repository '${repository}' not found or you don't have access to it.`,
          );
        }
        if (response.status === 422) {
          throw new Error(
            "Invalid query parameters. Please check your date range.",
          );
        }
        throw new Error(
          `GitHub API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      // Store the actual total count from first response
      if (page === 1) {
        actualTotalCount = data.total_count ?? 0;
      }

      if (data.items && data.items.length > 0) {
        allPRs.push(...data.items);
        hasMore =
          allPRs.length < (data.total_count ?? Infinity) &&
          data.items.length === 100;
        page++;
      } else {
        hasMore = false;
      }
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error(
            "Request timeout while fetching PRs from GitHub. The repository may be too large or GitHub API is slow.",
          );
        }
        throw error;
      }
      throw new Error(`Failed to fetch PRs: ${String(error)}`);
    }
  }

  return {
    prs: allPRs,
    totalCount: actualTotalCount, // Return GitHub's actual total count
    fetchedCount: allPRs.length, // Also provide count of actually fetched PRs
  };
}

export function filterRepositories(
  repositories: GitHubRepository[],
  searchTerm: string,
): GitHubRepository[] {
  if (!searchTerm.trim()) {
    return repositories;
  }

  const term = searchTerm.toLowerCase();
  return repositories.filter(
    (repo) =>
      repo.name.toLowerCase().includes(term) ||
      repo.full_name.toLowerCase().includes(term) ||
      repo.description?.toLowerCase().includes(term) ||
      repo.owner.login.toLowerCase().includes(term),
  );
}

export function sortRepositories(
  repositories: GitHubRepository[],
  sortBy: "name" | "updated" | "stars" | "created" = "updated",
): GitHubRepository[] {
  return [...repositories].sort((a, b) => {
    switch (sortBy) {
      case "name":
        return a.name.localeCompare(b.name);
      case "updated":
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      case "stars":
        return b.stargazers_count - a.stargazers_count;
      case "created":
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      default:
        return 0;
    }
  });
}
