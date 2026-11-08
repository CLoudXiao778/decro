import { For, Show } from "solid-js";
import type { Page } from "../App";
import type { Playlist } from "../data/mock";
import { CoverArt } from "./CoverArt";
import { Icon, type IconName } from "./Icon";

const navItems: { page: Page; label: string; icon: IconName }[] = [
  { page: "explore", label: "主页", icon: "home" },
  { page: "podcast", label: "分类", icon: "grid" },
  { page: "library", label: "资料库", icon: "library" },
  { page: "search", label: "搜索", icon: "search" },
];

export function Sidebar(props: {
  page: Page;
  collapsed: boolean;
  playlists: Playlist[];
  onToggleCollapsed: () => void;
  onNavigate: (page: Page) => void;
  onOpenPlaylist: (playlist: Playlist) => void;
  onOpenLiked: () => void;
  onOpenDaily: () => void;
  onOpenRecent: () => void;
  onSettings: () => void;
}) {
  return (
    <aside class="sidebar" classList={{ "is-collapsed": props.collapsed }}>
      <nav class="sidebar__nav" aria-label="主导航">
        <For each={navItems}>
          {(item) => (
            <button
              class="nav-item"
              classList={{ "is-active": props.page === item.page }}
              aria-current={props.page === item.page ? "page" : undefined}
              title={props.collapsed ? item.label : undefined}
              onClick={() => props.onNavigate(item.page)}
            >
              <span class="nav-item__icon">
                <Icon name={item.icon} size={19} />
              </span>
              <span class="nav-item__label">{item.label}</span>
              <Show when={props.page === item.page}>
                <span class="nav-item__dot" />
              </Show>
            </button>
          )}
        </For>
      </nav>

      <div class="sidebar__section">
        <div class="sidebar__section-title">
          <span>我的音乐</span>
          <button class="icon-btn icon-btn--tiny" aria-label="新建歌单" title="新建歌单">
            <Icon name="plus" size={14} />
          </button>
        </div>
        <button class="library-row" onClick={props.onOpenLiked}>
          <span class="library-row__icon library-row__icon--like">
            <Icon name="heart-fill" size={15} />
          </span>
          <span class="library-row__label">我喜欢的音乐</span>
          <span class="library-row__count num">328</span>
        </button>
        <button class="library-row" onClick={props.onOpenDaily}>
          <span class="library-row__icon">
            <Icon name="sparkles" size={15} />
          </span>
          <span class="library-row__label">每日推荐</span>
          <span class="library-row__count num">30</span>
        </button>
        <button class="library-row" onClick={props.onOpenRecent}>
          <span class="library-row__icon">
            <Icon name="clock" size={15} />
          </span>
          <span class="library-row__label">最近播放</span>
        </button>
      </div>

      <div class="sidebar__section sidebar__section--playlists">
        <div class="sidebar__section-title">
          <span>歌单</span>
          <button class="icon-btn icon-btn--tiny" aria-label="添加歌单" title="添加歌单">
            <Icon name="plus" size={14} />
          </button>
        </div>
        <div class="sidebar__playlist-scroll">
          <For each={props.playlists.slice(0, 9)}>
            {(playlist) => (
              <button class="playlist-row" onClick={() => props.onOpenPlaylist(playlist)} title={playlist.title}>
                <span class="playlist-row__thumb">
                  <CoverArt palette={playlist.palette} seed={playlist.coverSeed ?? 0} showLabel={false} />
                </span>
                <span class="playlist-row__text">
                  <span class="playlist-row__title">{playlist.title}</span>
                  <span class="playlist-row__meta">{playlist.subtitle}</span>
                </span>
              </button>
            )}
          </For>
        </div>
      </div>

      <div class="sidebar__bottom">
        <button class="profile-chip" onClick={props.onSettings}>
          <span class="profile-chip__avatar">C</span>
          <span class="profile-chip__text">
            <b>cloud</b>
            <small>网易云已连接</small>
          </span>
          <Icon name="more" size={16} class="profile-chip__more" />
        </button>
        <button
          class="sidebar-collapse"
          title={props.collapsed ? "展开侧栏" : "收起侧栏"}
          aria-label={props.collapsed ? "展开侧栏" : "收起侧栏"}
          onClick={props.onToggleCollapsed}
        >
          <Icon name={props.collapsed ? "chevron-right" : "chevron-left"} size={15} />
        </button>
      </div>
    </aside>
  );
}
