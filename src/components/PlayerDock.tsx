import type { Track } from "../data/mock";
import { CoverArt } from "./CoverArt";
import { Icon } from "./Icon";

export function PlayerDock(props: {
  track: Track;
  playing: boolean;
  progress: number;
  volume: number;
  liked: boolean;
  hidden: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (value: number) => void;
  onVolume: (value: number) => void;
  onToggleLike: () => void;
  onOpenPlayer: () => void;
  onOpenQueue: () => void;
  onOpenLyrics: () => void;
}) {
  const fraction = () => Math.min(1, Math.max(0, props.progress / props.track.durationSec));

  return (
    <div id="player-dock" class="player-dock source-dock" classList={{ "is-hidden": props.hidden }} aria-label="迷你播放条">
      <button
        id="dock-cover"
        class="source-dock__cover"
        onClick={props.onOpenPlayer}
        aria-label="打开播放页"
        title="打开播放页"
      >
        <CoverArt palette={props.track.palette} seed={props.track.coverSeed ?? 0} showLabel={false} />
      </button>

      <button class="source-dock__meta" onClick={props.onOpenPlayer} aria-label="打开播放页">
        <span>{props.track.title}</span>
        <small>{props.track.artist}</small>
      </button>

      <div class="source-dock__actions">
        <button
          class="source-dock__button"
          aria-label={props.playing ? "暂停" : "播放"}
          onClick={props.onTogglePlay}
        >
          <Icon name={props.playing ? "pause-fill" : "play-fill"} size={24} />
        </button>
        <button class="source-dock__button" aria-label="下一首" onClick={props.onNext}>
          <Icon name="next" size={24} />
        </button>
      </div>

      <div class="source-dock__progress" aria-hidden="true">
        <span style={{ width: `${fraction() * 100}%` }} />
      </div>
    </div>
  );
}
