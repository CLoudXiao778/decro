import { For, Show } from "solid-js";
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
}) {
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

        <section class="source-section" id="library-recent">
          <div class="source-section__head">
            <h2>最近播放</h2>
            <span class="source-section__note">{props.recent.length} 首</span>
          </div>
          <Show
            when={props.recent.length > 0}
            fallback={<div class="library-empty">最近还没有播放记录。</div>}
          >
            <Shelf class="shelf--tall">
              <For each={props.recent.slice(0, 10)}>
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
            <h2>我的歌单</h2>
            <span class="source-section__note">{props.playlists.length} 个</span>
          </div>
          <Show
            when={props.playlists.length > 0}
            fallback={<div class="library-empty">登录后创建的歌单和收藏的歌单会出现在这里。</div>}
          >
            <Shelf class="shelf--playlist">
              <For each={props.playlists}>
                {(playlist) => (
                  <button
                    class="shelf-tile"
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
                )}
              </For>
            </Shelf>
          </Show>
        </section>
      </Show>
    </div>
  );
}
