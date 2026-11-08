import { invoke } from "@tauri-apps/api/core";
import type { LyricLine, Playlist, Track } from "../data/mock";
import { playlists as mockPlaylists, tracks as mockTracks } from "../data/mock";
import { formatTime } from "./format";
import { isTauri } from "./auth";

export type Account = {
  userId: string;
  nickname: string;
  avatarUrl: string;
};

type TrackDto = {
  id: string;
  name: string;
  artist: string;
  album: string;
  durationMs: number;
  coverUrl: string;
  fee: number;
  quality: string;
};

type PlaylistDto = {
  id: string;
  name: string;
  coverUrl: string;
  trackCount: number;
  playCount: number;
  description: string;
  creator: string;
  specialType: number;
  updateTime: number;
  tracks: TrackDto[];
};

type HomeFeedDto = {
  recommended: PlaylistDto[];
  newSongs: TrackDto[];
  daily: TrackDto[];
  recent: TrackDto[];
  userPlaylists: PlaylistDto[];
};

type LibraryDto = {
  playlists: PlaylistDto[];
  recent: TrackDto[];
  liked: PlaylistDto | null;
};

type SearchDto = {
  songs: TrackDto[];
  playlists: PlaylistDto[];
};

type LyricDto = {
  lines: LyricLine[];
};

export type HomeBundle = {
  recommended: Playlist[];
  newSongs: Track[];
  daily: Track[];
  recent: Track[];
  userPlaylists: Playlist[];
};

export type LibraryBundle = {
  playlists: Playlist[];
  recent: Track[];
  liked: Playlist | null;
};

export type PlaybackConfig = {
  base: string;
  token: string;
};

const palettes: [string, string, string, string][] = [
  ["#7a1f2b", "#ff5f4d", "#f0b15c", "#2a1020"],
  ["#4a1f45", "#8c3b64", "#e0a1a8", "#1c101d"],
  ["#12304f", "#2b7a9c", "#9bd3ce", "#101b2a"],
  ["#2a1840", "#6c3d91", "#c1738a", "#150f22"],
  ["#3b3b1f", "#7d7a3a", "#d6b06d", "#19180e"],
  ["#2a2626", "#7c4b43", "#c79b7b", "#181313"],
  ["#6d5c2f", "#b68a4a", "#e0c786", "#241d12"],
  ["#143249", "#2e6d84", "#b5d5d1", "#0b1923"],
  ["#4a1f45", "#8c3b64", "#e0a1a8", "#1c101d"],
  ["#2c3036", "#5e6870", "#a9b4b8", "#14171a"],
];

