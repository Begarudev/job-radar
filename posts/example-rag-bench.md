---
title: "Building rag-bench: a public benchmark for hybrid retrieval"
slug: "rag-bench-launch"
date: "2026-05-12"
excerpt: "How I measured BM25, ColBERT-v2, and RRF fusion across three real-world corpora — with reproducible Modal scripts."
tags: ["rag", "colbert", "bm25", "evaluation"]
subtitle: "Hybrid retrieval, measured."
---

## Why this exists

Most public RAG benchmarks test embedding models in isolation. In production, the actual question is: which combination of retriever + reranker + fusion strategy wins on _my_ corpus?

I needed an answer for bitsGPT, so I built one.

## Setup

Three corpora:
- **CUAD** — legal contracts (510 docs, 13K Q/A)
- **PubMedQA** — biomedical abstracts (10K Q/A)
- **FinanceBench** — financial filings (10K queries)

Ten configurations, holding everything else fixed:
- BM25 only
- ColBERT-v2 only
- Hybrid α=0.3 / 0.5 / 0.7 (cosine on dense, BM25 score normalized)
- RRF fusion (k=60)
- RRF + Cohere rerank
- HyDE + dense
- Query rewriting + hybrid
- Multi-query + RRF

## Results

(table goes here when I'm done — preview numbers in the repo)

RRF + Cohere rerank wins on CUAD by 14% MRR at 1.3x latency vs dense-only. On FinanceBench the gap shrinks — BM25 carries it.

## Reproduce

```bash
git clone https://github.com/begarudev/rag-bench
modal run bench.py --corpus cuad --config rrf-rerank
```

All numbers come out of `make bench-all` in under 30 min on Modal.
