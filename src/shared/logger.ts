// Structured logger. Plain-text by default, JSON when LOG_FORMAT=json.

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
} as const;

type Level = "info" | "warn" | "error" | "success" | "debug";

const LEVEL_COLOR: Record<Level, keyof typeof COLORS> = {
  info: "cyan",
  warn: "yellow",
  error: "red",
  success: "green",
  debug: "dim",
};

const useJson = process.env["LOG_FORMAT"] === "json";
const debugOn = process.env["LOG_LEVEL"] === "debug";

function emit(level: Level, label: string, msg: string, data?: unknown) {
  if (level === "debug" && !debugOn) return;
  const ts = new Date().toISOString();
  if (useJson) {
    console.log(JSON.stringify({ ts, level, label, msg, data: data ?? null }));
    return;
  }
  const color = COLORS[LEVEL_COLOR[level]];
  const tag = `${color}${label.padEnd(8)}${COLORS.reset}`;
  const time = `${COLORS.dim}${ts.slice(11, 19)}${COLORS.reset}`;
  console.log(`${time} ${tag} ${msg}${data ? " " + JSON.stringify(data) : ""}`);
}

export function makeLogger(label: string) {
  return {
    info: (msg: string, data?: unknown) => emit("info", label, msg, data),
    warn: (msg: string, data?: unknown) => emit("warn", label, msg, data),
    error: (msg: string, data?: unknown) => emit("error", label, msg, data),
    success: (msg: string, data?: unknown) => emit("success", label, msg, data),
    debug: (msg: string, data?: unknown) => emit("debug", label, msg, data),
  };
}

export const loggers = {
  scan: makeLogger("scan"),
  score: makeLogger("score"),
  feed: makeLogger("feed"),
  now: makeLogger("now"),
  scraper: makeLogger("scraper"),
};
