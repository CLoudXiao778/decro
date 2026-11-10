import { createEffect, createSignal, For, on, onCleanup, onMount, Show } from "solid-js";
import type { Playlist, Track } from "../data/mock";
import { CoverArt } from "../components/CoverArt";
import { Icon } from "../components/Icon";
import { openPlaylistPage } from "../lib/system";

export function DetailPage(props: {
  playlist: Playlist;
  origin?: DOMRect | null;
  onOriginConsumed?: () => void;
  current: Track;
  playing: boolean;
  liked: (track: Track) => boolean;
  onPlayPlaylist: (playlist: Playlist, shuffle?: boolean) => void;
  onPlayTrack: (track: Track, context?: Track[]) => void;
  onToggleLike: (track: Track) => void;
  onSetPlaylistSubscribed: (playlist: Playlist, subscribed: boolean) => Promise<boolean>;
  onToast: (message: string) => void;
  onBack: () => void;
  onOpenPlaylist: (playlist: Playlist, origin?: HTMLElement) => void;
  loading?: boolean;
}) {
  const [liked, setLiked] = createSignal(!!props.playlist.subscribed);
  const [moreOpen, setMoreOpen] = createSignal(false);
  const [trackMenu, setTrackMenu] = createSignal<{ track: Track; x: number; y: number } | null>(null);
  createEffect(on(
    () => props.playlist.id,
    () => setLiked(!!props.playlist.subscribed),
  ));

  const playlistUrl = () =>
    /^\d+$/.test(props.playlist.id)
      ? `https://music.163.com/#/playlist?id=${props.playlist.id}`
      : "";

  const copyPlaylistLink = async () => {
    const url = playlistUrl();
    if (!url) {
      props.onToast("这个歌单没有可分享的链接");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      props.onToast("歌单链接已复制");
    } catch {
      props.onToast("复制失败，请检查剪贴板权限");
    }
    setMoreOpen(false);
  };

  const openPlaylistInNetEase = () => {
    if (!playlistUrl()) {
      props.onToast("这个歌单没有网易云链接");
      return;
    }
    void openPlaylistPage(props.playlist.id).catch((error) =>
      props.onToast(typeof error === "string" ? error : "打开网易云页面失败"),
    );
    setMoreOpen(false);
  };

  const copyTrackInfo = async (track: Track) => {
    try {
      await navigator.clipboard.writeText(`${track.title} - ${track.artist}`);
      props.onToast("歌曲信息已复制");
    } catch {
      props.onToast("复制失败，请检查剪贴板权限");
    }
    setTrackMenu(null);
  };

  onMount(() => {
    const closeMenus = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".detail-more-menu") && !target?.closest(".detail-source__top .detail-circle")) {
        setMoreOpen(false);
      }
      if (!target?.closest(".detail-track-menu") && !target?.closest(".detail-track__more")) {
        setTrackMenu(null);
      }
    };
    window.addEventListener("pointerdown", closeMenus);
    onCleanup(() => window.removeEventListener("pointerdown", closeMenus));
  });

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
        <button class="detail-circle" aria-label="分享" title="分享" onClick={() => void copyPlaylistLink()}>
          <Icon name="share" size={22} />
        </button>
        <button
          class="detail-circle"
          aria-label="更多"
          title="更多"
          aria-expanded={moreOpen()}
          onClick={() => setMoreOpen((value) => !value)}
        >
          <Icon name="more" size={22} />
        </button>
        <Show when={moreOpen()}>
          <div class="detail-more-menu">
            <button onClick={() => void copyPlaylistLink()}>
              <Icon name="share" size={15} />
              复制歌单链接
            </button>
            <button onClick={openPlaylistInNetEase}>
              <Icon name="cast" size={15} />
              在网易云打开
            </button>
          </div>
        </Show>
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
          <button class="detail-action-square" aria-label="随机播放" onClick={() => props.onPlayPlaylist(props.playlist, true)}>
            <Icon name="shuffle" size={25} />
          </button>
          <button class="detail-source__play" aria-label="播放全部" onClick={() => props.onPlayPlaylist(props.playlist)}>
            <Icon name="play-fill" size={28} />
          </button>
          <button
            class="detail-action-square"
            classList={{ "is-liked": liked() }}
            aria-label={liked() ? "取消收藏歌单" : "收藏歌单"}
            onClick={() => {
              const next = !liked();
              void props
                .onSetPlaylistSubscribed(props.playlist, next)
                .then((ok) => {
                  if (ok) setLiked(next);
                });
            }}
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
              <span
                class="detail-track__more"
                role="button"
                tabindex="0"
                aria-label="曲目更多操作"
                onClick={(event) => {
                  event.stopPropagation();
                  const rect = event.currentTarget.getBoundingClientRect();
                  setTrackMenu({
                    track,
                    x: Math.min(rect.right, window.innerWidth - 176),
                    y: rect.bottom + 6,
                  });
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  event.stopPropagation();
                  const rect = event.currentTarget.getBoundingClientRect();
                  setTrackMenu({
                    track,
                    x: Math.min(rect.right, window.innerWidth - 176),
                    y: rect.bottom + 6,
                  });
                }}
              >
                <Icon name="more-vertical" size={20} />
              </span>
            </button>
          )}
        </For>
      </div>
      <Show when={trackMenu()}>
        {(menu) => (
          <div
            class="detail-track-menu"
            style={{ left: `${menu().x}px`, top: `${menu().y}px` }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              onClick={() => {
                props.onPlayTrack(menu().track, props.playlist.tracks ?? []);
                setTrackMenu(null);
              }}
            >
              播放
            </button>
            <button
              onClick={() => {
                props.onToggleLike(menu().track);
                setTrackMenu(null);
              }}
            >
              {props.liked(menu().track) ? "取消喜欢" : "喜欢"}
            </button>
            <button onClick={() => void copyTrackInfo(menu().track)}>复制歌曲信息</button>
          </div>
        )}
      </Show>
    </div>
  );
}
