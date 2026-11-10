import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./auth";

export type LogLevel = "debug" | "info" | "warn" | "error" | "none";

export const LOG_LEVELS: { value: LogLevel; label: string }[] = [
  { value: "debug", label: "Debug" },
  { value: "info", label: "Info" },
  { value: "warn", label: "Warn" },
  { value: "error", label: "Error" },
  { value: "none", label: "None" },
];

export function isLogLevel(value: string): value is LogLevel {
  return LOG_LEVELS.some((level) => level.value === value);
}

let currentLevel: LogLevel = "info";

function rank(level: LogLevel): number {
  return { debug: 0, info: 1, warn: 2, error: 3, none: 4 }[level];
}

function enabled(level: LogLevel): boolean {
  return currentLevel !== "none" && rank(level) >= rank(currentLevel);
}

function stringify(data: Record<string, unknown>): string {
  try {
    return ` ${JSON.stringify(data)}`;
  } catch {
    return "";
  }
}

function logAt(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (!enabled(level)) return;
  const text = `${message}${data ? stringify(data) : ""}`;
  console.debug(`[decro][${level}] ${text}`);
  if (isTauri()) {
    void invoke("debug_log", {
      level,
      target: "frontend",
      message: text,
    }).catch(() => undefined);
  }
}

/** Debug channel: console + the rotating app log file. Never pass cookies,
 * tokens, or signed stream URLs here. */
export function debugLog(message: string, data?: Record<string, unknown>): void {
  logAt("debug", message, data);
}

/** Non-fatal failures: network errors, failed optional actions, etc. */
export function warnLog(message: string, data?: Record<string, unknown>): void {
  logAt("warn", message, data);
}

/** Fatal frontend failures only. */
export function errorLog(message: string, data?: Record<string, unknown>): void {
  logAt("error", message, data);
}

export async function setLogLevel(level: LogLevel): Promise<void> {
  currentLevel = level;
  if (!isTauri()) return;
  await invoke("set_log_level", { level });
}

export async function openLogFolder(): Promise<void> {
  if (!isTauri()) return;
  await invoke("open_log_folder");
}
