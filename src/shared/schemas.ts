import { z } from "zod";

export const PostingSchema = z.object({
  id: z.string(), // hash(source + url)
  source: z.enum([
    "hn",
    "yc",
    "wellfound",
    "remoteok",
    "internshala",
    "speedyapply",
  ]),
  title: z.string(),
  company: z.string().optional(),
  url: z.url(),
  body: z.string().default(""),
  location: z.string().optional(),
  remote: z.boolean().default(false),
  postedAt: z.string(), // ISO
  fetchedAt: z.string(), // ISO
  // Filled by enrichers.
  score: z.number().min(0).max(10).optional(),
  reasons: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

export type Posting = z.infer<typeof PostingSchema>;

export const FeedSchema = z.object({
  updatedAt: z.string(),
  count: z.number(),
  postings: z.array(PostingSchema),
});

export type Feed = z.infer<typeof FeedSchema>;

export const NowEventSchema = z.object({
  type: z.string(),
  repo: z.string(),
  summary: z.string(),
  at: z.string(),
});

export type NowEvent = z.infer<typeof NowEventSchema>;

export const NowSchema = z.object({
  updatedAt: z.string(),
  events: z.array(NowEventSchema),
  currently: z.array(z.string()),
});

export type Now = z.infer<typeof NowSchema>;

// Events radar — hackathons, launch weeks, bounty programs, build challenges.
// Distinct from job postings; these are time-bound participation
// opportunities that YC startups announce on LinkedIn AND on their blog.

export const BuilderEventSchema = z.object({
  id: z.string(),
  source: z.string(), // "vercel-blog", "supabase-blog", "devpost", etc.
  kind: z.enum(["hackathon", "launch-week", "bounty", "challenge", "demo-day", "other"]),
  title: z.string(),
  description: z.string().default(""),
  url: z.url(),
  publishedAt: z.string(),
  fetchedAt: z.string(),
  company: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export type BuilderEvent = z.infer<typeof BuilderEventSchema>;

export const EventsFeedSchema = z.object({
  updatedAt: z.string(),
  count: z.number(),
  events: z.array(BuilderEventSchema),
});

export type EventsFeed = z.infer<typeof EventsFeedSchema>;

// Engagement signals — concrete reply-targets surfaced from founder repos.
// Persisted so the dashboard can show them outside the Telegram window.

export const EngagementSignalSchema = z.object({
  founder: z.string(),
  company: z.string(),
  repo: z.string(),
  kind: z.enum(["pr", "issue", "release"]),
  number: z.number(),
  title: z.string(),
  url: z.url(),
  author: z.string(),
  at: z.string(),
});

export type EngagementSignal = z.infer<typeof EngagementSignalSchema>;

export const EngagementFeedSchema = z.object({
  updatedAt: z.string(),
  count: z.number(),
  signals: z.array(EngagementSignalSchema),
});

export type EngagementFeed = z.infer<typeof EngagementFeedSchema>;
