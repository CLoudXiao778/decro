import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show } from "solid-js";
import type { Track } from "../data/mock";
import { formatTime } from "../lib/format";
import { CoverArt } from "./CoverArt";
import { Icon } from "./Icon";
import { VolumeBar } from "./ProgressBar";

type Rect = { left: number; top: number; width: number; height: number; right: number; bottom: number };

const EASE_OPEN = "cubic-bezier(.05,.7,.1,1)";
const EASE_CLOSE = "cubic-bezier(.2,0,0,1)";

function WaveProgress(props: {
  value: number;
  duration: number;
  playing: boolean;
  onSeek: (value: number) => void;
}) {
  let track!: HTMLDivElement;
  const fraction = () => (props.duration > 0 ? Math.min(1, Math.max(0, props.value / props.duration)) : 0);
  const seek = (event: PointerEvent) => {
    const rect = track.getBoundingClientRect();
    props.onSeek(Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)) * props.duration);
  };
  return (
    <div
      ref={track}
      class="wave-progress"
      classList={{ "is-paused": !props.playing }}
      role="slider"
      aria-label="播放进度"
      aria-valuemin={0}
      aria-valuemax={Math.round(props.duration)}
      aria-valuenow={Math.round(props.value)}
      tabindex="0"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        track.setPointerCapture(event.pointerId);
        seek(event);
      }}
      onPointerMove={(event) => {
        if (event.buttons & 1) seek(event);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          event.stopPropagation();
          props.onSeek(Math.min(props.duration, props.value + 5));
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          props.onSeek(Math.max(0, props.value - 5));
        }
      }}
    >
      <span class="wave-progress__line" style={{ left: `${fraction() * 100}%` }} />
      <span class="wave-progress__played" style={{ width: `${fraction() * 100}%` }}>
        <span class="wave-progress__wave" />
        <span class="wave-progress__flat" />
      </span>
      <span class="wave-progress__thumb" style={{ left: `${fraction() * 100}%` }} />
    </div>
  );
}

