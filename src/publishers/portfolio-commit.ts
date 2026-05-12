import { env, require_ } from "../shared/env.ts";
import { loggers } from "../shared/logger.ts";

// Commit a single file to the portfolio repo via GitHub Contents API.
// Triggers Vercel's webhook automatically on push.

const API = "https://api.github.com";

type ContentsRes = { sha: string };

async function getExistingSha(path: string): Promise<string | undefined> {
  const url = `${API}/repos/${env.portfolioOwner}/${env.portfolioRepo}/contents/${path}?ref=${env.portfolioBranch}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${require_("githubToken")}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (res.status === 404) return undefined;
  if (!res.ok) {
    throw new Error(`GET contents failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as ContentsRes;
  return json.sha;
}

export async function commitToPortfolio(opts: {
  pathInRepo: string; // e.g. "src/content/blog/rag-bench.mdx"
  content: string;
  message: string;
}): Promise<{ url: string; sha: string }> {
  require_("githubToken");
  const sha = await getExistingSha(opts.pathInRepo);
  loggers.feed.info(
    `portfolio commit: ${opts.pathInRepo}${sha ? " (update)" : " (new)"}`,
  );

  const url = `${API}/repos/${env.portfolioOwner}/${env.portfolioRepo}/contents/${opts.pathInRepo}`;
  const body = {
    message: opts.message,
    content: Buffer.from(opts.content, "utf8").toString("base64"),
    branch: env.portfolioBranch,
    ...(sha ? { sha } : {}),
  };
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${env.githubToken}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`PUT contents failed: ${res.status} ${await res.text()}`);
  }
  const json = (await res.json()) as { content: { sha: string; html_url: string } };
  loggers.feed.success(`portfolio commit: ${json.content.html_url}`);
  return { url: json.content.html_url, sha: json.content.sha };
}
