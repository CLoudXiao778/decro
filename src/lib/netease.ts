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
  artistId: string;
  artists: { id: string; name: string }[];
  album: string;
  albumId: string;
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
  subscribed: boolean;
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
  error?: string;
};

type SearchDto = {
  songs: TrackDto[];
  playlists: PlaylistDto[];
  artists: ArtistDto[];
  albums: AlbumDto[];
  lyrics: { track: TrackDto; lines: string[] }[];
};

export type SearchKind = "song" | "playlist" | "artist" | "album" | "lyric";
export type SearchBundle = {
  songs: Track[];
  playlists: Playlist[];
  artists: ArtistInfo[];
  albums: AlbumInfo[];
  lyrics: { track: Track; lines: string[] }[];
};

type LyricDto = {
  lines: LyricLine[];
};

type ArtistDto = {
  id: string;
  name: string;
  avatarUrl: string;
  briefDesc: string;
  aliases: string[];
  albumCount: number;
  songCount: number;
};

type AlbumDto = {
  id: string;
  name: string;
  coverUrl: string;
  publishTime: number;
  size: number;
  company: string;
  kind: string;
  artist: string;
  artistId: string;
};

type ArtistPageDto = {
  artist: ArtistDto;
  songs: TrackDto[];
  albums: AlbumDto[];
  albumError?: string;
};

type AlbumPageDto = {
  album: AlbumDto;
  description: string;
  artists: { id: string; name: string }[];
  songs: TrackDto[];
};

export type ArtistInfo = ArtistDto;
export type AlbumInfo = AlbumDto;
export type ArtistRef = { id: string; name: string };
export type ArtistPageData = {
  artist: ArtistInfo;
  songs: Track[];
  albums: AlbumInfo[];
  albumError?: string;
};
export type AlbumPageData = {
  album: AlbumInfo;
  description: string;
  artists: ArtistRef[];
  songs: Track[];
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
  error?: string;
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
    artistId: dto.artistId || undefined,
    artists: dto.artists ?? [],
    album: dto.album || "未知专辑",
    albumId: dto.albumId || undefined,
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
    subscribed: dto.subscribed,
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
    error: data.error,
  };
}

export async function createPlaylist(name: string): Promise<string> {
  if (!isTauri()) return `preview-${Date.now()}`;
  return invoke("create_playlist", { name });
}

export async function subscribePlaylist(id: string, subscribe: boolean): Promise<void> {
  if (!isTauri()) return;
  await invoke("subscribe_playlist", { id, subscribe });
}

export async function getPlaylistDetail(id: string): Promise<Playlist> {
  if (!isTauri()) {
    const playlist = mockPlaylists.find((item) => item.id === id) ?? mockPlaylists[0];
    return { ...playlist, tracks: mockTracks };
  }
  const data: PlaylistDto = await invoke("playlist_detail", { id });
  return toPlaylist(data);
}

export async function getArtistPage(id: string): Promise<ArtistPageData> {
  if (!isTauri()) {
    const name = mockTracks[0]?.artist ?? "未知歌手";
    return {
      artist: {
        id,
        name,
        avatarUrl: "",
        briefDesc: "浏览器预览：安装 Windows 客户端后会加载歌手简介、热门歌曲和专辑。",
        aliases: [],
        albumCount: 0,
        songCount: mockTracks.length,
      },
      songs: mockTracks,
      albums: [],
    };
  }
  const data: ArtistPageDto = await invoke("artist_page", { id });
  return {
    artist: data.artist,
    songs: data.songs.map(toTrack),
    albums: data.albums,
    albumError: data.albumError,
  };
}

