# job-radar

Self-running radar for YC-tier AI / dev-tool internships, plus a
cross-posting + outreach toolkit. Bun + TypeScript + GitHub Actions.
Runs entirely on free tiers.

## What it does

**Inbound (passive — runs on cron):**
- Scrapes Hacker News "Who is hiring?" (Algolia search-by-date), RemoteOK,
  and `speedyapply/2026-AI-College-Jobs` `INTERN_INTL.md` every 4 hours.
- Dedupes, then scores each posting 0-10 against the profile in
  `src/config/profile.ts` (word-boundary keyword match, hard-excludes
  for senior/onsite-only roles).
- Writes `data/feed.json` (postings ≥ 6.0, capped 100) and `data/now.json`
  (last 20 GitHub events + a hand-curated "currently" list).
- Optional: pushes ≥ 8.0 hits to a Telegram chat.

**Outbound (active — CLIs you invoke):**
- `bun run post ./posts/foo.md` — commits MDX to the portfolio repo via
  GitHub Contents API (Vercel auto-rebuilds), drafts a dev.to post, drafts
  a Hashnode post, emits a tweet draft + LinkedIn carousel skeleton.
- `bun run founders:draft browser-use --artifact ./posts/foo.md` — drafts
  a Soham-pattern cold email per founder using the Anthropic API
  (`claude-sonnet-4-5`), falls back to a deterministic template if no key.
- `bun run engagement` — twice-daily Telegram nudge with the latest tweets
  from your Tier-2 founder list, fetched via Nitter RSS. Cron triggers
  this at 7:30pm + 8:30am IST.

## Quickstart

```bash
bun install
bun run scan          # one-shot scrape + score
bun run now           # one-shot GitHub-activity snapshot
bun run post ./posts/example.md --dry-run
bun run founders:draft browser-use
bun run engagement    # prints to stdout if Telegram unset
```

Outputs land in `data/feed.json`, `data/now.json`, `data/drafts/`,
`data/dm-drafts/`.

## Consume from a frontend

Portfolio site reads the two JSON feeds directly:

- `https://raw.githubusercontent.com/begarudev/job-radar/main/data/feed.json`
- `https://raw.githubusercontent.com/begarudev/job-radar/main/data/now.json`

## Configure

### `src/config/profile.ts`
Scoring profile — skills (must / strong / bonus), role titles, salary
floor, exclude patterns. Edit when your stack changes.

### `src/dispatchers/founders/seed.ts`
Tier-2 founder list — name, X handle, company, product blurb. Used by
`founders:draft` and `engagement`. Sourced from
`research_devrole_discovery_visibility/findings_x_twitter.md`.

### Env vars (`.env` locally, GitHub Actions Secrets in CI)

| Variable | Required for | Notes |
|---|---|---|
| `GITHUB_TOKEN` | `bun run now`, `bun run post` | Local PAT with `public_repo`. In Actions the built-in `${{ secrets.GITHUB_TOKEN }}` covers `now.yml`. |
| `ANTHROPIC_API_KEY` | `bun run founders:draft` (Claude path) | Optional — falls back to template if unset. |
| `DEV_TO_API_KEY` | `bun run post` cross-post | Optional. Draft if unset. |
| `HASHNODE_TOKEN` + `HASHNODE_PUBLICATION_ID` | `bun run post` cross-post | Optional. |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | `bun run engagement`, scan-level pushes | Optional. |
| `NITTER_BASE` (Actions `vars`) | `bun run engagement` | Pin to a live Nitter mirror — defaults to `nitter.privacydev.net`. |
| `PORTFOLIO_OWNER` / `PORTFOLIO_REPO` / `PORTFOLIO_BLOG_DIR` / `PORTFOLIO_BRANCH` | `bun run post` | Defaults match Begarudev/portfolio. |

## Workflows

| File | Schedule | What |
|---|---|---|
| `scan.yml` | every 4 h | scrape → score → commit `data/feed.json` |
| `now.yml` | daily 06:00 UTC | GitHub events → commit `data/now.json` |
| `engagement.yml` | 03:00 + 14:00 UTC (~8:30am + 7:30pm IST) | Telegram nudge with Tier-2 tweet links |

All commit-back workflows share `concurrency: data-write` so they can't
race on push, with a `pull-rebase` retry loop as defence in depth.

## Author

[garudev.codes](https://garudev.codes) — the automation layer for a
recursive job-discovery + visibility loop. Fork it. Edit `profile.ts`.
Get your own radar.

## License

MIT.
