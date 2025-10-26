# AI Changelog Generator

Generate detailed changelogs from GitHub pull requests using AI.

## Features

- 🔍 Fetch PRs from any public GitHub repository
- 📅 Flexible date range selection (last N days or custom range)
- 🤖 AI-powered changelog generation with categorization
- 📝 Beautiful MDX rendering with syntax highlighting
- ⚡ Real-time streaming for instant feedback
- 📥 Download changelog as MDX file
- 🎨 Dark mode support

## Setup

### Environment Variables

For better GitHub API rate limits, add a GitHub token:

\`\`\`bash
GITHUB_TOKEN=your_github_personal_access_token
\`\`\`

Without a token, you're limited to 60 requests/hour. With a token, you get 5000 requests/hour.

### Creating a GitHub Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token with `public_repo` scope
3. Copy the token and add it to your environment variables

## Usage

1. Enter a GitHub repository in `owner/repository` format (e.g., `vercel/next.js`)
2. Select a time frame:
   - **Last N Days**: Get PRs from the last X days
   - **Date Range**: Specify exact start and end dates
3. Click "Generate Changelog"
4. Wait for the AI to process and generate your changelog
5. Copy or download the generated changelog

## Handling Large Repositories

### Timeout Prevention

The app is designed to handle repositories with hundreds of PRs:

- **API Route Timeout**: Set to 60 seconds (`maxDuration = 60`)
- **Fetch Timeout**: 30 seconds total, 10 seconds per request
- **PR Limit**: Fetches up to 1000 PRs (10 pages × 100 PRs)
- **Token Limit**: Truncates PR descriptions to 500 characters
- **Batching**: For >200 PRs, only the first 200 are sent to AI with a note about truncation

### Why Timeouts Might Occur

1. **GitHub API Rate Limits**: Without a token, you're limited to 60 requests/hour
2. **Large Date Ranges**: Querying years of PRs takes longer
3. **Network Latency**: Slow connections to GitHub API
4. **AI Processing**: Large amounts of data take longer to process

### Solutions

1. **Add a GitHub Token**: Increases rate limits from 60 to 5000 requests/hour
2. **Reduce Date Range**: Query smaller time periods
3. **Use Specific Dates**: Target specific release periods instead of broad ranges
4. **Deploy to Vercel**: Better network connectivity and serverless function limits

## Technical Details

### Architecture

- **Frontend**: Next.js 16 with React Server Components
- **Styling**: Tailwind CSS v4 with custom design tokens
- **AI**: Vercel AI SDK v5 with streaming
- **Markdown**: react-markdown with GitHub Flavored Markdown support
- **Syntax Highlighting**: react-syntax-highlighter with Prism

### API Endpoints

- `POST /api/generate-changelog`: Fetches PRs and generates changelog with streaming response

### Rate Limits

The hosted version has a ratelimit of 5 req every 60seconds using Unkey. You can remove that and use your own Github token to increase the rate limit.

### Fingerprinting for Rate Limiting

This application uses browser fingerprinting to identify unique users for rate limiting purposes:

- **Technology**: FingerprintJS is used to generate a unique browser fingerprint
- **Purpose**: Each unique browser fingerprint is rate limited to 5 requests per 60 seconds
- **Privacy**: The fingerprint is only used for rate limiting and is not stored permanently
- **Implementation**: The fingerprint is automatically generated when the form loads and sent with each request

The fingerprinting ensures fair usage across all users while maintaining privacy and not requiring user registration.
