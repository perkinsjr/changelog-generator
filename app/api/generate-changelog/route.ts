import { Ratelimit } from "@unkey/ratelimit";
import { streamText } from "ai";
import { calculateDateRange, fetchGitHubPRs } from "@/lib/github";
const unkeyRootKey = process.env.UNKEY_ROOT_KEY;

if (!unkeyRootKey) {
  throw new Error("UNKEY_ROOT_KEY is not set");
}

const unkey = new Ratelimit({
  rootKey: unkeyRootKey,
  namespace: "generator",
  limit: 5,
  duration: "60s",
});

export async function POST(req: Request) {
  try {
    const { repository, dateMode, days, startDate, endDate, identifier } =
      await req.json();

    console.log("API: Received request data:", {
      repository,
      dateMode,
      days,
      startDate,
      endDate,
      identifier: identifier ? "present" : "missing",
    });

    if (!repository) {
      return Response.json(
        { error: "Repository is required" },
        { status: 400 },
      );
    }

    if (!repository.includes("/") || repository.split("/").length !== 2) {
      return Response.json(
        { error: "Invalid repository format. Use 'owner/repository'" },
        { status: 400 },
      );
    }

    if (!identifier) {
      return Response.json(
        { error: "Fingerprint identifier is required" },
        { status: 400 },
      );
    }
    const ratelimit = await unkey.limit(identifier);
    if (!ratelimit.success) {
      return new Response("try again later", { status: 429 });
    }

    // Calculate date range
    console.log("API: Calculating date range with:", {
      dateMode,
      days,
      startDate,
      endDate,
    });
    const { start, end } = calculateDateRange(
      dateMode,
      days,
      startDate,
      endDate,
    );
    console.log("API: Calculated date range:", {
      start: start.toISOString(),
      end: end.toISOString(),
    });

    console.log(
      `Fetching PRs for ${repository} from ${start.toISOString()} to ${end.toISOString()}`,
    );

    // Fetch PRs from GitHub
    const { prs, totalCount } = await fetchGitHubPRs(repository, start, end);

    if (totalCount === 0) {
      return new Response(
        "# No Pull Requests Found\n\nNo merged pull requests found in the specified time range.",
        {
          headers: { "Content-Type": "text/plain" },
        },
      );
    }

    console.log(`Fetched ${totalCount} PRs for ${repository}`);

    // Prepare PR data for AI processing
    const prSummaries = prs.map((pr) => ({
      number: pr.number,
      title: pr.title,
      author: pr.user.login,
      url: pr.html_url,
      mergedAt: pr.merged_at,
      labels: pr.labels.map((l) => l.name),
      body: pr.body ? pr.body.substring(0, 500) : "No description provided",
    }));

    let promptData: string;
    if (totalCount > 200) {
      promptData = `Note: This repository has ${totalCount} PRs in the date range. Here are the first 200 PRs:\n${JSON.stringify(prSummaries.slice(0, 200), null, 2)}\n\nNote: ${totalCount - 200} additional PRs were found but truncated to prevent token overflow.`;
    } else {
      promptData = JSON.stringify(prSummaries, null, 2);
    }

    const prompt = `You are the CEO of the company creating a detailed changelog from GitHub pull requests. The summary should be engaging and casual, highlighting the most impactful changes and features.

Repository: ${repository}
Date Range: ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}
Total PRs: ${totalCount}

Pull Requests Data:
${promptData}

🚨 CRITICAL INSTRUCTION: You must process EVERY SINGLE pull request from the JSON data above. This is not optional.

BEFORE YOU START WRITING:
1. Parse the JSON data and extract EVERY pull request entry
2. Create a mental list of all ${totalCount} PR numbers
3. You will reference each one exactly once in the changelog

FORMAT REQUIREMENTS:

# [Engaging Title - max 120 characters]

## Summary
Write a 600-800 word engaging summary covering the major themes and impacts of this release.

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
1. Create a mental list of all ${totalCount} PR numbers from the JSON data
2. Ensure each PR appears exactly once in the appropriate category
3. Verify no PR from the source data has been skipped
4. If truncated, note: "Note: Only the first X PRs were provided in the source data due to volume limitations."

DO NOT include the PR index or verification checklist in your output - these are for your internal verification only.

Output ONLY the MDX content for the changelog.`;

    console.log(`Starting AI generation with ${totalCount} PRs`);

    const result = streamText({
      model: "openai/gpt-4-turbo",
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
          console.error("[v0] Error in stream:", error);
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
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("[v0] Error generating changelog:", error);

    const errorMessage =
      error instanceof Error
        ? error.message
        : "An error occurred while generating the changelog";

    // Return error as plain text stream so it displays in the UI
    return new Response(
      `# Error Generating Changelog\n\n${errorMessage}\n\nPlease check:\n- Repository name is correct (format: owner/repo)\n- Date range is valid\n- GitHub API rate limits (add GITHUB_TOKEN for higher limits)`,
      {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      },
    );
  }
}
