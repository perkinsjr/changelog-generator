import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getGitHubToken } from "@/lib/server-utils";
import { fetchAllUserRepositories } from "@/lib/github/authenticated";

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth();

    // Get user's GitHub access token
    const accessToken = await getGitHubToken(session.user.id);
    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "GitHub access token not found or expired. Please login again.",
        },
        { status: 401 },
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const type =
      (searchParams.get("type") as "all" | "public" | "private") || "all";
    const sort =
      (searchParams.get("sort") as
        | "created"
        | "updated"
        | "pushed"
        | "full_name") || "updated";
    const direction =
      (searchParams.get("direction") as "asc" | "desc") || "desc";
    const maxRepos = Math.min(
      parseInt(searchParams.get("maxRepos") || "100"),
      200,
    ); // Cap at 200 for performance

    // Fetch repositories from GitHub
    const repositories = await fetchAllUserRepositories(accessToken, {
      type,
      sort,
      direction,
      maxRepos,
    });

    console.log(repositories[0]);
    return NextResponse.json({
      repositories,
      count: repositories.length,
    });
  } catch (error) {
    console.error("Failed to fetch repositories:", error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message === "Authentication required") {
        return NextResponse.json(
          { error: "Authentication required" },
          { status: 401 },
        );
      }

      if (error.message.includes("GitHub access token is invalid")) {
        return NextResponse.json(
          {
            error:
              "GitHub access token is invalid or expired. Please login again.",
          },
          { status: 401 },
        );
      }

      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "GitHub API rate limit exceeded. Please try again later." },
          { status: 429 },
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to fetch repositories" },
      { status: 500 },
    );
  }
}
