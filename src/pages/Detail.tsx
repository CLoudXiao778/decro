import { createSignal, For, Show } from "solid-js";
import type { Playlist, Track } from "../data/mock";
import { CoverArt } from "../components/CoverArt";
import { Icon } from "../components/Icon";

export function DetailPage(props: {
  playlist: Playlist;
  origin?: DOMRect | null;
  onOriginConsumed?: () => void;
  current: Track;
  playing: boolean;
  liked: (track: Track) => boolean;
  onPlayPlaylist: (playlist: Playlist) => void;
  onPlayTrack: (track: Track, context?: Track[]) => void;
  onToggleLike: (track: Track) => void;
  onBack: () => void;
  onOpenPlaylist: (playlist: Playlist, origin?: HTMLElement) => void;
  loading?: boolean;
}) {
  const [liked, setLiked] = createSignal(false);

  return (
    <div
      class="page page--detail-source"
      classList={{ "is-revealing": !!props.origin }}
      style={{ "--p1": props.playlist.palette[0], "--p2": props.playlist.palette[1], "--p3": props.playlist.palette[2] }}
    >
      <div class="detail-source__backdrop" aria-hidden="true">
        <CoverArt palette={props.playlist.palette} seed={props.playlist.coverSeed ?? 0} url={props.playlist.coverUrl} showLabel={false} />
        <div class="detail-source__shade" />
      </div>

      <div class="detail-source__top">
        <button class="detail-circle" onClick={props.onBack} aria-label="返回">
          <Icon name="chevron-left" size={24} />
        </button>
        <div class="detail-source__top-space" />
        <button class="detail-circle" aria-label="分享" title="分享">
          <Icon name="share" size={22} />
        </button>
        <button class="detail-circle" aria-label="更多" title="更多">
          <Icon name="more" size={22} />
        </button>
      </div>

      <header class="detail-source__hero">
        <h1>{props.playlist.title}</h1>
        <p class="detail-source__sub">
          {props.playlist.kind === "daily"
            ? "每日推荐 · 每天 6:00 更新"
            : props.playlist.kind === "radio"
              ? "私人雷达 · 每日更新"
              : `${props.playlist.creator ?? "网易云音乐"} · ${props.playlist.count} 首`}
        </p>
        <p class="detail-source__date">
          {props.playlist.updateTime
            ? new Date(props.playlist.updateTime).toLocaleDateString("zh-CN")
            : props.playlist.kind === "daily"
              ? "今天"
              : "云音乐歌单"}
        </p>

        <div class="detail-source__actions">
          <button class="detail-action-square" aria-label="随机播放" onClick={() => props.onPlayPlaylist(props.playlist)}>
            <Icon name="shuffle" size={25} />
          </button>
          <button class="detail-source__play" aria-label="播放全部" onClick={() => props.onPlayPlaylist(props.playlist)}>
            <Icon name="play-fill" size={28} />
          </button>
          <button
            class="detail-action-square"
            classList={{ "is-liked": liked() }}
            aria-label="收藏歌单"
            onClick={() => setLiked((value) => !value)}
          >
            <Icon name={liked() ? "star-fill" : "star"} size={25} />
          </button>
        </div>

        <p class="detail-source__desc">
          {props.playlist.description ?? "耐听的好歌，快来收藏订阅吧～"}
        </p>
      </header>

      <div class="detail-source__list">
        <Show when={props.loading}>
          <div class="detail-list-state">正在加载歌曲…</div>
        </Show>
        <Show when={!props.loading && (props.playlist.tracks?.length ?? 0) === 0}>
          <div class="detail-list-state">这个歌单还没有可播放的歌曲</div>
        </Show>
        <For each={props.playlist.tracks ?? []}>
          {(track) => (
            <button
              class="detail-track"
              classList={{ "is-active": track.id === props.current.id }}
              onClick={() => props.onPlayTrack(track, props.playlist.tracks ?? [])}
            >
              <span class="detail-track__cover">
                <CoverArt palette={track.palette} seed={track.coverSeed ?? 0} url={track.coverUrl} showLabel={false} />
              </span>
              <span class="detail-track__text">
                <b>{track.title}</b>
                <small>{track.artist}</small>
              </span>
              <Show when={track.id === props.current.id && props.playing}>
                <span class="detail-track__playing">
                  <i />
                  <i />
                  <i />
                </span>
              </Show>
              <span class="detail-track__more" aria-hidden="true">
                <Icon name="more-vertical" size={20} />
              </span>
            </button>
          )}
        </For>
      </div>
    </div>
  );
}
