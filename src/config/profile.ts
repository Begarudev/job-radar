// Scoring inputs. Edit when your stack or targets change.

export const profile = {
  name: "Ayush Upadhyay",
  handle: "begarudev",
  location: "India (remote-friendly + open to relocation)",
  yearsExperience: 0,
  gradYear: 2028,
  school: "BITS Pilani",

  // Roles we want.
  targetTitles: [
    "intern",
    "software engineer intern",
    "fullstack engineer intern",
    "ai engineer intern",
    "ml engineer intern",
    "founding engineer",
    "forward deployed",
  ],

  // Stack tokens — match against posting body for keyword overlap.
  skills: {
    must: ["typescript", "react", "next", "go", "python", "node"],
    strong: [
      "rag",
      "retrieval-augmented",
      "colbert",
      "bm25",
      "vector",
      "embeddings",
      "llm",
      "agent",
      "fine-tune",
      "fine-tuning",
      "llama",
      "flutter",
      "firebase",
      "postgres",
      "pgvector",
    ],
    bonus: ["mcp", "modal", "vllm", "langchain", "claude", "anthropic", "openai"],
  },

  // Hard filters.
  exclude: {
    seniorityPatterns: [
      /\bsenior\b/i,
      /\bstaff\b/i,
      /\bprincipal\b/i,
      /\blead\b/i,
      /\b10\+\s*years?\b/i,
      /\b15\+\s*years?\b/i,
    ],
    locationPatterns: [/onsite only/i, /no remote/i],
  },

  // Salary band sanity check. USD/month equivalent.
  salary: {
    minPerMonthUsd: 2000, // ≈ ₹1.6L
    targetPerMonthUsd: 5000, // YC seed band
  },
} as const;
