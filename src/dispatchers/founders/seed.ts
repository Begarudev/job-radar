// Curated Tier-2 list from research_devrole_discovery_visibility/findings_x_twitter.md.
// Email patterns are best-effort. Always verify with Hunter / company "team" page
// before pressing send.

export type Founder = {
  name: string;
  handle?: string; // X handle, no @
  github?: string; // GitHub user, no @
  companyRepo?: string; // org/repo to watch for activity
  company: string;
  companyUrl: string;
  yc?: string; // batch e.g. "W25"
  email?: string;
  product: string; // one-line, for prompt context
};

export const founders: Founder[] = [
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
  },
  {
    name: "Gregor Žunič",
    handle: "gregpr07",
    github: "gregpr07",
    companyRepo: "browser-use/browser-use",
    company: "Browser Use",
    companyUrl: "https://browser-use.com",
    yc: "W25",
    product: "Co-founder of Browser Use. Same product as above.",
  },
  {
    name: "Soham Ganatra",
    handle: "SohamGanatra",
    github: "sohamganatra",
    companyRepo: "ComposioHQ/composio",
    company: "Composio",
    companyUrl: "https://composio.dev",
    product:
      "Tool-calling and integration infra for AI agents (MCP, Vercel AI SDK adapters). $29M raised.",
  },
  {
    name: "Karan Vaidya",
    handle: "karanvaidya6",
    github: "karanvaidya6",
    companyRepo: "ComposioHQ/composio",
    company: "Composio",
    companyUrl: "https://composio.dev",
    product: "Co-founder of Composio. Same product as above.",
  },
  {
    name: "Abhilash Chowdhary",
    handle: "TheChowdhary",
    company: "Crustdata",
    companyUrl: "https://crustdata.com",
    yc: "F24",
    product:
      "B2B data + search infra used by AI agents. BM25 + dense retrieval ranking pipelines.",
  },
  {
    name: "Jason Liu",
    handle: "jxnlco",
    github: "jxnl",
    companyRepo: "567-labs/instructor",
    company: "instructor (OSS) + consultancy",
    companyUrl: "https://jxnl.co",
    product:
      "Author of the `instructor` library for structured LLM outputs + RAG / eval consultancy.",
  },
  {
    name: "Harrison Chase",
    handle: "hwchase17",
    github: "hwchase17",
    companyRepo: "langchain-ai/langchain",
    company: "LangChain",
    companyUrl: "https://www.langchain.com",
    product: "LangChain / LangSmith / LangGraph. Agent + observability stack.",
  },
  {
    name: "Amjad Masad",
    handle: "amasad",
    github: "amasad",
    company: "Replit",
    companyUrl: "https://replit.com",
    product: "Replit Agent + cloud dev environment.",
  },
];
