import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { env, require_ } from "../shared/env.ts";
import { loggers } from "../shared/logger.ts";
import { EngagementFeedSchema, type EngagementFeed } from "../shared/schemas.ts";
import { founders, type Founder } from "./founders/seed.ts";

const PERSIST_PATH = "data/engagement.json";

// Twice-daily Telegram nudge listing concrete engagement targets from
// founder ecosystems. Pulls recent activity (issues, PRs, commits) from
// each founder's company repo via the GitHub REST API. Reliable,
// auth-friendly (60 req/h unauth, 5k/h with token), and substantively
// higher-signal than tweet RSS — replying to a real PR with a
// technical observation beats a generic "great tweet" reply.
//
// CLI: bun run engagement
// Scheduled via .github/workflows/engagement.yml

const MAX_PER_REPO = 2;
const MAX_TOTAL = 12;
const SINCE_HOURS = 24;

type Signal = {
  founder: string;
  company: string;
  repo: string;
  kind: "pr" | "issue" | "release";
  number: number;
  title: string;
  url: string;
  author: string;
  at: string;
};

type IssueOrPr = {
  number: number;
  title: string;
  html_url: string;
  state: string;
  user: { login: string };
  created_at: string;
  pull_request?: unknown;
};

type Release = {
  tag_name: string;
  name: string | null;
  html_url: string;
  author: { login: string };
  published_at: string;
};

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "job-radar engagement",
  };
  if (env.githubToken) h["Authorization"] = `Bearer ${env.githubToken}`;
  return h;
}

async function fetchRepoSignals(f: Founder): Promise<Signal[]> {
  if (!f.companyRepo) return [];
  const since = new Date(Date.now() - SINCE_HOURS * 3600_000).toISOString();
  const url = `https://api.github.com/repos/${f.companyRepo}/issues?state=open&sort=created&direction=desc&since=${since}&per_page=${MAX_PER_REPO * 3}`;
  const res = await fetch(url, { headers: ghHeaders(), signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    loggers.scan.debug(`gh ${f.companyRepo} ${res.status}`);
    return [];
  }
  const items = (await res.json()) as IssueOrPr[];
  return items.slice(0, MAX_PER_REPO).map((i) => ({
    founder: f.name,
    company: f.company,
    repo: f.companyRepo!,
    kind: i.pull_request ? "pr" : "issue",
    number: i.number,
    title: i.title.slice(0, 140),
    url: i.html_url,
    author: i.user.login,
    at: i.created_at,
  }));
}

async function fetchLatestRelease(f: Founder): Promise<Signal | null> {
  if (!f.companyRepo) return null;
  const res = await fetch(`https://api.github.com/repos/${f.companyRepo}/releases/latest`, {
    headers: ghHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const r = (await res.json()) as Release;
  // Only surface releases newer than SINCE_HOURS.
  if (Date.now() - Date.parse(r.published_at) > SINCE_HOURS * 3600_000) return null;
  return {
    founder: f.name,
    company: f.company,
    repo: f.companyRepo,
    kind: "release",
    number: 0,
    title: `${r.name ?? r.tag_name} released`,
    url: r.html_url,
    author: r.author.login,
    at: r.published_at,
  };
}

function format(signals: Signal[]): string {
  const lines = [
    `🛰  Engagement window — ${signals.length} fresh signal${signals.length === 1 ? "" : "s"} (last ${SINCE_HOURS}h)`,
    "",
    "Reply to 3-5 with a technical observation, then post your daily ship-tweet.",
    "",
  ];
  // Dedup by repo, then prefer releases > PRs > issues.
  const sorted = [...signals].sort((a, b) => {
    const w = (k: Signal["kind"]) => ({ release: 3, pr: 2, issue: 1 })[k];
    return w(b.kind) - w(a.kind) || Date.parse(b.at) - Date.parse(a.at);
  });
  sorted.slice(0, MAX_TOTAL).forEach((s, i) => {
    const tag = s.kind === "release" ? "REL" : s.kind === "pr" ? "PR " : "ISS";
    lines.push(`${i + 1}. [${tag}] ${s.repo}#${s.number || ""}`);
    lines.push(`   ${s.title}`);
    lines.push(`   by @${s.author} · ${s.url}`);
    lines.push("");
  });
  // Always-on X reminder block: profile URLs to check manually.
  lines.push("X profile sweep (manual — open these in the app):");
  for (const f of founders) {
    if (!f.handle) continue;
    lines.push(`  @${f.handle} (${f.company}) — https://x.com/${f.handle}`);
  }
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
    loggers.feed.warn("telegram not configured — printing to stdout instead");
  }
  loggers.scan.info(`polling ${founders.length} founder repos via github`);

  const settled = await Promise.allSettled(
    founders.flatMap((f) => [fetchRepoSignals(f), fetchLatestRelease(f)]),
  );
  const collected: Signal[] = [];
  for (const r of settled) {
    if (r.status !== "fulfilled") continue;
    const v = r.value;
    if (Array.isArray(v)) collected.push(...v);
    else if (v) collected.push(v);
  }
  // Dedupe by URL, then drop bot authors — you can't have a useful
  // conversation with github-actions[bot].
  const seen = new Set<string>();
  const all: Signal[] = [];
  for (const s of collected) {
    if (seen.has(s.url)) continue;
    if (/\[bot\]$/i.test(s.author)) continue;
    seen.add(s.url);
    all.push(s);
  }
  loggers.scan.success(
    `${all.length} unique human-authored signals (${collected.length} raw)`,
  );

  // Persist so the dashboard can render outside the Telegram window.
  const feed: EngagementFeed = {
    updatedAt: new Date().toISOString(),
    count: all.length,
    signals: all,
  };
  EngagementFeedSchema.parse(feed);
  await mkdir(dirname(PERSIST_PATH), { recursive: true });
  await writeFile(PERSIST_PATH, JSON.stringify(feed, null, 2) + "\n");
  loggers.feed.success(`wrote ${PERSIST_PATH}`);

  const msg = format(all);
  if (env.telegramBotToken && env.telegramChatId) {
    await sendTelegram(msg);
  } else {
    console.log(msg);
  }
}

await main();
