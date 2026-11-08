import { createEffect, createSignal, onCleanup } from "solid-js";
import { tracks } from "./data/mock";
import { formatTime } from "./lib/format";
import { CoverArt } from "./components/CoverArt";
import { Icon } from "./components/Icon";
import { ProgressBar } from "./components/ProgressBar";

export function MiniPlayer() {
  const track = tracks[1];
  const [playing, setPlaying] = createSignal(true);
  const [progress, setProgress] = createSignal(96);
  const [liked, setLiked] = createSignal(true);

  createEffect(() => {
    if (!playing()) return;
    const timer = window.setInterval(() => {
      setProgress((value) => (value >= track.durationSec ? 0 : value + 0.5));
    }, 500);
    onCleanup(() => window.clearInterval(timer));
  });

  return (
    <div class="mini-root" data-tauri-drag-region>
      <div class="mini-shell">
        <div class="mini-cover">
          <CoverArt palette={track.palette} seed={track.coverSeed ?? 0} showLabel={false} />
          <span class="mini-live" classList={{ "is-paused": !playing() }}>
            <i />
            {playing() ? "PLAYING" : "PAUSED"}
          </span>
        </div>

        <div class="mini-meta">
          <span class="mini-title">{track.title}</span>
          <span class="mini-artist">{track.artist}</span>
          <div class="mini-progress">
            <span class="num">{formatTime(progress())}</span>
            <ProgressBar value={progress()} duration={track.durationSec} onSeek={setProgress} compact />
            <span class="num">{track.duration}</span>
          </div>
        </div>

        <div class="mini-actions">
          <button
            class="icon-btn mini-like"
            classList={{ "is-liked": liked() }}
            aria-label={liked() ? "取消喜欢" : "喜欢"}
            onClick={() => setLiked((value) => !value)}
          >
            <Icon name={liked() ? "heart-fill" : "heart"} size={16} />
          </button>
          <button class="icon-btn" aria-label="上一首">
            <Icon name="prev" size={17} />
          </button>
          <button class="mini-play" aria-label={playing() ? "暂停" : "播放"} onClick={() => setPlaying((v) => !v)}>
            <Icon name={playing() ? "pause-fill" : "play-fill"} size={17} />
          </button>
          <button class="icon-btn" aria-label="下一首">
            <Icon name="next" size={17} />
          </button>
          <button
            class="icon-btn mini-expand"
            aria-label="回到主窗口"
            title="回到主窗口"
            onClick={() => {
              if (window.opener) {
                window.opener.focus();
                window.close();
              } else {
                window.location.href = "/";
              }
            }}
          >
            <Icon name="expand" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
