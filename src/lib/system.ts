import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./auth";

export async function openSoundSettings(): Promise<void> {
  if (!isTauri()) {
    throw "浏览器预览无法打开系统声音设置";
  }
  await invoke("open_sound_settings");
}

export async function openSongPage(id: string): Promise<void> {
  if (!isTauri()) {
    window.open(`https://music.163.com/#/song?id=${encodeURIComponent(id)}`, "_blank");
    return;
  }
  await invoke("open_song_page", { id });
}
