import { createEffect, createMemo, createSignal, Match, on, onCleanup, onMount, Show, Switch } from "solid-js";
import { CommandPalette } from "./components/CommandPalette";
import { FullPlayer } from "./components/FullPlayer";
import { Icon } from "./components/Icon";
import { LoginModal } from "./components/LoginModal";
import { PlayerDock } from "./components/PlayerDock";
import { Sidebar } from "./components/Sidebar";
import { Splash } from "./components/Splash";
import { Titlebar } from "./components/Titlebar";
import type { Playlist, Track } from "./data/mock";
import { tracks as mockTracks } from "./data/mock";
import { getAuthStatus, isTauri, logout as apiLogout, type Account } from "./lib/auth";
import {
  createPlaylist as apiCreatePlaylist,
  getAlbumPage,
  getArtistPage,
  getHomeFeed,
  getLibraryData,
  getLyric,
  getPlaybackConfig,
  getPlaylistDetail,
  isRealTrack,
  likeSong,
  playlistFromTracks,
  reportPlayStart,
  streamLevel,
  streamUrl,
  subscribePlaylist,
  type HomeBundle,
  type LibraryBundle,
  type PlaybackConfig,
} from "./lib/netease";
import {
  isQualityLevel,
  qualityLabel,
  type QualityLevel,
} from "./lib/quality";
import { EntityPage, type EntityEntry } from "./pages/Entity";
import { formatTime } from "./lib/format";
import { debugLog, openLogFolder } from "./lib/log";
import { clearMediaSession, listenMediaControls, updateMediaSession } from "./lib/media";
import { DetailPage } from "./pages/Detail";
import { Explore } from "./pages/Explore";
import { Library } from "./pages/Library";
import { PodcastPage } from "./pages/Podcast";
import { SearchPage } from "./pages/Search";
import { SettingsPage } from "./pages/Settings";

export type Page = "explore" | "search" | "library" | "podcast" | "settings";

function migrateLocalSettings() {
  for (const key of ["theme", "lowPower", "coverAccent", "translation"]) {
    const legacy = localStorage.getItem(`cirro.${key}`);
    if (legacy === null) continue;
    if (localStorage.getItem(`decro.${key}`) === null) {
      localStorage.setItem(`decro.${key}`, legacy);
    }
    localStorage.removeItem(`cirro.${key}`);
  }
}