export function FullPlayer(props: {
  open: boolean;
  track: Track;
  queue: Track[];
  progress: number;
  playing: boolean;
  liked: boolean;
  volume: number;
  onClose: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (value: number) => void;
  onVolume: (value: number) => void;
  onToggleLike: () => void;
  onPlayTrack: (track: Track) => void;
  showTranslation: boolean;
}) {
  const [visible, setVisible] = createSignal(false);
  const [hidden, setHidden] = createSignal(true);
  const [expanded, setExpanded] = createSignal(false);
  const [preparing, setPreparing] = createSignal(false);
  const [heroReady, setHeroReady] = createSignal(false);
  const [lyricsFocus, setLyricsFocus] = createSignal(false);
  const [queueOpen, setQueueOpen] = createSignal(false);
  const [sourceDock, setSourceDock] = createSignal<Rect | null>(null);
  const [sourceCover, setSourceCover] = createSignal<Rect | null>(null);

  let cover!: HTMLButtonElement;
  let clone!: HTMLDivElement;
  let lyricsViewport!: HTMLDivElement;
  let lyricsInner!: HTMLDivElement;
  let cloneAnim: Animation | null = null;
  let fallbackTimer: number | undefined;
  let closeTimer: number | undefined;

  const activeIndex = createMemo(() => {
    const lines = props.track.lyrics;
    let index = 0;
    for (let i = 0; i < lines.length; i++) {
      if (props.progress >= lines[i].time) index = i;
    }
    return index;
  });

  const clip = createMemo(() => {
    if (expanded()) return "inset(0px 0px 0px 0px round 0px)";
    const src = sourceDock();
    if (!src) return "inset(0px 0px 0px 0px round 0px)";
    const overlayTop = 48;
    const top = Math.max(0, src.top - overlayTop);
    const left = Math.max(0, src.left);
    const right = Math.max(0, window.innerWidth - src.right);
    const bottom = Math.max(0, window.innerHeight - src.bottom);
    return `inset(${top}px ${right}px ${bottom}px ${left}px round 22px)`;
  });

  const toRect = (r: DOMRect | undefined | null): Rect | null =>
    r ? { left: r.left, top: r.top, width: r.width, height: r.height, right: r.right, bottom: r.bottom } : null;

  function readRects(): { dock: Rect | null; cover: Rect | null } {
    const dockEl = document.getElementById("player-dock");
    const coverEl = document.getElementById("dock-cover");
    return {
      dock: toRect(dockEl?.getBoundingClientRect()),
      cover: toRect(coverEl?.getBoundingClientRect()),
    };
  }

  function runClone(from: Rect, to: Rect, closing: boolean): Promise<void> {
    const duration = closing ? 320 : 360;
    const easing = closing ? EASE_CLOSE : EASE_OPEN;
    window.clearTimeout(fallbackTimer);
    cloneAnim?.cancel();
    clone.style.visibility = "visible";
    clone.style.left = `${to.left}px`;
    clone.style.top = `${to.top}px`;
    clone.style.width = `${to.width}px`;
    clone.style.height = `${to.height}px`;
    const sx = from.width / Math.max(1, to.width);
    const sy = from.height / Math.max(1, to.height);
    const tx = from.left - to.left;
    const ty = from.top - to.top;
    const fromRadius = Math.max(8, 16 / Math.max(0.01, sx));
    cloneAnim = clone.animate(
      [
        {
          transform: `translate3d(${tx}px, ${ty}px, 0) scale(${sx}, ${sy})`,
          borderRadius: `${fromRadius}px`,
        },
        { transform: "translate3d(0,0,0) scale(1,1)", borderRadius: "24px" },
      ],
      { duration, easing, fill: "both" },
    );
    return cloneAnim.finished.then(
      () => {
        clone.style.visibility = "hidden";
      },
      () => {
        clone.style.visibility = "hidden";
      },
    );
  }

  function openPlayer() {
    window.clearTimeout(closeTimer);
    setHidden(false);
    const rects = readRects();
    setSourceDock(rects.dock);
    setSourceCover(rects.cover);
    setPreparing(true);
    setVisible(true);
    setExpanded(false);
    // Keep the real cover ready underneath the flying clone: a delayed clone
    // completion (or a throttled animation frame) must never leave a blank cover.
    setHeroReady(true);
    setLyricsFocus(false);
    setQueueOpen(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPreparing(false);
        const dest = toRect(cover.getBoundingClientRect());
        setExpanded(true);
        const src = rects.cover ?? rects.dock;
        if (src && dest) {
          runClone(src, dest, false).then(() => {
            if (props.open) setHeroReady(true);
          });
          fallbackTimer = window.setTimeout(() => {
            if (props.open) {
              setHeroReady(true);
              if (clone) clone.style.visibility = "hidden";
            }
          }, 700);
        } else {
          setHeroReady(true);
        }
      });
    });
  }

  function hideClone() {
    if (clone) clone.style.visibility = "hidden";
  }

  function closePlayer() {
    if (!visible()) return;
    // Reverse of open: fly the real player cover back to the dock, not the
    // other way around. The old direction could leave a full-size clone on
    // top of the page after the panel closed.
    const from = toRect(cover?.getBoundingClientRect());
    const to = sourceCover() ?? sourceDock();
    if (from && to) {
      setHeroReady(false);
      runClone(from, to, true).then(() => {
        hideClone();
        if (!props.open) {
          setVisible(false);
          setHidden(true);
        }
      });
      closeTimer = window.setTimeout(() => {
        hideClone();
        if (!props.open) {
          setVisible(false);
          setHidden(true);
        }
      }, 380);
    } else {
      hideClone();
      setVisible(false);
      setHidden(true);
    }
    setPreparing(false);
    setExpanded(false);
    setQueueOpen(false);
  }

  createEffect(on(
    () => props.open,
    (open) => {
      if (open) openPlayer();
      else if (visible()) closePlayer();
    },
    { defer: true },
  ));

  createEffect(() => {
    if (!lyricsFocus()) return;
    const idx = activeIndex();
    if (!lyricsViewport || !lyricsInner) return;
    const line = lyricsInner.children[idx] as HTMLElement | undefined;
    if (!line) return;
    const target = line.offsetTop - lyricsViewport.clientHeight / 2 + line.offsetHeight / 2;
    lyricsInner.style.transform = `translate3d(0, ${-Math.max(0, target)}px, 0)`;
  });

  const onKey = (event: KeyboardEvent) => {
    if (!props.open) return;
    if (document.querySelector(".command-layer")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      props.onClose();
    }
    if (event.key === " " && !(event.target instanceof HTMLInputElement)) {
      event.preventDefault();
      props.onTogglePlay();
    }
  };

  onMount(() => window.addEventListener("keydown", onKey));
  onCleanup(() => {
    window.removeEventListener("keydown", onKey);
    cloneAnim?.cancel();
    window.clearTimeout(fallbackTimer);
    window.clearTimeout(closeTimer);
    hideClone();
  });

  const paletteStyle = () => ({
    "--p1": props.track.palette[0],
    "--p2": props.track.palette[1],
    "--p3": props.track.palette[2],
    "--p4": props.track.palette[3],
  });

  return (
    <>
      <div
        class="player-scrim"
        classList={{ "is-visible": visible(), "is-closing": !props.open }}
        aria-hidden="true"
      />
      <div
        class="player-layer"
        classList={{
          "is-visible": visible(),
          "is-expanded": expanded(),
          "is-preparing": preparing(),
          "is-closing": !props.open,
          "is-lyrics": lyricsFocus(),
        }}
        style={{
          ...paletteStyle(),
          "clip-path": clip(),
          visibility: hidden() ? "hidden" : "visible",
          display: hidden() ? "none" : "flex",
        }}
        aria-hidden={!props.open}
        aria-modal="true"
        role="dialog"
        aria-label="沉浸播放页"
      >
        <div class="player-backdrop" aria-hidden="true">
          <div class="player-backdrop__cover">
            <CoverArt palette={props.track.palette} seed={props.track.coverSeed ?? 0} url={props.track.coverUrl} showLabel={false} />
          </div>
          <div class="player-backdrop__shade" />
          <div class="player-backdrop__grain" />
        </div>

        <div class="player-top">
          <button class="icon-btn player-close" aria-label="收起播放页" title="收起 (Esc)" onClick={props.onClose}>
            <Icon name="chevron-down" size={20} />
          </button>
          <div class="player-top__label">
            <span class="player-top__dot" />
            正在播放
            <span class="player-top__source">网易云音乐</span>
          </div>
          <div class="player-top__actions">
            <span class="player-quality">{props.track.quality ?? "SQ"}</span>
            <button class="icon-btn" title="输出设备" aria-label="输出设备">
              <Icon name="cast" size={18} />
            </button>
            <button class="icon-btn" title="更多" aria-label="更多">
              <Icon name="more" size={18} />
            </button>
          </div>
        </div>

        <div class="player-body">
          <div class="player-left">
            <button
              ref={cover}
              class="player-cover"
              classList={{ "is-hero-ready": heroReady() }}
              onClick={() => setLyricsFocus((value) => !value)}
              aria-label="切换歌词"
              title="切换歌词"
            >
              <CoverArt
                palette={props.track.palette}
                seed={props.track.coverSeed ?? 0}
                url={props.track.coverUrl}
                showLabel={false}
              />
              <span class="player-cover__glass" />
              <span class="player-cover__shade" />
              <span class="player-cover__caption">
                <span>{props.track.album}</span>
                <i />
                <span>网易云音乐</span>
              </span>
              <span class="player-cover__hint">
                <Icon name="lyrics" size={16} />
                查看歌词
              </span>
            </button>
            <div class="player-under">
              <span class="player-under__label">专辑</span>
              <span>{props.track.album}</span>
              <span class="player-under__divider" />
              <span>{props.track.artist}</span>
            </div>
          </div>

          <div class="player-right">
            <div class="player-title-row">
              <div class="player-title-block">
                <div class="player-title">{props.track.title}</div>
                <div class="player-artist">{props.track.artist}</div>
              </div>
              <div class="player-head-actions">
                <button
                  class="player-head-button"
                  classList={{ "is-liked": props.liked }}
                  aria-label={props.liked ? "取消喜爱" : "喜爱"}
                  onClick={props.onToggleLike}
                >
                  <Icon name={props.liked ? "star-fill" : "star"} size={22} />
                </button>
                <button class="player-head-button" aria-label="更多" title="更多">
                  <Icon name="more" size={22} />
                </button>
              </div>
            </div>

            <Show when={lyricsFocus()}>
              <div class="player-lyrics" ref={lyricsViewport}>
                <div class="player-lyrics__inner" ref={lyricsInner}>
                  <For each={props.track.lyrics}>
                    {(line, i) => (
                      <div class="player-lyric" classList={{ "is-active": i() === activeIndex() }}>
                        <p>{line.text}</p>
                        <Show when={props.showTranslation && line.translation}>
                          <p class="player-lyric__tr">{line.translation}</p>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            </Show>

            <Show when={!lyricsFocus()}>
              <div class="player-cover-copy">
                <p class="player-cover-copy__quote">
                  “{props.track.album}” · {props.track.artist}
                </p>
                <div class="player-cover-copy__meta">
                  <span>{props.track.quality ?? "SQ"}</span>
                  <span>·</span>
                  <span>网易云音乐</span>
                </div>
                <button class="player-cover-copy__lyrics" onClick={() => setLyricsFocus(true)}>
                  <Icon name="lyrics" size={16} />
                  打开歌词
                </button>
              </div>
            </Show>
          </div>
        </div>

        <div class="player-bottom">
          <div class="player-progress-block">
            <WaveProgress value={props.progress} duration={props.track.durationSec} playing={props.playing} onSeek={props.onSeek} />
            <div class="player-times">
              <span class="num">{formatTime(props.progress).padStart(5, "0")}</span>
              <span class="num">{props.track.duration.padStart(5, "0")}</span>
            </div>
          </div>
          <div class="player-controls-row">
            <div class="player-controls-left">
              <button class="player-round-button" aria-label="评论" title="评论">
                <Icon name="comment" size={19} />
              </button>
              <button
                class="player-round-button"
                classList={{ "is-active": lyricsFocus() }}
                aria-label="歌词"
                title="歌词"
                onClick={() => setLyricsFocus((value) => !value)}
              >
                <Icon name="lyrics" size={19} />
              </button>
            </div>
            <div class="player-controls-center">
              <button class="player-skip" aria-label="上一首" title="上一首" onClick={props.onPrev}>
                <Icon name="prev" size={24} />
              </button>
              <button class="player-source-play" aria-label={props.playing ? "暂停" : "播放"} onClick={props.onTogglePlay}>
                <Icon name={props.playing ? "pause-fill" : "play-fill"} size={30} />
              </button>
              <button class="player-skip" aria-label="下一首" title="下一首" onClick={props.onNext}>
                <Icon name="next" size={24} />
              </button>
            </div>
            <div class="player-controls-right">
              <button class="player-round-button" aria-label="播放队列" title="播放队列" onClick={() => setQueueOpen((v) => !v)}>
                <Icon name="queue" size={19} />
              </button>
              <div class="player-volume">
                <Icon name={props.volume === 0 ? "volume-mute" : "volume"} size={17} />
                <VolumeBar value={props.volume} onInput={props.onVolume} />
              </div>
            </div>
          </div>
        </div>

        <div class="player-queue-scrim" classList={{ "is-open": queueOpen() }} onClick={() => setQueueOpen(false)} />
        <aside class="player-queue" classList={{ "is-open": queueOpen() }} aria-label="播放队列">
          <div class="player-queue__head">
            <div>
              <span>播放队列</span>
              <small>{props.queue.length} 首</small>
            </div>
            <button class="icon-btn" aria-label="关闭队列" onClick={() => setQueueOpen(false)}>
              <Icon name="close" size={17} />
            </button>
          </div>
          <div class="player-queue__list">
            <For each={props.queue}>
              {(track, index) => (
                <button
                  class="player-queue__row"
                  classList={{ "is-current": track.id === props.track.id }}
                  onClick={() => props.onPlayTrack(track)}
                >
                  <span class="num">{index() + 1}</span>
                  <span class="player-queue__thumb">
                    <CoverArt palette={track.palette} seed={track.coverSeed ?? 0} url={track.coverUrl} showLabel={false} />
                  </span>
                  <span class="player-queue__meta">
                    <b>{track.title}</b>
                    <small>{track.artist}</small>
                  </span>
                  <span class="player-queue__duration num">{track.duration}</span>
                </button>
              )}
            </For>
          </div>
        </aside>
      </div>

      <div ref={clone} class="morph-cover" aria-hidden="true" style={{ visibility: "hidden" }}>
        <CoverArt palette={props.track.palette} seed={props.track.coverSeed ?? 0} url={props.track.coverUrl} showLabel={false} />
      </div>
    </>
  );
}
