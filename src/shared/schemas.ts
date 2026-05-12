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
