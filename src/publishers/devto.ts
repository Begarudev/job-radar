import { env } from "../shared/env.ts";
import { loggers } from "../shared/logger.ts";

// Cross-post a Markdown body to dev.to. Skipped silently if DEV_TO_API_KEY
// is not set so the publish CLI degrades gracefully on first runs.

type DevToRes = { url: string; id: number };

export async function publishToDevTo(opts: {
  title: string;
  body: string;
  tags: string[];
  canonicalUrl: string;
  published?: boolean;
}): Promise<DevToRes | null> {
  if (!env.devToApiKey) {
    loggers.feed.debug("dev.to skipped (no DEV_TO_API_KEY)");
    return null;
  }
  // dev.to allows max 4 tags, lowercase, no spaces.
  const tags = opts.tags
    .map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .slice(0, 4);

  const res = await fetch("https://dev.to/api/articles", {
    method: "POST",
    headers: {
      "api-key": env.devToApiKey,
      "Content-Type": "application/json",
      "User-Agent": "job-radar publish",
    },
    body: JSON.stringify({
      article: {
        title: opts.title,
        body_markdown: opts.body,
        tags,
        canonical_url: opts.canonicalUrl,
        published: opts.published ?? false, // default to DRAFT for safety
      },
    }),
  });
  if (!res.ok) {
    loggers.feed.warn(`dev.to ${res.status}: ${await res.text()}`);
    return null;
  }
  const json = (await res.json()) as DevToRes;
  loggers.feed.success(`dev.to: ${json.url}`);
  return json;
}
