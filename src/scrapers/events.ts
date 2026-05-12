import type { BuilderEvent } from "../shared/schemas.ts";
import { loggers } from "../shared/logger.ts";

// Builder-event radar. Sources:
// 1. Curated company-blog RSS feeds — catches "Bloomathon", "Launch Week",
//    "Builder Bounty"-class posts that get pushed to LinkedIn too.
// 2. Devpost API — public hackathon listings filtered for AI/ML themes.
//
// Detection is keyword-based: any post whose title or first-200 chars
// contain one of the EVENT_PATTERNS is surfaced.

const FEEDS: Array<{ source: string; url: string; company: string }> = [
  { source: "vercel-blog", url: "https://vercel.com/blog/feed.xml", company: "Vercel" },
  { source: "supabase-blog", url: "https://supabase.com/blog/rss.xml", company: "Supabase" },
  { source: "huggingface-blog", url: "https://huggingface.co/blog/feed.xml", company: "Hugging Face" },
  { source: "cloudflare-blog", url: "https://blog.cloudflare.com/rss/", company: "Cloudflare" },
  { source: "github-blog", url: "https://github.blog/feed/", company: "GitHub" },
  { source: "replicate-blog", url: "https://replicate.com/blog/rss", company: "Replicate" },
  { source: "langchain-blog", url: "https://blog.langchain.com/rss/", company: "LangChain" },
  { source: "modal-blog", url: "https://modal.com/blog/feed.xml", company: "Modal" },
  { source: "anthropic-blog", url: "https://www.anthropic.com/news/rss.xml", company: "Anthropic" },
  { source: "openai-blog", url: "https://openai.com/news/rss.xml", company: "OpenAI" },
];

const EVENT_PATTERNS: Array<{ re: RegExp; kind: BuilderEvent["kind"] }> = [
  { re: /\bhackathons?\b/i, kind: "hackathon" },
  { re: /\b\w+athon\b/i, kind: "hackathon" }, // bloomathon, buildathon, etc.
  { re: /\blaunch\s*week\b/i, kind: "launch-week" },
  { re: /\b(builder|build|bug|security)\s*(bounty|bounties|grant|grants)\b/i, kind: "bounty" },
  { re: /\bbounty\s+program\b/i, kind: "bounty" },
  { re: /\b(building|build)\s*challenges?\b/i, kind: "challenge" },
  { re: /\b(coding|dev|developer)\s*challenges?\b/i, kind: "challenge" },
  { re: /\binvitationals?\b/i, kind: "challenge" },
  { re: /\bdemo\s*days?\b/i, kind: "demo-day" },
  { re: /\bbuilders?\s*event\b/i, kind: "other" },
  { re: /\bhack\s*(night|day|week)\b/i, kind: "hackathon" },
];

// Anti-patterns — drop recap/old/marketing posts even if a kind matched.
const ANTI_PATTERNS: RegExp[] = [
  /\b(report|recap|wrap[- ]?up|follow[- ]?up|results?|winners?)\s+from\b/i,
  /\bfinal projects?\b/i,
  /\buses?\s+ai\s+to\b/i, // "Figma uses AI to..."
  /\b(scholars?|fellows?)\s+\d{4}\b/i, // "OpenAI Scholars 2019"
];

// Skip events older than this many days.
const MAX_AGE_DAYS = 90;

function classify(text: string): BuilderEvent["kind"] | null {
  for (const re of ANTI_PATTERNS) {
    if (re.test(text)) return null;
  }
  for (const { re, kind } of EVENT_PATTERNS) {
    if (re.test(text)) return kind;
  }
  return null;
}