function hash(value: string): number {
  let result = 0;
  for (let i = 0; i < value.length; i++) {
    result = (result * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(result);
}

export function paletteFor(id: string): [string, string, string, string] {
  return palettes[hash(id) % palettes.length];
}

export function toTrack(dto: TrackDto): Track {
  const seconds = Math.max(0, Math.round(dto.durationMs / 1000));
  return {
    id: dto.id,
    title: dto.name || "未知歌曲",
    artist: dto.artist || "未知艺人",
    album: dto.album || "未知专辑",
    duration: formatTime(seconds),
    durationSec: seconds,
    palette: paletteFor(dto.id),
    lyrics: [],
    coverUrl: dto.coverUrl,
    coverSeed: hash(dto.id) % 10,
    fee: dto.fee,
    quality: (dto.quality as Track["quality"]) ?? "标准",
    vip: dto.fee !== 0,
  };
}

export function toPlaylist(dto: PlaylistDto): Playlist {
  const tracks = dto.tracks.map(toTrack);
  const palette = paletteFor(dto.id);
  return {
    id: dto.id,
    title: dto.name || "未命名歌单",
    subtitle: `${dto.creator || "网易云音乐"} · ${dto.trackCount} 首`,
    count: String(dto.trackCount),
    palette,
    coverUrl: dto.coverUrl,
    coverSeed: hash(dto.id) % 10,
    kind: "playlist",
    description: dto.description,
    creator: dto.creator,
    playCount: dto.playCount,
    updateTime: dto.updateTime,
    specialType: dto.specialType,
    trackCount: dto.trackCount,
    tracks,
  };
}

export function playlistFromTracks(
  id: string,
  title: string,
  subtitle: string,
  tracks: Track[],
  kind: Playlist["kind"] = "playlist",
): Playlist {
  return {
    id,
    title,
    subtitle,
    count: String(tracks.length),
    palette: tracks[0]?.palette ?? palettes[0],
    coverUrl: tracks[0]?.coverUrl,
    coverSeed: tracks[0]?.coverSeed ?? 0,
    kind,
    description: subtitle,
    trackCount: tracks.length,
    tracks,
  };
}

function previewHome(): HomeBundle {
  const recommended = mockPlaylists.map((playlist, index) => ({
    ...playlist,
    coverUrl: undefined,
    tracks: mockTracks.slice(index, index + 6),
  }));
  return {
    recommended,
    newSongs: mockTracks.slice(4),
    daily: mockTracks.slice(0, 7),
    recent: mockTracks.slice(0, 7),
    userPlaylists: mockPlaylists.slice(0, 6).map((playlist) => ({
      ...playlist,
      tracks: mockTracks,
    })),
  };
}

function previewLibrary(): LibraryBundle {
  const liked = playlistFromTracks(
    "liked",
    "我喜欢的音乐",
    "本地预览 · 喜欢歌曲",
    mockTracks.filter((track) => track.liked),
  );
  return {
    playlists: mockPlaylists.map((playlist) => ({ ...playlist, tracks: mockTracks })),
    recent: mockTracks.slice(0, 7),
    liked,
  };
}

export async function getHomeFeed(): Promise<HomeBundle> {
  if (!isTauri()) return previewHome();
  const data: HomeFeedDto = await invoke("home_feed");
  return {
    recommended: data.recommended.map(toPlaylist),
    newSongs: data.newSongs.map(toTrack),
    daily: data.daily.map(toTrack),
    recent: data.recent.map(toTrack),
    userPlaylists: data.userPlaylists.map(toPlaylist),
  };
}

export async function getLibraryData(): Promise<LibraryBundle> {
  if (!isTauri()) return previewLibrary();
  const data: LibraryDto = await invoke("library_data");
  return {
    playlists: data.playlists.map(toPlaylist),
    recent: data.recent.map(toTrack),
    liked: data.liked ? toPlaylist(data.liked) : null,
  };
}

export async function getPlaylistDetail(id: string): Promise<Playlist> {
  if (!isTauri()) {
    const playlist = mockPlaylists.find((item) => item.id === id) ?? mockPlaylists[0];
    return { ...playlist, tracks: mockTracks };
  }
  const data: PlaylistDto = await invoke("playlist_detail", { id });
  return toPlaylist(data);
}

export async function searchMusic(keyword: string): Promise<{ songs: Track[]; playlists: Playlist[] }> {
  if (!isTauri()) {
    const query = keyword.trim().toLowerCase();
    return {
      songs: mockTracks
        .filter((track) => `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(query))
        .slice(0, 12),
      playlists: mockPlaylists
        .filter((playlist) => `${playlist.title} ${playlist.subtitle}`.toLowerCase().includes(query))
        .slice(0, 6),
    };
  }
  const data: SearchDto = await invoke("search_music", { keyword });
  return {
    songs: data.songs.map(toTrack),
    playlists: data.playlists.map(toPlaylist),
  };
}

export async function getLyric(id: string): Promise<LyricLine[]> {
  if (!isTauri()) {
    return mockTracks.find((track) => track.id === id)?.lyrics ?? [];
  }
  const data: LyricDto = await invoke("lyric", { id });
  return data.lines;
}

export async function likeSong(id: string, like: boolean): Promise<boolean> {
  if (!isTauri()) return like;
  const result = await invoke<{ liked: boolean }>("like_song", { id, like });
  return result.liked;
}

export async function getPlaybackConfig(): Promise<PlaybackConfig> {
  return invoke<PlaybackConfig>("playback_config");
}

export function streamUrl(config: PlaybackConfig, id: string): string {
  return `${config.base}/stream/${encodeURIComponent(id)}?token=${encodeURIComponent(config.token)}`;
}

export function isRealTrack(track: Track): boolean {
  return /^\d+$/.test(track.id);
}

export function isRealPlaylist(playlist: Playlist): boolean {
  return /^\d+$/.test(playlist.id);
}