function storedTheme(): "dark" | "light" {
  const saved = localStorage.getItem("decro.theme");
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function initialLowPower(): boolean {
  const saved = localStorage.getItem("decro.lowPower");
  if (saved === "true" || saved === "false") return saved === "true";
  return (navigator.hardwareConcurrency ?? 8) <= 4;
}

function storedBool(key: string, fallback: boolean): boolean {
  const saved = localStorage.getItem(key);
  if (saved === "true" || saved === "false") return saved === "true";
  return fallback;
}

function initialQuality(): QualityLevel {
  const saved = localStorage.getItem("decro.defaultQuality");
  return saved && isQualityLevel(saved) ? saved : "auto";
}

const LAST_PLAYBACK_KEY = "decro.lastPlayback";

type StoredPlayback = {
  track: Track;
  queue: Track[];
  progress: number;
  sourceId: string;
};

function isStoredTrack(value: unknown): value is Track {
  if (!value || typeof value !== "object") return false;
  const track = value as Track;
  return typeof track.id === "string" && typeof track.title === "string";
}

function readLastPlayback(): StoredPlayback | null {
  try {
    const raw = localStorage.getItem(LAST_PLAYBACK_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<StoredPlayback> | null;
    if (!data || !isStoredTrack(data.track)) return null;
    const queue = Array.isArray(data.queue)
      ? data.queue.filter(isStoredTrack)
      : [];
    const progress =
      typeof data.progress === "number" && Number.isFinite(data.progress)
        ? Math.max(
            0,
            Math.min(
              data.progress,
              data.track.durationSec > 0 ? data.track.durationSec : data.progress,
            ),
          )
        : 0;
    return {
      track: data.track,
      queue,
      progress,
      sourceId: typeof data.sourceId === "string" ? data.sourceId : "0",
    };
  } catch {
    return null;
  }
}

export default function App() {
  migrateLocalSettings();
  const restoredPlayback = readLastPlayback();
  const [page, setPage] = createSignal<Page>("explore");
  const [detail, setDetail] = createSignal<Playlist | null>(null);
  const [detailOrigin, setDetailOrigin] = createSignal<DOMRect | null>(null);
  const [detailOnTop, setDetailOnTop] = createSignal(false);
  const [entityStack, setEntityStack] = createSignal<EntityEntry[]>([]);
  const [detailLoading, setDetailLoading] = createSignal(false);
  const [current, setCurrent] = createSignal<Track>(
    restoredPlayback?.track ?? mockTracks[0],
  );
  const [queue, setQueue] = createSignal<Track[]>(
    restoredPlayback?.queue.length
      ? restoredPlayback.queue
      : isTauri()
        ? restoredPlayback
          ? [restoredPlayback.track]
          : []
        : mockTracks,
  );
  const [playing, setPlaying] = createSignal(!isTauri() && !restoredPlayback);
  const [progress, setProgress] = createSignal(restoredPlayback?.progress ?? 0);
  const [volume, setVolume] = createSignal(0.64);
  const [theme, setTheme] = createSignal<"dark" | "light">(storedTheme());
  const [lowPower, setLowPower] = createSignal<boolean>(initialLowPower());
  const [coverAccent, setCoverAccent] = createSignal(storedBool("decro.coverAccent", true));
  const [showTranslation, setShowTranslation] = createSignal(storedBool("decro.translation", true));
  const [defaultQuality, setDefaultQuality] = createSignal<QualityLevel>(initialQuality());
  const [qualityOverrides, setQualityOverrides] = createSignal<Record<string, QualityLevel>>({});
  const [account, setAccount] = createSignal<Account | null>(null);
  const [loginOpen, setLoginOpen] = createSignal(false);
  const [navCollapsed, setNavCollapsed] = createSignal(true);
  const [playerOpen, setPlayerOpen] = createSignal(false);
  const [paletteOpen, setPaletteOpen] = createSignal(false);
  const [splash, setSplash] = createSignal(!new URLSearchParams(window.location.search).has("nosplash"));
  const [toast, setToast] = createSignal<string | null>(null);
  const [likedIds, setLikedIds] = createSignal(
    new Set(isTauri() ? [] : mockTracks.filter((track) => track.liked).map((track) => track.id)),
  );
  const [home, setHome] = createSignal<HomeBundle | null>(null);
  const [library, setLibrary] = createSignal<LibraryBundle | null>(null);
  const [catalogLoading, setCatalogLoading] = createSignal(false);
  const [catalogError, setCatalogError] = createSignal<string | null>(null);
  const [playback, setPlayback] = createSignal<PlaybackConfig | null>(null);

  let mainScroll!: HTMLDivElement;
  let toastTimer: number | undefined;
  let audio: HTMLAudioElement | null = null;
  let userStarted = !!restoredPlayback;
  let sessionEpoch = 0;
  let catalogRequest = 0;
  let lyricRequest = 0;
  let pendingSeek: number | null = null;
  let pendingRestoreProgress = restoredPlayback?.progress ?? 0;
  let restoredTrackId = restoredPlayback?.track.id ?? "";
  let audioFailed = false;
  let lastReportedPlayId = "";
  let playSourceId = restoredPlayback?.sourceId ?? "0";
  let playRequest = 0;
  let entityKey = 0;
  const entityScrollStack: number[] = [];
  let detailScrollTop: number | null = null;
  let likedLoaded = false;
  const pendingLikes = new Set<string>();

  const isLiked = (track: Track) => likedIds().has(track.id);
  const entity = createMemo(() => entityStack().at(-1) ?? null);
  const canGoBack = createMemo(
    () => detail() !== null || entityStack().length > 0 || detailOnTop(),
  );

  const showToast = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => setToast(null), 2400);
  };

  const currentQuality = () => qualityOverrides()[current().id] ?? defaultQuality();
  const currentLevel = () => {
    const selected = currentQuality();
    return selected === "auto" ? streamLevel(current().quality) : selected;
  };

  const rememberRecent = (track: Track) => {
    const merge = (list: Track[]) =>
      [track, ...list.filter((item) => item.id !== track.id)].slice(0, 60);
    setHome((value) => (value ? { ...value, recent: merge(value.recent) } : value));
    setLibrary((value) => (value ? { ...value, recent: merge(value.recent) } : value));
  };

  const saveLastPlayback = () => {
    if (isTauri() && !isRealTrack(current())) return;
    try {
      const track = current();
      const rest = queue().filter((item) => item.id !== track.id);
      localStorage.setItem(
        LAST_PLAYBACK_KEY,
        JSON.stringify({
          track,
          queue: [track, ...rest].slice(0, 60),
          progress: Math.max(0, progress()),
          sourceId: playSourceId,
        }),
      );
    } catch {
      /* localStorage may be unavailable */
    }
  };

  const reportCurrentPlayStart = () => {
    const track = current();
    if (!isTauri() || !isRealTrack(track) || lastReportedPlayId === track.id) return;
    lastReportedPlayId = track.id;
    void reportPlayStart(track.id, playSourceId)
      .then(() => rememberRecent(track))
      .catch((error) => {
        if (lastReportedPlayId === track.id) lastReportedPlayId = "";
        debugLog("play report failed", {
          id: track.id,
          message: typeof error === "string" ? error : String(error),
        });
      });
  };

  const loadLyrics = async (track: Track) => {
    if (!isTauri() || !isRealTrack(track) || track.lyrics.length > 0) return;
    const request = ++lyricRequest;
    try {
      const lines = await getLyric(track.id);
      if (request !== lyricRequest || current().id !== track.id) return;
      setCurrent((previous) =>
        previous.id === track.id
          ? {
              ...previous,
              lyrics: lines.length > 0 ? lines : [{ time: 0, text: "暂无歌词" }],
            }
          : previous,
      );
    } catch {
      if (request !== lyricRequest || current().id !== track.id) return;
      setCurrent((previous) =>
        previous.id === track.id && previous.lyrics.length === 0
          ? { ...previous, lyrics: [{ time: 0, text: "暂无歌词" }] }
          : previous,
      );
    }
  };

  const applyHome = (data: HomeBundle) => {
    setHome(data);
    if (userStarted) return;
    const start =
      data.recent[0] ??
      data.daily[0] ??
      data.newSongs[0] ??
      data.recommended.flatMap((playlist) => playlist.tracks ?? [])[0];
    if (!start) return;
    const source =
      data.recent.length > 0
        ? data.recent
        : data.daily.length > 0
          ? data.daily
          : data.newSongs;
    setCurrent(start);
    setQueue(source);
    setProgress(0);
    void loadLyrics(start);
  };

  const loadCatalog = async () => {
    const request = ++catalogRequest;
    debugLog("catalog load start", { request, loggedIn: !!account() });
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const data = await getHomeFeed();
      if (request !== catalogRequest) return;
      debugLog("catalog home loaded", {
        recommended: data.recommended.length,
        newSongs: data.newSongs.length,
        daily: data.daily.length,
        recent: data.recent.length,
        userPlaylists: data.userPlaylists.length,
      });
      applyHome(data);

      if (account() || !isTauri()) {
        const lib = await getLibraryData();
        if (request !== catalogRequest) return;
        setLibrary(lib);
        if (!likedLoaded && lib.liked?.tracks) {
          setLikedIds(new Set(lib.liked.tracks.map((track) => track.id)));
          likedLoaded = true;
        }
      }
    } catch (error) {
      if (request !== catalogRequest) return;
      debugLog("catalog load failed", { error: String(error) });
      setCatalogError(typeof error === "string" ? error : "无法连接网易云，请检查网络");
    } finally {
      if (request === catalogRequest) setCatalogLoading(false);
    }
  };

  const restoreScroll = (top: number) => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        mainScroll?.scrollTo({ top, behavior: "instant" as ScrollBehavior }),
      ),
    );
  };

  const back = () => {
    if (detailOnTop() && detail()) {
      setDetail(null);
      setDetailOrigin(null);
      setDetailOnTop(false);
      if (detailScrollTop !== null) {
        const top = detailScrollTop;
        detailScrollTop = null;
        restoreScroll(top);
      }
      return;
    }
    if (entityStack().length > 0) {
      setEntityStack((stack) => stack.slice(0, -1));
      const scrollTop = entityScrollStack.pop();
      if (scrollTop !== undefined) restoreScroll(scrollTop);
      return;
    }
    if (detail()) {
      setDetail(null);
      setDetailOrigin(null);
      setDetailOnTop(false);
    } else {
      navigate("explore");
    }
  };

  const openArtist = (id: string) => {
    if (!id) return;
    const current = entity();
    if (current?.kind === "artist" && current.id === id && !current.error) return;
    setPlayerOpen(false);
    setDetailOnTop(false);
    entityScrollStack.push(mainScroll?.scrollTop ?? 0);
    requestAnimationFrame(() =>
      mainScroll?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }),
    );
    const key = ++entityKey;
    setEntityStack((stack) => [
      ...stack,
      { kind: "artist", key, id, loading: true, data: null },
    ]);
    void getArtistPage(id)
      .then((data) => {
        setEntityStack((stack) =>
          stack.map((item) =>
            item.key === key && item.kind === "artist"
              ? { ...item, loading: false, data }
              : item,
          ),
        );
      })
      .catch((error) => {
        setEntityStack((stack) =>
          stack.map((item) =>
            item.key === key && item.kind === "artist"
              ? {
                  ...item,
                  loading: false,
                  error: typeof error === "string" ? error : "歌手页加载失败",
                }
              : item,
          ),
        );
      });
  };

  const openAlbum = (id: string) => {
    if (!id) return;
    const current = entity();
    if (current?.kind === "album" && current.id === id && !current.error) return;
    setPlayerOpen(false);
    setDetailOnTop(false);
    entityScrollStack.push(mainScroll?.scrollTop ?? 0);
    requestAnimationFrame(() =>
      mainScroll?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }),
    );
    const key = ++entityKey;
    setEntityStack((stack) => [
      ...stack,
      { kind: "album", key, id, loading: true, data: null },
    ]);
    void getAlbumPage(id)
      .then((data) => {
        setEntityStack((stack) =>
          stack.map((item) =>
            item.key === key && item.kind === "album"
              ? { ...item, loading: false, data }
              : item,
          ),
        );
      })
      .catch((error) => {
        setEntityStack((stack) =>
          stack.map((item) =>
            item.key === key && item.kind === "album"
              ? {
                  ...item,
                  loading: false,
                  error: typeof error === "string" ? error : "专辑页加载失败",
                }
              : item,
          ),
        );
      });
  };

  const playAll = (tracks: Track[]) => {
    const first = tracks[0];
    if (first) playTrack(first, tracks);
  };

  const navigate = (next: Page) => {
    setDetail(null);
    setDetailOrigin(null);
    setDetailOnTop(false);
    setEntityStack([]);
    entityScrollStack.length = 0;
    detailScrollTop = null;
    setPage(next);
    setPaletteOpen(false);
    requestAnimationFrame(() => mainScroll?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }));
  };

  const fetchDetail = async (playlist: Playlist) => {
    setDetailLoading(true);
    try {
      const full = await getPlaylistDetail(playlist.id);
      if (detail()?.id === playlist.id) {
        setDetail({
          ...playlist,
          ...full,
          tracks: full.tracks ?? [],
        });
      }
    } catch (error) {
      showToast(typeof error === "string" ? error : "歌单加载失败");
    } finally {
      if (detail()?.id === playlist.id) setDetailLoading(false);
    }
  };

  const handleCreatePlaylist = () => {
    if (!account()) {
      setLoginOpen(true);
      return;
    }
    const name = window.prompt("新歌单名称")?.trim();
    if (!name) return;
    void apiCreatePlaylist(name)
      .then(() => {
        showToast(`已创建歌单「${name}」`);
        void loadCatalog();
      })
      .catch((error) =>
        showToast(typeof error === "string" ? error : "新建歌单失败"),
      );
  };

  const handleAddPlaylist = () => {
    if (!account()) {
      setLoginOpen(true);
      return;
    }
    const raw = window.prompt("输入歌单 ID 或歌单链接")?.trim();
    if (!raw) return;
    const linked = raw.match(/[?&#]id=(\d+)/) ?? raw.match(/playlist\/(\d+)/);
    const id = linked?.[1] ?? raw.trim();
    if (!/^\d+$/.test(id)) {
      showToast("请输入有效的歌单 ID 或链接");
      return;
    }
    void subscribePlaylist(id, true)
      .then(() => {
        showToast("已添加歌单到资料库");
        void loadCatalog();
      })
      .catch((error) =>
        showToast(typeof error === "string" ? error : "添加歌单失败"),
      );
  };

  const setPlaylistSubscribed = async (playlist: Playlist, subscribe: boolean) => {
    try {
      await subscribePlaylist(playlist.id, subscribe);
      setDetail((current) =>
        current && current.id === playlist.id
          ? { ...current, subscribed: subscribe }
          : current,
      );
      showToast(subscribe ? "已收藏歌单" : "已取消收藏");
      void loadCatalog();
      return true;
    } catch (error) {
      showToast(typeof error === "string" ? error : "收藏歌单失败");
      return false;
    }
  };

  const openPlaylist = (playlist: Playlist, origin?: HTMLElement) => {
    try {
      const key = "decro.playlistUsage";
      const raw = localStorage.getItem(key);
      const usage = raw ? JSON.parse(raw) : {};
      if (usage && typeof usage === "object") {
        usage[playlist.id] = (Number(usage[playlist.id]) || 0) + 1;
        localStorage.setItem(key, JSON.stringify(usage));
      }
    } catch {
      /* ignore local usage tracking */
    }
    if (!detail()) detailScrollTop = mainScroll?.scrollTop ?? 0;
    setDetailOrigin(origin?.getBoundingClientRect() ?? null);
    setDetailOnTop(true);
    setDetail(playlist);
    setPaletteOpen(false);
    requestAnimationFrame(() => mainScroll?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }));
    const needsDetail =
      (playlist.tracks?.length ?? 0) === 0 &&
      !["daily", "liked", "recent"].includes(playlist.id);
    if (needsDetail) {
      void fetchDetail(playlist);
    } else {
      setDetailLoading(false);
    }
  };

  const openProfile = () => {
    if (account()) navigate("settings");
    else setLoginOpen(true);
  };

  const playTrack = (track: Track, context?: Track[], sourceId?: string) => {
    playRequest += 1;
    userStarted = true;
    playSourceId =
      sourceId && /^\d+$/.test(sourceId)
        ? sourceId
        : track.albumId && /^\d+$/.test(track.albumId)
          ? track.albumId
          : "0";
    debugLog("play track", {
      id: track.id,
      title: track.title,
      real: isRealTrack(track),
      context: context?.length ?? 0,
    });
    setCurrent(track);
    setProgress(0);
    setPlaying(true);
    if (context && context.length > 0) {
      setQueue(context);
    } else if (!queue().some((item) => item.id === track.id)) {
      setQueue([...queue(), track]);
    }
    void loadLyrics(track);
  };

  const playPlaylist = async (playlist: Playlist, shuffle = false) => {
    const request = ++playRequest;
    let target = playlist;
    let list = target.tracks ?? [];
    if (list.length === 0 && !["daily", "liked", "recent"].includes(target.id)) {
      showToast("正在加载歌单…");
      try {
        target = await getPlaylistDetail(target.id);
        list = target.tracks ?? [];
        if (request !== playRequest) return;
        if (detail()?.id === playlist.id) setDetail(target);
      } catch (error) {
        if (request !== playRequest) return;
        showToast(typeof error === "string" ? error : "歌单加载失败");
        return;
      }
    }
    if (request !== playRequest) return;
    if (list.length === 0) {
      showToast("这个歌单暂时没有可播放的歌曲");
      return;
    }
    if (shuffle && list.length > 1) {
      list = [...list];
      for (let index = list.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(Math.random() * (index + 1));
        [list[index], list[swap]] = [list[swap], list[index]];
      }
    }
    userStarted = true;
    playSourceId = /^\d+$/.test(target.id) ? target.id : "0";
    setQueue(list);
    setCurrent(list[0]);
    setProgress(0);
    setPlaying(true);
    void loadLyrics(list[0]);
    showToast(`正在播放「${target.title}」`);
  };

  const toggleLike = async (track: Track) => {
    const wasLiked = likedIds().has(track.id);
    if (isTauri() && isRealTrack(track)) {
      if (!account()) {
        showToast("登录后才能喜欢歌曲");
        return;
      }
      if (pendingLikes.has(track.id)) return;
      pendingLikes.add(track.id);
      try {
        await likeSong(track.id, !wasLiked);
        setLikedIds((previous) => {
          const next = new Set(previous);
          if (wasLiked) next.delete(track.id);
          else next.add(track.id);
          return next;
        });
        showToast(wasLiked ? `已取消喜欢「${track.title}」` : `已喜欢「${track.title}」`);
      } catch (error) {
        showToast(typeof error === "string" ? error : "喜欢操作失败");
      } finally {
        pendingLikes.delete(track.id);
      }
      return;
    }
    setLikedIds((previous) => {
      const next = new Set(previous);
      if (wasLiked) next.delete(track.id);
      else next.add(track.id);
      return next;
    });
    showToast(wasLiked ? `已取消喜欢「${track.title}」` : `已喜欢「${track.title}」`);
  };

  const stepTrack = (delta: number) => {
    playRequest += 1;
    const list = queue();
    if (list.length === 0) {
      showToast("播放队列为空");
      return;
    }
    const index = list.findIndex((track) => track.id === current().id);
    const next = list[(index + delta + list.length) % list.length] ?? list[0];
    const restart = next.id === current().id;
    userStarted = true;
    setCurrent(next);
    setProgress(0);
    setPlaying(true);
    void loadLyrics(next);
    if (restart) {
      if (audio && playback() && isRealTrack(next)) {
        try {
          audio.currentTime = 0;
        } catch {
          /* source not ready; canplay will play */
        }
        if (audio.paused) attemptPlay();
      }
    }
  };

  const nextTrack = () => stepTrack(1);
  const prevTrack = () => stepTrack(-1);

  const attemptPlay = () => {
    if (!audio) return;
    debugLog("audio play attempt", {
      id: current().id,
      readyState: audio.readyState,
      paused: audio.paused,
      hasSrc: !!audio.src,
    });
    void audio.play().catch((error) => {
      const name = error instanceof DOMException ? error.name : "";
      debugLog("audio play rejected", {
        name,
        message: error instanceof Error ? error.message : String(error),
      });
      // A source swap aborts the previous play() promise. Keep the playing
      // state so the new source starts as soon as it can play.
      if (name === "AbortError") return;
      setPlaying(false);
      showToast(
        name === "NotAllowedError"
          ? "播放被系统拦截，请再点一次播放按钮"
          : "音频播放失败，请检查网络或换一首歌",
      );
    });
  };

  const reloadCurrentQuality = (selected: QualityLevel) => {
    if (!audio || !playback() || !isRealTrack(current()) || !audio.src) return;
    const resumeAt = audio.currentTime;
    const shouldPlay = playing();
    const level = selected === "auto" ? streamLevel(current().quality) : selected;
    audio.src = streamUrl(playback()!, current().id, level);
    audio.load();
    audio.addEventListener(
      "loadedmetadata",
      () => {
        if (!audio) return;
        try {
          if (resumeAt > 0) audio.currentTime = resumeAt;
        } catch {
          /* the new source may not be seekable yet */
        }
        if (shouldPlay) attemptPlay();
      },
      { once: true },
    );
  };

  const handleDefaultQuality = (level: QualityLevel) => {
    setDefaultQuality(level);
    showToast(`默认音质已设为${qualityLabel(level)}`);
    reloadCurrentQuality(level);
  };

  const handleTrackQuality = (level: QualityLevel) => {
    const trackId = current().id;
    setQualityOverrides((value) => ({ ...value, [trackId]: level }));
    showToast(`当前歌曲音质已设为${qualityLabel(level)}`);
    reloadCurrentQuality(level);
  };

  /** Keep Windows' media flyout and hardware keys in sync with the WebView
   * player. Position is sent once per second while playing, not per frame. */
  const syncMediaSession = (positionOverride?: number) => {
    if (!isTauri()) return;
    const track = current();
    if (!isRealTrack(track)) return;
    const position = audio?.currentTime;
    const positionSec =
      positionOverride ?? (Number.isFinite(position) ? (position as number) : progress());
    updateMediaSession({
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      coverUrl: track.coverUrl?.trim() || null,
      durationMs: Math.max(0, Math.round(track.durationSec * 1000)),
      positionMs: Math.max(0, Math.round(positionSec * 1000)),
      playing: playing(),
    });
  };

  const togglePlay = () => {
    if (isTauri() && (!isRealTrack(current()) || !playback() || !audio)) {
      showToast("歌曲还在加载，请稍候");
      return;
    }
    if (audio && audioFailed && playback() && isRealTrack(current())) {
      audioFailed = false;
      pendingSeek = null;
      debugLog("audio source set", {
        id: current().id,
        base: playback()!.base,
      });
      audio.src = streamUrl(playback()!, current().id, currentLevel());
      audio.load();
    }
    if (audio && !audio.src && isRealTrack(current())) {
      showToast("音源尚未就绪，请稍候");
      return;
    }
    setPlaying((value) => !value);
  };

  const seek = (value: number) => {
    const target = Math.max(0, Math.min(current().durationSec, value));
    if (audio && isRealTrack(current())) {
      if (audio.readyState >= 1) {
        try {
          audio.currentTime = target;
        } catch {
          pendingSeek = target;
        }
      } else {
        pendingSeek = target;
      }
    }
    setProgress(target);
    syncMediaSession(target);
  };

  const openLiked = () => {
    const liked = likedPlaylist();
    if (liked) openPlaylist(liked);
    else if (account()) showToast("喜欢的音乐暂时没有加载出来");
    else setLoginOpen(true);
  };

  const openDaily = () => {
    const daily = dailyPlaylist();
    if (daily) openPlaylist(daily);
    else if (account()) showToast("每日推荐暂时不可用，请稍后刷新");
    else setLoginOpen(true);
  };

  const openRecent = () => {
    const recent = recentPlaylist();
    if (recent) openPlaylist(recent);
    else navigate("library");
  };

  const likedPlaylist = createMemo<Playlist | null>(() => {
    if (library()?.liked) return library()!.liked;
    return home()?.userPlaylists.find((playlist) => playlist.specialType === 5) ?? null;
  });

  const dailyPlaylist = createMemo<Playlist | null>(() => {
    const tracks = home()?.daily ?? [];
    if (tracks.length === 0) return null;
    return playlistFromTracks(
      "daily",
      "每日推荐",
      `${tracks.length} 首 · 每天 6:00 更新`,
      tracks,
      "daily",
    );
  });

  const recentPlaylist = createMemo<Playlist | null>(() => {
    const tracks = home()?.recent ?? [];
    if (tracks.length === 0) return null;
    return playlistFromTracks("recent", "最近播放", `${tracks.length} 首`, tracks);
  });

  const featured = createMemo<Playlist | null>(
    () => dailyPlaylist() ?? recentPlaylist() ?? home()?.recommended[0] ?? null,
  );
  const radar = createMemo<Playlist | null>(
    () => home()?.recommended[1] ?? home()?.recommended[0] ?? null,
  );
  const sidebarPlaylists = createMemo<Playlist[]>(() => {
    const own = library()?.playlists ?? [];
    if (own.length > 0) return own;
    return home()?.userPlaylists ?? [];
  });
  const charts = createMemo<Playlist[]>(() => {
    const list = home()?.recommended ?? [];
    if (list.length <= 8) return list.slice(0, 4);
    return list.slice(8, 12);
  });

  const handleLoginSuccess = (next: Account) => {
    sessionEpoch += 1;
    likedLoaded = false;
    lastReportedPlayId = "";
    setAccount(next);
    setLoginOpen(false);
    setLibrary(null);
    showToast(`已登录：${next.nickname}，正在同步歌库`);
    void loadCatalog();
    if (playing()) reportCurrentPlayStart();
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      showToast(typeof error === "string" ? `退出登录失败：${error}` : "退出登录失败，请重试");
      return;
    }
    sessionEpoch += 1;
    lastReportedPlayId = "";
    setAccount(null);
    setHome(null);
    setLibrary(null);
    setDetail(null);
    setDetailOrigin(null);
    setDetailOnTop(false);
    setEntityStack([]);
    entityScrollStack.length = 0;
    detailScrollTop = null;
    setLikedIds(new Set<string>());
    likedLoaded = false;
    setPlaying(false);
    userStarted = false;
    setQueue([]);
    setCurrent(mockTracks[0]);
    setProgress(0);
    pendingRestoreProgress = 0;
    restoredTrackId = "";
    try {
      localStorage.removeItem(LAST_PLAYBACK_KEY);
    } catch {
      /* ignore */
    }
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    clearMediaSession();
    showToast("已退出登录");
    void loadCatalog();
  };

  const initAudio = () => {
    if (!isTauri()) return;
    audio = new Audio();
    audio.preload = "metadata";
    audio.volume = volume();
    audio.addEventListener("loadstart", () => {
      debugLog("audio loadstart", { id: current().id });
    });
    audio.addEventListener("canplay", () => {
      debugLog("audio canplay", { id: current().id });
      // Retry after a load interrupted the first play() attempt.
      if (audio && playing() && audio.paused && !audioFailed) attemptPlay();
    });
    audio.addEventListener("play", () => {
      debugLog("audio play event", { id: current().id });
      setPlaying(true);
      audioFailed = false;
      reportCurrentPlayStart();
    });
    audio.addEventListener("playing", () => {
      debugLog("audio playing", { id: current().id });
      setPlaying(true);
      audioFailed = false;
    });
    audio.addEventListener("waiting", () => {
      debugLog("audio waiting", { id: current().id });
    });
    audio.addEventListener("stalled", () => {
      debugLog("audio stalled", { id: current().id });
    });
    audio.addEventListener("timeupdate", () => {
      if (audio) setProgress(audio.currentTime);
    });
    const applyPendingSeek = () => {
      if (!audio || pendingSeek === null) return;
      const target = pendingSeek;
      pendingSeek = null;
      try {
        audio.currentTime = target;
      } catch {
        pendingSeek = target;
      }
    };
    audio.addEventListener("loadedmetadata", () => {
      if (!audio) return;
      const duration = audio.duration;
      debugLog("audio metadata", {
        id: current().id,
        duration: Number.isFinite(duration) ? duration : 0,
      });
      if (Number.isFinite(duration) && duration > 0) {
        setCurrent((previous) =>
          Math.abs(previous.durationSec - duration) < 0.25
            ? previous
            : {
                ...previous,
                durationSec: duration,
                duration: formatTime(duration),
              },
        );
      }
      applyPendingSeek();
    });
    audio.addEventListener("canplay", applyPendingSeek);
    audio.addEventListener("pause", () => {
      debugLog("audio pause event", { id: current().id });
      setPlaying(false);
    });
    audio.addEventListener("ended", () => {
      debugLog("audio ended", { id: current().id });
      nextTrack();
    });
    audio.addEventListener("error", () => {
      audioFailed = true;
      setPlaying(false);
      debugLog("audio error", {
        id: current().id,
        code: audio?.error?.code ?? 0,
        message: audio?.error?.message ?? "",
      });
      showToast("该歌曲暂不可播放（可能需要会员或受版权限制）");
    });
    void getPlaybackConfig()
      .then((config) => {
        setPlayback(config);
        debugLog("playback config ready", { base: config.base });
      })
      .catch((error) => {
        debugLog("playback config failed", { error: String(error) });
        showToast("本地音频代理启动失败，请重启应用");
      });
  };

  createEffect(() => {
    document.documentElement.dataset.theme = theme();
    localStorage.setItem("decro.theme", theme());
  });

  createEffect(() => {
    document.documentElement.dataset.perf = lowPower() ? "low" : "high";
    localStorage.setItem("decro.lowPower", String(lowPower()));
  });

  createEffect(() => {
    const track = current();
    const root = document.documentElement;
    const enabled = coverAccent();
    root.style.setProperty("--accent", enabled ? track.palette[1] : "#ff645d");
    root.style.setProperty("--accent-2", enabled ? track.palette[2] : "#ff8b69");
    root.style.setProperty("--accent-3", enabled ? track.palette[3] : "#2a1020");
    root.style.setProperty("--accent-ink", enabled ? track.palette[0] : "#2a0b0d");
    localStorage.setItem("decro.coverAccent", String(enabled));
  });

  createEffect(() => {
    localStorage.setItem("decro.translation", String(showTranslation()));
  });

  createEffect(() => {
    localStorage.setItem("decro.defaultQuality", defaultQuality());
  });

  createEffect(on(
    () => current().id,
    () => {
      queueMicrotask(saveLastPlayback);
    },
    { defer: true },
  ));

  onMount(() => {
    const save = () => saveLastPlayback();
    const timer = window.setInterval(save, 5000);
    window.addEventListener("beforeunload", save);
    window.addEventListener("pagehide", save);
    onCleanup(() => {
      window.clearInterval(timer);
      window.removeEventListener("beforeunload", save);
      window.removeEventListener("pagehide", save);
    });
  });

  createEffect(() => {
    if (isTauri()) return;
    if (!playing()) return;
    const timer = window.setInterval(() => {
      setProgress((value) => {
        const duration = current().durationSec;
        if (value >= duration) {
          nextTrack();
          return 0;
        }
        return value + 0.5;
      });
    }, 500);
    onCleanup(() => window.clearInterval(timer));
  });

  // Track the id/token as a memo. Reading `current()` directly in the effect
  // would also subscribe to duration updates from `loadedmetadata`, which
  // reloads the same source forever and aborts every play() request.
  const audioKey = createMemo(() => `${current().id}:${playback()?.token ?? ""}`);

  createEffect(on(
    audioKey,
    () => {
      if (!audio || !playback()) return;
      if (!isRealTrack(current())) return;
      audioFailed = false;
      const restore =
        pendingRestoreProgress > 0 && current().id === restoredTrackId;
      pendingSeek = restore ? pendingRestoreProgress : null;
      if (restore) pendingRestoreProgress = 0;
      debugLog("audio source set", {
        id: current().id,
        base: playback()!.base,
      });
      audio.src = streamUrl(playback()!, current().id, currentLevel());
      audio.load();
      if (playing()) attemptPlay();
    },
    { defer: true },
  ));

  createEffect(() => {
    // Read `playing` before the audio guard. At the first effect run `audio`
    // is still null because initAudio() runs in onMount; returning before
    // reading the signal would leave this effect unsubscribed forever, so
    // pause would update the UI while the audio element kept playing.
    const shouldPlay = playing();
    if (!audio) return;
    if (shouldPlay) {
      if (audio.paused && audio.src) attemptPlay();
    } else {
      audio.pause();
    }
  });

  createEffect(() => {
    const nextVolume = volume();
    if (audio) audio.volume = nextVolume;
  });

  const mediaKey = createMemo(() => `${current().id}:${playing()}:${queue().length}`);
  let lastMediaTrackId = "";
  createEffect(on(
    mediaKey,
    () => {
      const id = current().id;
      const trackChanged = id !== lastMediaTrackId;
      lastMediaTrackId = id;
      if (trackChanged) {
        debugLog("media session track", {
          id,
          title: current().title,
          artist: current().artist,
        });
      }
      syncMediaSession(trackChanged ? 0 : undefined);
    },
    { defer: true },
  ));

  createEffect(() => {
    if (!isTauri() || !playing()) return;
    const timer = window.setInterval(syncMediaSession, 1000);
    onCleanup(() => window.clearInterval(timer));
  });

  createEffect(() => {
    debugLog("play state", { playing: playing(), id: current().id });
  });

  onMount(() => {
    debugLog("app mounted", { tauri: isTauri() });
    initAudio();
    if (restoredPlayback && isRealTrack(current())) void loadLyrics(current());
    void loadCatalog();

    let unlistenMedia: (() => void) | undefined;
    let mediaDisposed = false;
    if (isTauri()) {
      const epoch = sessionEpoch;
      void getAuthStatus()
        .then((value) => {
          if (epoch !== sessionEpoch) return;
          if (value) {
            setAccount(value);
            void loadCatalog();
          }
        })
        .catch(() => undefined);

      void listenMediaControls((action) => {
        debugLog("media control", { action });
        if (action === "next") nextTrack();
        else if (action === "previous") prevTrack();
      })
        .then((unlisten) => {
          if (mediaDisposed) unlisten();
          else unlistenMedia = unlisten;
        })
        .catch((error) => {
          debugLog("media control listen failed", { error: String(error) });
        });
    }
    onCleanup(() => {
      mediaDisposed = true;
      unlistenMedia?.();
    });

    const openLogin = () => setLoginOpen(true);
    window.addEventListener("decro:open-login", openLogin);
    onCleanup(() => window.removeEventListener("decro:open-login", openLogin));

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA";
      const mod = event.ctrlKey || event.metaKey;

      if (mod && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (event.key === "Escape") {
        if (paletteOpen()) {
          setPaletteOpen(false);
          return;
        }
        // The full player owns Escape while it is open.
        if (playerOpen()) return;
      }
      if (typing) return;

      if (event.code === "Space") {
        // The full player owns Space while it is open.
        if (playerOpen()) return;
        event.preventDefault();
        togglePlay();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        seek(progress() + 5);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        seek(progress() - 5);
      } else if (event.key.toLowerCase() === "l") {
        setPlayerOpen(true);
      } else if (event.key.toLowerCase() === "f") {
        void toggleLike(current());
      } else if (event.key.toLowerCase() === "m") {
        setVolume((value) => (value > 0 ? 0 : 0.64));
      } else if (event.key === "ArrowUp" && !event.altKey) {
        event.preventDefault();
        setVolume((value) => Math.min(1, value + 0.05));
      } else if (event.key === "ArrowDown" && !event.altKey) {
        event.preventDefault();
        setVolume((value) => Math.max(0, value - 0.05));
      } else if (event.altKey && event.key === "1") {
        navigate("explore");
      } else if (event.altKey && event.key === "2") {
        navigate("search");
      } else if (event.altKey && event.key === "3") {
        navigate("library");
      } else if (mod && event.key === ",") {
        event.preventDefault();
        navigate("settings");
      }
    };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  return (
    <div
      class="app"
      classList={{
        "nav-collapsed": navCollapsed(),
        "player-open": playerOpen(),
      }}
      style={{
        "--accent": current().palette[1],
        "--accent-2": current().palette[2],
        "--accent-3": current().palette[3],
      }}
    >
      <div class="ambient" aria-hidden="true">
        <div class="ambient__blob ambient__blob--a" />
        <div class="ambient__blob ambient__blob--b" />
        <div class="ambient__blob ambient__blob--c" />
      </div>

      <Titlebar
        theme={theme()}
        page={page()}
        canGoBack={canGoBack()}
        onToggleTheme={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
        onOpenSearch={() => setPaletteOpen(true)}
        account={account()}
        onLogin={() => setLoginOpen(true)}
        onBack={back}
        onForward={() => undefined}
        onSettings={() => navigate("settings")}
      />

      <div class="workspace">
        <Sidebar
          page={page()}
          collapsed={navCollapsed()}
          playlists={sidebarPlaylists()}
          account={account()}
          likedCount={likedPlaylist()?.tracks?.length ?? 0}
          dailyCount={home()?.daily.length ?? 0}
          onLogin={() => setLoginOpen(true)}
          onToggleCollapsed={() => setNavCollapsed((value) => !value)}
          onNavigate={navigate}
          onOpenPlaylist={openPlaylist}
          onOpenLiked={openLiked}
          onOpenDaily={openDaily}
          onOpenRecent={openRecent}
          onSettings={() => navigate("settings")}
          onCreatePlaylist={handleCreatePlaylist}
          onAddPlaylist={handleAddPlaylist}
        />

        <main class="main">
          <div class="main__scroll" ref={mainScroll}>
            <Switch
              fallback={
                <Switch>
                  <Match when={page() === "explore"}>
                    <Explore
                      current={current()}
                      playing={playing()}
                      featured={featured()}
                      radar={radar()}
                      recent={home()?.recent ?? []}
                      recommended={home()?.recommended ?? []}
                      newSongs={home()?.newSongs ?? []}
                      charts={charts()}
                      loading={catalogLoading()}
                      error={catalogError()}
                      onProfile={openProfile}
                      onOpenPlaylist={openPlaylist}
                      onPlayPlaylist={playPlaylist}
                      onPlayTrack={playTrack}
                    />
                  </Match>
                  <Match when={page() === "search"}>
                    <SearchPage
                      current={current()}
                      playing={playing()}
                      account={account()}
                      likedTracks={likedPlaylist()?.tracks ?? []}
                      onOpenPlaylist={openPlaylist}
                      onOpenArtist={openArtist}
                      onOpenAlbum={openAlbum}
                      onPlayTrack={playTrack}
                    />
                  </Match>
                  <Match when={page() === "library"}>
                    <Library
                      account={account()}
                      playlists={sidebarPlaylists()}
                      recent={home()?.recent ?? []}
                      likedPlaylist={likedPlaylist()}
                      current={current()}
                      playing={playing()}
                      loading={catalogLoading()}
                      liked={isLiked}
                      onOpenPlaylist={openPlaylist}
                      onPlayPlaylist={playPlaylist}
                      onPlayTrack={playTrack}
                      onToggleLike={(track) => void toggleLike(track)}
                      onLogin={() => setLoginOpen(true)}
                      error={library()?.error}
                      onRetry={() => void loadCatalog()}
                    />
                  </Match>
                  <Match when={page() === "podcast"}>
                    <PodcastPage
                      playlists={home()?.recommended ?? []}
                      onPlayTrack={playTrack}
                      onOpenPlaylist={openPlaylist}
                    />
                  </Match>
                  <Match when={page() === "settings"}>
                    <SettingsPage
                      theme={theme()}
                      onTheme={setTheme}
                      onToast={showToast}
                      onClose={() => navigate("explore")}
                      lowPower={lowPower()}
                      onLowPower={setLowPower}
                      coverAccent={coverAccent()}
                      onCoverAccent={setCoverAccent}
                      showTranslation={showTranslation()}
                      onShowTranslation={setShowTranslation}
                      defaultQuality={defaultQuality()}
                      onDefaultQuality={handleDefaultQuality}
                      account={account()}
                      onLogin={() => setLoginOpen(true)}
                      onLogout={() => void handleLogout()}
                      onOpenLogs={() => {
                        void openLogFolder().catch((error) =>
                          showToast(typeof error === "string" ? error : "打开日志目录失败"),
                        );
                      }}
                    />
                  </Match>
                </Switch>
              }
            >
              <Match when={detailOnTop() && detail()}>
                {(playlist) => (
                  <DetailPage
                    playlist={playlist()}
                                      origin={detailOrigin()}
                  onOriginConsumed={() => setDetailOrigin(null)}
                  current={current()}
                  playing={playing()}
                  liked={isLiked}
                  loading={detailLoading()}
                  onPlayPlaylist={playPlaylist}
                  onPlayTrack={playTrack}
                  onToggleLike={(track) => void toggleLike(track)}
                  onSetPlaylistSubscribed={setPlaylistSubscribed}
                  onToast={showToast}
                  onBack={back}
                  onOpenPlaylist={openPlaylist}
                  />
                )}
              </Match>
              <Match when={entity()}>
                {(entry) => (
                  <EntityPage
                    entry={entry()}
                    current={current()}
                    playing={playing()}
                    onBack={back}
                    onPlayTrack={playTrack}
                    onPlayAll={playAll}
                    onOpenArtist={openArtist}
                    onOpenAlbum={openAlbum}
                  />
                )}
              </Match>
              <Match when={detail()}>
                {(playlist) => (
                  <DetailPage
                    playlist={playlist()}
                                      origin={detailOrigin()}
                  onOriginConsumed={() => setDetailOrigin(null)}
                  current={current()}
                  playing={playing()}
                  liked={isLiked}
                  loading={detailLoading()}
                  onPlayPlaylist={playPlaylist}
                  onPlayTrack={playTrack}
                  onToggleLike={(track) => void toggleLike(track)}
                  onSetPlaylistSubscribed={setPlaylistSubscribed}
                  onToast={showToast}
                  onBack={back}
                  onOpenPlaylist={openPlaylist}
                  />
                )}
              </Match>
            </Switch>
          </div>
        </main>

      </div>

      <PlayerDock
        track={current()}
        playing={playing()}
        progress={progress()}
        volume={volume()}
        liked={isLiked(current())}
        hidden={playerOpen() || page() === "settings"}
        onTogglePlay={togglePlay}
        onNext={nextTrack}
        onPrev={prevTrack}
        onSeek={seek}
        onVolume={setVolume}
        onToggleLike={() => void toggleLike(current())}
        onOpenPlayer={() => setPlayerOpen(true)}
        onOpenQueue={() => setPlayerOpen(true)}
        onOpenLyrics={() => setPlayerOpen(true)}
      />

      <FullPlayer
        open={playerOpen()}
        track={current()}
        queue={queue()}
        progress={progress()}
        playing={playing()}
        liked={isLiked(current())}
        volume={volume()}
        onClose={() => setPlayerOpen(false)}
        onTogglePlay={togglePlay}
        onNext={nextTrack}
        onPrev={prevTrack}
        onSeek={seek}
        onVolume={setVolume}
        onToggleLike={() => void toggleLike(current())}
        onPlayTrack={playTrack}
        onOpenArtist={openArtist}
        onOpenAlbum={openAlbum}
        onToast={showToast}
        showTranslation={showTranslation()}
        quality={currentQuality()}
        onQuality={handleTrackQuality}
      />

      <LoginModal
        open={loginOpen()}
        onClose={() => setLoginOpen(false)}
        onSuccess={handleLoginSuccess}
      />

      <CommandPalette
        open={paletteOpen()}
        onClose={() => setPaletteOpen(false)}
        onPlayTrack={playTrack}
        onOpenPlaylist={openPlaylist}
        onNavigate={navigate}
        tracks={home()?.recent ?? []}
        playlists={sidebarPlaylists()}
      />

      <Show when={toast()}>
        <div class="toast" role="status">
          <Icon name="check" size={15} />
          {toast()}
        </div>
      </Show>

      <Show when={splash()}>
        <Splash onDone={() => setSplash(false)} />
      </Show>
    </div>
  );
}
