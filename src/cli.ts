import { runAllScrapers } from "./scrapers/index.ts";
import { dedupe } from "./enrichers/dedupe.ts";
import { scoreAll } from "./enrichers/score.ts";
import { writeFeed } from "./publishers/feed.ts";
import { writeNow } from "./publishers/now.ts";
import { pushToTelegram } from "./publishers/telegram.ts";
import { loggers } from "./shared/logger.ts";

async function cmdScan() {
  const start = Date.now();
  const raw = await runAllScrapers();
  const unique = dedupe(raw);
  loggers.scan.info(`${unique.length} after dedupe`);
  const scored = scoreAll(unique);
  await writeFeed(scored);
  await pushToTelegram(scored);
  loggers.scan.success(`done in ${((Date.now() - start) / 1000).toFixed(1)}s`);
}

async function cmdNow() {
  await writeNow();
}

const cmd = Bun.argv[2] ?? "scan";

switch (cmd) {
  case "scan":
    await cmdScan();
    break;
  case "now":
    await cmdNow();
    break;
  case "all":
    await cmdScan();
    await cmdNow();
    break;
  default:
    loggers.scan.error(`unknown command: ${cmd}`);
    process.exit(1);
}
