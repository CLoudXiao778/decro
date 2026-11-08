import { For, Show } from "solid-js";
import type { Playlist, Track } from "../data/mock";
import type { Account } from "../lib/netease";
import { CoverArt } from "../components/CoverArt";

export function PodcastPage(props: {
  account: Account | null;
  playlists: Playlist[];
  onProfile: () => void;
  onPlayTrack: (track: Track) => void;
  onOpenPlaylist: (playlist: Playlist, origin?: HTMLElement) => void;
}) {
  return (
    <div class="page page--categories">
      <header class="source-head">
        <h1 class="source-title">分类</h1>
        <button class="source-avatar" aria-label="个人资料" title="个人资料" onClick={props.onProfile}>
          <span class="source-avatar__inner">
            {props.account ? props.account.nickname.slice(0, 1).toUpperCase() : "C"}
          </span>
        </button>
      </header>

      <Show
        when={props.playlists.length > 0}
        fallback={<div class="library-empty">登录或联网后，这里会显示网易云推荐歌单。</div>}
      >
        <div class="category-grid">
          <For each={props.playlists.slice(0, 8)}>
            {(playlist) => (
              <button
                class="category-card"
                onClick={(event) => props.onOpenPlaylist(playlist, event.currentTarget)}
              >
                <CoverArt
                  palette={playlist.palette}
                  seed={playlist.coverSeed ?? 0}
                  url={playlist.coverUrl}
                  class="category-card__bg"
                  showLabel={false}
                />
                <span class="category-card__shade" />
                <span class="category-card__name">{playlist.title}</span>
                <span class="category-card__meta">{playlist.subtitle}</span>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