export async function getAlbumPage(id: string): Promise<AlbumPageData> {
  if (!isTauri()) {
    const track = mockTracks[0];
    return {
      album: {
        id,
        name: track?.album ?? "未知专辑",
        coverUrl: track?.coverUrl ?? "",
        publishTime: 0,
        size: mockTracks.length,
        company: "",
        kind: "专辑",
        artist: track?.artist ?? "未知歌手",
        artistId: track?.artistId ?? "",
      },
      description: "浏览器预览：安装 Windows 客户端后会加载专辑曲目。",
      artists: track ? [{ id: track.artistId ?? "", name: track.artist }] : [],
      songs: mockTracks,
    };
  }
  const data: AlbumPageDto = await invoke("album_page", { id });
  return {
    album: data.album,
    description: data.description,
    artists: data.artists,
    songs: data.songs.map(toTrack),
  };
}

export async function searchByKind(keyword: string, kind: SearchKind): Promise<SearchBundle> {
  const query = keyword.trim();
  if (!query) {
    return { songs: [], playlists: [], artists: [], albums: [], lyrics: [] };
  }
  if (!isTauri()) {
    const lower = query.toLowerCase();
    const tracks = mockTracks.filter((track) =>
      `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(lower),
    );
    const artists = [
      ...new Map(
        mockTracks.map((track) => [
          track.artist,
          {
            id: track.artistId ?? `preview-artist-${track.artist}`,
            name: track.artist,
            avatarUrl: "",
            briefDesc: "浏览器预览：安装 Windows 客户端后会加载歌手资料。",
            aliases: [],
            albumCount: new Set(mockTracks.map((item) => item.album)).size,
            songCount: mockTracks.filter((item) => item.artist === track.artist).length,
          },
        ]),
      ).values(),
    ].filter((artist) => artist.name.toLowerCase().includes(lower));
    const albums = [
      ...new Map(
        mockTracks.map((track) => [
          track.album,
          {
            id: track.albumId ?? `preview-album-${track.album}`,
            name: track.album,
            coverUrl: track.coverUrl ?? "",
            publishTime: 0,
            size: mockTracks.filter((item) => item.album === track.album).length,
            company: "",
            kind: "专辑",
            artist: track.artist,
            artistId: track.artistId ?? "",
          },
        ]),
      ).values(),
    ].filter((album) => `${album.name} ${album.artist}`.toLowerCase().includes(lower));
    return {
      songs: kind === "song" ? tracks : [],
      playlists:
        kind === "playlist"
          ? mockPlaylists.filter((playlist) =>
              `${playlist.title} ${playlist.subtitle}`.toLowerCase().includes(lower),
            )
          : [],
      artists: kind === "artist" ? artists : [],
      albums: kind === "album" ? albums : [],
      lyrics:
        kind === "lyric"
          ? tracks.map((track) => ({
              track,
              lines: track.lyrics
                .map((line) => line.text)
                .filter((text) => text.toLowerCase().includes(lower))
                .slice(0, 3),
            }))
          : [],
    };
  }
  const data: SearchDto = await invoke("search_kind", { kind, keyword: query });
  return {
    songs: data.songs.map(toTrack),
    playlists: data.playlists.map(toPlaylist),
    artists: data.artists,
    albums: data.albums,
    lyrics: data.lyrics.map((item) => ({ track: toTrack(item.track), lines: item.lines })),
  };
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

export async function reportPlayStart(id: string, sourceId = "0"): Promise<void> {
  if (!isTauri()) return;
  await invoke("report_play_start", { id, sourceId });
}

export async function getPlaybackConfig(): Promise<PlaybackConfig> {
  return invoke<PlaybackConfig>("playback_config");
}

export function streamLevel(quality?: string): string {
  if (quality === "Hi-Res") return "hires";
  if (quality === "SQ") return "lossless";
  if (quality === "HQ") return "higher";
  return "standard";
}

export function streamUrl(config: PlaybackConfig, id: string, level?: string): string {
  const query = new URLSearchParams({ token: config.token });
  if (level) query.set("level", level);
  return `${config.base}/stream/${encodeURIComponent(id)}?${query.toString()}`;
}

export function isRealTrack(track: Track): boolean {
  return /^\d+$/.test(track.id);
}

export function isRealPlaylist(playlist: Playlist): boolean {
  return /^\d+$/.test(playlist.id);
}
