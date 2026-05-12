import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { Feed, Posting } from "../shared/schemas.ts";
import { FeedSchema } from "../shared/schemas.ts";
import { loggers } from "../shared/logger.ts";

const FEED_PATH = "data/feed.json";
const MAX = 100;

export async function writeFeed(postings: Posting[]): Promise<void> {
  // Sort: score desc, then newest first.
  const sorted = [...postings]
    .filter((p) => (p.score ?? 0) >= 6)
    .sort((a, b) => {
      const ds = (b.score ?? 0) - (a.score ?? 0);
      if (ds !== 0) return ds;
      return b.fetchedAt.localeCompare(a.fetchedAt);
    })
    .slice(0, MAX);

  const feed: Feed = {
    updatedAt: new Date().toISOString(),
    count: sorted.length,
    postings: sorted,
  };

  // Validate before write.
  FeedSchema.parse(feed);

  await mkdir(dirname(FEED_PATH), { recursive: true });
  await writeFile(FEED_PATH, JSON.stringify(feed, null, 2) + "\n");
  loggers.feed.success(`wrote ${FEED_PATH} with ${sorted.length} postings`);
}
