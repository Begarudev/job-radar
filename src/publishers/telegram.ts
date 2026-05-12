import type { Posting } from "../shared/schemas.ts";
import { loggers } from "../shared/logger.ts";

// Optional Telegram push. Configure TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
// in GitHub Actions secrets. Skips silently if unconfigured.

const MIN_SCORE = 8;

function formatPosting(p: Posting): string {
  const score = p.score?.toFixed(1) ?? "?";
  return [
    `★ ${score} · ${p.title}`,
    p.company ? `at ${p.company}` : "",
    p.location ? `(${p.location})` : "",
    p.url,
    p.reasons.slice(0, 3).join(" · "),
  ]
    .filter(Boolean)
    .join("\n");
}

export async function pushToTelegram(postings: Posting[]): Promise<void> {
  const token = process.env["TELEGRAM_BOT_TOKEN"];
  const chatId = process.env["TELEGRAM_CHAT_ID"];
  if (!token || !chatId) {
    loggers.feed.debug("telegram not configured, skipping");
    return;
  }
  const top = postings.filter((p) => (p.score ?? 0) >= MIN_SCORE).slice(0, 5);
  if (top.length === 0) {
    loggers.feed.debug("no telegram-tier postings");
    return;
  }
  const body = `🛰 ${top.length} new ${top.length === 1 ? "lead" : "leads"}\n\n${top.map(formatPosting).join("\n\n---\n\n")}`;

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: body,
      disable_web_page_preview: true,
    }),
  });
  if (!res.ok) {
    loggers.feed.warn(`telegram: ${res.status}`);
  } else {
    loggers.feed.success(`pushed ${top.length} to telegram`);
  }
}
