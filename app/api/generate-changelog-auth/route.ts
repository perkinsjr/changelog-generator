import { Ratelimit } from "@unkey/ratelimit";
import { streamText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { calculateDateRange } from "@/lib/github";
import { fetchGitHubPRsAuthenticated } from "@/lib/github/authenticated";
import { requireAuth, getGitHubToken } from "@/lib/server-utils";

const AI_MODEL = process.env.AI_MODEL || "openai/gpt-4-turbo";
const unkeyRootKey = process.env.UNKEY_ROOT_KEY;

if (!unkeyRootKey) {
  throw new Error("UNKEY_ROOT_KEY is not set");
}

// Separate rate limit namespace for authenticated users with higher limits
const unkeyAuth = new Ratelimit({
  rootKey: unkeyRootKey,
  namespace: "generator",
  limit: 20, // Higher limit for authenticated users
  duration: "60s",
});

export async function POST(req: NextRequest) {
  try {
    const { repository, dateMode, days, startDate, endDate } = await req.json();

    if (process.env.NODE_ENV === "development") {
      console.log("AUTH API: Received request data:", {
        repository,
        dateMode,
        days,
        startDate,
        endDate,
      });
    }

    if (!repository) {
      return NextResponse.json(
        { error: "Repository is required" },
        { status: 400 },
      );
    }

    if (!repository.includes("/") || repository.split("/").length !== 2) {
      return NextResponse.json(
        { error: "Invalid repository format. Use 'owner/repository'" },
        { status: 400 },
      );
    }

    // Require authentication
    let session;
    try {
      session = await requireAuth();
    } catch (error) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    // Rate limiting based on authenticated user
    const ratelimit = await unkeyAuth.limit(session.user.id);
    if (!ratelimit.success) {
      return NextResponse.json(
        {
          error:
            "Rate limit exceeded. Authenticated users can make 20 requests per minute.",
          resetTime: ratelimit.reset,
        },
        { status: 429 },
      );
    }

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

    // Calculate date range
    if (process.env.NODE_ENV === "development") {
      console.log("AUTH API: Calculating date range with:", {
        dateMode,
        days,
        startDate,
        endDate,
      });
    }
    const { start, end } = calculateDateRange(
      dateMode,
      days,
      startDate,
      endDate,
    );
    if (process.env.NODE_ENV === "development") {
      console.log("AUTH API: Calculated date range:", {
        start: start.toISOString(),
        end: end.toISOString(),
      });
    }

    if (process.env.NODE_ENV === "development") {
      console.log(
        `Fetching PRs for ${repository} from ${start.toISOString()} to ${end.toISOString()} (authenticated)`,
      );
    }

    // Fetch PRs from GitHub using authenticated request
    const { prs, totalCount } = await fetchGitHubPRsAuthenticated(
      repository,
      start,
      end,
      accessToken,
    );

    if (totalCount === 0) {
      return new Response(
        "# No Pull Requests Found\n\nNo merged pull requests found in the specified time range.",
        {
          headers: { "Content-Type": "text/plain" },
        },
      );
    }

    if (process.env.NODE_ENV === "development") {
      console.log(
        `Fetched ${totalCount} PRs for ${repository} (authenticated)`,
      );
    }

    // Prepare PR data for AI processing
    const prSummaries = prs.map((pr) => ({
      number: pr.number,
      title: pr.title,
      author: pr.user?.login || "unknown",
      url: pr.html_url,
      mergedAt: pr.merged_at,
      labels: pr.labels.map((l) => l.name),
      body: pr.body ? pr.body.substring(0, 500) : "No description provided",
    }));

    let promptData: string;
    let actualPRCount: number;
    if (totalCount > 200) {
      actualPRCount = 200;
      promptData = `Note: This repository has ${totalCount} PRs in the date range. Here are the first 200 PRs:\n${JSON.stringify(prSummaries.slice(0, 200), null, 2)}\n\nNote: ${totalCount - 200} additional PRs were found but truncated to prevent token overflow.`;
    } else {
      actualPRCount = totalCount;
      promptData = JSON.stringify(prSummaries, null, 2);
    }

    const prompt = `You are the CEO of the company creating a detailed changelog from GitHub pull requests. The summary should be engaging and casual, highlighting the most impactful changes and features.

Repository: ${repository}
Date Range: ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}
Total PRs in Range: ${totalCount}
PRs Provided: ${actualPRCount}

Pull Requests Data:
${promptData}

🚨 CRITICAL INSTRUCTION: You must process EVERY SINGLE pull request from the JSON data above (${actualPRCount} PRs). This is not optional.

BEFORE YOU START WRITING:
1. Parse the JSON data and extract EVERY pull request entry
2. Create a mental list of all ${actualPRCount} PR numbers
3. You will reference each one exactly once in the changelog

FORMAT REQUIREMENTS:

# [Engaging Title - max 120 characters]

## Summary
Write a 600-800 word engaging summary covering the major themes and impacts of this release.${totalCount > 200 ? ` Note: This changelog covers ${actualPRCount} of ${totalCount} PRs due to data limitations.` : ""}

## Pull Requests by Category

Organize EVERY PR from the data into appropriate sections:

### 🚀 Features & Enhancements
[List all feature/enhancement PRs here]

### 🐛 Bug Fixes
[List all bug fix PRs here]

### ⚡ Performance Improvements
[List all performance PRs here]

### 📚 Documentation
[List all documentation PRs here]

### 🔧 Internal Changes
[List all internal/refactor PRs here]

### 🧪 Testing
[List all testing PRs here]

### 🏗️ Infrastructure
[List all infrastructure PRs here]

### 🔒 Security
[List all security PRs here]

For each PR use this exact format:
- **[Descriptive Title]** [#${"{"}number}](https://github.com/${repository}/pull/${"{"}number}) - Brief description of the change and its impact. (Author: @${"{"}author})

INTERNAL VERIFICATION (DO NOT INCLUDE IN OUTPUT):
Before finalizing your response, internally verify:
1. Create a mental list of all ${actualPRCount} PR numbers from the JSON data
2. Ensure each PR appears exactly once in the appropriate category
3. Verify no PR from the source data has been skipped

DO NOT include the PR index or verification checklist in your output - these are for your internal verification only.

Output ONLY the MDX content for the changelog.`;

    console.log(
      `Starting AI generation with ${totalCount} PRs (authenticated)`,
    );

    const result = streamText({
      model: AI_MODEL,
      prompt,
    });

    // Return a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          console.error("[AUTH API] Error in stream:", error);
          const errorMessage =
            error instanceof Error ? error.message : "Stream error occurred";
          controller.enqueue(
            encoder.encode(`\n\n---\n\n**Error:** ${errorMessage}`),
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("[AUTH API] Error generating changelog:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "An error occurred while generating the changelog";

    // Return error as plain text stream so it displays in the UI
    return new Response(
      `# Error Generating Changelog\n\n${errorMessage}\n\nPlease check:\n- Repository name is correct (format: owner/repo)\n- You have access to the repository\n- Date range is valid\n- Your GitHub authentication is still valid`,
      {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      },
    );
  }
}
