import { createMemo, createSignal, For, Show } from "solid-js";
import type { Playlist, Track } from "../data/mock";
import type { Account } from "../lib/netease";
import { CoverArt } from "../components/CoverArt";
import { Icon, type IconName } from "../components/Icon";
import { Shelf } from "../components/Shelf";

const rows: { label: string; icon: IconName; kind: "liked" | "playlists" | "recent" }[] = [
  { label: "喜爱歌曲", icon: "star-fill", kind: "liked" },
  { label: "播放列表", icon: "queue", kind: "playlists" },
  { label: "最近播放", icon: "clock", kind: "recent" },
];

export function Library(props: {
  account: Account | null;
  playlists: Playlist[];
  recent: Track[];
  likedPlaylist: Playlist | null;
  current: Track;
  playing: boolean;
  loading?: boolean;
  liked: (track: Track) => boolean;
  onOpenPlaylist: (playlist: Playlist, origin?: HTMLElement) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onPlayTrack: (track: Track, context?: Track[]) => void;
  onToggleLike: (track: Track) => void;
  onLogin: () => void;
  error?: string;
  onRetry: () => void;
}) {
  const [recentExpanded, setRecentExpanded] = createSignal(false);
  const [playlistsExpanded, setPlaylistsExpanded] = createSignal(false);
  const recentLimit = 10;
  const playlistLimit = 8;
  const pinKey = "decro.pinnedPlaylists";

  const readPinned = (): string[] => {
    try {
      const raw = localStorage.getItem(pinKey);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string")
        : [];
    } catch {
      return [];
    }
  };

  const [pinnedPlaylists, setPinnedPlaylists] = createSignal<string[]>(readPinned());

  const readUsage = (): Record<string, number> => {
    try {
      const raw = localStorage.getItem("decro.playlistUsage");
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };

  const isPinned = (id: string) => pinnedPlaylists().includes(id);

  const togglePinned = (id: string) => {
    const next = isPinned(id)
      ? pinnedPlaylists().filter((item) => item !== id)
      : [...pinnedPlaylists(), id];
    setPinnedPlaylists(next);
    try {
      localStorage.setItem(pinKey, JSON.stringify(next));
    } catch {
      /* ignore local pin persistence */
    }
  };

  const pinnedItems = createMemo(() => {
    const byId = new Map(props.playlists.map((playlist) => [playlist.id, playlist]));
    return pinnedPlaylists()
      .map((id) => byId.get(id))
      .filter((playlist): playlist is Playlist => Boolean(playlist));
  });

  const usedPlaylists = createMemo(() => {
    const usage = readUsage();
    const pinned = new Set(pinnedPlaylists());
    return props.playlists
      .filter((playlist) => !pinned.has(playlist.id))
      .sort(
        (a, b) =>
          (usage[b.id] ?? 0) - (usage[a.id] ?? 0) ||
          (b.playCount ?? 0) - (a.playCount ?? 0) ||
          (b.updateTime ?? 0) - (a.updateTime ?? 0),
      );
  });

  const commonLimit = createMemo(() => Math.max(playlistLimit, pinnedItems().length));

  const commonPlaylists = createMemo(() =>
    [...pinnedItems(), ...usedPlaylists()].slice(0, commonLimit()),
  );

  const recentItems = createMemo(() =>
    recentExpanded() ? props.recent : props.recent.slice(0, recentLimit),
  );
  const playlistItems = createMemo(() =>
    playlistsExpanded() ? [...pinnedItems(), ...usedPlaylists()] : commonPlaylists(),
  );

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openRow = (kind: "liked" | "playlists" | "recent") => {
    if (kind === "liked") {
      if (props.likedPlaylist) props.onOpenPlaylist(props.likedPlaylist);
      else props.onLogin();
    } else if (kind === "playlists") {
      scrollTo("library-playlists");
    } else {
      scrollTo("library-recent");
    }
  };

  return (
    <div class="page page--library-source">
      <header class="source-head">
        <h1 class="source-title">资料库</h1>
      </header>

      <Show
        when={props.account}
        fallback={
          <button class="library-login-card" onClick={props.onLogin}>
            <span class="library-login-card__icon">
              <Icon name="user" size={24} />
            </span>
            <span>
              <b>登录网易云音乐</b>
              <small>扫码后自动同步你的歌单、喜欢歌曲和最近播放。</small>
            </span>
            <Icon name="chevron-right" size={22} />
          </button>
        }
      >
        <div class="library-source-rows">
          <For each={rows}>
            {(row) => (
              <button class="library-source-row" onClick={() => openRow(row.kind)}>
                <span class="library-source-row__icon">
                  <Icon name={row.icon} size={23} />
                </span>
                <span class="library-source-row__label">{row.label}</span>
                <Icon name="chevron-right" size={22} class="library-source-row__chevron" />
              </button>
            )}
          </For>
        </div>

        <Show when={props.loading}>
          <div class="library-loading">正在同步资料库…</div>
        </Show>
        <Show when={props.error}>
          <div class="library-error">
            <span>资料库部分内容加载失败：{props.error}</span>
            <button onClick={props.onRetry}>重试</button>
          </div>
        </Show>

        <section class="source-section" id="library-recent">
          <div class="source-section__head">
            <h2>最近播放</h2>
            <div class="source-section__tools">
              <span class="source-section__note">{props.recent.length} 首</span>
              <Show when={props.recent.length > recentLimit}>
                <button
                  class="source-section__more"
                  onClick={() => setRecentExpanded((value) => !value)}
                >
                  {recentExpanded() ? "收起" : "更多"}
                  <Icon name={recentExpanded() ? "chevron-down" : "chevron-right"} size={14} />
                </button>
              </Show>
            </div>
          </div>
          <Show
            when={props.recent.length > 0}
            fallback={<div class="library-empty">最近还没有播放记录。</div>}
          >
            <Shelf class={`shelf--tall ${recentExpanded() ? "shelf--wrap" : ""}`}>
              <For each={recentItems()}>
                {(track) => (
                  <button class="shelf-tile" onClick={() => props.onPlayTrack(track, props.recent)}>
                    <span class="shelf-tile__cover">
                      <CoverArt
                        palette={track.palette}
                        seed={track.coverSeed ?? 0}
                        url={track.coverUrl}
                        showLabel={false}
                      />
                      <span class="shelf-tile__play">
                        <Icon name="play-fill" size={15} />
                      </span>
                    </span>
                    <span class="shelf-tile__title">{track.title}</span>
                    <span class="shelf-tile__meta">{track.artist}</span>
                  </button>
                )}
              </For>
            </Shelf>
          </Show>
        </section>

        <section class="source-section" id="library-playlists">
          <div class="source-section__head">
            <h2>
              我的歌单
              <span
                class="source-section__badge"
                title="置顶歌单优先，其余按打开次数排序"
              >
                {playlistsExpanded() ? "全部" : "常用"}
              </span>
            </h2>
            <div class="source-section__tools">
              <span class="source-section__note">{props.playlists.length} 个</span>
              <Show when={props.playlists.length > commonLimit()}>
                <button
                  class="source-section__more"
                  onClick={() => setPlaylistsExpanded((value) => !value)}
                >
                  {playlistsExpanded() ? "收起" : "更多"}
                  <Icon name={playlistsExpanded() ? "chevron-down" : "chevron-right"} size={14} />
                </button>
              </Show>
            </div>
          </div>
          <Show when={props.playlists.length > 0}>
            <p class="library-playlist-hint">置顶优先，其余按打开次数排序；悬停封面点图钉可置顶。</p>
          </Show>
          <Show
            when={props.playlists.length > 0}
            fallback={<div class="library-empty">登录后创建的歌单和收藏的歌单会出现在这里。</div>}
          >
            <Shelf class={`shelf--playlist ${playlistsExpanded() ? "shelf--wrap" : ""}`}>
              <For each={playlistItems()}>
                {(playlist) => (
                  <div class="shelf-tile shelf-tile--playlist">
                    <button
                      class="shelf-tile__open"
                      onClick={(event) => props.onOpenPlaylist(playlist, event.currentTarget)}
                    >
                      <span class="shelf-tile__cover shelf-tile__cover--square">
                        <CoverArt
                          palette={playlist.palette}
                          seed={playlist.coverSeed ?? 0}
                          url={playlist.coverUrl}
                          showLabel={false}
                        />
                      </span>
                      <span class="shelf-tile__title">{playlist.title}</span>
                      <span class="shelf-tile__meta">{playlist.subtitle}</span>
                    </button>
                    <button
                      class="shelf-tile__pin"
                      classList={{ "is-pinned": isPinned(playlist.id) }}
                      aria-label={
                        isPinned(playlist.id)
                          ? `取消置顶 ${playlist.title}`
                          : `置顶 ${playlist.title}`
                      }
                      aria-pressed={isPinned(playlist.id)}
                      title={isPinned(playlist.id) ? "取消置顶" : "置顶到常用歌单"}
                      onClick={() => togglePinned(playlist.id)}
                    >
                      <Icon name="pin" size={14} />
                    </button>
                  </div>
                )}
              </For>
            </Shelf>
          </Show>
        </section>
      </Show>
    </div>
  );
}
