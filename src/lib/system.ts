import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./auth";

export async function openPlaylistPage(id: string): Promise<void> {
  if (!isTauri()) {
    window.open(`https://music.163.com/#/playlist?id=${encodeURIComponent(id)}`, "_blank");
    return;
  }
  await invoke("open_playlist_page", { id });
}

export async function openSongPage(id: string): Promise<void> {
  if (!isTauri()) {
    window.open(`https://music.163.com/#/song?id=${encodeURIComponent(id)}`, "_blank");
    return;
  }
  await invoke("open_song_page", { id });
}
