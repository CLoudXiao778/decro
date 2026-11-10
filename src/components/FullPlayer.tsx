import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show } from "solid-js";
import type { Track } from "../data/mock";
import { formatTime } from "../lib/format";
import { qualityLabel, qualityOptions, type QualityLevel } from "../lib/quality";
import { CoverArt } from "./CoverArt";
import { Icon } from "./Icon";
import { VolumeBar } from "./ProgressBar";
import { openSongPage } from "../lib/system";

type Rect = { left: number; top: number; width: number; height: number; right: number; bottom: number };

const EASE_OPEN = "cubic-bezier(.05,.7,.1,1)";
const EASE_CLOSE = "cubic-bezier(.2,0,0,1)";
const MORPH_OPEN_MS = 700;
const MORPH_CLOSE_MS = 640;

// One path morphs between a straight line and a scrolling sine wave. Both
// variants use the same Q/T command sequence so Chromium can interpolate `d`
// instead of cross-fading two separate elements.
const WAVE_WIDTH = 1440;
function progressPath(wave: boolean): string {
  const controlY = wave ? 1 : 8;
  let d = `M0 8 Q8 ${controlY} 16 8`;
  for (let x = 32; x <= WAVE_WIDTH; x += 16) d += ` T${x} 8`;
  return d;
}
const WAVE_PATH = progressPath(true);
const FLAT_PATH = progressPath(false);

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
        <svg
          class="wave-progress__shape"
          viewBox={`0 0 ${WAVE_WIDTH} 16`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            class="wave-progress__path"
            d={props.playing ? WAVE_PATH : FLAT_PATH}
          />
        </svg>
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
  onOpenArtist: (id: string) => void;
  onOpenAlbum: (id: string) => void;
  onToast: (message: string) => void;
  showTranslation: boolean;
  quality: QualityLevel;
  onQuality: (level: QualityLevel) => void;
}) {
  const [visible, setVisible] = createSignal(false);
  const [hidden, setHidden] = createSignal(true);
  const [expanded, setExpanded] = createSignal(false);
  const [preparing, setPreparing] = createSignal(false);
  const [heroReady, setHeroReady] = createSignal(false);
  const [lyricsFocus, setLyricsFocus] = createSignal(false);
  const [queueOpen, setQueueOpen] = createSignal(false);
  const [menuOpen, setMenuOpen] = createSignal(false);
  const [qualityMenuOpen, setQualityMenuOpen] = createSignal(false);
  const [sourceDock, setSourceDock] = createSignal<Rect | null>(null);
  const [sourceCover, setSourceCover] = createSignal<Rect | null>(null);
  const [sourceControls, setSourceControls] = createSignal<{
    play: Rect | null;
    next: Rect | null;
  }>({ play: null, next: null });
  const [controlsReady, setControlsReady] = createSignal(true);

  let cover!: HTMLButtonElement;
  let playButton!: HTMLButtonElement;
  let nextButton!: HTMLButtonElement;
  let playerLayer!: HTMLDivElement;
  let lastFocused: HTMLElement | null = null;
  let clone!: HTMLDivElement;
  let lyricsViewport!: HTMLDivElement;
  let lyricsInner!: HTMLDivElement;
  let lyricsFollowPaused = false;
  let lyricsResumeTimer: number | undefined;
  let cloneAnim: Animation | null = null;
  let controlClones: {
    wrapper: HTMLDivElement;
    animations: Animation[];
    cleanup: () => void;
  }[] = [];
  let fallbackTimer: number | undefined;
  let closeTimer: number | undefined;
  let closing = false;

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

  function readDockControls(): { play: Rect | null; next: Rect | null } {
    return {
      play: toRect(document.getElementById("dock-play")?.getBoundingClientRect()),
      next: toRect(document.getElementById("dock-next")?.getBoundingClientRect()),
    };
  }

  function radiusPx(element: HTMLElement, rect: Rect): number {
    const raw = getComputedStyle(element).borderTopLeftRadius;
    if (raw.endsWith("%")) {
      return (Math.min(rect.width, rect.height) * parseFloat(raw)) / 100;
    }
    return parseFloat(raw) || 0;
  }

  function iconRect(element: HTMLElement): Rect | null {
    const icon = element.querySelector("svg");
    return icon ? toRect(icon.getBoundingClientRect()) : null;
  }

  function hideControlClones() {
    for (const clone of controlClones) {
      clone.animations.forEach((animation) => animation.cancel());
      clone.cleanup();
    }
    controlClones = [];
  }

  function runControlClone(
    fromElement: HTMLElement,
    from: Rect,
    toElement: HTMLElement,
    to: Rect,
    closing: boolean,
  ): Promise<void> {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduceMotion ? 0 : closing ? MORPH_CLOSE_MS : MORPH_OPEN_MS;
    const easing = closing ? EASE_CLOSE : EASE_OPEN;
    const fromStyle = getComputedStyle(fromElement);
    const toStyle = getComputedStyle(toElement);
    const fromIcon = iconRect(fromElement);
    const toIcon = iconRect(toElement);
    const targetIcon = toElement.querySelector("svg");
    if (!targetIcon) return Promise.resolve();

    const wrapper = document.createElement("div");
    wrapper.className = "morph-control";
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.style.left = `${from.left}px`;
    wrapper.style.top = `${from.top}px`;
    wrapper.style.width = `${from.width}px`;
    wrapper.style.height = `${from.height}px`;
    wrapper.style.borderRadius = `${radiusPx(fromElement, from)}px`;
    wrapper.style.backgroundColor = fromStyle.backgroundColor;
    wrapper.style.color = fromStyle.color;
    wrapper.style.boxShadow = closing ? "none" : toStyle.boxShadow;
    const icon = targetIcon.cloneNode(true) as SVGElement;
    icon.style.display = "block";
    wrapper.appendChild(icon);
    document.body.appendChild(wrapper);

    const mainAnimation = wrapper.animate(
      [
        {
          left: `${from.left}px`,
          top: `${from.top}px`,
          width: `${from.width}px`,
          height: `${from.height}px`,
          borderRadius: `${radiusPx(fromElement, from)}px`,
          backgroundColor: fromStyle.backgroundColor,
          color: fromStyle.color,
        },
        {
          left: `${to.left}px`,
          top: `${to.top}px`,
          width: `${to.width}px`,
          height: `${to.height}px`,
          borderRadius: `${radiusPx(toElement, to)}px`,
          backgroundColor: toStyle.backgroundColor,
          color: toStyle.color,
        },
      ],
      { duration, easing, fill: "both" },
    );
    const animations: Animation[] = [mainAnimation];
    if (fromIcon && toIcon) {
      animations.push(
        icon.animate(
          [
            { transform: `scale(${fromIcon.width / Math.max(1, toIcon.width)})` },
            { transform: "scale(1)" },
          ],
          { duration, easing, fill: "both" },
        ),
      );
    }

    let settled = false;
    let timer: number | undefined;
    let resolveDone!: () => void;
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve;
    });
    const cleanup = () => {
      if (settled) return;
      settled = true;
      if (timer) window.clearTimeout(timer);
      wrapper.remove();
      controlClones = controlClones.filter((item) => item !== entry);
      resolveDone();
    };
    const entry = { wrapper, animations, cleanup };
    controlClones.push(entry);
    mainAnimation.finished.then(cleanup, cleanup);
    timer = window.setTimeout(cleanup, duration + 80);
    return done;
  }

  function runControlMorph(closing: boolean): Promise<void> {
    hideControlClones();
    const cached = sourceControls();
    const pairs = [
      {
        dock: document.getElementById("dock-play"),
        player: playButton,
        dockRect: cached.play,
      },
      {
        dock: document.getElementById("dock-next"),
        player: nextButton,
        dockRect: cached.next,
      },
    ];
    return Promise.all(
      pairs.map(({ dock, player, dockRect }) => {
        if (!dock || !player || !dockRect) return Promise.resolve();
        const playerRect = toRect(player.getBoundingClientRect());
        if (!playerRect) return Promise.resolve();
        return closing
          ? runControlClone(player, playerRect, dock, dockRect, true)
          : runControlClone(dock, dockRect, player, playerRect, false);
      }),
    ).then(() => undefined);
  }

  function runClone(from: Rect, to: Rect, closing: boolean): Promise<void> {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduceMotion ? 0 : closing ? MORPH_CLOSE_MS : MORPH_OPEN_MS;
    const easing = closing ? EASE_CLOSE : EASE_OPEN;
    window.clearTimeout(fallbackTimer);
    cloneAnim?.cancel();
    clone.style.display = "block";
    clone.style.visibility = "visible";
    clone.style.left = `${to.left}px`;
    clone.style.top = `${to.top}px`;
    clone.style.width = `${to.width}px`;
    clone.style.height = `${to.height}px`;
    const sx = from.width / Math.max(1, to.width);
    const sy = from.height / Math.max(1, to.height);
    const tx = from.left - to.left;
    const ty = from.top - to.top;
    const startRadius = (closing ? 24 : 16) / Math.max(0.01, sx);
    const endRadius = closing ? 16 : 24;
    const animation = clone.animate(
      [
        {
          transform: `translate3d(${tx}px, ${ty}px, 0) scale(${sx}, ${sy})`,
          borderRadius: `${startRadius}px`,
        },
        { transform: "translate3d(0,0,0) scale(1,1)", borderRadius: `${endRadius}px` },
      ],
      { duration, easing, fill: "both" },
    );
    cloneAnim = animation;
    const settle = () => {
      // A newer open/close morph may have taken over while this animation was
      // cancelled. Only the current animation is allowed to hide the clone.
      if (cloneAnim === animation) clone.style.visibility = "hidden";
    };
    return animation.finished.then(settle, settle);
  }

  function openPlayer() {
    window.clearTimeout(closeTimer);
    closing = false;
    lastFocused = document.activeElement as HTMLElement | null;
    setMenuOpen(false);
    setHidden(false);
    hideControlClones();
    const rects = readRects();
    setSourceDock(rects.dock);
    setSourceCover(rects.cover);
    setSourceControls(readDockControls());
    setControlsReady(false);
    setPreparing(true);
    setExpanded(false);
    // Keep the real cover hidden until the clone lands. Showing it underneath
    // makes the landing look like a hard cut if the two rects differ by even a
    // few pixels; the fallback timer below still guarantees a visible cover.
    setHeroReady(false);
    setLyricsFocus(false);
    setQueueOpen(false);

    // Measure and launch the clone before the expensive player paint. Waiting
    // for two animation frames let the player body appear first, so the clone
    // seemed to arrive late and hide on top of an already-visible cover.
    queueMicrotask(() => {
      if (!props.open) return;
      const dest = toRect(cover.getBoundingClientRect());
      const src = rects.cover ?? rects.dock;
      if (src && dest) {
        void runControlMorph(false).then(() => {
          if (props.open) setControlsReady(true);
        });
        runClone(src, dest, false).then(() => {
          if (props.open) setHeroReady(true);
        });
        fallbackTimer = window.setTimeout(() => {
          if (props.open) {
            setHeroReady(true);
            setControlsReady(true);
            hideClone();
          }
        }, 1100);
      } else {
        setHeroReady(true);
        setControlsReady(true);
      }
    });

    // First paint the panel at the dock clip while the clone is already flying,
    // then open the clip. This keeps the expensive player paint from delaying
    // the start of the shared-cover motion.
    requestAnimationFrame(() => {
      if (!props.open) {
        setVisible(false);
        setPreparing(false);
        setHidden(true);
        return;
      }
      setVisible(true);
      playerLayer?.focus({ preventScroll: true });
      requestAnimationFrame(() => {
        if (!props.open) {
          setVisible(false);
          setPreparing(false);
          setHidden(true);
          return;
        }
        setPreparing(false);
        setExpanded(true);
      });
    });
  }

  function hideClone() {
    hideControlClones();
    if (!clone) return;
    clone.style.visibility = "hidden";
    // Remove the compositor layer entirely. A hidden-but-composited cover can
    // survive a WebView2 repaint as a stale patch after lyrics mode toggles.
    clone.style.display = "none";
  }

  function restoreFocus() {
    const target =
      lastFocused && document.contains(lastFocused)
        ? lastFocused
        : (document.getElementById("player-dock") as HTMLElement | null);
    lastFocused = null;
    target?.focus?.({ preventScroll: true });
  }

  function closePlayer() {
    setMenuOpen(false);
    if (!visible() || closing) return;
    closing = true;
    setControlsReady(false);
    void runControlMorph(true);
    // Reverse of open: fly the real player cover back to the dock, not the
    // other way around. The old direction could leave a full-size clone on
    // top of the page after the panel closed.
    const from = toRect(cover?.getBoundingClientRect());
    const to = sourceCover() ?? sourceDock();
    if (from && to) {
      setHeroReady(false);
      runClone(from, to, true).then(() => {
        if (props.open) return;
        hideClone();
        setVisible(false);
        setHidden(true);
        restoreFocus();
      });
      closeTimer = window.setTimeout(() => {
        hideClone();
        if (!props.open) {
          setVisible(false);
          setHidden(true);
          restoreFocus();
        }
      }, 760);
    } else {
      hideClone();
      setVisible(false);
      setHidden(true);
      restoreFocus();
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

  let lyricsReady = false;

  const positionLyrics = (animate: boolean) => {
    if (!lyricsViewport || !lyricsInner) return;
    const line = lyricsInner.children[activeIndex()] as HTMLElement | undefined;
    if (!line) return;
    const max = Math.max(0, lyricsViewport.scrollHeight - lyricsViewport.clientHeight);
    const target = Math.max(
      0,
      Math.min(max, line.offsetTop - lyricsViewport.clientHeight / 2 + line.offsetHeight / 2),
    );
    if (animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      lyricsViewport.scrollTo({ top: target, behavior: "smooth" });
      return;
    }
    // Entering lyrics mode / reduced motion must jump straight to the line.
    const previous = lyricsViewport.style.scrollBehavior;
    lyricsViewport.style.scrollBehavior = "auto";
    lyricsViewport.scrollTop = target;
    lyricsViewport.style.scrollBehavior = previous;
  };

  const pauseLyricsFollow = () => {
    lyricsFollowPaused = true;
    window.clearTimeout(lyricsResumeTimer);
    lyricsResumeTimer = window.setTimeout(() => {
      lyricsFollowPaused = false;
      if (lyricsFocus()) positionLyrics(true);
    }, 5000);
  };

  const resumeLyricsFollow = () => {
    lyricsFollowPaused = false;
    window.clearTimeout(lyricsResumeTimer);
  };

  const seekToLyric = (time: number, index: number) => {
    resumeLyricsFollow();
    props.onSeek(time);
    if (index === activeIndex()) positionLyrics(true);
  };

  createEffect(on(
    activeIndex,
    () => {
      if (!lyricsFocus() || !lyricsReady || lyricsFollowPaused) return;
      positionLyrics(true);
    },
    { defer: true },
  ));

  createEffect(on(
    () => `${props.track.id}:${props.track.lyrics.length}`,
    () => {
      resumeLyricsFollow();
      if (!lyricsFocus()) return;
      lyricsReady = false;
      queueMicrotask(() => {
        if (!lyricsFocus()) return;
        positionLyrics(false);
        lyricsReady = true;
      });
    },
    { defer: true },
  ));

  createEffect(() => {
    if (!lyricsFocus()) {
      resumeLyricsFollow();
      lyricsReady = false;
    }
  });

  const toggleLyrics = () => {
    hideClone();
    setMenuOpen(false);
    setLyricsFocus((value) => !value);
  };

  const openLyrics = () => {
    hideClone();
    setMenuOpen(false);
    setLyricsFocus(true);
  };

  const copySongInfo = () => {
    const text = `${props.track.title} - ${props.track.artist}`;
    void navigator.clipboard
      .writeText(text)
      .then(() => props.onToast("已复制歌曲信息"))
      .catch(() => props.onToast("复制失败，请检查剪贴板权限"));
    setMenuOpen(false);
  };

  const artistRefs = () => {
    const list = (props.track.artists ?? []).filter((artist) => artist.id && artist.name);
    if (list.length > 0) return list;
    return props.track.artistId
      ? [{ id: props.track.artistId, name: props.track.artist }]
      : [];
  };

  const openArtistPage = () => {
    setMenuOpen(false);
    const first = artistRefs()[0];
    if (first) props.onOpenArtist(first.id);
    else props.onToast("这首歌曲没有歌手信息");
  };

  const openArtistRef = (id: string) => {
    setMenuOpen(false);
    props.onOpenArtist(id);
  };

  const openAlbumPage = () => {
    setMenuOpen(false);
    if (props.track.albumId) props.onOpenAlbum(props.track.albumId);
    else props.onToast("这首歌曲没有专辑信息");
  };

  const displayedQuality = () =>
    props.quality === "auto"
      ? props.track.quality ?? "标准"
      : qualityLabel(props.quality);

  const canOpenSong = () => /^\d+$/.test(props.track.id);

  const openComments = () => {
    if (!canOpenSong()) {
      props.onToast("示例歌曲无法打开网易云页面");
      return;
    }
    setMenuOpen(false);
    void openSongPage(props.track.id).catch((error) =>
      props.onToast(typeof error === "string" ? error : "打开网易云页面失败"),
    );
  };

  const onKey = (event: KeyboardEvent) => {
    if (!props.open) return;
    if (document.querySelector(".command-layer")) return;
    if (event.key === "Escape") {
      if (menuOpen()) {
        event.preventDefault();
        setMenuOpen(false);
        return;
      }
      event.preventDefault();
      props.onClose();
      return;
    }
    if (event.key === "Tab" && playerLayer) {
      const items = Array.from(
        playerLayer.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (element) =>
          element.offsetParent !== null &&
          !element.closest("[inert]") &&
          !element.closest("[aria-hidden='true']"),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!active || !playerLayer.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (active === playerLayer) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }
    const target = event.target as HTMLElement | null;
    const interactive = target?.closest(
      "button, a, input, textarea, select, [role='slider'], [contenteditable='true']",
    );
    if (event.key === " " && !interactive) {
      event.preventDefault();
      props.onTogglePlay();
    }
  };

  createEffect(() => {
    if (!menuOpen()) setQualityMenuOpen(false);
  });

  onMount(() => window.addEventListener("keydown", onKey));
  onMount(() => {
    const closeMenu = (event: PointerEvent) => {
      if (!menuOpen()) return;
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".player-more-wrap")) setMenuOpen(false);
    };
    window.addEventListener("pointerdown", closeMenu);
    onCleanup(() => window.removeEventListener("pointerdown", closeMenu));
  });
  onCleanup(() => {
    window.removeEventListener("keydown", onKey);
    cloneAnim?.cancel();
    window.clearTimeout(fallbackTimer);
    window.clearTimeout(closeTimer);
    window.clearTimeout(lyricsResumeTimer);
    hideControlClones();
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
        ref={playerLayer}
        tabindex={-1}
        class="player-layer"
        classList={{
          "is-visible": visible(),
          "is-expanded": expanded(),
          "is-preparing": preparing(),
          "is-controls-ready": controlsReady(),
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
        </div>

        <div class="player-body">
          <div class="player-left">
            <button
              ref={cover}
              class="player-cover"
              classList={{ "is-hero-ready": heroReady() }}
              onClick={toggleLyrics}
              aria-label="切换歌词"
              title="切换歌词"
            >
              <CoverArt
                palette={props.track.palette}
                seed={props.track.coverSeed ?? 0}
                url={props.track.coverUrl}
                showLabel={false}
              />
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
                  aria-label={props.liked ? "取消喜欢" : "添加到我喜欢"}
                  title={props.liked ? "取消喜欢" : "添加到我喜欢"}
                  onClick={props.onToggleLike}
                >
                  <Icon name={props.liked ? "heart-fill" : "heart"} size={22} />
                </button>
                <div class="player-more-wrap">
                  <button
                    class="player-head-button"
                    aria-label="更多操作"
                    title="更多操作"
                    aria-expanded={menuOpen()}
                    onClick={() => setMenuOpen((value) => !value)}
                  >
                    <Icon name="more" size={22} />
                  </button>
                  <Show when={menuOpen()}>
                    <div class="player-menu" role="menu">
                      <Show
                        when={artistRefs().length > 1}
                        fallback={
                          <button role="menuitem" onClick={openArtistPage} disabled={!artistRefs().length}>
                            <Icon name="user" size={16} />
                            查看歌手
                          </button>
                        }
                      >
                        <div class="player-menu__label">查看歌手</div>
                        <For each={artistRefs()}>
                          {(artist) => (
                            <button
                              role="menuitem"
                              class="player-menu__artist"
                              onClick={() => openArtistRef(artist.id)}
                            >
                              <Icon name="user" size={15} />
                              {artist.name}
                            </button>
                          )}
                        </For>
                      </Show>
                      <button role="menuitem" onClick={openAlbumPage} disabled={!props.track.albumId}>
                        <Icon name="disc" size={16} />
                        查看专辑
                      </button>
                      <button role="menuitem" onClick={copySongInfo}>
                        <Icon name="share" size={16} />
                        复制歌曲信息
                      </button>
                      <button
                        role="menuitem"
                        aria-haspopup="menu"
                        aria-expanded={qualityMenuOpen()}
                        onClick={() => setQualityMenuOpen((value) => !value)}
                      >
                        <Icon name="headphones" size={16} />
                        选择音质
                        <span class="player-menu__value">{qualityLabel(props.quality)}</span>
                      </button>
                      <Show when={qualityMenuOpen()}>
                        <div class="player-menu__qualities" role="group" aria-label="选择音质">
                          <For each={qualityOptions}>
                            {(option) => (
                              <button
                                role="menuitemradio"
                                aria-checked={props.quality === option.value}
                                class="player-menu__quality"
                                classList={{ "is-active": props.quality === option.value }}
                                title={option.hint}
                                onClick={() => {
                                  props.onQuality(option.value);
                                  setMenuOpen(false);
                                }}
                              >
                                <span>{option.label}</span>
                                <Show when={props.quality === option.value}>
                                  <Icon name="check" size={14} />
                                </Show>
                              </button>
                            )}
                          </For>
                        </div>
                      </Show>
                      <button
                        role="menuitem"
                        onClick={openComments}
                        disabled={!canOpenSong()}
                        title={canOpenSong() ? "" : "示例歌曲没有网易云页面"}
                      >
                        <Icon name="comment" size={16} />
                        在网易云打开
                      </button>
                    </div>
                  </Show>
                </div>
              </div>
            </div>

            <Show when={lyricsFocus()}>
              <div
                class="player-lyrics"
                onWheel={pauseLyricsFollow}
                onPointerDown={pauseLyricsFollow}
                onTouchStart={pauseLyricsFollow}
                ref={(el) => {
                  lyricsViewport = el;
                  // Jump to the current line before the first paint. A
                  // requestAnimationFrame can be throttled, which made every
                  // entry visibly scroll down from the first line.
                  queueMicrotask(() => {
                    if (!lyricsFocus()) return;
                    positionLyrics(false);
                    lyricsReady = true;
                  });
                }}
              >
                <div class="player-lyrics__inner" ref={lyricsInner}>
                  <For each={props.track.lyrics}>
                    {(line, i) => (
                      <div
                        class="player-lyric"
                        classList={{ "is-active": i() === activeIndex() }}
                        role="button"
                        tabindex="0"
                        aria-label={`跳转到：${line.text}`}
                        title="点击跳转到这句"
                        onClick={() => seekToLyric(line.time, i())}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter" && event.key !== " ") return;
                          event.preventDefault();
                          seekToLyric(line.time, i());
                        }}
                      >
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
                  <Show
                    when={props.track.albumId}
                    fallback={<span>“{props.track.album}”</span>}
                  >
                    <button
                      class="player-cover-copy__link"
                      onClick={() => props.onOpenAlbum(props.track.albumId!)}
                    >
                      “{props.track.album}”
                    </button>
                  </Show>
                  <span> · </span>
                  <Show
                    when={artistRefs().length > 0}
                    fallback={<span>{props.track.artist}</span>}
                  >
                    <For each={artistRefs()}>
                      {(artist, index) => (
                        <>
                          <Show when={index() > 0}>
                            <span> / </span>
                          </Show>
                          <button
                            class="player-cover-copy__link"
                            onClick={() => props.onOpenArtist(artist.id)}
                          >
                            {artist.name}
                          </button>
                        </>
                      )}
                    </For>
                  </Show>
                </p>
                <div class="player-cover-copy__meta">
                  <span title="当前请求音质；不可用时自动回退">{displayedQuality()}</span>
                  <span>·</span>
                  <span>网易云音乐</span>
                </div>
                <button class="player-cover-copy__lyrics" onClick={openLyrics}>
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
              <button
                class="player-round-button"
                aria-label="在网易云查看评论"
                title={canOpenSong() ? "在网易云查看评论" : "示例歌曲没有网易云页面"}
                disabled={!canOpenSong()}
                onClick={openComments}
              >
                <Icon name="comment" size={19} />
              </button>
              <button
                class="player-round-button"
                classList={{ "is-active": lyricsFocus() }}
                aria-label="歌词"
                title="歌词"
                onClick={toggleLyrics}
              >
                <Icon name="lyrics" size={19} />
              </button>
            </div>
            <div class="player-controls-center">
              <button class="player-skip" aria-label="上一首" title="上一首" onClick={props.onPrev}>
                <Icon name="prev" size={24} />
              </button>
              <button
                ref={playButton}
                class="player-source-play"
                aria-label={props.playing ? "暂停" : "播放"}
                onClick={props.onTogglePlay}
              >
                <Icon name={props.playing ? "pause-fill" : "play-fill"} size={30} />
              </button>
              <button
                ref={nextButton}
                class="player-skip player-skip--next"
                aria-label="下一首"
                title="下一首"
                onClick={props.onNext}
              >
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
        <aside
          class="player-queue"
          classList={{ "is-open": queueOpen() }}
          aria-label="播放队列"
          aria-hidden={!queueOpen()}
          inert={!queueOpen()}
        >
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
            <Show when={visible()}>
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
            </Show>
          </div>
        </aside>
      </div>

      <div
        ref={clone}
        class="morph-cover"
        aria-hidden="true"
        style={{ visibility: "hidden", display: "none" }}
      >
        <CoverArt palette={props.track.palette} seed={props.track.coverSeed ?? 0} url={props.track.coverUrl} showLabel={false} />
      </div>
    </>
  );
}
