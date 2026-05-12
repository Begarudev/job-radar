import type { Posting } from "../shared/schemas.ts";
import { loggers } from "../shared/logger.ts";

type RemoteOKJob = {
  id?: string | number;
  slug?: string;
  url?: string;
  position?: string;
  company?: string;
  tags?: string[];
  description?: string;
  date?: string;
  location?: string;
};

export async function scrapeRemoteOK(): Promise<Posting[]> {
  loggers.scraper.info("RemoteOK: fetching API");

  const res = await fetch("https://remoteok.com/api", {
    headers: { "User-Agent": "job-radar (https://github.com/begarudev/job-radar)" },
  });
  if (!res.ok) {
    loggers.scraper.warn(`RemoteOK: ${res.status}`);
    return [];
  }

  const data = (await res.json()) as unknown[];
  // First item is metadata; rest are jobs.
  const jobs = data.slice(1) as RemoteOKJob[];
  const now = new Date().toISOString();
  const postings: Posting[] = [];

  for (const j of jobs) {
    if (!j.id || !j.position) continue;
    const blob = `${j.position} ${j.tags?.join(" ") ?? ""} ${j.description ?? ""}`.toLowerCase();
    const isIntern = /\b(intern|internship|junior|new[- ]grad)\b/.test(blob);
    const isEng = /(engineer|developer|software|ai|ml|llm|fullstack|frontend|backend)/.test(blob);
    if (!isIntern && !isEng) continue;

    postings.push({
      id: `remoteok:${j.id}`,
      source: "remoteok",
      title: j.position,
      company: j.company,
      url: j.url ?? `https://remoteok.com/remote-jobs/${j.slug ?? j.id}`,
      body: (j.description ?? "").replace(/<[^>]+>/g, " ").slice(0, 4000),
      location: j.location,
      remote: true,
      postedAt: j.date ?? now,
      fetchedAt: now,
      reasons: [],
      tags: j.tags?.slice(0, 8) ?? [],
    });
  }

  loggers.scraper.success(`RemoteOK: ${postings.length} candidates`);
  return postings;
}
