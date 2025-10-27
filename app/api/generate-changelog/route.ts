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

    const prompt = `You are a CEO creating a detailed changelog from GitHub pull requests.

Repository: ${repository}
Date Range: ${start.toISOString().split("T")[0]} to ${end.toISOString().split("T")[0]}
Total PRs: ${totalCount}

Pull Requests:
${promptData}

Generate a comprehensive changelog in MDX format with the following structure:
1. A title made from the most important change, or a brief summary of the changes, no more than 150 characters.
2. A summary section highlighting the most important changes in a casual manner, this should be at least 500 words but no more than 700 words.
3. Categorized sections (Features, Bug Fixes, Performance, Documentation, etc.)
4. Each PR should be listed with its title, PR number (as a link), and a brief description, and under one of the category sections, do not skip any PRs. Make sure that the PR count matches the ${totalCount}, unless prompted otherwise.
5. Use proper markdown formatting with headers, lists, and links

Make the changelog casual, clear, and easy to read. Group related changes together.
Use this exact link format for PRs: [#123](https://github.com/${repository}/pull/123)

IMPORTANT: Output ONLY the MDX content, no additional commentary or explanations.`;

    console.log(`Starting AI generation with ${totalCount} PRs`);

    const result = await streamText({
      model: "openai/gpt-4o-mini",
      prompt,
      maxTokens: 15000,
      temperature: 0.7,
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
