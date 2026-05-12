// Centralized env access. Bun auto-loads .env on startup.
// Each key is optional — callers gate features on presence, not on
// validation failure.

function read(key: string): string | undefined {
  const v = process.env[key];
  if (!v || v.trim() === "") return undefined;
  return v.trim();
}

export const env = {
  // GitHub: lifts events-API rate limits + commits MDX to portfolio repo.
  // Needs scope: `public_repo` (or `repo` for private).
  githubToken: read("GITHUB_TOKEN"),

  // Anthropic: cold-email drafting + nuanced posting scorer.
  anthropicApiKey: read("ANTHROPIC_API_KEY"),

  // Cross-post destinations. Each pipeline step skips silently if absent.
  devToApiKey: read("DEV_TO_API_KEY"),
  hashnodeToken: read("HASHNODE_TOKEN"),
  hashnodePublicationId: read("HASHNODE_PUBLICATION_ID"),

  // Notification fan-out.
  telegramBotToken: read("TELEGRAM_BOT_TOKEN"),
  telegramChatId: read("TELEGRAM_CHAT_ID"),

  // Portfolio target. Defaults match this owner's setup.
  portfolioOwner: read("PORTFOLIO_OWNER") ?? "Begarudev",
  portfolioRepo: read("PORTFOLIO_REPO") ?? "portfolio",
  portfolioBlogDir: read("PORTFOLIO_BLOG_DIR") ?? "src/content/blog",
  portfolioBranch: read("PORTFOLIO_BRANCH") ?? "main",
} as const;

export function require_(name: keyof typeof env): string {
  const v = env[name];
  if (!v) {
    throw new Error(
      `missing env: ${String(name).toUpperCase()} — add to .env or repo secrets`,
    );
  }
  return v;
}
