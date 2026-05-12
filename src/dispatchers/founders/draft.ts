import { readFile, mkdir, writeFile } from "node:fs/promises";
import { env } from "../../shared/env.ts";
import { loggers } from "../../shared/logger.ts";
import { founders, type Founder } from "./seed.ts";

// CLI:
//   bun founders:draft browser-use --artifact ./posts/rag-bench.md
//   bun founders:draft all          --artifact ./posts/rag-bench.md
//
// Behaviour:
//   - finds founder(s) by company-slug match against `seed.ts`
//   - if ANTHROPIC_API_KEY set: drafts a 180-240w cold email via Claude
//   - else: fills a deterministic template
//   - writes drafts to data/dm-drafts/<timestamp>-<handle>.md
//
// Drafts are never auto-sent. You paste into Gmail.

const CANDIDATE = {
  name: "Ayush Upadhyay",
  handle: "garudev",
  github: "https://github.com/begarudev",
  site: "https://garudev.codes",
  receipts: [
    "Built a campus payment app on Flutter+Firebase processing $1.4M/yr across thousands of DAU",
    "Wrote a concurrent limit-order-book matching engine in Go (Kafka→RabbitMQ migration for sub-1GB-RAM low-latency)",
    "Shipped a RAG pipeline with BM25 + ColBERT + Reciprocal Rank Fusion + Llama-3-8B fine-tune",
  ],
};

function templateBody(f: Founder, artifactBlurb: string): string {
  return `Hi ${f.name.split(" ")[0]},

I'm a BITS Pilani sophomore (grad May '28) who's been building in your lane. ${artifactBlurb}

Three things I've shipped:
- ${CANDIDATE.receipts[0]}
- ${CANDIDATE.receipts[1]}
- ${CANDIDATE.receipts[2]}

I work cross-platform (React, Next, RN, Flutter, Go, Python, C++) and pair with Claude + Codex daily — high-agency, fast shipper. ${f.company} is exactly the kind of product I want to spend a summer at.

Available immediately for a remote summer 2026 intern role. Happy to ship a 48h sample feature on something you'd want built.

Repo: ${CANDIDATE.github} — Site: ${CANDIDATE.site}

— Ayush (${CANDIDATE.handle})`;
}

async function draftViaClaude(opts: {
  founder: Founder;
  artifactPath?: string;
  artifactBody?: string;
}): Promise<string | null> {
  if (!env.anthropicApiKey) return null;
  const { founder, artifactPath, artifactBody } = opts;
  const artifactExcerpt = artifactBody
    ? artifactBody.slice(0, 1500)
    : "(no artifact attached)";

  const system = `You write cold-emails for a BITS Pilani sophomore engineer (Ayush Upadhyay, handle "garudev") seeking a summer 2026 YC-stage intern role. House style:
- 180-240 words total
- 4 paragraphs: (1) one specific reference to the founder's product proving the candidate has read/used it (2) 2-3 concrete "receipts" of what the candidate built with metrics (3) why this candidate fits this specific company in 2 sentences (4) low-friction ask + GitHub link
- No emojis. No "passionate". No "I'd love the opportunity." No "circling back."
- Voice: technical, calm, slightly understated
- End with: "— Ayush (garudev)"
- Always include GitHub: https://github.com/begarudev
- Never invent biographical facts beyond what's provided`;

  const userMessage = `Founder: ${founder.name} (handle @${founder.handle ?? "?"})
Company: ${founder.company} ${founder.yc ? `(YC ${founder.yc})` : ""}
Product: ${founder.product}

Candidate receipts (use 2-3, pick the most relevant to this company):
- ${CANDIDATE.receipts[0]}
- ${CANDIDATE.receipts[1]}
- ${CANDIDATE.receipts[2]}

Latest artifact${artifactPath ? ` (${artifactPath})` : ""}: """
${artifactExcerpt}
"""

Write the email. Subject line on its own first line prefixed with "Subject: ". Then a blank line. Then the body.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 800,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });
  if (!res.ok) {
    loggers.feed.warn(`anthropic ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return null;
  }
  const json = (await res.json()) as {
    content: Array<{ type: string; text: string }>;
  };
  const text = json.content.find((c) => c.type === "text")?.text;
  return text ?? null;
}

function matchFounders(arg: string): Founder[] {
  if (arg === "all") return founders;
  const norm = arg.toLowerCase().replace(/[^a-z0-9]+/g, "");
  return founders.filter((f) => {
    const c = f.company.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const h = (f.handle ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
    return c.includes(norm) || h === norm;
  });
}

async function main() {
  const args = Bun.argv.slice(2);
  const target = args.find((a) => !a.startsWith("--")) ?? "all";
  const artifactIdx = args.indexOf("--artifact");
  const artifactPath = artifactIdx >= 0 ? args[artifactIdx + 1] : undefined;
  const artifactBody = artifactPath
    ? await readFile(artifactPath, "utf8")
    : undefined;

  const targets = matchFounders(target);
  if (targets.length === 0) {
    loggers.feed.error(`no founder matched "${target}" — try one of: ${founders.map((f) => f.company).join(", ")}`);
    process.exit(1);
  }

  await mkdir("data/dm-drafts", { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  for (const f of targets) {
    const artifactBlurb = artifactPath
      ? `Latest thing I shipped: ${artifactPath.split("/").pop()}.`
      : "";
    const claude = await draftViaClaude({ founder: f, artifactPath, artifactBody });
    const body =
      claude ??
      `Subject: ${CANDIDATE.name} → ${f.company} — sophomore engineer, 3 receipts, 48h sample?\n\n${templateBody(f, artifactBlurb)}`;

    const slug = f.company.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const path = `data/dm-drafts/${stamp}-${slug}.md`;
    await writeFile(
      path,
      `# To: ${f.name} (${f.company})\n# Handle: @${f.handle ?? ""}\n# Email: ${f.email ?? "(verify with Hunter)"}\n# Engine: ${claude ? "claude" : "template"}\n\n${body}\n`,
    );
    loggers.feed.success(`draft: ${path}`);
  }
}

await main();
