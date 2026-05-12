import { scrapeAllEvents } from "../scrapers/events.ts";
import { writeEvents, pushEventsToTelegram } from "../publishers/events.ts";
import { loggers } from "../shared/logger.ts";

async function main() {
  const start = Date.now();
  const events = await scrapeAllEvents();
  const { newCount, newEvents } = await writeEvents(events);
  await pushEventsToTelegram(newEvents);
  loggers.scan.success(
    `events scan done in ${((Date.now() - start) / 1000).toFixed(1)}s — ${newCount} new`,
  );
}

await main();
