import { For } from "solid-js";
import type { Playlist, Track } from "../data/mock";
import { charts, playlists, tracks } from "../data/mock";
import { CoverArt } from "../components/CoverArt";
import { Icon } from "../components/Icon";

export function Explore(props: {
  current: Track;
  playing: boolean;
  liked: (track: Track) => boolean;
  onOpenPlaylist: (playlist: Playlist, origin?: HTMLElement) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onPlayTrack: (track: Track) => void;
  onToggleLike: (track: Track) => void;
}) {
  const featured = playlists[0];
  const radar = playlists[6];
  const radarShelf = [playlists[6], playlists[7], playlists[8], playlists[2], playlists[3]];
  const picks = playlists.slice(1, 6);

  return (
    <div class="page page--explore">
      <header class="source-head">
        <h1 class="source-title">主页</h1>
        <button class="source-avatar" aria-label="个人资料" title="个人资料" onClick={() => window.dispatchEvent(new Event("cirro:open-login"))}>
          <span class="source-avatar__inner">C</span>
        </button>
      </header>

      <section class="feature-grid">
        <button class="feature-card" onClick={(event) => props.onOpenPlaylist(featured, event.currentTarget)}>
          <CoverArt palette={featured.palette} seed={0} class="feature-card__bg" showLabel={false} />
          <span class="feature-card__shade" />
          <span class="feature-card__content">
            <span class="feature-card__kicker">
              <Icon name="sparkles" size={13} />
              今日更新
            </span>
            <span class="feature-card__title">每日推荐</span>
            <span class="feature-card__meta">{featured.title} · 28 首</span>
          </span>
          <span class="feature-card__play">
            <Icon name="play-fill" size={17} />
          </span>
        </button>

        <button class="feature-card" onClick={(event) => props.onOpenPlaylist(radar, event.currentTarget)}>
          <CoverArt palette={radar.palette} seed={6} class="feature-card__bg" showLabel={false} />
          <span class="feature-card__shade" />
          <span class="feature-card__content">
            <span class="feature-card__kicker">
              <span class="radar-dot" />
              根据最近的循环
            </span>
            <span class="feature-card__title">私人雷达</span>
            <span class="feature-card__meta">只有你能听见的频率 · 30 首</span>
          </span>
          <span class="feature-card__play">
            <Icon name="play-fill" size={17} />
          </span>
        </button>
      </section>

      <section class="source-section">
        <div class="source-section__head">
          <h2>最近播放</h2>
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
          <h2>雷达播放列表</h2>
          <button class="source-section__more">
            更多 <Icon name="chevron-right" size={14} />
          </button>
        </div>
        <div class="shelf shelf--playlist">
          <For each={radarShelf}>
            {(playlist, index) => (
              <button class="shelf-tile" onClick={(event) => props.onOpenPlaylist(playlist, event.currentTarget)}>
                <span class="shelf-tile__cover shelf-tile__cover--square">
                  <CoverArt palette={playlist.palette} seed={playlist.coverSeed ?? index()} showLabel={false} />
                  {index() === 0 && (
                    <span class="shelf-tile__radar">
                      <Icon name="waves" size={14} />
                    </span>
                  )}
                </span>
                <span class="shelf-tile__title">{playlist.title}</span>
                <span class="shelf-tile__meta">{playlist.subtitle}</span>
              </button>
            )}
          </For>
        </div>
      </section>

      <section class="source-section">
        <div class="source-section__head">
          <h2>一秒中毒的抖腿电音</h2>
          <button class="source-section__more">
            播放全部 <Icon name="play-fill" size={12} />
          </button>
        </div>
        <div class="source-track-grid">
          <For each={[tracks[1], tracks[3], tracks[5], tracks[7], tracks[8], tracks[9]]}>
            {(track) => (
              <button
                class="source-track"
                classList={{ "is-active": track.id === props.current.id }}
                onClick={() => props.onPlayTrack(track)}
              >
                <span class="source-track__cover">
                  <CoverArt palette={track.palette} seed={track.coverSeed ?? 0} showLabel={false} />
                </span>
                <span class="source-track__text">
                  <b>{track.title}</b>
                  <small>{track.artist}</small>
                </span>
                <span class="source-track__play">
                  <Icon name={track.id === props.current.id && props.playing ? "pause-fill" : "play-fill"} size={17} />
                </span>
              </button>
            )}
          </For>
        </div>
      </section>

      <section class="source-section">
        <div class="source-section__head">
          <h2>为你精选</h2>
          <button class="source-section__more">
            查看全部 <Icon name="chevron-right" size={14} />
          </button>
        </div>
        <div class="shelf shelf--playlist">
          <For each={picks}>
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

      <section class="source-section">
        <div class="source-section__head">
          <h2>榜单</h2>
          <button class="source-section__more">
            查看全部 <Icon name="chevron-right" size={14} />
          </button>
        </div>
        <div class="shelf shelf--playlist">
          <For each={charts}>
            {(chart) => (
              <button class="shelf-tile" onClick={(event) => props.onOpenPlaylist(chart, event.currentTarget)}>
                <span class="shelf-tile__cover shelf-tile__cover--square">
                  <CoverArt palette={chart.palette} seed={chart.coverSeed ?? 0} showLabel={false} />
                </span>
                <span class="shelf-tile__title">{chart.title}</span>
                <span class="shelf-tile__meta">{chart.subtitle}</span>
              </button>
            )}
          </For>
        </div>
      </section>
    </div>
  );
}
