import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import type { Playlist, Track } from "../data/mock";
import type { Account, AlbumInfo, ArtistInfo, SearchKind } from "../lib/netease";
import { searchByKind } from "../lib/netease";
import { CoverArt } from "../components/CoverArt";
import { Icon } from "../components/Icon";

const SEARCH_KINDS: { id: SearchKind; label: string }[] = [
  { id: "song", label: "歌曲" },
  { id: "playlist", label: "歌单" },
  { id: "artist", label: "歌手" },
  { id: "album", label: "专辑" },
  { id: "lyric", label: "歌词" },
];

type SearchBundle = {
  songs: Track[];
  playlists: Playlist[];
  artists: ArtistInfo[];
  albums: AlbumInfo[];
  lyrics: { track: Track; lines: string[] }[];
};

const emptyResults = (): SearchBundle => ({
  songs: [],
  playlists: [],
  artists: [],
  albums: [],
  lyrics: [],
});

// Keep the search state when opening an artist/album page and coming back.
let cachedQuery = "";
let cachedKind: SearchKind = "song";
let cachedSource: "cloud" | "library" = "cloud";
let cachedFocused = false;
let cachedKey = "";
let cachedResults = emptyResults();

function yearOf(time: number): string {
  if (!time) return "";
  return String(new Date(time).getFullYear());
}

