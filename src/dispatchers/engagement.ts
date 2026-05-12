import { env, require_ } from "../shared/env.ts";
import { loggers } from "../shared/logger.ts";
import { founders } from "./founders/seed.ts";

// Twice-daily "reply window" Telegram nudge.
//
// Source of tweets: Nitter RSS (no auth). If your default instance dies,
// override with NITTER_BASE in env. Caller is responsible for choosing a
// live mirror.
//
// CLI: bun engagement
// Scheduled via .github/workflows/engagement.yml

const NITTER_BASE = process.env["NITTER_BASE"] ?? "https://nitter.privacydev.net";
const MAX_TWEETS_PER_HANDLE = 3;
const MAX_TOTAL = 10;

type Tweet = { handle: string; title: string; url: string; pub: string };

function escapeXml(s: string): string {
  return s.replace(/[<>&]/g, "");
}

function parseRssItems(xml: string): Array<{ title: string; link: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; pubDate: string }> = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1] ?? "";
    const title = block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() ?? "";
    const link = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? "";
    const pubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? "";
    if (title && link) items.push({ title, link, pubDate });
  }
  return items;
}

async function fetchHandle(handle: string): Promise<Tweet[]> {
  const url = `${NITTER_BASE}/${handle}/rss`;
  const res = await fetch(url, {
    headers: { "User-Agent": "job-radar engagement" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) {
    loggers.scan.debug(`nitter ${handle} ${res.status}`);
    return [];
  }
  const xml = await res.text();
  const items = parseRssItems(xml).slice(0, MAX_TWEETS_PER_HANDLE);
  return items.map((i) => ({
    handle,
    title: i.title.slice(0, 180),
    url: i.link.replace(NITTER_BASE, "https://x.com"),
    pub: i.pubDate,
  }));
}

function format(tweets: Tweet[]): string {
  const lines = [
    "Engagement window — reply to 8 of these, then post your daily ship-tweet.",
    "",
  ];
  tweets.slice(0, MAX_TOTAL).forEach((t, i) => {
    lines.push(`${i + 1}. @${t.handle}`);
    lines.push(`   ${escapeXml(t.title)}`);
    lines.push(`   ${t.url}`);
    lines.push("");
  });
  return lines.join("\n");
}

async function sendTelegram(text: string): Promise<void> {
  const token = require_("telegramBotToken");
  const chatId = require_("telegramChatId");
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    loggers.feed.error(`telegram ${res.status}: ${(await res.text()).slice(0, 200)}`);
    process.exit(1);
  }
  loggers.feed.success("telegram sent");
}

async function main() {
  if (!env.telegramBotToken || !env.telegramChatId) {
    loggers.feed.warn("telegram not configured — running in stdout-only mode");
  }
  const handles = founders.map((f) => f.handle).filter((h): h is string => Boolean(h));
  loggers.scan.info(`polling ${handles.length} handles via nitter`);
  const settled = await Promise.allSettled(handles.map(fetchHandle));
  const all: Tweet[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") all.push(...r.value);
  }
  // Newest first.
  all.sort((a, b) => Date.parse(b.pub) - Date.parse(a.pub));
  loggers.scan.success(`${all.length} tweets collected`);
  if (all.length === 0) {
    loggers.scan.warn("nothing to send — nitter instance may be down");
    return;
  }
  const msg = format(all);
  if (env.telegramBotToken && env.telegramChatId) {
    await sendTelegram(msg);
  } else {
    console.log(msg);
  }
}

await main();
