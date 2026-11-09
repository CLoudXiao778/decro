import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./auth";

function stringify(data: Record<string, unknown>): string {
  try {
    return ` ${JSON.stringify(data)}`;
  } catch {
    return "";
  }
}

/** Debug channel: console + the rotating app log file. Never pass cookies,
 * tokens, or signed stream URLs here. */
export function debugLog(message: string, data?: Record<string, unknown>): void {
  const text = `${message}${data ? stringify(data) : ""}`;
  console.debug(`[decro] ${text}`);
  if (isTauri()) {
    void invoke("debug_log", {
      level: "debug",
      target: "frontend",
      message: text,
    }).catch(() => undefined);
  }
}

export async function openLogFolder(): Promise<void> {
  if (!isTauri()) return;
  await invoke("open_log_folder");
}