export function SearchPage(props: {
  current: Track;
  playing: boolean;
  account: Account | null;
  likedTracks: Track[];
  onOpenPlaylist: (playlist: Playlist, origin?: HTMLElement) => void;
  onOpenArtist: (id: string) => void;
  onOpenAlbum: (id: string) => void;
  onPlayTrack: (track: Track, context?: Track[]) => void;
}) {
  const [query, setQuery] = createSignal(cachedQuery);
  const [focused, setFocused] = createSignal(cachedFocused || !!cachedQuery);
  const [source, setSource] = createSignal<"cloud" | "library">(cachedSource);
  const [kind, setKind] = createSignal<SearchKind>(cachedKind);
  const [kindOpen, setKindOpen] = createSignal(false);
  const [results, setResults] = createSignal<SearchBundle>(cachedResults);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  let input!: HTMLInputElement;
  let timer: number | undefined;
  let requestId = 0;

  const kindLabel = createMemo(
    () => SEARCH_KINDS.find((item) => item.id === kind())?.label ?? "歌曲",
  );

  createEffect(() => {
    cachedQuery = query();
    cachedKind = kind();
    cachedSource = source();
    cachedFocused = focused();
  });

  createEffect(() => {
    const keyword = query().trim();
    const selected = kind();
    const request = ++requestId;
    window.clearTimeout(timer);
    if (!keyword) {
      setResults(emptyResults());
      setLoading(false);
      setError(null);
      return;
    }
    const key = `${selected}:${keyword}`;
    if (cachedKey === key) {
      setResults(cachedResults);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    timer = window.setTimeout(async () => {
      try {
        const data = await searchByKind(keyword, selected);
        if (request !== requestId) return;
        cachedKey = key;
        cachedResults = data;
        setResults(data);
      } catch (reason) {
        if (request !== requestId) return;
        setResults(emptyResults());
        setError(typeof reason === "string" ? reason : "搜索失败，请稍后再试");
      } finally {
        if (request === requestId) setLoading(false);
      }
    }, 280);
  });

  onCleanup(() => window.clearTimeout(timer));

  onMount(() => {
    const closeKind = (event: PointerEvent) => {
      if (!kindOpen()) return;
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".search-kind")) setKindOpen(false);
    };
    window.addEventListener("pointerdown", closeKind);
    onCleanup(() => window.removeEventListener("pointerdown", closeKind));
  });

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
    const titles = [
      ...results().songs.map((track) => track.title),
      ...results().playlists.map((playlist) => playlist.title),
      ...results().artists.map((artist) => artist.name),
      ...results().albums.map((album) => album.name),
    ];
    return [...new Set([keyword, ...titles])].slice(0, 3);
  });

  const hasResults = createMemo(() => {
    const data = results();
    const selected = kind();
    if (selected === "song") return data.songs.length > 0;
    if (selected === "playlist") return data.playlists.length > 0;
    if (selected === "artist") return data.artists.length > 0;
    if (selected === "album") return data.albums.length > 0;
    return data.lyrics.length > 0;
  });

  const resultCount = createMemo(() => {
    const data = results();
    const selected = kind();
    if (selected === "song") return data.songs.length;
    if (selected === "playlist") return data.playlists.length;
    if (selected === "artist") return data.artists.length;
    if (selected === "album") return data.albums.length;
    return data.lyrics.length;
  });

  const clear = () => {
    cachedKey = "";
    cachedResults = emptyResults();
    setQuery("");
    setFocused(false);
    setKindOpen(false);
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
          <span>搜索歌曲、歌手、歌单、专辑、歌词</span>
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
            <Show when={source() === "cloud"}>
              <div class="search-kind">
                <button
                  class="search-kind__button"
                  aria-haspopup="listbox"
                  aria-expanded={kindOpen()}
                  onClick={() => setKindOpen((value) => !value)}
                >
                  {kindLabel()}
                  <Icon name="chevron-down" size={15} />
                </button>
                <Show when={kindOpen()}>
                  <div class="search-kind__menu" role="listbox">
                    <For each={SEARCH_KINDS}>
                      {(item) => (
                        <button
                          role="option"
                          aria-selected={kind() === item.id}
                          classList={{ "is-active": kind() === item.id }}
                          onClick={() => {
                            setKind(item.id);
                            setKindOpen(false);
                          }}
                        >
                          {item.label}
                        </button>
                      )}
                    </For>
                  </div>
                </Show>
              </div>
            </Show>
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
              <Show when={hasResults()}>
                <div class="search-result-heading">
                  {kindLabel()} · {resultCount()} 个结果
                </div>
              </Show>

              <Show when={kind() === "song"}>
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
              </Show>

              <Show when={kind() === "playlist"}>
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

              <Show when={kind() === "artist"}>
                <div class="search-result-list">
                  <For each={results().artists}>
                    {(artist) => (
                      <button
                        class="search-result-card"
                        onClick={() => props.onOpenArtist(artist.id)}
                      >
                        <span class="search-result-card__cover search-result-card__cover--artist">
                          <CoverArt
                            palette={["#2a2626", "#7c4b43", "#c79b7b", "#181313"]}
                            url={artist.avatarUrl}
                            showLabel={false}
                          />
                        </span>
                        <span class="search-result-card__text">
                          <b>{artist.name}</b>
                          <small>
                            歌手 · {artist.aliases.join(" / ") || "网易云音乐"}
                            {artist.songCount ? ` · ${artist.songCount} 首歌曲` : ""}
                            {artist.albumCount ? ` · ${artist.albumCount} 张专辑` : ""}
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

              <Show when={kind() === "album"}>
                <div class="search-result-list">
                  <For each={results().albums}>
                    {(album) => (
                      <button class="search-result-card" onClick={() => props.onOpenAlbum(album.id)}>
                        <span class="search-result-card__cover">
                          <CoverArt
                            palette={["#2a2626", "#7c4b43", "#c79b7b", "#181313"]}
                            url={album.coverUrl}
                            showLabel={false}
                          />
                        </span>
                        <span class="search-result-card__text">
                          <b>{album.name}</b>
                          <small>
                            专辑 · {album.artist}
                            {yearOf(album.publishTime) ? ` · ${yearOf(album.publishTime)}` : ""}
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

              <Show when={kind() === "lyric"}>
                <div class="search-result-list">
                  <For each={results().lyrics}>
                    {(item) => (
                      <button
                        class="search-result-card search-result-card--lyric"
                        onClick={() => props.onPlayTrack(item.track, results().lyrics.map((entry) => entry.track))}
                      >
                        <span class="search-result-card__cover">
                          <CoverArt
                            palette={item.track.palette}
                            seed={item.track.coverSeed ?? 0}
                            url={item.track.coverUrl}
                            showLabel={false}
                          />
                        </span>
                        <span class="search-result-card__text">
                          <b>{item.track.title}</b>
                          <small>
                            歌词 · {item.track.artist} · {item.track.album}
                          </small>
                          <Show when={item.lines.length > 0}>
                            <span class="search-result-card__lyric">
                              {item.lines.slice(0, 2).join(" / ")}
                            </span>
                          </Show>
                        </span>
                        <span class="search-result-card__more" aria-hidden="true">
                          <Icon name="play-fill" size={18} />
                        </span>
                      </button>
                    )}
                  </For>
                </div>
              </Show>

              <Show when={!hasResults()}>
                <div class="search-empty">
                  <Icon name="search" size={28} />
                  <p>没有找到「{query()}」的相关{kindLabel()}</p>
                </div>
              </Show>
            </Show>
          </Show>

          <Show when={query().trim() && source() === "library"}>
            <Show
              when={libraryResults().length > 0}
              fallback={
                <div class="search-empty">
                  <Icon name="heart" size={28} />
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
