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
    const { repository, dateMode, days, startDate, endDate, identifier } = await req.json();

    if (!repository) {
      return Response.json({ error: "Repository is required" }, { status: 400 });
    }

    if (!repository.includes("/") || repository.split("/").length !== 2) {
      return Response.json(
        { error: "Invalid repository format. Use 'owner/repository'" },
        { status: 400 },
      );
    }

    if (!identifier) {
      return Response.json({ error: "Fingerprint identifier is required" }, { status: 400 });
    }
    const ratelimit = await unkey.limit(identifier);
    if (!ratelimit.success) {
      return new Response("try again later", { status: 429 });
    }

    // Calculate date range
    const { start, end } = calculateDateRange(dateMode, days, startDate, endDate);

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

    const prompt = `You are a CEO creating a detailed changelog from GitHub pull requests in a casual tone.

Repository: ${repository}
Date Range: ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}
Total PRs: ${totalCount}

Pull Requests Data:
${promptData}

⚠️ MANDATORY REQUIREMENT: You MUST include ALL ${totalCount} pull requests in the changelog. No exceptions.

STEP 1: Before writing the changelog, count the PRs in the data above to verify you have ${totalCount} items.

STEP 2: Generate a comprehensive changelog in MDX format with the following structure:

# TITLE (max 120 characters)
Create an engaging title that captures the most significant change or theme of this release.

## Summary
Write a compelling 600-800 word summary that:
- Highlights the most impactful changes and their benefits to users
- Explains the context and reasoning behind major updates
- Mentions key contributors and community involvement
- Uses a conversational, engaging tone that tells the story of this release
- Focuses on user value rather than just technical details

## Categories
Organize ALL ${totalCount} PRs into these sections (create sections as needed):
- 🚀 Features & Enhancements
- 🐛 Bug Fixes
- ⚡ Performance Improvements
- 📚 Documentation
- 🔧 Internal Changes
- 🧪 Testing
- 🏗️ Infrastructure
- 🔒 Security

For each PR, provide:
- Title (make it more descriptive if the original is unclear)
- PR link using format: [#123](https://github.com/${repository}/pull/123)
- 1-2 sentence description of what changed and why it matters
- Credit the author when possible

STEP 3: After writing all sections, add a verification section at the end:

## Verification
✅ Total PRs included: [COUNT THE ACTUAL PRs YOU LISTED]
Target: ${totalCount} PRs

If your count doesn't match ${totalCount}, you MUST go back and find the missing PRs.

ABSOLUTE REQUIREMENTS:
- Every single PR from the data must appear in one of the category sections
- If you see "Note: X additional PRs were found but truncated", mention this clearly
- Double-check your work by counting the PRs you've listed
- Make descriptions meaningful, not just repeating the title
- Group related PRs together logically

Output ONLY the MDX content with no additional commentary.`;

    console.log(`Starting AI generation with ${totalCount} PRs`);

    const result = await streamText({
      model: "openai/gpt-4o",
      prompt,
      maxTokens: 16000,
      temperature: 0.3,
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
          const errorMessage = error instanceof Error ? error.message : "Stream error occurred";
          controller.enqueue(encoder.encode(`\n\n---\n\n**Error:** ${errorMessage}`));
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
      error instanceof Error ? error.message : "An error occurred while generating the changelog";

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
