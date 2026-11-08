import { createSignal } from "solid-js";
import { audioQualities } from "../data/mock";
import { Icon } from "../components/Icon";

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
}) {
  const [quality, setQuality] = createSignal("标准");
  const [volumeBalance, setVolumeBalance] = createSignal(true);
  const [vocal, setVocal] = createSignal(true);
  const [listBlur, setListBlur] = createSignal(true);
  const [oneTake, setOneTake] = createSignal(true);
  const [coverAccent, setCoverAccent] = createSignal(true);
  const [lyricsBlur, setLyricsBlur] = createSignal(true);
  const [translation, setTranslation] = createSignal(true);
  const [fluidBlur, setFluidBlur] = createSignal(false);

  return (
    <div class="page page--settings-source">
      <header class="settings-source__top">
        <button class="settings-close" aria-label="关闭设置" onClick={props.onClose}>
          <Icon name="close" size={26} />
        </button>
        <h1>账户与设置</h1>
        <span class="settings-top-spacer" />
      </header>

      <section class="settings-account">
        <span class="settings-account__avatar">C</span>
        <span class="settings-account__text">
          <b>cloud</b>
          <small>100000001</small>
        </span>
      </section>

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
          <Toggle checked={coverAccent()} onChange={setCoverAccent} label="封面取色" />
        </div>
        <div class="settings-source-row">
          <span class="settings-source-row__text">
            <b>列表渐变模糊</b>
            <small>在搜索页顶部显示渐变模糊。</small>
          </span>
          <Toggle checked={listBlur()} onChange={setListBlur} label="列表渐变模糊" />
        </div>
        <div class="settings-source-row">
          <span class="settings-source-row__text">
            <b>一镜到底动画</b>
            <small>让卡片展开与页面切换自然衔接。</small>
          </span>
          <Toggle checked={oneTake()} onChange={setOneTake} label="一镜到底动画" />
        </div>
      </div>

      <div class="settings-group-label">音频</div>
      <div class="settings-source-list">
        <button class="settings-source-row" onClick={() => setQuality(audioQualities[(audioQualities.indexOf(quality()) + 1) % audioQualities.length])}>
          <span class="settings-source-row__text">
            <b>音频质量</b>
          </span>
          <Picker value={quality()} />
        </button>
        <div class="settings-source-row">
          <span class="settings-source-row__text">
            <b>音量平衡</b>
            <small>自动将歌曲播放音量调节到相同水平。</small>
          </span>
          <Toggle checked={volumeBalance()} onChange={setVolumeBalance} label="音量平衡" />
        </div>
        <div class="settings-source-row">
          <span class="settings-source-row__text">
            <b>人声分离</b>
            <small>在歌词页调节人声大小。关闭后隐藏入口并释放模型。</small>
          </span>
          <Toggle checked={vocal()} onChange={setVocal} label="人声分离" />
        </div>
        <button class="settings-source-row">
          <span class="settings-source-row__text"><b>人声分离模型</b></span>
          <Picker value="Clarity" />
        </button>
        <button class="settings-source-row">
          <span class="settings-source-row__text"><b>人声分离性能</b></span>
          <Picker value="自动" />
        </button>
      </div>

      <div class="settings-group-label">歌词</div>
      <div class="settings-source-list">
        <div class="settings-source-row">
          <span class="settings-source-row__text"><b>歌词模糊</b></span>
          <Toggle checked={lyricsBlur()} onChange={setLyricsBlur} label="歌词模糊" />
        </div>
        <button class="settings-source-row">
          <span class="settings-source-row__text">
            <b>Apple Music 已订阅账号</b>
            <small>登录后可从 Apple Music 获取歌词</small>
          </span>
          <Icon name="chevron-right" size={22} class="settings-source-row__chevron" />
        </button>
        <div class="settings-source-row">
          <span class="settings-source-row__text">
            <b>显示翻译</b>
            <small>在歌词下方显示可用翻译。</small>
          </span>
          <Toggle checked={translation()} onChange={setTranslation} label="显示翻译" />
        </div>
      </div>

      <div class="settings-group-label">实验</div>
      <div class="settings-source-list">
        <div class="settings-source-row">
          <span class="settings-source-row__text"><b>关闭流体背景模糊</b></span>
          <Toggle checked={fluidBlur()} onChange={setFluidBlur} label="关闭流体背景模糊" />
        </div>
      </div>

      <button class="settings-logout" onClick={() => props.onToast("已退出登录")}>
        退出登录
      </button>

    </div>
  );
}
