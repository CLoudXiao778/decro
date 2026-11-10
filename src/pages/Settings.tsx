import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { Icon } from "../components/Icon";
import type { Account } from "../lib/auth";
import { LOG_LEVELS, type LogLevel } from "../lib/log";
import { qualityOptions, type QualityLevel } from "../lib/quality";

function Toggle(props: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      class="source-switch"
      classList={{ "is-on": props.checked }}
      role="switch"
      aria-checked={props.checked}
      aria-label={props.label}
      onClick={() => props.onChange(!props.checked)}
    >
      <span />
    </button>
  );
}

function Picker(props: { value: string }) {
  return (
    <span class="settings-picker">
      <span>{props.value}</span>
      <span class="settings-picker__chevrons" aria-hidden="true">
        <Icon name="chevron-down" size={16} class="rotate-180" />
        <Icon name="chevron-down" size={16} />
      </span>
    </span>
  );
}

function SettingsDropdown(props: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  ariaLabel: string;
}) {
  const [open, setOpen] = createSignal(false);
  const [up, setUp] = createSignal(false);
  let button!: HTMLButtonElement;

  const currentLabel = () =>
    props.options.find((option) => option.value === props.value)?.label ?? props.value;

  onMount(() => {
    const closeMenu = (event: PointerEvent) => {
      if (!open()) return;
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".settings-quality")) setOpen(false);
    };
    window.addEventListener("pointerdown", closeMenu);
    onCleanup(() => window.removeEventListener("pointerdown", closeMenu));
  });

  return (
    <div class="settings-quality" classList={{ "is-up": up() }}>
      <button
        ref={button}
        class="settings-quality__button"
        aria-haspopup="listbox"
        aria-expanded={open()}
        aria-label={props.ariaLabel}
        onClick={() => {
          setOpen((value) => {
            const next = !value;
            if (next) {
              const rect = button?.getBoundingClientRect();
              setUp(!!rect && rect.bottom + 260 > window.innerHeight);
            }
            return next;
          });
        }}
      >
        <span>{currentLabel()}</span>
        <Icon name="chevron-down" size={15} />
      </button>
      <Show when={open()}>
        <div class="settings-quality__menu" role="listbox" aria-label={props.ariaLabel}>
          <For each={props.options}>
            {(option) => (
              <button
                role="option"
                aria-selected={props.value === option.value}
                classList={{ "is-active": props.value === option.value }}
                onClick={() => {
                  props.onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

export function SettingsPage(props: {
  theme: "dark" | "light";
  onTheme: (theme: "dark" | "light") => void;
  onToast: (message: string) => void;
  onClose: () => void;
  lowPower: boolean;
  onLowPower: (value: boolean) => void;
  coverAccent: boolean;
  onCoverAccent: (value: boolean) => void;
  showTranslation: boolean;
  onShowTranslation: (value: boolean) => void;
  defaultQuality: QualityLevel;
  onDefaultQuality: (value: QualityLevel) => void;
  logLevel: LogLevel;
  onLogLevel: (value: LogLevel) => void;
  account: Account | null;
  onLogin: () => void;
  onLogout: () => void;
  onOpenLogs: () => void;
}) {
  return (
    <div class="page page--settings-source">
      <header class="settings-source__top">
        <button class="settings-close" aria-label="关闭设置" onClick={props.onClose}>
          <Icon name="close" size={26} />
        </button>
        <h1>账户与设置</h1>
        <span class="settings-top-spacer" />
      </header>

      <button
        class="settings-account"
        classList={{ "is-logged-in": !!props.account }}
        onClick={() => {
          if (!props.account) props.onLogin();
        }}
      >
        <span class="settings-account__avatar">
          {props.account ? props.account.nickname.slice(0, 1).toUpperCase() : "D"}
        </span>
        <span class="settings-account__text">
          <b>{props.account ? props.account.nickname : "网易云未登录"}</b>
          <small>{props.account ? `ID ${props.account.userId}` : "点击扫码登录"}</small>
        </span>
        <Show when={!props.account}>
          <span class="settings-account__chevron">
            <Icon name="chevron-right" size={22} />
          </span>
        </Show>
      </button>

      <div class="settings-group-label">个性化</div>
      <div class="settings-source-list">
        <button class="settings-source-row" onClick={() => props.onTheme(props.theme === "dark" ? "light" : "dark")}>
          <span class="settings-source-row__text">
            <b>主题</b>
            <small>跟随系统，或固定为浅色 / 深色。</small>
          </span>
          <Picker value={props.theme === "dark" ? "深色" : "浅色"} />
        </button>
        <div class="settings-source-row">
          <span class="settings-source-row__text">
            <b>封面取色</b>
            <small>让播放页的环境光跟随当前封面。</small>
          </span>
          <Toggle checked={props.coverAccent} onChange={props.onCoverAccent} label="封面取色" />
        </div>
      </div>

      <div class="settings-group-label">音质</div>
      <div class="settings-source-list">
        <div class="settings-source-row">
          <span class="settings-source-row__text">
            <b>默认音质</b>
            <small>每次播放时向网易云请求的音质；不可用时自动回退到较低档位。</small>
          </span>
          <SettingsDropdown
            value={props.defaultQuality}
            options={qualityOptions}
            onChange={(value) => props.onDefaultQuality(value as QualityLevel)}
            ariaLabel="默认音质"
          />
        </div>
      </div>

      <div class="settings-group-label">歌词</div>
      <div class="settings-source-list">
        <div class="settings-source-row">
          <span class="settings-source-row__text">
            <b>显示翻译</b>
            <small>在歌词下方显示可用翻译。</small>
          </span>
          <Toggle checked={props.showTranslation} onChange={props.onShowTranslation} label="显示翻译" />
        </div>
      </div>

      <div class="settings-group-label">日志</div>
      <div class="settings-source-list">
        <div class="settings-source-row">
          <span class="settings-source-row__text">
            <b>日志级别</b>
            <small>Debug 记录全部；Info 常规；Warn 仅非致命错误；Error 仅崩溃或无法继续；None 关闭日志。</small>
          </span>
          <SettingsDropdown
            value={props.logLevel}
            options={LOG_LEVELS}
            onChange={(value) => props.onLogLevel(value as LogLevel)}
            ariaLabel="日志级别"
          />
        </div>
      </div>

      <div class="settings-group-label">实验</div>
      <div class="settings-source-list">
        <div class="settings-source-row">
          <span class="settings-source-row__text">
            <b>性能模式</b>
            <small>降低背景模糊、玻璃与动效开销，适合低配电脑。</small>
          </span>
          <Toggle checked={props.lowPower} onChange={props.onLowPower} label="性能模式" />
        </div>
        <button class="settings-source-row" onClick={props.onOpenLogs}>
          <span class="settings-source-row__text">
            <b>调试日志</b>
            <small>播放/登录异常时打开日志目录，把 decro.log 发给开发者。</small>
          </span>
          <Icon name="chevron-right" size={22} class="settings-source-row__chevron" />
        </button>
      </div>

      <Show when={props.account}>
        <button class="settings-logout" onClick={props.onLogout}>
          退出登录
        </button>
      </Show>

      <p class="settings-thanks">
        Decro 是对 Cirro 的非官方重制。感谢 Cirro 原项目、alpha42 真机参考与所有开源依赖。
      </p>
    </div>
  );
}
