import { readFile, mkdir, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { commitToPortfolio } from "../publishers/portfolio-commit.ts";
import { publishToDevTo } from "../publishers/devto.ts";
import { publishToHashnode } from "../publishers/hashnode.ts";
import { env } from "../shared/env.ts";
import { loggers } from "../shared/logger.ts";

// CLI: bun post ./posts/rag-bench.md [--live] [--dry-run]
//
// Pipeline:
//   1. parse frontmatter + body
//   2. compute slug + canonical URL
//   3. commit MDX to portfolio repo (Vercel auto-rebuild)
//   4. POST to dev.to as draft (or live with --live)
//   5. POST to Hashnode draft (if env)
//   6. emit tweet draft + LinkedIn-carousel skeleton to data/drafts/

const SITE = "https://garudev.codes";

type Frontmatter = {
  title: string;
  slug?: string;
  date?: string;
  excerpt?: string;
  tags?: string[];
  subtitle?: string;
};

function parseMarkdown(raw: string): { meta: Frontmatter; body: string } {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) {
    return { meta: { title: "Untitled" }, body: raw };
  }
  const yaml = m[1] ?? "";
  const body = (m[2] ?? "").trimStart();
  const meta: Record<string, unknown> = {};
  for (const line of yaml.split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1]!;
    const val = (kv[2] ?? "").trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      meta[key] = val
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      meta[key] = val.replace(/^["']|["']$/g, "");
    }
  }
  return { meta: meta as Frontmatter, body };
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildTweet(meta: Frontmatter, url: string): string {
  return [
    meta.title,
    "",
    meta.excerpt ?? "",
    "",
    url,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildCarouselOutline(meta: Frontmatter, body: string): string {
  // Naive splitter: pick first H2 sections as slides.
  const slides: string[] = [
    `# ${meta.title}\n\n${meta.excerpt ?? ""}`,
  ];
  const sections = body.split(/^##\s+/m).slice(1);
  for (const sec of sections.slice(0, 6)) {
    const firstLine = sec.split("\n")[0] ?? "";
    const rest = sec.split("\n").slice(1).join("\n").trim();
    slides.push(`## ${firstLine}\n\n${rest.slice(0, 380)}`);
  }
  slides.push(`# Built by Ayush Upadhyay (garudev)\n${SITE}`);
  return slides.map((s, i) => `--- slide ${i + 1} ---\n${s}`).join("\n\n");
}

async function main() {
  const args = Bun.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  const isLive = args.includes("--live");
  const isDry = args.includes("--dry-run");
  if (!file) {
    loggers.feed.error("usage: bun post <file.md> [--live] [--dry-run]");
    process.exit(1);
  }
  const raw = await readFile(file, "utf8");
  const { meta, body } = parseMarkdown(raw);
  const slug = meta.slug ?? slugify(meta.title);
  const canonical = `${SITE}/blog/${slug}`;
  const portfolioPath = `${env.portfolioBlogDir}/${slug}.mdx`;
  const tags = meta.tags ?? [];

  loggers.feed.info(`publish: ${slug}`);
  loggers.feed.info(`canonical: ${canonical}`);
  loggers.feed.info(`portfolio path: ${portfolioPath}`);
  loggers.feed.info(`live: ${isLive ? "yes (will publish dev.to/Hashnode)" : "no (drafts only)"}`);

  if (isDry) {
    loggers.feed.success("dry-run: would commit to portfolio + draft cross-posts");
    return;
  }

  // 1. Portfolio commit (always — Vercel auto-rebuilds).
  const portfolioMdx = `---
title: "${meta.title.replace(/"/g, '\\"')}"
slug: "${slug}"
date: "${meta.date ?? new Date().toISOString().slice(0, 10)}"
excerpt: "${(meta.excerpt ?? "").replace(/"/g, '\\"')}"
tags: ${JSON.stringify(tags)}
canonical: "${canonical}"
---

${body}
`;
  const commit = await commitToPortfolio({
    pathInRepo: portfolioPath,
    content: portfolioMdx,
    message: `blog: ${isLive ? "publish" : "draft"} ${slug}`,
  });
  loggers.feed.success(`portfolio: ${commit.url}`);

  // 2. dev.to (draft unless --live).
  await publishToDevTo({
    title: meta.title,
    body,
    tags,
    canonicalUrl: canonical,
    published: isLive,
  });

  // 3. Hashnode (always draft via canonical until UI flip).
  await publishToHashnode({
    title: meta.title,
    body,
    tags,
    canonicalUrl: canonical,
    subtitle: meta.subtitle ?? meta.excerpt,
  });

  // 4. Draft tweet + carousel outline to local files for human review.
  await mkdir("data/drafts", { recursive: true });
  const draftBase = `data/drafts/${slug}-${Date.now()}`;
  await writeFile(`${draftBase}.tweet.txt`, buildTweet(meta, canonical));
  await writeFile(`${draftBase}.carousel.md`, buildCarouselOutline(meta, body));
  loggers.feed.success(`tweet + carousel drafts: ${draftBase}.*`);

  loggers.feed.success(`publish complete: ${basename(file)}`);
}

await main();
