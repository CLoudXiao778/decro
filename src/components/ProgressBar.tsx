import { createSignal, Show } from "solid-js";

export function ProgressBar(props: {
  value: number;
  duration: number;
  onSeek: (value: number) => void;
  compact?: boolean;
  showThumb?: boolean;
  class?: string;
}) {
  const [dragging, setDragging] = createSignal(false);
  let track!: HTMLDivElement;

  const fraction = () => (props.duration > 0 ? Math.min(1, Math.max(0, props.value / props.duration)) : 0);

  const seekFromEvent = (event: PointerEvent) => {
    const rect = track.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    props.onSeek(f * props.duration);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    setDragging(true);
    track.setPointerCapture(event.pointerId);
    seekFromEvent(event);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!dragging()) return;
    seekFromEvent(event);
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!dragging()) return;
    setDragging(false);
    try {
      track.releasePointerCapture(event.pointerId);
    } catch {
      /* noop */
    }
  };

  return (
    <div
      ref={track}
      class={`progress ${props.compact ? "progress--compact" : ""} ${props.class ?? ""}`}
      classList={{ "is-dragging": dragging() }}
      role="slider"
      aria-label="播放进度"
      aria-valuemin={0}
      aria-valuemax={Math.round(props.duration)}
      aria-valuenow={Math.round(props.value)}
      tabindex="0"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") props.onSeek(Math.min(props.duration, props.value + 5));
        if (event.key === "ArrowLeft") props.onSeek(Math.max(0, props.value - 5));
      }}
    >
      <div class="progress__track">
        <div class="progress__fill" style={{ width: `${fraction() * 100}%` }}>
          <Show when={props.showThumb !== false}>
            <span class="progress__thumb" />
          </Show>
        </div>
      </div>
    </div>
  );
}

export function VolumeBar(props: { value: number; onInput: (value: number) => void }) {
  let track!: HTMLDivElement;
  const seek = (event: PointerEvent) => {
    const rect = track.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    props.onInput(f);
  };
  return (
    <div
      ref={track}
      class="volume-bar"
      role="slider"
      aria-label="音量"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(props.value * 100)}
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
          props.onInput(Math.min(1, props.value + 0.05));
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          props.onInput(Math.max(0, props.value - 0.05));
        }
      }}
    >
      <div class="volume-bar__track">
        <div class="volume-bar__fill" style={{ width: `${props.value * 100}%` }} />
      </div>
    </div>
  );
}