function isFresh(publishedAt: string): boolean {
  const ts = Date.parse(publishedAt);
  if (Number.isNaN(ts)) return true; // unknown date → keep, don't false-reject
  const ageDays = (Date.now() - ts) / (24 * 3600_000);
  return ageDays <= MAX_AGE_DAYS;
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRssItems(xml: string): Array<{ title: string; link: string; pubDate: string; desc: string }> {
  const items: Array<{ title: string; link: string; pubDate: string; desc: string }> = [];
  // Match both <item> (RSS 2.0) and <entry> (Atom).
  const itemRe = /<(?:item|entry)\b([\s\S]*?)<\/(?:item|entry)>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[1] ?? "";
    const titleM =
      block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    // Atom uses <link href="..."/>, RSS uses <link>...</link>
    const linkM =
      block.match(/<link[^>]*?href=["']([^"']+)["']/) ??
      block.match(/<link[^>]*>([\s\S]*?)<\/link>/);
    const dateM = block.match(/<(?:pubDate|published|updated)>([\s\S]*?)<\/(?:pubDate|published|updated)>/);
    const descM = block.match(/<(?:description|summary|content)[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/(?:description|summary|content)>/);
    const title = stripHtml(titleM?.[1]?.trim() ?? "");
    const link = (linkM?.[1] ?? "").trim();
    const pubDate = dateM?.[1]?.trim() ?? new Date().toISOString();
    const desc = stripHtml(descM?.[1]?.trim() ?? "");
    if (title && link) items.push({ title, link, pubDate, desc });
  }
  return items;
}

async function scrapeFeed(
  source: string,
  url: string,
  company: string,
): Promise<BuilderEvent[]> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "job-radar events" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      loggers.scraper.debug(`${source} ${res.status}`);
      return [];
    }
    const xml = await res.text();
    const items = parseRssItems(xml);
    const out: BuilderEvent[] = [];
    const now = new Date().toISOString();
    for (const i of items) {
      const text = `${i.title} ${i.desc.slice(0, 400)}`;
      const kind = classify(text);
      if (!kind) continue;
      if (!isFresh(i.pubDate)) continue;
      out.push({
        id: `${source}:${i.link}`,
        source,
        kind,
        title: i.title.slice(0, 200),
        description: i.desc.slice(0, 600),
        url: i.link,
        publishedAt: i.pubDate,
        fetchedAt: now,
        company,
        tags: [],
      });
    }
    if (out.length > 0) loggers.scraper.info(`${source}: ${out.length} event(s)`);
    return out;
  } catch (err) {
    loggers.scraper.debug(`${source} fetch failed`, { err: String(err) });
    return [];
  }
}

type DevpostHackathon = {
  id: number;
  title: string;
  url: string;
  description?: string;
  submission_period_dates?: string;
  open_state?: string;
  themes?: Array<{ name: string }>;
};

async function scrapeDevpost(): Promise<BuilderEvent[]> {
  const url = "https://devpost.com/api/hackathons?challenge_type=online&themes[]=Machine%20Learning&order_by=recently-added&per_page=30";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "job-radar events", Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      loggers.scraper.debug(`devpost ${res.status}`);
      return [];
    }
    const data = (await res.json()) as { hackathons?: DevpostHackathon[] };
    const now = new Date().toISOString();
    const out: BuilderEvent[] = [];
    for (const h of data.hackathons ?? []) {
      if (h.open_state && /closed|ended/i.test(h.open_state)) continue;
      out.push({
        id: `devpost:${h.id}`,
        source: "devpost",
        kind: "hackathon",
        title: h.title,
        description: stripHtml(h.description ?? "").slice(0, 600),
        url: h.url.startsWith("http") ? h.url : `https://devpost.com${h.url}`,
        publishedAt: h.submission_period_dates ?? now,
        fetchedAt: now,
        tags: (h.themes ?? []).map((t) => t.name.toLowerCase()),
      });
    }
    if (out.length > 0) loggers.scraper.info(`devpost: ${out.length} hackathon(s)`);
    return out;
  } catch (err) {
    loggers.scraper.debug("devpost fetch failed", { err: String(err) });
    return [];
  }
}

export async function scrapeAllEvents(): Promise<BuilderEvent[]> {
  loggers.scraper.info(`events: polling ${FEEDS.length} feeds + devpost`);
  const settled = await Promise.allSettled([
    ...FEEDS.map((f) => scrapeFeed(f.source, f.url, f.company)),
    scrapeDevpost(),
  ]);
  const all: BuilderEvent[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") all.push(...r.value);
  }
  // Dedupe by id.
  const seen = new Set<string>();
  const unique: BuilderEvent[] = [];
  for (const e of all) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    unique.push(e);
  }
  loggers.scraper.success(`events: ${unique.length} unique (${all.length} raw)`);
  return unique;
}
