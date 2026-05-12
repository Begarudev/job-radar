import type { Posting } from "../shared/schemas.ts";
import { loggers } from "../shared/logger.ts";

// speedyapply/2026-AI-College-Jobs maintains an INTERN_INTL.md file with
// international-friendly internships. We fetch the raw file and parse its
// markdown table.

const RAW =
  "https://raw.githubusercontent.com/speedyapply/2026-AI-College-Jobs/main/INTERN_INTL.md";

function parseRow(line: string): { cells: string[] } | null {
  if (!line.startsWith("|")) return null;
  const cells = line
    .split("|")
    .map((c) => c.trim())
    .filter((_, i, arr) => i > 0 && i < arr.length - 1);
  if (cells.length < 3) return null;
  if (cells.every((c) => /^[-:\s]+$/.test(c))) return null;
  return { cells };
}

function extractLink(md: string): { text: string; href?: string } {
  const m = md.match(/\[([^\]]+)\]\(([^)]+)\)/);
  if (m) return { text: m[1] ?? md, href: m[2] };
  return { text: md };
}

export async function scrapeSpeedyApply(): Promise<Posting[]> {
  loggers.scraper.info("SpeedyApply: fetching INTERN_INTL.md");

  const res = await fetch(RAW, {
    headers: { "User-Agent": "job-radar (https://github.com/begarudev/job-radar)" },
  });
  if (!res.ok) {
    loggers.scraper.warn(`SpeedyApply: ${res.status}`);
    return [];
  }

  const text = await res.text();
  const lines = text.split("\n");
  const postings: Posting[] = [];
  const now = new Date().toISOString();

  let headerSeen = false;
  for (const line of lines) {
    const row = parseRow(line);
    if (!row) continue;
    if (!headerSeen) {
      // First non-separator row is the header.
      headerSeen = true;
      continue;
    }
    const [companyRaw, roleRaw, locationRaw] = row.cells;
    if (!companyRaw || !roleRaw) continue;

    const company = extractLink(companyRaw);
    const role = extractLink(roleRaw);
    const href = role.href ?? company.href;
    if (!href) continue;

    postings.push({
      id: `speedyapply:${encodeURIComponent(href)}`,
      source: "speedyapply",
      title: role.text,
      company: company.text,
      url: href,
      body: row.cells.join(" · "),
      location: locationRaw,
      remote: /remote/i.test(locationRaw ?? ""),
      postedAt: now,
      fetchedAt: now,
      reasons: [],
      tags: ["intern-intl"],
    });
  }

  loggers.scraper.success(`SpeedyApply: ${postings.length} intern roles`);
  return postings;
}
