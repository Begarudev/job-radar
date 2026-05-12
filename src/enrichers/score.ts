import type { Posting } from "../shared/schemas.ts";
import { profile } from "../config/profile.ts";
import { loggers } from "../shared/logger.ts";

// Keyword-based scorer. Free, deterministic. Range 0-10.
// Phase 2 can layer Claude API on top for nuance — we'll cap LLM at
// score>=5 postings to keep API spend bounded.

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Word-boundary aware match. Hyphens/dots inside terms (e.g. "next.js",
// "fine-tune") are treated as literal; surrounded by non-word chars.
function hasTerm(blob: string, term: string): boolean {
  const escaped = escapeRe(term);
  const re = new RegExp(`(^|[^a-z0-9_])${escaped}([^a-z0-9_]|$)`, "i");
  return re.test(blob);
}

export function scoreKeyword(p: Posting): { score: number; reasons: string[]; tags: string[] } {
  const blob = `${p.title} ${p.body} ${p.location ?? ""}`.toLowerCase();
  const reasons: string[] = [];
  const tags: string[] = [];
  let score = 0;

  // Hard exclude.
  for (const re of profile.exclude.seniorityPatterns) {
    if (re.test(blob)) {
      return { score: 0, reasons: ["seniority excluded"], tags: ["excluded:senior"] };
    }
  }
  for (const re of profile.exclude.locationPatterns) {
    if (re.test(blob)) {
      return { score: 0, reasons: ["location excluded"], tags: ["excluded:location"] };
    }
  }

  // Role match.
  const titleMatch = profile.targetTitles.find((t) => hasTerm(blob, t));
  if (titleMatch) {
    score += 3;
    reasons.push(`title match: ${titleMatch}`);
    tags.push("role:match");
  }

  // Must-have stack.
  const mustHit = profile.skills.must.filter((s) => hasTerm(blob, s));
  if (mustHit.length > 0) {
    score += Math.min(2, mustHit.length * 0.7);
    reasons.push(`core stack: ${mustHit.join(", ")}`);
    tags.push(...mustHit.map((s) => `stack:${s}`));
  }

  // Strong stack.
  const strongHit = profile.skills.strong.filter((s) => hasTerm(blob, s));
  if (strongHit.length > 0) {
    score += Math.min(3, strongHit.length * 0.6);
    reasons.push(`strong fit: ${strongHit.join(", ")}`);
    tags.push(...strongHit.map((s) => `signal:${s}`));
  }

  // Bonus.
  const bonusHit = profile.skills.bonus.filter((s) => hasTerm(blob, s));
  if (bonusHit.length > 0) {
    score += Math.min(1, bonusHit.length * 0.3);
    reasons.push(`bonus: ${bonusHit.join(", ")}`);
  }

  // Remote-friendly perks.
  if (p.remote || /\bremote\b/i.test(blob) || /\bworldwide\b/i.test(blob)) {
    score += 1;
    reasons.push("remote-friendly");
    tags.push("remote");
  }

  // YC signal.
  if (/\b\(yc\b/i.test(blob) || /y combinator/i.test(blob)) {
    score += 1;
    reasons.push("YC company");
    tags.push("yc");
  }

  // India-friendly bonus.
  if (/india/i.test(blob)) {
    score += 0.5;
    reasons.push("mentions India");
    tags.push("india-friendly");
  }

  // Clamp.
  score = Math.min(10, Math.round(score * 10) / 10);
  return { score, reasons, tags };
}

export function scoreAll(postings: Posting[]): Posting[] {
  loggers.score.info(`scoring ${postings.length} postings`);
  const scored = postings.map((p) => {
    const { score, reasons, tags } = scoreKeyword(p);
    return { ...p, score, reasons, tags: [...p.tags, ...tags] };
  });
  const above6 = scored.filter((p) => (p.score ?? 0) >= 6).length;
  loggers.score.success(`${above6}/${scored.length} scored >= 6`);
  return scored;
}
