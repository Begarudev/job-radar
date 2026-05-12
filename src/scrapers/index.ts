import type { Posting } from "../shared/schemas.ts";
import { scrapeHN } from "./hn.ts";
import { scrapeRemoteOK } from "./remoteok.ts";
import { scrapeSpeedyApply } from "./speedyapply.ts";
import { loggers } from "../shared/logger.ts";

export async function runAllScrapers(): Promise<Posting[]> {
  const results = await Promise.allSettled([
    scrapeHN(),
    scrapeRemoteOK(),
    scrapeSpeedyApply(),
  ]);

  const all: Posting[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") {
      all.push(...r.value);
    } else {
      loggers.scraper.error("scraper failed", { reason: String(r.reason) });
    }
  }
  loggers.scraper.success(`collected ${all.length} raw postings`);
  return all;
}
