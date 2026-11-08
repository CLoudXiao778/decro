import { For, Show } from "solid-js";
import type { Playlist, Track } from "../data/mock";
import type { Account } from "../lib/netease";
import { CoverArt } from "../components/CoverArt";
import { Icon } from "../components/Icon";

export function Explore(props: {
  current: Track;
  playing: boolean;
  account: Account | null;
  featured: Playlist | null;
  radar: Playlist | null;
  recent: Track[];
  recommended: Playlist[];
  newSongs: Track[];
  charts: Playlist[];
  loading?: boolean;
  error?: string | null;
  onProfile: () => void;
  onOpenPlaylist: (playlist: Playlist, origin?: HTMLElement) => void;
  onPlayPlaylist: (playlist: Playlist) => void;
  onPlayTrack: (track: Track, context?: Track[]) => void;
}) {
  const featuredTitle = () =>
    props.featured?.kind === "daily" ? "每日推荐" : props.featured?.title ?? "每日推荐";
  const radarTitle = () =>
    props.radar?.kind === "daily" ? "私人雷达" : props.radar?.title ?? "为你推荐";
  const featuredMeta = () =>
    props.featured?.kind === "daily"
      ? `每天 6:00 更新 · ${props.featured.count} 首`
      : props.featured?.subtitle ?? "";
  const featuredKicker = () =>
    props.featured?.kind === "daily" ? "今日更新" : "编辑精选";

  return (
    <div class="page page--explore">
      <header class="source-head">
        <h1 class="source-title">主页</h1>
        <button
          class="source-avatar"
          aria-label="个人资料"
          title="个人资料"
          onClick={props.onProfile}
        >
          <span class="source-avatar__inner">
            {props.account ? props.account.nickname.slice(0, 1).toUpperCase() : "C"}
          </span>
        </button>
      </header>

      <Show when={props.loading || props.error}>
        <div class="catalog-status" classList={{ "is-error": !!props.error }}>
          <Icon name="refresh" size={15} />
          <span>{props.error ? `在线内容加载失败：${props.error}` : "正在同步网易云内容…"}</span>
        </div>
      </Show>

      <section class="feature-grid">
        <Show
          when={props.featured}
          fallback={
            <button class="feature-card" onClick={props.onProfile}>
              <span class="feature-card__shade" />
              <span class="feature-card__content">
                <span class="feature-card__kicker">
                  <Icon name="sparkles" size={13} />
                  登录后开启
                </span>
                <span class="feature-card__title">每日推荐</span>
                <span class="feature-card__meta">扫码登录，获取每天为你生成的歌单</span>
              </span>
            </button>
          }
        >
          {(featured) => (
            <button
              class="feature-card"
              onClick={(event) => props.onOpenPlaylist(featured(), event.currentTarget)}
            >
              <CoverArt
                palette={featured().palette}
                seed={featured().coverSeed ?? 0}
                url={featured().coverUrl}
                class="feature-card__bg"
                showLabel={false}
              />
              <span class="feature-card__shade" />
              <span class="feature-card__content">
                <span class="feature-card__kicker">
                  <Icon name="sparkles" size={13} />
                  {featuredKicker()}
                </span>
                <span class="feature-card__title">{featuredTitle()}</span>
                <span class="feature-card__meta">{featuredMeta()}</span>
              </span>
              <span class="feature-card__play">
                <Icon name="play-fill" size={17} />
              </span>
            </button>
          )}
        </Show>

        <Show
          when={props.radar}
          fallback={
            <button class="feature-card" onClick={props.onProfile}>
              <span class="feature-card__shade" />
              <span class="feature-card__content">
                <span class="feature-card__kicker">
                  <span class="radar-dot" />
                  根据最近的循环
                </span>
                <span class="feature-card__title">私人雷达</span>
                <span class="feature-card__meta">登录后根据你的口味生成</span>
              </span>
            </button>
          }
        >
          {(radar) => (
            <button
              class="feature-card"
              onClick={(event) => props.onOpenPlaylist(radar(), event.currentTarget)}
            >
              <CoverArt
                palette={radar().palette}
                seed={radar().coverSeed ?? 0}
                url={radar().coverUrl}
                class="feature-card__bg"
                showLabel={false}
              />
              <span class="feature-card__shade" />
              <span class="feature-card__content">
                <span class="feature-card__kicker">
                  <span class="radar-dot" />
                  为你推荐
                </span>
                <span class="feature-card__title">{radarTitle()}</span>
                <span class="feature-card__meta">{radar().subtitle}</span>
              </span>
              <span class="feature-card__play">
                <Icon name="play-fill" size={17} />
              </span>
            </button>
          )}
        </Show>
      </section>

      <section class="source-section">
        <div class="source-section__head">
          <h2>最近播放</h2>
          <button class="source-section__more" onClick={() => props.recent[0] && props.onPlayTrack(props.recent[0])}>
            播放全部 <Icon name="play-fill" size={12} />
          </button>
        </div>
        <Show
          when={props.recent.length > 0}
          fallback={<div class="library-empty">登录后，这里会显示你最近听过的歌。</div>}
        >
          <div class="shelf shelf--tall">
            <For each={props.recent.slice(0, 8)}>
              {(track) => (
                <button class="shelf-tile" onClick={() => props.onPlayTrack(track, props.recent)}>
                  <span class="shelf-tile__cover">
                    <CoverArt
                      palette={track.palette}
                      seed={track.coverSeed ?? 0}
                      url={track.coverUrl}
                      showLabel={false}
                    />
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
        </Show>
      </section>

      <section class="source-section">
        <div class="source-section__head">
          <h2>为你推荐</h2>
          <button class="source-section__more" onClick={() => props.recommended[0] && props.onOpenPlaylist(props.recommended[0])}>
            查看更多 <Icon name="chevron-right" size={14} />
          </button>
        </div>
        <div class="shelf shelf--playlist">
          <For each={props.recommended.slice(0, 8)}>
            {(playlist, index) => (
              <button
                class="shelf-tile"
                onClick={(event) => props.onOpenPlaylist(playlist, event.currentTarget)}
              >
                <span class="shelf-tile__cover shelf-tile__cover--square">
                  <CoverArt
                    palette={playlist.palette}
                    seed={playlist.coverSeed ?? index()}
                    url={playlist.coverUrl}
                    showLabel={false}
                  />
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
          <h2>新歌速递</h2>
          <span class="source-section__note">{props.newSongs.length} 首</span>
        </div>
        <Show
          when={props.newSongs.length > 0}
          fallback={<div class="library-empty">暂时没有取到新歌。</div>}
        >
          <div class="source-track-grid">
            <For each={props.newSongs.slice(0, 6)}>
              {(track) => (
                <button
                  class="source-track"
                  classList={{ "is-active": track.id === props.current.id }}
                  onClick={() => props.onPlayTrack(track, props.newSongs)}
                >
                  <span class="source-track__cover">
                    <CoverArt
                      palette={track.palette}
                      seed={track.coverSeed ?? 0}
                      url={track.coverUrl}
                      showLabel={false}
                    />
                  </span>
                  <span class="source-track__text">
                    <b>{track.title}</b>
                    <small>{track.artist}</small>
                  </span>
                  <span class="source-track__play">
                    <Icon
                      name={track.id === props.current.id && props.playing ? "pause-fill" : "play-fill"}
                      size={17}
                    />
                  </span>
                </button>
              )}
            </For>
          </div>
        </Show>
      </section>

      <section class="source-section">
        <div class="source-section__head">
          <h2>热门歌单</h2>
          <span class="source-section__note">来自网易云推荐</span>
        </div>
        <div class="shelf shelf--playlist">
          <For each={props.charts}>
            {(playlist) => (
              <button
                class="shelf-tile"
                onClick={(event) => props.onOpenPlaylist(playlist, event.currentTarget)}
              >
                <span class="shelf-tile__cover shelf-tile__cover--square">
                  <CoverArt
                    palette={playlist.palette}
                    seed={playlist.coverSeed ?? 0}
                    url={playlist.coverUrl}
                    showLabel={false}
                  />
                </span>
                <span class="shelf-tile__title">{playlist.title}</span>
                <span class="shelf-tile__meta">{playlist.subtitle}</span>
              </button>
            )}
          </For>
        </div>
      </section>
    </div>
  );
}
