import { BrandMark } from "./CoverArt";
import { Icon } from "./Icon";
import type { Page } from "../App";

export function Titlebar(props: {
  theme: "dark" | "light";
  page: Page;
  railOpen: boolean;
  canGoBack: boolean;
  onToggleTheme: () => void;
  onToggleRail: () => void;
  onOpenSearch: () => void;
  onMini: () => void;
  onBack: () => void;
  onForward: () => void;
  onSettings: () => void;
}) {
  const minimize = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().minimize();
    } catch {
      /* browser preview */
    }
  };
  const maximize = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().toggleMaximize();
    } catch {
      /* browser preview */
    }
  };
  const close = async () => {
    try {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      await getCurrentWindow().close();
    } catch {
      /* browser preview */
    }
  };

  return (
    <header class="titlebar" data-tauri-drag-region>
      <div class="titlebar__brand" data-tauri-drag-region>
        <div class="brand-mark">
          <BrandMark size={25} />
        </div>
        <span>Cirro</span>
        <small>DESKTOP</small>
      </div>

      <div class="titlebar__history">
        <button class="icon-btn icon-btn--sm" aria-label="后退" disabled={!props.canGoBack} onClick={props.onBack}>
          <Icon name="chevron-left" size={17} />
        </button>
        <button class="icon-btn icon-btn--sm" aria-label="前进" disabled={true} onClick={props.onForward}>
          <Icon name="chevron-right" size={17} />
        </button>
      </div>

      <button class="search-trigger" onClick={props.onOpenSearch} aria-label="搜索">
        <Icon name="search" size={15} />
        <span>搜索歌曲、歌手、专辑</span>
        <kbd>Ctrl K</kbd>
      </button>

      <div class="titlebar__spacer" data-tauri-drag-region />

      <div class="titlebar__actions">
        <button class="icon-btn icon-btn--sm" title="迷你播放器" aria-label="迷你播放器" onClick={props.onMini}>
          <Icon name="grid" size={16} />
        </button>
        <button class="icon-btn icon-btn--sm" title="切换主题" aria-label="切换主题" onClick={props.onToggleTheme}>
          <Icon name={props.theme === "dark" ? "sun" : "moon"} size={17} />
        </button>
        <button
          class="icon-btn icon-btn--sm"
          title={props.railOpen ? "收起正在播放" : "展开正在播放"}
          aria-label="正在播放侧栏"
          onClick={props.onToggleRail}
        >
          <Icon name="waves" size={17} />
        </button>
        <button class="icon-btn icon-btn--sm" title="设置" aria-label="设置" onClick={props.onSettings}>
          <Icon name="settings" size={17} />
        </button>
      </div>

      <div class="window-controls">
        <button aria-label="最小化" onClick={minimize}>
          <Icon name="minimize" size={13} />
        </button>
        <button aria-label="最大化" onClick={maximize}>
          <Icon name="maximize" size={12} />
        </button>
        <button class="window-controls__close" aria-label="关闭" onClick={close}>
          <Icon name="close" size={13} />
        </button>
      </div>
    </header>
  );
}
