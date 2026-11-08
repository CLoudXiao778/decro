import { Show } from "solid-js";
import type { Playlist, Track } from "../data/mock";
import { CoverArt } from "./CoverArt";
import { Icon } from "./Icon";

export function SectionHeader(props: { title: string; subtitle?: string; action?: string; onAction?: () => void }) {
  return (
    <div class="section-head">
      <div class="section-head__text">
        <h2>{props.title}</h2>
        <Show when={props.subtitle}>
          <span>{props.subtitle}</span>
        </Show>
      </div>
      <Show when={props.action}>
        <button class="section-head__action" onClick={props.onAction}>
          {props.action}
          <Icon name="chevron-right" size={14} />
        </button>
      </Show>
    </div>
  );
}

export function PlaylistCard(props: {
  playlist: Playlist;
  onOpen: (playlist: Playlist, origin?: HTMLElement) => void;
  onPlay: (playlist: Playlist) => void;
}) {
  return (
    <article
      class="playlist-card"
      onClick={(event) => {
        const cover = event.currentTarget.querySelector<HTMLElement>(".playlist-card__cover");
        props.onOpen(props.playlist, cover ?? undefined);
      }}
    >
      <div class="playlist-card__cover">
        <CoverArt palette={props.playlist.palette} seed={props.playlist.coverSeed ?? 0} showLabel={false} />
        <span class="playlist-card__type">
          <Icon name={props.playlist.kind === "radio" ? "waves" : props.playlist.kind === "chart" ? "grid" : "queue"} size={12} />
          {props.playlist.kind === "radio" ? "RADAR" : props.playlist.kind === "chart" ? "CHART" : "PLAYLIST"}
        </span>
        <button
          class="playlist-card__play"
          aria-label={`播放 ${props.playlist.title}`}
          onClick={(event) => {
            event.stopPropagation();
            props.onPlay(props.playlist);
          }}
        >
          <Icon name="play-fill" size={18} />
        </button>
      </div>
      <div class="playlist-card__meta">
        <h3>{props.playlist.title}</h3>
        <p>{props.playlist.subtitle}</p>
      </div>
    </article>
  );
}

export function ChartCard(props: { playlist: Playlist; onOpen: (playlist: Playlist) => void }) {
  return (
    <button class="chart-card" onClick={() => props.onOpen(props.playlist)}>
      <div class="chart-card__cover">
        <CoverArt palette={props.playlist.palette} seed={props.playlist.coverSeed ?? 0} showLabel={false} />
        <span class="chart-card__overlay">
          <span class="chart-card__title">{props.playlist.title}</span>
          <span class="chart-card__meta">{props.playlist.subtitle}</span>
          <span class="chart-card__play">
            <Icon name="play-fill" size={16} />
          </span>
        </span>
      </div>
    </button>
  );
}

export function TrackRow(props: {
  track: Track;
  index: number;
  active?: boolean;
  playing?: boolean;
  liked?: boolean;
  showAlbum?: boolean;
  onPlay: (track: Track) => void;
  onToggleLike?: (track: Track) => void;
  onMore?: (track: Track) => void;
}) {
  return (
    <div
      class="track-row"
      classList={{ "is-active": props.active }}
      onDblClick={() => props.onPlay(props.track)}
    >
      <span class="track-row__index num">
        <span class="track-row__number">{props.index.toString().padStart(2, "0")}</span>
        <button class="track-row__play" aria-label={`播放 ${props.track.title}`} onClick={() => props.onPlay(props.track)}>
          <Icon name={props.active && props.playing ? "pause-fill" : "play-fill"} size={14} />
        </button>
      </span>
      <span class="track-row__main">
        <span class="track-row__thumb">
          <CoverArt palette={props.track.palette} seed={props.track.coverSeed ?? 0} showLabel={false} />
        </span>
        <span class="track-row__text">
          <span class="track-row__title">
            {props.track.title}
            <Show when={props.track.quality === "Hi-Res"}>
              <span class="track-row__hires">HR</span>
            </Show>
          </span>
          <span class="track-row__artist">{props.track.artist}</span>
        </span>
      </span>
      <Show when={props.showAlbum !== false}>
        <span class="track-row__album ellipsis">{props.track.album}</span>
      </Show>
      <span class="track-row__quality">{props.track.quality ?? "SQ"}</span>
      <span class="track-row__time num">{props.track.duration}</span>
      <span class="track-row__actions">
        <button
          class="icon-btn icon-btn--tiny"
          classList={{ "is-liked": props.liked }}
          aria-label={props.liked ? "取消喜欢" : "喜欢"}
          onClick={() => props.onToggleLike?.(props.track)}
        >
          <Icon name={props.liked ? "heart-fill" : "heart"} size={15} />
        </button>
        <button class="icon-btn icon-btn--tiny" aria-label="更多" onClick={() => props.onMore?.(props.track)}>
          <Icon name="more" size={15} />
        </button>
      </span>
    </div>
  );
}
