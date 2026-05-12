import type { Posting } from "../shared/schemas.ts";
import { loggers } from "../shared/logger.ts";

// HN Algolia API — finds the most recent "Ask HN: Who is hiring?" thread,
// then pulls top-level comments. Filters for intern/remote-friendly.

const ALGOLIA = "https://hn.algolia.com/api/v1";

type AlgoliaHit = { objectID: string; title?: string; created_at: string };
type AlgoliaSearch = { hits: AlgoliaHit[] };
type AlgoliaItem = {
  id: number;
  text?: string;
  url?: string;
  created_at: string;
  children?: AlgoliaItem[];
};

function looksRelevant(text: string): boolean {
  const t = text.toLowerCase();
  const wantsIntern = /\bintern(ship)?\b/.test(t) || /\bnew[- ]grad\b/.test(t);
  const isRemoteOk =
    /\bremote\b/.test(t) || /\bworldwide\b/.test(t) || /\banywhere\b/.test(t);
  const hasAi = /(ai|ml|llm|rag|agent|fullstack|full-stack|engineer)/i.test(t);
  return (wantsIntern || isRemoteOk) && hasAi;
}

function firstUrl(text: string): string | undefined {
  const m = text.match(/https?:\/\/[^\s<>"']+/);
  return m ? m[0] : undefined;
}

function firstLine(text: string): string {
  const stripped = text
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.slice(0, 200);
}

export async function scrapeHN(): Promise<Posting[]> {
  loggers.scraper.info("HN: searching for latest Who is Hiring thread");

  // Find the latest "Ask HN: Who is hiring?" thread.
  // Use search_by_date so the freshest thread comes first.
  const searchRes = await fetch(
    `${ALGOLIA}/search_by_date?query=Ask+HN+Who+is+hiring&tags=story,author_whoishiring&hitsPerPage=5`,
  );
  if (!searchRes.ok) {
    loggers.scraper.warn("HN: search failed");
    return [];
  }
  const search = (await searchRes.json()) as AlgoliaSearch;
  const thread = search.hits.find((h) =>
    h.title?.toLowerCase().includes("who is hiring"),
  );
  if (!thread) {
    loggers.scraper.warn("HN: no thread found");
    return [];
  }

  loggers.scraper.info(`HN: thread ${thread.objectID}`);

  // Pull full thread with comments.
  const itemRes = await fetch(`${ALGOLIA}/items/${thread.objectID}`);
  if (!itemRes.ok) return [];
  const item = (await itemRes.json()) as AlgoliaItem;

  const postings: Posting[] = [];
  const now = new Date().toISOString();

  for (const comment of item.children ?? []) {
    if (!comment.text) continue;
    if (!looksRelevant(comment.text)) continue;

    const url = firstUrl(comment.text) ?? `https://news.ycombinator.com/item?id=${comment.id}`;
    const title = firstLine(comment.text);

    postings.push({
      id: `hn:${comment.id}`,
      source: "hn",
      title: title.slice(0, 120),
      url,
      body: comment.text.replace(/<[^>]+>/g, " ").slice(0, 4000),
      remote: /\bremote\b/i.test(comment.text),
      postedAt: comment.created_at,
      fetchedAt: now,
      reasons: [],
      tags: ["hn-who-is-hiring"],
    });
  }

  loggers.scraper.success(`HN: ${postings.length} relevant comments`);
  return postings;
}
