import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { BuilderEvent, EventsFeed } from "../shared/schemas.ts";
import { EventsFeedSchema, EventsFeedSchema as _ES } from "../shared/schemas.ts";
import { env } from "../shared/env.ts";
import { loggers } from "../shared/logger.ts";

void _ES;

const EVENTS_PATH = "data/events.json";
const MAX = 80;

async function loadExistingIds(): Promise<Set<string>> {
  try {
    const raw = await readFile(EVENTS_PATH, "utf8");
    const feed = JSON.parse(raw) as EventsFeed;
    return new Set(feed.events.map((e) => e.id));
  } catch {
    return new Set();
  }
}

export async function writeEvents(events: BuilderEvent[]): Promise<{
  total: number;
  newCount: number;
  newEvents: BuilderEvent[];
}> {
  const existing = await loadExistingIds();
  const newEvents = events.filter((e) => !existing.has(e.id));

  // Sort: newest first.
  const sorted = [...events].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
  const trimmed = sorted.slice(0, MAX);

  const feed: EventsFeed = {
    updatedAt: new Date().toISOString(),
    count: trimmed.length,
    events: trimmed,
  };
  EventsFeedSchema.parse(feed);

  await mkdir(dirname(EVENTS_PATH), { recursive: true });
  await writeFile(EVENTS_PATH, JSON.stringify(feed, null, 2) + "\n");
  loggers.feed.success(
    `wrote ${EVENTS_PATH} — ${trimmed.length} events (${newEvents.length} new)`,
  );

  return { total: trimmed.length, newCount: newEvents.length, newEvents };
}

export async function pushEventsToTelegram(newEvents: BuilderEvent[]): Promise<void> {
  if (newEvents.length === 0) {
    loggers.feed.debug("events: no new items, skip telegram");
    return;
  }
  if (!env.telegramBotToken || !env.telegramChatId) {
    loggers.feed.debug("events: telegram not configured");
    return;
  }

  const KIND_ICON: Record<BuilderEvent["kind"], string> = {
    hackathon: "🏁",
    "launch-week": "🚀",
    bounty: "💰",
    challenge: "🎯",
    "demo-day": "🎬",
    other: "📢",
  };

  const lines = [
    `🌸  ${newEvents.length} new builder event${newEvents.length === 1 ? "" : "s"} on the radar`,
    "",
  ];
  for (const e of newEvents.slice(0, 10)) {
    lines.push(`${KIND_ICON[e.kind]} ${e.kind.toUpperCase()} · ${e.company ?? e.source}`);
    lines.push(`   ${e.title}`);
    lines.push(`   ${e.url}`);
    lines.push("");
  }
  if (newEvents.length > 10) {
    lines.push(`   …and ${newEvents.length - 10} more in data/events.json`);
  }

  const res = await fetch(
    `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: env.telegramChatId,
        text: lines.join("\n"),
        disable_web_page_preview: true,
      }),
    },
  );
  if (!res.ok) {
    loggers.feed.warn(`events telegram ${res.status}`);
  } else {
    loggers.feed.success(`events: pushed ${Math.min(newEvents.length, 10)} to telegram`);
  }
}
