import { createEffect, createMemo, createSignal, Match, on, onCleanup, onMount, Show, Switch } from "solid-js";
import { CommandPalette } from "./components/CommandPalette";
import { FullPlayer } from "./components/FullPlayer";
import { Icon } from "./components/Icon";
import { LoginModal } from "./components/LoginModal";
import { NowPlayingRail, type RailTab } from "./components/NowPlayingRail";
import { PlayerDock } from "./components/PlayerDock";
import { Sidebar } from "./components/Sidebar";
import { Splash } from "./components/Splash";
import { Titlebar } from "./components/Titlebar";
import type { Playlist, Track } from "./data/mock";
import { tracks as mockTracks } from "./data/mock";
import { getAuthStatus, isTauri, logout as apiLogout, type Account } from "./lib/auth";
import {
  getHomeFeed,
  getLibraryData,
  getLyric,
  getPlaybackConfig,
  getPlaylistDetail,
  isRealTrack,
  likeSong,
  playlistFromTracks,
  streamUrl,
  type HomeBundle,
  type LibraryBundle,
  type PlaybackConfig,
} from "./lib/netease";
import { formatTime } from "./lib/format";
import { DetailPage } from "./pages/Detail";
import { Explore } from "./pages/Explore";
import { Library } from "./pages/Library";
import { PodcastPage } from "./pages/Podcast";
import { SearchPage } from "./pages/Search";
import { SettingsPage } from "./pages/Settings";

export type Page = "explore" | "search" | "library" | "podcast" | "settings";

