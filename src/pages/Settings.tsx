import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { Icon } from "../components/Icon";
import type { Account } from "../lib/auth";
import { qualityLabel, qualityOptions, type QualityLevel } from "../lib/quality";

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
  account: Account | null;
  onLogin: () => void;
  onLogout: () => void;
  onOpenLogs: () => void;
}) {
  const [qualityOpen, setQualityOpen] = createSignal(false);
  const [qualityUp, setQualityUp] = createSignal(false);
  let qualityButton!: HTMLButtonElement;

  onMount(() => {
    const closeMenu = (event: PointerEvent) => {
      if (!qualityOpen()) return;
      const target = event.target as HTMLElement | null;
      if (!target?.closest(".settings-quality")) setQualityOpen(false);
    };
    window.addEventListener("pointerdown", closeMenu);
    onCleanup(() => window.removeEventListener("pointerdown", closeMenu));
  });

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
          <div class="settings-quality" classList={{ "is-up": qualityUp() }}>
            <button
              ref={qualityButton}
              class="settings-quality__button"
              aria-haspopup="listbox"
              aria-expanded={qualityOpen()}
              aria-label="默认音质"
              onClick={() => {
                setQualityOpen((value) => {
                  const next = !value;
                  if (next) {
                    const rect = qualityButton?.getBoundingClientRect();
                    setQualityUp(!!rect && rect.bottom + 260 > window.innerHeight);
                  }
                  return next;
                });
              }}
            >
              <span>{qualityLabel(props.defaultQuality)}</span>
              <Icon name="chevron-down" size={15} />
            </button>
            <Show when={qualityOpen()}>
              <div class="settings-quality__menu" role="listbox" aria-label="默认音质">
                <For each={qualityOptions}>
                  {(option) => (
                    <button
                      role="option"
                      aria-selected={props.defaultQuality === option.value}
                      classList={{ "is-active": props.defaultQuality === option.value }}
                      onClick={() => {
                        props.onDefaultQuality(option.value);
                        setQualityOpen(false);
                      }}
                    >
                      {option.label}
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </div>
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
