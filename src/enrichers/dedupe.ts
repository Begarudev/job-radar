import type { Posting } from "../shared/schemas.ts";

// Dedupe by id first, then by title-similarity fallback.
export function dedupe(postings: Posting[]): Posting[] {
  const seen = new Set<string>();
  const out: Posting[] = [];
  for (const p of postings) {
    if (seen.has(p.id)) continue;
    const titleKey = p.title.toLowerCase().replace(/\s+/g, " ").trim();
    const dupKey = `${p.company ?? ""}::${titleKey}`;
    if (seen.has(dupKey)) continue;
    seen.add(p.id);
    seen.add(dupKey);
    out.push(p);
  }
  return out;
}
