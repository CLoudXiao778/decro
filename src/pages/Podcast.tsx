import { For } from "solid-js";
import type { Track } from "../data/mock";
import { playlists } from "../data/mock";
import { CoverArt } from "../components/CoverArt";

const genres = [
  { name: "City Pop", meta: "城市流行 · 64 首", index: 5 },
  { name: "Synthwave", meta: "复古合成器 · 42 首", index: 1 },
  { name: "Ambient", meta: "环境音乐 · 51 首", index: 3 },
  { name: "Jazz", meta: "爵士 · 29 首", index: 4 },
  { name: "华语", meta: "华语流行 · 128 首", index: 0 },
  { name: "日系", meta: "J-Pop · 96 首", index: 7 },
  { name: "独立", meta: "Indie · 76 首", index: 2 },
  { name: "电子", meta: "Electronic · 88 首", index: 6 },
];

export function PodcastPage(props: {
  onPlayTrack: (track: Track) => void;
  onOpenPlaylist: (playlist: (typeof playlists)[number], origin?: HTMLElement) => void;
}) {
  return (
    <div class="page page--categories">
      <header class="source-head">
        <h1 class="source-title">分类</h1>
        <button class="source-avatar" aria-label="个人资料" title="个人资料">
          <span class="source-avatar__inner">C</span>
        </button>
      </header>

      <div class="category-grid">
        <For each={genres}>
          {(genre) => {
            const palette = playlists[genre.index % playlists.length].palette;
            return (
              <button
                class="category-card"
                onClick={(event) => props.onOpenPlaylist(playlists[genre.index % playlists.length], event.currentTarget)}
              >
                <CoverArt palette={palette} seed={genre.index} class="category-card__bg" showLabel={false} />
                <span class="category-card__shade" />
                <span class="category-card__name">{genre.name}</span>
                <span class="category-card__meta">{genre.meta}</span>
              </button>
            );
          }}
        </For>
      </div>
    </div>
  );
}
