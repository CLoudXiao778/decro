import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import type { Playlist, Track } from "../data/mock";
import { hotSearches, recentSearches } from "../data/mock";
import { searchMusic } from "../lib/netease";
import { CoverArt } from "./CoverArt";
import { Icon } from "./Icon";

type Result =
  | { kind: "track"; item: Track }
  | { kind: "playlist"; item: Playlist }
  | { kind: "action"; id: string; label: string; hint?: string };

export function CommandPalette(props: {
  open: boolean;
  onClose: () => void;
  onPlayTrack: (track: Track, context?: Track[]) => void;
  onOpenPlaylist: (playlist: Playlist) => void;
  onNavigate: (page: "explore" | "search" | "library" | "podcast" | "settings") => void;
  tracks: Track[];
  playlists: Playlist[];
}) {
  const [query, setQuery] = createSignal("");
  const [selected, setSelected] = createSignal(0);
  const [remote, setRemote] = createSignal<{ songs: Track[]; playlists: Playlist[] }>({
    songs: [],
    playlists: [],
  });
  const [searching, setSearching] = createSignal(false);
  let input!: HTMLInputElement;
  let list!: HTMLDivElement;
  let searchTimer: number | undefined;
  let searchRequest = 0;

  createEffect(() => {
    const keyword = query().trim();
    window.clearTimeout(searchTimer);
    const request = ++searchRequest;
    if (!keyword) {
      setRemote({ songs: [], playlists: [] });
      setSearching(false);
      return;
    }
    setSearching(true);
    setRemote({ songs: [], playlists: [] });
    searchTimer = window.setTimeout(async () => {
      try {
        const data = await searchMusic(keyword);
        if (request !== searchRequest) return;
        setRemote(data);
      } catch {
        if (request !== searchRequest) return;
        setRemote({ songs: [], playlists: [] });
      } finally {
        if (request === searchRequest) setSearching(false);
      }
    }, 260);
  });

  onCleanup(() => window.clearTimeout(searchTimer));

  const results = createMemo<Result[]>(() => {
    const q = query().trim().toLowerCase();
    if (!q) {
      return [
        ...props.tracks.slice(0, 4).map((item) => ({ kind: "track" as const, item })),
        ...props.playlists.slice(0, 3).map((item) => ({ kind: "playlist" as const, item })),
      ];
    }
    const online = remote();
    if (online.songs.length > 0 || online.playlists.length > 0) {
      return [
        ...online.songs.slice(0, 5).map((item) => ({ kind: "track" as const, item })),
        ...online.playlists.slice(0, 4).map((item) => ({ kind: "playlist" as const, item })),
      ];
    }
    const trackResults = props.tracks
      .filter((t) => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(q))
      .slice(0, 5)
      .map((item) => ({ kind: "track" as const, item }));
    const playlistResults = props.playlists
      .filter((p) => `${p.title} ${p.subtitle}`.toLowerCase().includes(q))
      .slice(0, 4)
      .map((item) => ({ kind: "playlist" as const, item }));
    return [...trackResults, ...playlistResults];
  });

  const actions: Result[] = [
    { kind: "action", id: "explore", label: "前往探索", hint: "Alt 1" },
    { kind: "action", id: "search", label: "前往搜索", hint: "Alt 2" },
    { kind: "action", id: "library", label: "前往音乐库", hint: "Alt 3" },
    { kind: "action", id: "settings", label: "打开设置", hint: "Ctrl ," },
  ];

  createEffect(() => {
    if (props.open) {
      setQuery("");
      setSelected(0);
      requestAnimationFrame(() => input?.focus());
    }
  });

  createEffect(() => {
    const el = list?.querySelector<HTMLElement>(`[data-index="${selected()}"]`);
    el?.scrollIntoView({ block: "nearest" });
  });

  const run = (result: Result) => {
    if (result.kind === "track") {
      const context = results()
        .filter((item): item is Extract<Result, { kind: "track" }> => item.kind === "track")
        .map((item) => item.item);
      props.onPlayTrack(result.item, context);
    }
    else if (result.kind === "playlist") props.onOpenPlaylist(result.item);
    else props.onNavigate(result.id as "explore" | "search" | "library" | "settings");
    props.onClose();
  };

  const onKey = (event: KeyboardEvent) => {
    if (!props.open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      props.onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelected((i) => Math.min(results().length - 1, i + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelected((i) => Math.max(0, i - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const result = results()[selected()];
      if (result) run(result);
    }
  };

  onMount(() => window.addEventListener("keydown", onKey));
  onCleanup(() => window.removeEventListener("keydown", onKey));

  return (
    <Show when={props.open}>
      <div class="command-layer" role="dialog" aria-modal="true" aria-label="全局搜索">
        <div class="command-layer__scrim" onClick={props.onClose} />
        <div class="command">
          <div class="command__input-wrap">
            <Icon name="search" size={18} />
            <input
              ref={input}
              class="command__input"
              value={query()}
              placeholder="搜索歌曲、歌手、专辑，或输入命令…"
              onInput={(event) => {
                setQuery(event.currentTarget.value);
                setSelected(0);
              }}
            />
            <kbd>Esc</kbd>
          </div>

          <div class="command__body" ref={list}>
            <Show when={!query().trim()}>
              <div class="command__section">
                <span class="command__section-title">最近搜索</span>
                <div class="command__chips">
                  <For each={recentSearches}>
                    {(item) => (
                      <button class="chip" onClick={() => setQuery(item)}>
                        {item}
                      </button>
                    )}
                  </For>
                </div>
              </div>
              <div class="command__section">
                <span class="command__section-title">热门</span>
                <div class="command__chips">
                  <For each={hotSearches.slice(0, 6)}>
                    {(item) => (
                      <button class="chip" onClick={() => setQuery(item)}>
                        {item}
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            <Show when={results().length > 0}>
              <div class="command__section">
                <span class="command__section-title">{query() ? "搜索结果" : "快速播放"}</span>
                <div class="command__list">
                  <For each={results()}>
                    {(result, index) => (
                      <button
                        data-index={index()}
                        class="command__row"
                        classList={{ "is-selected": selected() === index() }}
                        onMouseEnter={() => setSelected(index())}
                        onClick={() => run(result)}
                      >
                        <Show when={result.kind === "track"}>
                          <span class="command__thumb">
                            <CoverArt
                              palette={(result as Extract<Result, { kind: "track" }>).item.palette}
                              seed={(result as Extract<Result, { kind: "track" }>).item.coverSeed ?? 0}
                              url={(result as Extract<Result, { kind: "track" }>).item.coverUrl}
                              showLabel={false}
                            />
                          </span>
                          <span class="command__meta">
                            <b>{(result as Extract<Result, { kind: "track" }>).item.title}</b>
                            <small>
                              {(result as Extract<Result, { kind: "track" }>).item.artist} ·{" "}
                              {(result as Extract<Result, { kind: "track" }>).item.album}
                            </small>
                          </span>
                          <span class="command__kind">
                            <Icon name="music" size={14} /> 歌曲
                          </span>
                        </Show>
                        <Show when={result.kind === "playlist"}>
                          <span class="command__thumb">
                            <CoverArt
                              palette={(result as Extract<Result, { kind: "playlist" }>).item.palette}
                              seed={(result as Extract<Result, { kind: "playlist" }>).item.coverSeed ?? 0}
                              url={(result as Extract<Result, { kind: "playlist" }>).item.coverUrl}
                              showLabel={false}
                            />
                          </span>
                          <span class="command__meta">
                            <b>{(result as Extract<Result, { kind: "playlist" }>).item.title}</b>
                            <small>{(result as Extract<Result, { kind: "playlist" }>).item.subtitle}</small>
                          </span>
                          <span class="command__kind">
                            <Icon name="queue" size={14} /> 歌单
                          </span>
                        </Show>
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            <Show when={!query().trim()}>
              <div class="command__section">
                <span class="command__section-title">快速前往</span>
                <div class="command__list">
                  <For each={actions}>
                    {(action) => (
                      <button
                        class="command__row command__row--action"
                        onClick={() => run(action)}
                      >
                        <span class="command__meta">
                          <b>{(action as Extract<Result, { kind: "action" }>).label}</b>
                        </span>
                        <span class="command__hint">
                          {(action as Extract<Result, { kind: "action" }>).hint}
                        </span>
                      </button>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            <Show when={query().trim() && searching() && results().length === 0}>
              <div class="command__empty">
                <span class="login-spinner" />
                <p>正在搜索「{query()}」</p>
              </div>
            </Show>

            <Show when={query().trim() && !searching() && results().length === 0}>
              <div class="command__empty">
                <Icon name="search" size={24} />
                <p>没有找到跟「{query()}」有关的结果</p>
                <span>试试歌曲名、歌手名，或者一张专辑。</span>
              </div>
            </Show>
          </div>

          <div class="command__footer">
            <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
            <span><kbd>↵</kbd> 打开</span>
            <span><kbd>Esc</kbd> 关闭</span>
            <span class="command__brand">DECRO SEARCH</span>
          </div>
        </div>
      </div>
    </Show>
  );
}
