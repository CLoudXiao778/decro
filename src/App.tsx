import { createEffect, createMemo, createSignal, Match, onCleanup, onMount, Show, Switch } from "solid-js";
import { CommandPalette } from "./components/CommandPalette";
import { FullPlayer } from "./components/FullPlayer";
import { Icon } from "./components/Icon";
import { NowPlayingRail, type RailTab } from "./components/NowPlayingRail";
import { PlayerDock } from "./components/PlayerDock";
import { Sidebar } from "./components/Sidebar";
import { Splash } from "./components/Splash";
import { Titlebar } from "./components/Titlebar";
import type { Playlist, Track } from "./data/mock";
import { playlists, tracks } from "./data/mock";
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

export default function App() {
  const [page, setPage] = createSignal<Page>("explore");
  const [detail, setDetail] = createSignal<Playlist | null>(null);
  const [detailOrigin, setDetailOrigin] = createSignal<DOMRect | null>(null);
  const [current, setCurrent] = createSignal<Track>(tracks[0]);
  const [queue, setQueue] = createSignal<Track[]>(tracks);
  const [playing, setPlaying] = createSignal(true);
  const [progress, setProgress] = createSignal(72);
  const [volume, setVolume] = createSignal(0.64);
  const [theme, setTheme] = createSignal<"dark" | "light">(storedTheme());
  const [navCollapsed, setNavCollapsed] = createSignal(true);
  const [railOpen, setRailOpen] = createSignal(false);
  const [railTab, setRailTab] = createSignal<RailTab>("lyrics");
  const [playerOpen, setPlayerOpen] = createSignal(false);
  const [paletteOpen, setPaletteOpen] = createSignal(false);
  const [splash, setSplash] = createSignal(!new URLSearchParams(window.location.search).has("nosplash"));
  const [toast, setToast] = createSignal<string | null>(null);
  const [likedIds, setLikedIds] = createSignal(
    new Set(tracks.filter((track) => track.liked).map((track) => track.id)),
  );

  let mainScroll!: HTMLDivElement;
  let toastTimer: number | undefined;

  const isLiked = (track: Track) => likedIds().has(track.id);
  const canGoBack = createMemo(() => detail() !== null);

  const showToast = (message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => setToast(null), 2400);
  };

  const navigate = (next: Page) => {
    setDetail(null);
    setDetailOrigin(null);
    setPage(next);
    setPaletteOpen(false);
    requestAnimationFrame(() => mainScroll?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }));
  };

  const openPlaylist = (playlist: Playlist, origin?: HTMLElement) => {
    setDetailOrigin(origin?.getBoundingClientRect() ?? null);
    setDetail(playlist);
    setPaletteOpen(false);
    requestAnimationFrame(() => mainScroll?.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior }));
  };

  const playTrack = (track: Track) => {
    setCurrent(track);
    setProgress(0);
    setPlaying(true);
    if (!queue().some((item) => item.id === track.id)) {
      setQueue([...queue(), track]);
    }
  };

  const playPlaylist = (playlist: Playlist) => {
    setQueue(tracks);
    setCurrent(tracks[0]);
    setProgress(0);
    setPlaying(true);
    showToast(`正在播放「${playlist.title}」`);
  };

  const toggleLike = (track: Track) => {
    setLikedIds((previous) => {
      const next = new Set(previous);
      if (next.has(track.id)) {
        next.delete(track.id);
        showToast(`已取消喜欢「${track.title}」`);
      } else {
        next.add(track.id);
        showToast(`已喜欢「${track.title}」`);
      }
      return next;
    });
  };

  const nextTrack = () => {
    const list = queue();
    const index = list.findIndex((track) => track.id === current().id);
    const next = list[(index + 1 + list.length) % list.length] ?? tracks[0];
    setCurrent(next);
    setProgress(0);
    setPlaying(true);
  };

  const prevTrack = () => {
    const list = queue();
    const index = list.findIndex((track) => track.id === current().id);
    const prev = list[(index - 1 + list.length) % list.length] ?? tracks[0];
    setCurrent(prev);
    setProgress(0);
    setPlaying(true);
  };

  const togglePlay = () => {
    setPlaying((value) => !value);
  };

  const seek = (value: number) => {
    setProgress(Math.max(0, Math.min(current().durationSec, value)));
  };

  const back = () => {
    if (detail()) {
      setDetail(null);
      setDetailOrigin(null);
    } else {
      navigate("explore");
    }
  };

  createEffect(() => {
    document.documentElement.dataset.theme = theme();
    localStorage.setItem("cirro.theme", theme());
  });

  createEffect(() => {
    const track = current();
    const root = document.documentElement;
    root.style.setProperty("--accent", track.palette[1]);
    root.style.setProperty("--accent-2", track.palette[2]);
    root.style.setProperty("--accent-3", track.palette[3]);
    root.style.setProperty("--accent-ink", track.palette[0]);
  });

  createEffect(() => {
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

  createEffect(() => {
    if (playerOpen()) {
      setRailTab("lyrics");
    }
  });

  onMount(() => {
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
        if (playerOpen()) {
          setPlayerOpen(false);
          return;
        }
      }
      if (typing) return;

      if (event.code === "Space") {
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
        toggleLike(current());
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
        onMini={() =>
          window.open(
            "/?mini",
            "cirro-mini",
            "width=440,height=160,resizable=no,scrollbars=no,titlebar=no",
          )
        }
        onBack={back}
        onForward={() => undefined}
        onSettings={() => navigate("settings")}
      />

      <div class="workspace">
        <Sidebar
          page={page()}
          collapsed={navCollapsed()}
          playlists={playlists}
          onToggleCollapsed={() => setNavCollapsed((value) => !value)}
          onNavigate={navigate}
          onOpenPlaylist={openPlaylist}
          onOpenLiked={() => {
            setDetail({
              id: "liked",
              title: "我喜欢的音乐",
              subtitle: "328 首 · 更新时间 21:42",
              count: "328",
              palette: tracks[0].palette,
              description: "你喜欢的音乐都在这里。",
              kind: "playlist",
            });
            setPage("library");
          }}
          onOpenDaily={() => {
            setDetail({
              id: "daily",
              title: "每日推荐",
              subtitle: "根据你的口味生成 · 30 首",
              count: "30",
              palette: tracks[2].palette,
              description: "每天 6:00 更新，今天份的耳朵礼物。",
              kind: "playlist",
            });
            setPage("explore");
          }}
          onOpenRecent={() => {
            setPage("library");
            setDetail(null);
          }}
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
                      liked={isLiked}
                      onOpenPlaylist={openPlaylist}
                      onPlayPlaylist={playPlaylist}
                      onPlayTrack={playTrack}
                      onToggleLike={toggleLike}
                    />
                  </Match>
                  <Match when={page() === "search"}>
                    <SearchPage
                      current={current()}
                      playing={playing()}
                      liked={isLiked}
                      onOpenPlaylist={openPlaylist}
                      onPlayPlaylist={playPlaylist}
                      onPlayTrack={playTrack}
                      onToggleLike={toggleLike}
                    />
                  </Match>
                  <Match when={page() === "library"}>
                    <Library
                      current={current()}
                      playing={playing()}
                      liked={isLiked}
                      onOpenPlaylist={openPlaylist}
                      onPlayPlaylist={playPlaylist}
                      onPlayTrack={playTrack}
                      onToggleLike={toggleLike}
                    />
                  </Match>
                  <Match when={page() === "podcast"}>
                    <PodcastPage onPlayTrack={playTrack} onOpenPlaylist={openPlaylist} />
                  </Match>
                  <Match when={page() === "settings"}>
                    <SettingsPage
                      theme={theme()}
                      onTheme={setTheme}
                      onToast={showToast}
                      onClose={() => navigate("explore")}
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
                  onPlayPlaylist={playPlaylist}
                  onPlayTrack={playTrack}
                  onToggleLike={toggleLike}
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
            onToggleLike={() => toggleLike(current())}
            onOpenPlayer={() => setPlayerOpen(true)}
            onOpenQueue={() => {
              setRailTab("queue");
              setPlayerOpen(true);
            }}
            onPlayTrack={playTrack}
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
        onToggleLike={() => toggleLike(current())}
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
        onToggleLike={() => toggleLike(current())}
        onPlayTrack={playTrack}
      />

      <CommandPalette
        open={paletteOpen()}
        onClose={() => setPaletteOpen(false)}
        onPlayTrack={playTrack}
        onOpenPlaylist={openPlaylist}
        onNavigate={navigate}
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
