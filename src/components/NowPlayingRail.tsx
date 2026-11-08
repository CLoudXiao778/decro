import { createMemo, For, Show } from "solid-js";
import type { Track } from "../data/mock";
import { CoverArt } from "./CoverArt";
import { Icon } from "./Icon";

export type RailTab = "lyrics" | "queue" | "info";

export function NowPlayingRail(props: {
  track: Track;
  queue: Track[];
  progress: number;
  playing: boolean;
  liked: boolean;
  tab: RailTab;
  onTab: (tab: RailTab) => void;
  onTogglePlay: () => void;
  onToggleLike: () => void;
  onOpenPlayer: () => void;
  onOpenQueue: () => void;
  onPlayTrack: (track: Track) => void;
  onPrev: () => void;
  onNext: () => void;
  showTranslation: boolean;
}) {
  const activeIndex = createMemo(() => {
    const lyrics = props.track.lyrics;
    let index = 0;
    for (let i = 0; i < lyrics.length; i++) {
      if (props.progress >= lyrics[i].time) index = i;
    }
    return index;
  });

  const visibleLyrics = createMemo(() => {
    const all = props.track.lyrics;
    const start = Math.max(0, activeIndex() - 2);
    return all.slice(start, start + 7).map((line, i) => ({
      ...line,
      index: start + i,
    }));
  });

  return (
    <aside class="now-rail" aria-label="正在播放">
      <div class="now-rail__head">
        <span>正在播放</span>
        <button class="icon-btn icon-btn--tiny" aria-label="更多" title="更多">
          <Icon name="more" size={16} />
        </button>
      </div>

      <button class="rail-cover" onClick={props.onOpenPlayer} aria-label="打开沉浸播放页" title="打开沉浸播放页">
        <CoverArt
          palette={props.track.palette}
          seed={props.track.coverSeed ?? 0}
          url={props.track.coverUrl}
          showLabel={false}
        />
        <span class="rail-cover__badge">
          <span class="rail-cover__dot" />
          {props.playing ? "PLAYING" : "PAUSED"}
        </span>
        <span class="rail-cover__play">
          <Icon name={props.playing ? "pause-fill" : "play-fill"} size={18} />
        </span>
      </button>

      <div class="rail-meta">
        <div class="rail-meta__text">
          <button class="rail-meta__title" onClick={props.onOpenPlayer}>
            {props.track.title}
          </button>
          <button class="rail-meta__artist">{props.track.artist}</button>
        </div>
        <button
          class="icon-btn rail-like"
          classList={{ "is-liked": props.liked }}
          aria-label={props.liked ? "取消喜欢" : "喜欢"}
          onClick={props.onToggleLike}
        >
          <Icon name={props.liked ? "star-fill" : "star"} size={19} />
        </button>
      </div>

      <div class="rail-badges">
        <Show when={props.track.quality}>
          <span class="badge badge--info">{props.track.quality}</span>
        </Show>
        <span class="badge">专辑 · {props.track.album}</span>
      </div>

      <div class="rail-tabs" role="tablist">
        <button classList={{ "is-active": props.tab === "lyrics" }} onClick={() => props.onTab("lyrics")} role="tab">
          歌词
        </button>
        <button classList={{ "is-active": props.tab === "queue" }} onClick={() => props.onTab("queue")} role="tab">
          队列
        </button>
        <button classList={{ "is-active": props.tab === "info" }} onClick={() => props.onTab("info")} role="tab">
          信息
        </button>
      </div>

      <div class="rail-panel">
        <Show when={props.tab === "lyrics"}>
          <div class="rail-lyrics">
            <For each={visibleLyrics()}>
              {(line) => (
                <div
                  class="rail-lyric"
                  classList={{ "is-active": line.index === activeIndex() }}
                  onClick={props.onOpenPlayer}
                >
                  <p>{line.text}</p>
                  <Show when={props.showTranslation && line.translation}>
                    <p class="rail-lyric__tr">{line.translation}</p>
                  </Show>
                </div>
              )}
            </For>
          </div>
          <button class="rail-open-lyrics" onClick={props.onOpenPlayer}>
            <Icon name="lyrics" size={15} />
            打开沉浸歌词
            <Icon name="chevron-right" size={14} />
          </button>
        </Show>

        <Show when={props.tab === "queue"}>
          <div class="rail-queue">
            <div class="rail-queue__now">
              <span class="eq" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>正在播放</span>
            </div>
            <For each={props.queue}>
              {(track, index) => (
                <button
                  class="rail-queue__row"
                  classList={{ "is-current": track.id === props.track.id }}
                  onClick={() => props.onPlayTrack(track)}
                >
                  <span class="num">{index() + 1}</span>
                  <span class="rail-queue__thumb">
                    <CoverArt palette={track.palette} seed={track.coverSeed ?? 0} url={track.coverUrl} showLabel={false} />
                  </span>
                  <span class="rail-queue__meta">
                    <b>{track.title}</b>
                    <small>{track.artist}</small>
                  </span>
                  <Icon name={track.id === props.track.id ? "pause-fill" : "play"} size={14} />
                </button>
              )}
            </For>
          </div>
        </Show>

        <Show when={props.tab === "info"}>
          <div class="rail-info">
            <div class="rail-info__cover">
              <CoverArt palette={props.track.palette} seed={props.track.coverSeed ?? 0} url={props.track.coverUrl} showLabel={false} />
            </div>
            <dl>
              <div>
                <dt>专辑</dt>
                <dd>{props.track.album}</dd>
              </div>
              <div>
                <dt>艺人</dt>
                <dd>{props.track.artist}</dd>
              </div>
              <div>
                <dt>时长</dt>
                <dd class="num">{props.track.duration}</dd>
              </div>
              <div>
                <dt>音质</dt>
                <dd>{props.track.quality ?? "SQ"}</dd>
              </div>
            </dl>
            <p class="rail-info__hint">封面颜色会随歌曲变化，并影响沉浸播放页的环境光。</p>
          </div>
        </Show>
      </div>

      <div class="rail-footer">
        <button class="icon-btn" aria-label="上一首" onClick={props.onPrev}>
          <Icon name="prev" size={18} />
        </button>
        <button class="play-btn play-btn--rail" aria-label={props.playing ? "暂停" : "播放"} onClick={props.onTogglePlay}>
          <Icon name={props.playing ? "pause-fill" : "play-fill"} size={19} />
        </button>
        <button class="icon-btn" aria-label="下一首" onClick={props.onNext}>
          <Icon name="next" size={18} />
        </button>
        <button class="icon-btn" aria-label="播放队列" onClick={props.onOpenQueue}>
          <Icon name="queue" size={18} />
        </button>
      </div>
    </aside>
  );
}
