import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { Now, NowEvent } from "../shared/schemas.ts";
import { NowSchema } from "../shared/schemas.ts";
import { profile } from "../config/profile.ts";
import { loggers } from "../shared/logger.ts";

const NOW_PATH = "data/now.json";

type GHEvent = {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string };
  payload?: { commits?: Array<{ message: string }> };
};

function summarize(e: GHEvent): string | null {
  if (e.type === "PushEvent") {
    const msg = e.payload?.commits?.[0]?.message?.split("\n")[0];
    return msg ? `pushed: ${msg}` : "pushed commits";
  }
  if (e.type === "CreateEvent") return "created repo";
  if (e.type === "PullRequestEvent") return "opened PR";
  if (e.type === "IssuesEvent") return "opened issue";
  if (e.type === "WatchEvent") return "starred";
  if (e.type === "PublicEvent") return "made public";
  return null;
}

export async function writeNow(): Promise<void> {
  loggers.now.info(`fetching GitHub events for ${profile.handle}`);

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "job-radar",
  };
  const token = process.env["GITHUB_TOKEN"];
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(
    `https://api.github.com/users/${profile.handle}/events/public?per_page=50`,
    { headers },
  );
  if (!res.ok) {
    loggers.now.error(`GitHub events: ${res.status}`);
    return;
  }
  const raw = (await res.json()) as GHEvent[];
  const events: NowEvent[] = [];
  for (const e of raw) {
    const summary = summarize(e);
    if (!summary) continue;
    events.push({
      type: e.type,
      repo: e.repo.name,
      summary,
      at: e.created_at,
    });
    if (events.length >= 20) break;
  }

  const now: Now = {
    updatedAt: new Date().toISOString(),
    events,
    currently: [
      "Building a public RAG benchmark (BM25 + ColBERT + RRF)",
      "Porting the Go limit-order-book matching engine to C++",
      "Open to YC AI / dev-tool internships, Summer 2026",
    ],
  };
  NowSchema.parse(now);

  await mkdir(dirname(NOW_PATH), { recursive: true });
  await writeFile(NOW_PATH, JSON.stringify(now, null, 2) + "\n");
  loggers.now.success(`wrote ${NOW_PATH} with ${events.length} events`);
}
