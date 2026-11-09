import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import type { Playlist, Track } from "../data/mock";
import type { Account } from "../lib/netease";
import { searchMusic } from "../lib/netease";
import { CoverArt } from "../components/CoverArt";
import { Icon } from "../components/Icon";

export function SearchPage(props: {
  current: Track;
  playing: boolean;
  account: Account | null;
  likedTracks: Track[];
  onOpenPlaylist: (playlist: Playlist, origin?: HTMLElement) => void;
  onPlayTrack: (track: Track, context?: Track[]) => void;
}) {
  const [query, setQuery] = createSignal("");
  const [focused, setFocused] = createSignal(false);
  const [source, setSource] = createSignal<"cloud" | "library">("cloud");
  const [results, setResults] = createSignal<{ songs: Track[]; playlists: Playlist[] }>({
    songs: [],
    playlists: [],
  });
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  let input!: HTMLInputElement;
  let timer: number | undefined;
  let requestId = 0;

  createEffect(() => {
    const keyword = query().trim();
    const request = ++requestId;
    window.clearTimeout(timer);
    if (!keyword) {
      setResults({ songs: [], playlists: [] });
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    timer = window.setTimeout(async () => {
      try {
        const data = await searchMusic(keyword);
        if (request !== requestId) return;
        setResults(data);
      } catch (reason) {
        if (request !== requestId) return;
        setResults({ songs: [], playlists: [] });
        setError(typeof reason === "string" ? reason : "搜索失败，请稍后再试");
      } finally {
        if (request === requestId) setLoading(false);
      }
    }, 280);
  });

  onCleanup(() => window.clearTimeout(timer));

  const libraryResults = createMemo(() => {
    const keyword = query().trim().toLowerCase();
    if (!keyword) return [];
    return props.likedTracks
      .filter((track) => `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(keyword))
      .slice(0, 20);
  });

  const suggestions = createMemo(() => {
    const keyword = query().trim();
    if (!keyword) return [] as string[];
    const titles = results().songs.slice(0, 2).map((track) => track.title);
    const artists = results().songs.slice(0, 2).map((track) => track.artist);
    return [...new Set([keyword, ...artists, ...titles])].slice(0, 3);
  });

  const clear = () => {
    setQuery("");
    setFocused(false);
    input?.blur();
  };

  return (
    <div class="page page--search-source">
      <Show when={!focused() && !query()}>
        <header class="source-head">
          <h1 class="source-title">搜索</h1>
        </header>
        <button
          class="search-source-pill"
          onClick={() => {
            setFocused(true);
            requestAnimationFrame(() => input?.focus());
          }}
        >
          <Icon name="search" size={22} />
          <span>搜索歌曲、歌手、歌单</span>
        </button>
      </Show>

      <Show when={focused() || query()}>
        <div class="search-active">
          <div class="search-active__bar">
            <div class="search-active__input">
              <Icon name="search" size={20} />
              <input
                ref={input}
                value={query()}
                placeholder="搜索"
                onInput={(event) => setQuery(event.currentTarget.value)}
                onFocus={() => setFocused(true)}
              />
            </div>
            <button class="search-active__close" aria-label="关闭搜索" onClick={clear}>
              <Icon name="close" size={20} />
            </button>
          </div>

          <div class="search-segment">
            <button classList={{ "is-active": source() === "cloud" }} onClick={() => setSource("cloud")}>
              Cloud Music
            </button>
            <button classList={{ "is-active": source() === "library" }} onClick={() => setSource("library")}>
              资料库
            </button>
          </div>

          <Show when={!query().trim()}>
            <div class="search-source-empty" />
          </Show>

          <Show when={query().trim() && source() === "cloud"}>
            <Show when={suggestions().length > 0}>
              <div class="search-suggestions">
                <For each={suggestions()}>
                  {(item) => (
                    <button class="search-suggestion" onClick={() => setQuery(item)}>
                      <Icon name="search" size={20} />
                      <span>{item}</span>
                    </button>
                  )}
                </For>
              </div>
            </Show>

            <Show when={loading()}>
              <div class="search-empty search-empty--soft">
                <span class="login-spinner" />
                <p>正在搜索「{query()}」</p>
              </div>
            </Show>

            <Show when={error()}>
              <div class="search-empty">
                <Icon name="search" size={27} />
                <p>{error()}</p>
              </div>
            </Show>

            <Show when={!loading() && !error()}>
              <div class="search-result-list">
                <For each={results().songs}>
                  {(track) => (
                    <button class="search-result-card" onClick={() => props.onPlayTrack(track, results().songs)}>
                      <span class="search-result-card__cover">
                        <CoverArt
                          palette={track.palette}
                          seed={track.coverSeed ?? 0}
                          url={track.coverUrl}
                          showLabel={false}
                        />
                      </span>
                      <span class="search-result-card__text">
                        <b>{track.title}</b>
                        <small>
                          歌曲 · {track.artist} · {track.album}
                        </small>
                      </span>
                      <span class="search-result-card__more" aria-hidden="true">
                        <Icon
                          name={track.id === props.current.id && props.playing ? "pause-fill" : "play-fill"}
                          size={18}
                        />
                      </span>
                    </button>
                  )}
                </For>
              </div>

              <Show when={results().playlists.length > 0}>
                <div class="search-result-heading">歌单</div>
                <div class="search-result-list">
                  <For each={results().playlists}>
                    {(playlist) => (
                      <button
                        class="search-result-card"
                        onClick={(event) => props.onOpenPlaylist(playlist, event.currentTarget)}
                      >
                        <span class="search-result-card__cover">
                          <CoverArt
                            palette={playlist.palette}
                            seed={playlist.coverSeed ?? 0}
                            url={playlist.coverUrl}
                            showLabel={false}
                          />
                        </span>
                        <span class="search-result-card__text">
                          <b>{playlist.title}</b>
                          <small>
                            歌单 · {playlist.subtitle} · {playlist.count} 首
                          </small>
                        </span>
                        <span class="search-result-card__more" aria-hidden="true">
                          <Icon name="chevron-right" size={18} />
                        </span>
                      </button>
                    )}
                  </For>
                </div>
              </Show>

              <Show when={results().songs.length === 0 && results().playlists.length === 0}>
                <div class="search-empty">
                  <Icon name="search" size={28} />
                  <p>没有找到「{query()}」</p>
                </div>
              </Show>
            </Show>
          </Show>

          <Show when={query().trim() && source() === "library"}>
            <Show
              when={libraryResults().length > 0}
              fallback={
                <div class="search-empty">
                  <Icon name="star" size={28} />
                  <p>{props.account ? "喜欢的歌曲里没有找到匹配项" : "登录后可搜索你喜欢的歌曲"}</p>
                </div>
              }
            >
              <div class="search-result-list">
                <For each={libraryResults()}>
                  {(track) => (
                    <button class="search-result-card" onClick={() => props.onPlayTrack(track, libraryResults())}>
                      <span class="search-result-card__cover">
                        <CoverArt
                          palette={track.palette}
                          seed={track.coverSeed ?? 0}
                          url={track.coverUrl}
                          showLabel={false}
                        />
                      </span>
                      <span class="search-result-card__text">
                        <b>{track.title}</b>
                        <small>
                          {track.artist} · {track.album}
                        </small>
                      </span>
                      <span class="search-result-card__more" aria-hidden="true">
                        <Icon name="play-fill" size={18} />
                      </span>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </div>
      </Show>
    </div>
  );
}