function storedTheme(): "dark" | "light" {
  const saved = localStorage.getItem("cirro.theme");
  if (saved === "dark" || saved === "light") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function initialLowPower(): boolean {
  const saved = localStorage.getItem("cirro.lowPower");
  if (saved === "true" || saved === "false") return saved === "true";
  return (navigator.hardwareConcurrency ?? 8) <= 4;
}

function storedBool(key: string, fallback: boolean): boolean {
  const saved = localStorage.getItem(key);
  if (saved === "true" || saved === "false") return saved === "true";
  return fallback;
}

export default function App() {
  const [page, setPage] = createSignal<Page>("explore");
  const [detail, setDetail] = createSignal<Playlist | null>(null);
  const [detailOrigin, setDetailOrigin] = createSignal<DOMRect | null>(null);
  const [detailLoading, setDetailLoading] = createSignal(false);
  const [current, setCurrent] = createSignal<Track>(mockTracks[0]);
  const [queue, setQueue] = createSignal<Track[]>(isTauri() ? [] : mockTracks);
  const [playing, setPlaying] = createSignal(!isTauri());
  const [progress, setProgress] = createSignal(0);
  const [volume, setVolume] = createSignal(0.64);
  const [theme, setTheme] = createSignal<"dark" | "light">(storedTheme());
  const [lowPower, setLowPower] = createSignal<boolean>(initialLowPower());
  const [coverAccent, setCoverAccent] = createSignal(storedBool("cirro.coverAccent", true));
  const [showTranslation, setShowTranslation] = createSignal(storedBool("cirro.translation", true));
  const [account, setAccount] = createSignal<Account | null>(null);
  const [loginOpen, setLoginOpen] = createSignal(false);
  const [navCollapsed, setNavCollapsed] = createSignal(true);
  const [railOpen, setRailOpen] = createSignal(false);
  const [railTab, setRailTab] = createSignal<RailTab>("lyrics");
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
  let userStarted = false;
  let sessionEpoch = 0;
  let catalogRequest = 0;
  let lyricRequest = 0;
  let pendingSeek: number | null = null;
  let audioFailed = false;
  let playRequest = 0;
  let likedLoaded = false;
  const pendingLikes = new Set<string>();

  const isLiked = (track: Track) => likedIds().has(track.id);
  const canGoBack = createMemo(() => detail() !== null);

  const showToast = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => setToast(null), 2400);
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
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const data = await getHomeFeed();
      if (request !== catalogRequest) return;
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
      setCatalogError(typeof error === "string" ? error : "无法连接网易云，请检查网络");
    } finally {
      if (request === catalogRequest) setCatalogLoading(false);
    }
  };

  const back = () => {
    if (detail()) {
      setDetail(null);
      setDetailOrigin(null);
    } else {
      navigate("explore");
    }
  };

  const navigate = (next: Page) => {
    setDetail(null);
    setDetailOrigin(null);
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

  const openPlaylist = (playlist: Playlist, origin?: HTMLElement) => {
    setDetailOrigin(origin?.getBoundingClientRect() ?? null);
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

  const playTrack = (track: Track, context?: Track[]) => {
    playRequest += 1;
    userStarted = true;
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

  const playPlaylist = async (playlist: Playlist) => {
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
    userStarted = true;
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
    if (list.length === 0) return;
    const index = list.findIndex((track) => track.id === current().id);
    const next = list[(index + delta + list.length) % list.length] ?? list[0];
    userStarted = true;
    setCurrent(next);
    setProgress(0);
    setPlaying(true);
    void loadLyrics(next);
  };

  const nextTrack = () => stepTrack(1);
  const prevTrack = () => stepTrack(-1);

  const togglePlay = () => {
    if (isTauri() && (!isRealTrack(current()) || !playback())) {
      showToast("歌曲还在加载，请稍候");
      return;
    }
    if (audio && audioFailed && playback() && isRealTrack(current())) {
      audioFailed = false;
      pendingSeek = null;
      audio.src = streamUrl(playback()!, current().id);
      audio.load();
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
    setAccount(next);
    setLoginOpen(false);
    setLibrary(null);
    showToast(`已登录：${next.nickname}，正在同步歌库`);
    void loadCatalog();
  };

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      showToast(typeof error === "string" ? `退出登录失败：${error}` : "退出登录失败，请重试");
      return;
    }
    sessionEpoch += 1;
    setAccount(null);
    setHome(null);
    setLibrary(null);
    setDetail(null);
    setDetailOrigin(null);
    setLikedIds(new Set<string>());
    likedLoaded = false;
    setPlaying(false);
    userStarted = false;
    setQueue([]);
    setCurrent(mockTracks[0]);
    setProgress(0);
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    showToast("已退出登录");
    void loadCatalog();
  };

  const initAudio = () => {
    if (!isTauri()) return;
    audio = new Audio();
    audio.preload = "metadata";
    audio.volume = volume();
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
      if (Number.isFinite(duration) && duration > 0) {
        setCurrent((previous) => ({
          ...previous,
          durationSec: duration,
          duration: formatTime(duration),
        }));
      }
      applyPendingSeek();
    });
    audio.addEventListener("canplay", applyPendingSeek);
    audio.addEventListener("ended", () => nextTrack());
    audio.addEventListener("error", () => {
      audioFailed = true;
      setPlaying(false);
      showToast("该歌曲暂不可播放（可能需要会员或受版权限制）");
    });
    void getPlaybackConfig()
      .then(setPlayback)
      .catch(() => showToast("本地音频代理启动失败，请重启应用"));
  };

  createEffect(() => {
    document.documentElement.dataset.theme = theme();
    localStorage.setItem("cirro.theme", theme());
  });

  createEffect(() => {
    document.documentElement.dataset.perf = lowPower() ? "low" : "high";
    localStorage.setItem("cirro.lowPower", String(lowPower()));
  });

  createEffect(() => {
    const track = current();
    const root = document.documentElement;
    const enabled = coverAccent();
    root.style.setProperty("--accent", enabled ? track.palette[1] : "#ff645d");
    root.style.setProperty("--accent-2", enabled ? track.palette[2] : "#ff8b69");
    root.style.setProperty("--accent-3", enabled ? track.palette[3] : "#2a1020");
    root.style.setProperty("--accent-ink", enabled ? track.palette[0] : "#2a0b0d");
    localStorage.setItem("cirro.coverAccent", String(enabled));
  });

  createEffect(() => {
    localStorage.setItem("cirro.translation", String(showTranslation()));
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

  createEffect(on(
    () => `${current().id}:${playback()?.token ?? ""}`,
    () => {
      if (!audio || !playback()) return;
      if (!isRealTrack(current())) return;
      audioFailed = false;
      pendingSeek = null;
      audio.src = streamUrl(playback()!, current().id);
      audio.load();
      if (playing()) {
        void audio.play().catch(() => setPlaying(false));
      }
    },
    { defer: true },
  ));

  createEffect(() => {
    if (!audio) return;
    if (playing()) {
      if (audio.paused && audio.src) {
        void audio.play().catch(() => setPlaying(false));
      }
    } else {
      audio.pause();
    }
  });

  createEffect(() => {
    if (audio) audio.volume = volume();
  });

  onMount(() => {
    initAudio();
    void loadCatalog();

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
    }

    const openLogin = () => setLoginOpen(true);
    window.addEventListener("cirro:open-login", openLogin);
    onCleanup(() => window.removeEventListener("cirro:open-login", openLogin));

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
        setRailTab("lyrics");
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
        "rail-hidden": !railOpen(),
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
        railOpen={railOpen()}
        canGoBack={canGoBack()}
        onToggleTheme={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
        onToggleRail={() => setRailOpen((value) => !value)}
        onOpenSearch={() => setPaletteOpen(true)}
        account={account()}
        onLogin={() => setLoginOpen(true)}
        onMini={() => {
          if (isTauri()) {
            showToast("迷你播放器将在下一版接入播放同步");
            return;
          }
          window.open(
            "/?mini",
            "cirro-mini",
            "width=440,height=160,resizable=no,scrollbars=no,titlebar=no",
          );
        }}
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
        />

        <main class="main">
          <div class="main__scroll" ref={mainScroll}>
            <Show
              when={detail()}
              fallback={
                <Switch>
                  <Match when={page() === "explore"}>
                    <Explore
                      current={current()}
                      playing={playing()}
                      account={account()}
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
                      onProfile={openProfile}
                      onOpenPlaylist={openPlaylist}
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
                    />
                  </Match>
                  <Match when={page() === "podcast"}>
                    <PodcastPage
                      account={account()}
                      playlists={home()?.recommended ?? []}
                      onProfile={openProfile}
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
                      account={account()}
                      onLogin={() => setLoginOpen(true)}
                      onLogout={() => void handleLogout()}
                    />
                  </Match>
                </Switch>
              }
            >
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
                  onBack={back}
                  onOpenPlaylist={openPlaylist}
                />
              )}
            </Show>
          </div>
        </main>

        <Show when={railOpen()}>
          <NowPlayingRail
            track={current()}
            queue={queue()}
            progress={progress()}
            playing={playing()}
            liked={isLiked(current())}
            tab={railTab()}
            onTab={setRailTab}
            onTogglePlay={togglePlay}
            onToggleLike={() => void toggleLike(current())}
            onOpenPlayer={() => setPlayerOpen(true)}
            onOpenQueue={() => {
              setRailTab("queue");
              setPlayerOpen(true);
            }}
            onPlayTrack={playTrack}
            onPrev={prevTrack}
            onNext={nextTrack}
            showTranslation={showTranslation()}
          />
        </Show>
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
        onOpenQueue={() => {
          setRailTab("queue");
          setPlayerOpen(true);
        }}
        onOpenLyrics={() => {
          setRailTab("lyrics");
          setPlayerOpen(true);
        }}
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
        showTranslation={showTranslation()}
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
