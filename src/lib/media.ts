import { isTauri } from "./auth";
import { debugLog } from "./log";

export type MediaControlAction = "play" | "pause" | "next" | "previous" | "stop";

export type MediaSessionUpdate = {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string | null;
  durationMs: number;
  positionMs: number;
  playing: boolean;
};

/**
 * WebView2 bridges navigator.mediaSession to Windows SMTC. This is the same
 * session that drives the Windows 10 media flyout and hardware media keys;
 * creating a second native SMTC session would duplicate the entry and fire
 * every key twice.
 */
function mediaSessionAvailable(): boolean {
  return (
    isTauri() &&
    typeof navigator !== "undefined" &&
    "mediaSession" in navigator &&
    typeof MediaMetadata !== "undefined"
  );
}

let lastMetadataId = "";

export function updateMediaSession(update: MediaSessionUpdate): void {
  if (!mediaSessionAvailable()) return;
  try {
    if (lastMetadataId !== update.id) {
      lastMetadataId = update.id;
      navigator.mediaSession.metadata = new MediaMetadata({
        title: update.title,
        artist: update.artist,
        album: update.album,
        artwork: update.coverUrl ? [{ src: update.coverUrl }] : [],
      });
    }

    navigator.mediaSession.playbackState = update.playing ? "playing" : "paused";

    if (update.durationMs > 0) {
      const duration = update.durationMs / 1000;
      const position = Math.min(duration, Math.max(0, update.positionMs / 1000));
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position,
      });
    }
  } catch (error) {
    debugLog("media session update failed", { error: String(error) });
  }
}

export function clearMediaSession(): void {
  lastMetadataId = "";
  if (!mediaSessionAvailable()) return;
  try {
    navigator.mediaSession.metadata = null;
    navigator.mediaSession.playbackState = "none";
  } catch {
    /* ignore */
  }
}

const ACTION_HANDLERS: {
  action: MediaSessionAction;
  control: MediaControlAction;
}[] = [
  { action: "play", control: "play" },
  { action: "pause", control: "pause" },
  { action: "nexttrack", control: "next" },
  { action: "previoustrack", control: "previous" },
  { action: "stop", control: "stop" },
];

/**
 * Hardware media keys and the Windows media flyout dispatch MediaSession
 * actions to this document. WebView2 keeps the session alive while audio is
 * playing, even when the app window is in the background.
 */
export async function listenMediaControls(
  handler: (action: MediaControlAction) => void,
): Promise<() => void> {
  if (!("mediaSession" in navigator)) return () => undefined;

  for (const { action, control } of ACTION_HANDLERS) {
    try {
      navigator.mediaSession.setActionHandler(action, () => handler(control));
    } catch {
      debugLog("media session action unsupported", { action });
    }
  }

  return () => {
    for (const { action } of ACTION_HANDLERS) {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch {
        /* ignore */
      }
    }
  };
}
