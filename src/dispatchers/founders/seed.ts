// Curated founders + amplifiers. Sourced from
// research_devrole_discovery_visibility/findings_x_twitter.md.
//
// Tiers:
// - direct: shipped product overlaps your stack, may hire you (cold-DM targets)
// - amplifier: won't hire you, but RT-amplifies signals into SF founder feeds
// - bridge: Indian/Asian engineering Twitter that crosses over to SF
//
// Each entry's GitHub user + companyRepo is verified at-add. Empty fields
// mean "not yet verified" — leave blank rather than guess; the bot
// gracefully skips missing data.

export type FounderTier = "direct" | "amplifier" | "bridge";

export type Founder = {
  name: string;
  handle?: string; // X handle, no @
  github?: string; // GitHub user, no @
  companyRepo?: string; // org/repo to watch for activity signals
  company: string;
  companyUrl: string;
  yc?: string; // batch e.g. "W25"
  email?: string;
  product: string; // one-line, for prompt context
  tier: FounderTier;
};

export const founders: Founder[] = [
  // ─────────────────────────────────────────────────────────────
  // DIRECT — product overlap, may hire you, cold-DM targets
  // ─────────────────────────────────────────────────────────────

  {
    name: "Magnus Müller",
    handle: "mamagnus00",
    github: "mamagnus00",
    companyRepo: "browser-use/browser-use",
    company: "Browser Use",
    companyUrl: "https://browser-use.com",
    yc: "W25",
    product:
      "Open-source web agent framework, 50K+ GitHub stars. Lets LLMs control real browsers.",
    tier: "direct",
  },
  {
    name: "Gregor Žunič",
    handle: "gregpr07",
    github: "gregpr07",
    companyRepo: "browser-use/browser-use",
    company: "Browser Use",
    companyUrl: "https://browser-use.com",
    yc: "W25",
    product: "Co-founder of Browser Use. Same product.",
    tier: "direct",
  },

  {
    name: "Soham Ganatra",
    handle: "SohamGanatra",
    github: "sohamganatra",
    companyRepo: "ComposioHQ/composio",
    company: "Composio",
    companyUrl: "https://composio.dev",
    product:
      "Tool-calling and integration infra for AI agents (MCP, Vercel AI SDK adapters). $29M raised. Indian founders.",
    tier: "direct",
  },
  {
    name: "Karan Vaidya",
    handle: "karanvaidya6",
    github: "karanvaidya6",
    companyRepo: "ComposioHQ/composio",
    company: "Composio",
    companyUrl: "https://composio.dev",
    product: "Co-founder of Composio. Same product.",
    tier: "direct",
  },

  {
    name: "Abhilash Chowdhary",
    handle: "TheChowdhary",
    company: "Crustdata",
    companyUrl: "https://crustdata.com",
    yc: "F24",
    product:
      "B2B data + search infra used by AI agents. BM25 + dense retrieval ranking pipelines — direct stack match with your RAG project.",
    tier: "direct",
  },

  {
    name: "Jason Liu",
    handle: "jxnlco",
    github: "jxnl",
    companyRepo: "567-labs/instructor",
    company: "instructor (OSS) + consultancy",
    companyUrl: "https://jxnl.co",
    product:
      "Author of the instructor library for structured LLM outputs. Heavy RAG/eval consulting practice. Single largest Tier-2 amplifier into AI-eng Twitter.",
    tier: "direct",
  },

  {
    name: "Harrison Chase",
    handle: "hwchase17",
    github: "hwchase17",
    companyRepo: "langchain-ai/langchain",
    company: "LangChain",
    companyUrl: "https://www.langchain.com",
    product:
      "LangChain / LangSmith / LangGraph. Agent + observability stack. PRs there are portable credentials across the whole ecosystem.",
    tier: "direct",
  },

  // Vercel — Next.js is your literal stack
  {
    name: "Guillermo Rauch",
    handle: "rauchg",
    github: "rauchg",
    companyRepo: "vercel/next.js",
    company: "Vercel",
    companyUrl: "https://vercel.com",
    product:
      "Vercel + Next.js. Retweets early-career devs who ship interesting Next.js demos. The site you're shipping on runs his infra.",
    tier: "direct",
  },
  {
    name: "Lee Robinson",
    handle: "leerob",
    github: "leerob",
    companyRepo: "vercel/next.js",
    company: "Vercel (DX)",
    companyUrl: "https://leerob.io",
    product:
      "VP of Product at Vercel. More accessible than Rauch. Replies to Next.js + AI SDK posts daily. Direct path to Vercel intern programs.",
    tier: "direct",
  },

  // Supabase — your Firebase migration narrative is their pitch
  {
    name: "Paul Copplestone",
    handle: "kiwicopple",
    github: "kiwicopple",
    companyRepo: "supabase/supabase",
    company: "Supabase",
    companyUrl: "https://supabase.com",
    product:
      "Supabase — OSS Firebase alternative. Your Firebase ($1.4M/yr SU app) → Supabase migration narrative is the exact story Paul amplifies.",
    tier: "direct",
  },

  // Modal — where rag-bench will run
  {
    name: "Erik Bernhardsson",
    handle: "bernhardsson",
    github: "erikbern",
    companyRepo: "modal-labs/modal-client",
    company: "Modal",
    companyUrl: "https://modal.com",
    product:
      "Modal serverless GPU. When rag-bench ships, Modal hosts it. Author of Annoy. Writes one of the most-followed eng blogs in SF.",
    tier: "direct",
  },

  // Indian AI labs — Sarvam, Julep
  {
    name: "Vivek Raghavan",
    handle: "vivraghavan",
    company: "Sarvam AI",
    companyUrl: "https://www.sarvam.ai",
    product:
      "Co-founder of Sarvam — India's sovereign LLM lab. 30B/105B open-source models. Exact ML target for your Llama-3 fine-tune + Indic-RAG narrative.",
    tier: "direct",
  },
  {
    name: "Diwank Tomer",
    handle: "diwank",
    github: "creatorrr",
    companyRepo: "julep-ai/julep",
    company: "Julep AI",
    companyUrl: "https://julep.ai",
    product:
      "Co-founder/CTO of Julep — stateful AI agents platform. YC, Indian-founded, hires remote India.",
    tier: "direct",
  },

  // ─────────────────────────────────────────────────────────────
  // AMPLIFIER — won't hire you, but RT-amplifies into SF feeds
  // ─────────────────────────────────────────────────────────────

  {
    name: "Aaron Levie",
    handle: "levie",
    company: "Box",
    companyUrl: "https://www.box.com",
    product:
      "Box CEO. Tier-3 amplifier — constantly retweets YC seed-stage launches. If your Show HN goes well, he's a 2-hop amplifier into mainstream eng Twitter.",
    tier: "amplifier",
  },
  {
    name: "Theo Browne",
    handle: "theo",
    github: "t3dotgg",
    companyRepo: "t3-oss/create-t3-app",
    company: "T3 Stack / Ping Labs",
    companyUrl: "https://t3.gg",
    product:
      "Opinionated TypeScript/React contrarian. Replies to dev-debate takes. Good for tech-debate engagement when you have benchmark numbers.",
    tier: "amplifier",
  },

  // ─────────────────────────────────────────────────────────────
  // BRIDGE — Indian/AI-eng Twitter that crosses over to SF founders
  // ─────────────────────────────────────────────────────────────

  {
    name: "Hamel Husain",
    handle: "HamelHusain",
    github: "hamelsmu",
    company: "Independent (LLM evals consultancy)",
    companyUrl: "https://hamel.dev",
    product:
      "Former Airbnb eng, now LLM-evals consultant. His blog shapes how YC AI cos think about evals. Replying to him with substance gets you on his radar.",
    tier: "bridge",
  },
  {
    name: "Eugene Yan",
    handle: "eugeneyan",
    github: "eugeneyan",
    company: "Independent (ML engineering essays)",
    companyUrl: "https://eugeneyan.com",
    product:
      "Long-form essays on ML system design + RAG eval. Heavily-read in SF AI eng. Bridge into Anthropic/OpenAI eng-research crowd.",
    tier: "bridge",
  },
];

export const directFounders = founders.filter((f) => f.tier === "direct");
