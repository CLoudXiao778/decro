import { createMemo, createSignal, For, Show } from "solid-js";
import type { Playlist, Track } from "../data/mock";
import { playlists, tracks } from "../data/mock";
import { CoverArt } from "../components/CoverArt";
import { Icon } from "../components/Icon";

export function SearchPage(props: {
  current: Track;
  playing: boolean;
  liked: (track: Track) => boolean;
  onOpenPlaylist: (playlist: Playlist, origin?: HTMLElement) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onPlayTrack: (track: Track) => void;
  onToggleLike: (track: Track) => void;
}) {
  const [query, setQuery] = createSignal("");
  const [focused, setFocused] = createSignal(false);
  const [source, setSource] = createSignal<"cloud" | "library">("cloud");
  let input!: HTMLInputElement;

  const results = createMemo(() => {
    const q = query().trim().toLowerCase();
    if (!q) return { tracks: [] as Track[], playlists: [] as Playlist[] };
    return {
      tracks: tracks.filter((t) => `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(q)).slice(0, 8),
      playlists: playlists.filter((p) => `${p.title} ${p.subtitle}`.toLowerCase().includes(q)).slice(0, 4),
    };
  });

  const suggestions = createMemo(() => {
    const q = query().trim();
    if (!q) return [] as string[];
    const titles = results().tracks.map((t) => t.title);
    const artists = results().tracks.map((t) => t.artist);
    return [...new Set([q, ...artists.slice(0, 1), ...titles.slice(0, 2)])].slice(0, 3);
  });

  const clear = () => {
    setQuery("");
    setFocused(false);
    input?.blur();
  };

  const libraryTracks = () => tracks.filter((t) => props.liked(t)).slice(0, 6);

  return (
    <div class="page page--search-source">
      <Show when={!focused() && !query()}>
        <header class="source-head">
          <h1 class="source-title">搜索</h1>
          <button class="source-avatar" aria-label="个人资料" title="个人资料" onClick={() => window.dispatchEvent(new Event("cirro:open-login"))}>
            <span class="source-avatar__inner">C</span>
          </button>
        </header>
        <button
          class="search-source-pill"
          onClick={() => {
            setFocused(true);
            requestAnimationFrame(() => input?.focus());
          }}
        >
          <Icon name="search" size={22} />
          <span>搜索</span>
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

            <div class="search-result-list">
              <For each={results().tracks}>
                {(track) => (
                  <button class="search-result-card" onClick={() => props.onPlayTrack(track)}>
                    <span class="search-result-card__cover">
                      <CoverArt palette={track.palette} seed={track.coverSeed ?? 0} showLabel={false} />
                    </span>
                    <span class="search-result-card__text">
                      <b>{track.title}</b>
                      <small>歌曲 · {track.artist}</small>
                    </span>
                    <span class="search-result-card__more" aria-hidden="true">
                      <Icon name="more-vertical" size={18} />
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
                    <button class="search-result-card" onClick={(event) => props.onOpenPlaylist(playlist, event.currentTarget)}>
                      <span class="search-result-card__cover">
                        <CoverArt palette={playlist.palette} seed={playlist.coverSeed ?? 0} showLabel={false} />
                      </span>
                      <span class="search-result-card__text">
                        <b>{playlist.title}</b>
                        <small>歌单 · {playlist.subtitle}</small>
                      </span>
                      <span class="search-result-card__more" aria-hidden="true">
                        <Icon name="more-vertical" size={18} />
                      </span>
                    </button>
                  )}
                </For>
              </div>
            </Show>

            <Show when={results().tracks.length === 0 && results().playlists.length === 0}>
              <div class="search-empty">
                <Icon name="search" size={28} />
                <p>没有找到「{query()}」</p>
              </div>
            </Show>
          </Show>

          <Show when={query().trim() && source() === "library"}>
            <div class="search-result-list">
              <For each={libraryTracks()}>
                {(track) => (
                  <button class="search-result-card" onClick={() => props.onPlayTrack(track)}>
                    <span class="search-result-card__cover">
                      <CoverArt palette={track.palette} seed={track.coverSeed ?? 0} showLabel={false} />
                    </span>
                    <span class="search-result-card__text">
                      <b>{track.title}</b>
                      <small>{track.artist} · {track.album}</small>
                    </span>
                    <span class="search-result-card__more" aria-hidden="true">
                      <Icon name="more-vertical" size={18} />
                    </span>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
