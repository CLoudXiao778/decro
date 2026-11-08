import { For } from "solid-js";
import type { Playlist, Track } from "../data/mock";
import { playlists, tracks } from "../data/mock";
import { CoverArt } from "../components/CoverArt";
import { Icon, type IconName } from "../components/Icon";

const rows: { label: string; icon: IconName; kind: string }[] = [
  { label: "喜爱歌曲", icon: "star", kind: "liked" },
  { label: "播放列表", icon: "queue", kind: "playlists" },
  { label: "艺人", icon: "podcast", kind: "artists" },
  { label: "专辑", icon: "disc", kind: "albums" },
  { label: "歌曲", icon: "music", kind: "songs" },
];

export function Library(props: {
  current: Track;
  playing: boolean;
  liked: (track: Track) => boolean;
  onOpenPlaylist: (playlist: Playlist, origin?: HTMLElement) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onPlayTrack: (track: Track) => void;
  onToggleLike: (track: Track) => void;
}) {
  const openRow = (kind: string) => {
    if (kind === "liked") {
      props.onOpenPlaylist({
        id: "liked",
        title: "喜爱歌曲",
        subtitle: "328 首 · 更新时间 21:42",
        count: "328",
        palette: tracks[0].palette,
        description: "你喜欢的音乐都在这里。",
        kind: "playlist",
      });
      return;
    }
    if (kind === "playlists") {
      props.onOpenPlaylist(playlists[0]);
    }
  };

  return (
    <div class="page page--library-source">
      <header class="source-head">
        <h1 class="source-title">资料库</h1>
        <button class="source-avatar" aria-label="个人资料" title="个人资料" onClick={() => window.dispatchEvent(new Event("cirro:open-login"))}>
          <span class="source-avatar__inner">C</span>
        </button>
      </header>

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

      <section class="source-section">
        <div class="source-section__head">
          <h2>最近添加</h2>
          <button class="source-section__more">
            全部 <Icon name="chevron-right" size={14} />
          </button>
        </div>
        <div class="shelf shelf--tall">
          <For each={tracks.slice(0, 7)}>
            {(track) => (
              <button class="shelf-tile" onClick={() => props.onPlayTrack(track)}>
                <span class="shelf-tile__cover">
                  <CoverArt palette={track.palette} seed={track.coverSeed ?? 0} showLabel={false} />
                  <span class="shelf-tile__play">
                    <Icon name="play-fill" size={15} />
                  </span>
                </span>
                <span class="shelf-tile__title">{track.title}</span>
                <span class="shelf-tile__meta">{track.artist}</span>
              </button>
            )}
          </For>
        </div>
      </section>

      <section class="source-section">
        <div class="source-section__head">
          <h2>收藏的歌单</h2>
          <button class="source-section__more">
            全部 <Icon name="chevron-right" size={14} />
          </button>
        </div>
        <div class="shelf shelf--playlist">
          <For each={playlists}>
            {(playlist) => (
              <button class="shelf-tile" onClick={(event) => props.onOpenPlaylist(playlist, event.currentTarget)}>
                <span class="shelf-tile__cover shelf-tile__cover--square">
                  <CoverArt palette={playlist.palette} seed={playlist.coverSeed ?? 0} showLabel={false} />
                </span>
                <span class="shelf-tile__title">{playlist.title}</span>
                <span class="shelf-tile__meta">{playlist.subtitle}</span>
              </button>
            )}
          </For>
        </div>
      </section>
    </div>
  );
}
