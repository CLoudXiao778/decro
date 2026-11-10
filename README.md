# Decro

> Decro（**De**sktop + **C**irro）是一个面向 Windows 的、非官方的 Cirro 桌面重制版。
> 以 **Cirro 的视觉语言与动效** 为核心，同时提供可用的扫码登录、在线曲库、搜索与播放。

Cirro 原本是一个 Android 音乐播放器，设计上有很强的个人风格：品牌红、流体渐变、玻璃浮层、封面取色、胶囊形 dock、从卡片连续长成全屏播放页的动效，以及逐行/逐字歌词。Decro 把同一套语言搬到桌面，而不是把手机比例放大。项目名称由 desktop 与 Cirro 组合而成，但仍明确标注这是对 Cirro 的非官方重制与致敬。

![status](https://img.shields.io/badge/status-online%20catalog%20%2B%20playback-c92027)
![stack](https://img.shields.io/badge/stack-Tauri%202%20%2B%20Rust%20%2B%20SolidJS-1b1d20)

## 下载

- **Windows 10/11 x64 安装包**：[Decro Desktop 0.5.4 (NSIS .exe)](https://github.com/CLoudXiao778/decro/releases/download/v0.5.4/Decro.Desktop_0.5.4_x64-setup.exe)
- 安装包约 **2.51 MiB**；未签名，首次运行可能触发 SmartScreen 提示。
- 依赖系统 WebView2（Windows 11 自带；较新的 Windows 10 通常已随 Edge 安装）。
- 这是 **0.5.4 版本**：修复新建/添加歌单、随机播放、收藏歌单、最近播放全部和资料库错误提示。

## 当前状态

- **阶段**：0.5.4 · Decro 品牌 + 歌手/专辑页 + Windows 系统媒体控制
- 已通过无线 ADB 获取 alpha42 真机截图，并按真机界面重做了主页、资料库、搜索、详情、播放页与歌词页。
- 已完成：桌面标题栏、图标侧栏、底部播放条、沉浸播放页、全屏歌词、搜索命令面板、主页/分类/资料库/搜索/详情/设置、亮/暗主题、Splash、共享封面转场、响应式布局。
- **0.5.4 P2/P3 修复**：
  - 侧栏新建/添加歌单可用；详情随机播放真正打乱；收藏歌单持久化；最近播放全部安装完整队列；资料库失败显示错误和重试。
  - 歌单详情分享/更多、曲目「⋮」菜单、推荐页文案、命令面板搜索、序号边界、mock 评论、音质档位均已补齐或校正。
  - 删除右侧「正在播放」栏及其入口、组件和样式，改由底部 dock 与沉浸播放页承担播放控制。
- **0.5.3 优化**：
  - 「为你推荐」的「更多」展开全部，不再跳到单个歌单。
  - 删除播放页封面玻璃高光，避免封面加载后出现光柱。
  - 多歌手歌曲的每位歌手可分别点击进入歌手页。
- **0.5.2 资料库优化**：
  - 我的歌单默认展示 8 个常用歌单，数量后「更多」展开全部；最近播放也可展开全部。
  - 移除鼠标滚轮横向翻页，触摸屏/触控板原生滑动保留。
- **0.5.1 审查修复**：
  - 浅色主题歌手/专辑页可读性；歌手/专辑页与歌单的返回层序；搜索状态与滚动位置恢复。
  - 播放页快速打开/关闭卡死、歌词切歌偏移、焦点循环、队列 inert、Space 与音量键冲突。
  - 歌手页改直连接口，专辑列表最多取 1000 张，失败时显示错误。
  - 剩余 P3 已知问题记录在 CHANGELOG。
- **0.5.0 新增**：
  - 歌手页：头像、简介、热门歌曲、专辑列表；专辑页：封面、发行信息、曲目列表。
  - 播放页「专辑 · 歌手」可点击进入对应页面；更多菜单支持查看歌手/专辑、复制歌曲信息、在网易云打开。
  - 搜索页支持下拉切换歌曲/歌单/歌手/专辑/歌词分类，结果可直达对应页面或播放。
  - 喜欢按钮改为爱心；删除重复的三点按钮。
- **0.4.7 优化**：
  - 封面从 dock 放大到播放页、再从播放页归位到 dock 的动画放慢到 700/640ms，克隆在首帧前启动，真实封面落位后再显示。
  - 删除封面下方「专辑 · 艺人」信息行。
- **0.4.6 修复**：
  - 打开播放页时真实封面等克隆落位后再显示，且两者矩形一致，不再出现双封面或最后一帧位移。
  - 删除封面下方「专辑 · 艺人」信息行。
- **0.4.5 修复**：
  - 进入歌词模式时按当前播放进度直接定位到对应行，不再从第一行滚动过去；后续换行仍平滑滚动。
- **0.4.4 新增 / 优化**：
  - 最近播放、我的歌单、为你推荐等横向歌单支持鼠标滚轮左右翻页；到达两端后恢复页面纵向滚动，不新增按钮或滚动条。
  - 移除主页、分类、资料库、搜索页标题右侧的头像/登录标记，只保留标题栏账号入口。
- **0.4.3 修复**：
  - 移除播放页背景封面的 `scale(10)` 巨型合成层，避免退出歌词模式后左上角残留未模糊的大封面。
  - `morph-cover` 克隆层隐藏时使用 `display:none`，切换歌词时主动清理。
- **0.4.2 修复**：
  - 修复点击暂停只改了 UI、音频仍继续播放：暂停 effect 首次运行时 `audio` 尚未初始化，在读取 `playing()` 前就 return，导致 effect 没订阅播放状态。现在先读取信号再判断音频对象。
  - 播放/暂停不再注册自定义 Media Session handler，交回 WebView2 原生 `<audio>` 控制，避免系统暂停后界面/波形继续跑。
  - 用 `audio` 的 `play`/`playing`/`pause` 事件回写界面状态；上一首/下一首仍由自定义 handler 控制。
- **0.4.1 修复**：
  - 播放页进度条不再用波形/直线两个元素做透明度交叉淡入淡出；改为同一个 SVG path 在 500ms 内从曲线形变为直线、再形变回曲线。
  - 波形滚动使用 transform，低性能模式与减少动效设置仍然生效。
- **0.4.0 新增 / 移除**：
  - 接入 Windows SMTC：系统媒体浮层同步歌曲名、歌手、专辑、封面、播放状态和进度；键盘媒体键与系统浮层可播放/暂停、上一首、下一首。
  - 移除未使用的迷你播放器：标题栏入口、迷你窗口、`?mini` 预览和相关样式/截图删除。
- **0.3.2 修复**：
  - 修复点击播放后无声的根因：播放源 effect 误订阅了整首歌曲对象，`loadedmetadata` 更新时长时把同一个音源无限重载，导致 `audio.play()` 每次都被 `AbortError` 中断；实测 17 秒内重载 5688 次。
  - 把音源依赖改为 `id + token` 的 memo，并忽略 `AbortError`；`canplay` 时若仍暂停会自动重试播放。
  - 日志新增可确认的 `audio canplay` / `audio playing` 阶段，继续在 设置 → 实验 → 调试日志 查看。
- **0.3.1 修复 / 诊断**：
  - 修复关闭沉浸播放页后残留大封面/播放层的问题（关闭时封面飞回 dock，结束后强制隐藏播放层与克隆层）。
  - 加入 debug 日志：设置 → 实验 → 调试日志，可打开日志目录；日志覆盖登录、libnetease 请求、音源解析、代理 Range、audio 生命周期与播放拒绝原因。
  - 为 WebView2 加 `--autoplay-policy=no-user-gesture-required`；播放被拦截时会弹出提示，不再静默失败。
- **0.3.0 修复**：
  - 接入 Cirro 原项目的 **libnetease**（C 子模块）处理扫码登录、`os/appver` 音源签名和红心；不再手写网易云加密/播放 URL。
  - 修复 weapi 请求缺少 `Content-Type` 导致网易云返回空 body 的问题；这是之前播放全部失败的根因之一。
  - 保留网页版 Cookie 导入；导入后会同步到 libnetease 的会话 jar。
- **0.2.1 实装**：
  - 项目/应用/安装包/包标识符统一改名为 **Decro**；旧 `cirrodesktop` 登录凭证自动迁移到 `decrodesktop`。
  - 新的 D 字标记与 Decro 品牌文案；设置页和登录页加入对 Cirro 原项目的感谢。
  - 网易云扫码登录（新版 `type=3` 桌面接口），登录态由 Windows DPAPI 加密保存在本机；二维码被风控时支持网页版 Cookie 导入。
  - 在线首页：推荐歌单、新歌速递、每日推荐、最近播放。
  - 资料库：我的歌单、收藏歌单、我喜欢的音乐、最近播放。
  - 搜索：在线歌曲与歌单，结果可直接播放或打开。
  - 播放：Rust 本地音频代理、Range/seek、播放/暂停、上一首/下一首、队列、音量、进度、真实歌词、喜欢/取消喜欢。
- Windows 集成：系统媒体浮层（SMTC）同步歌曲名/歌手/封面/进度，键盘媒体键与系统上一首/下一首可用。
  - 低配自动性能模式（4 线程及以下 CPU 默认开启）、500ms 波形播放/暂停交叉淡入淡出。
- 在线数据来自网易云非官方接口；登录/音源/红心经 `libnetease`，首页/歌单/搜索等仍由 Rust 直连 Web 接口。评论、下载、播客/MV、云盘、听歌上报尚未接入。
- 如果播放仍无声音：打开 设置 → 实验 → 调试日志，把 `decro.log` 发给开发者；日志不包含 Cookie/token。
- 最终目标：Tauri 2 + Rust + libnetease 统一数据层 + 系统 WebView2，安装包控制在 8–12 MB（不含 WebView2）。

### 致谢

- **Cirro 原项目**：[ThripleQ/cirro](https://github.com/ThripleQ/cirro) — 设计语言、交互与动效的源头；Decro 是非官方重制，感谢原作者。
- **libnetease**：[ThripleQ/libnetease](https://github.com/ThripleQ/libnetease) — Cirro 的 C 请求内核，0.3.0 起用于扫码、音源与红心。
- **alpha42 真机截图** — 用于设计研究，仅本地保留，不随仓库发布。
- **Inter / Tauri / SolidJS / 所有开源依赖** — 各自许可证见 `THIRD_PARTY.md` 与锁文件。

### 源版本参考

alpha42 真机截图只保存在本地 `docs/screenshots/apk/`，用于设计研究，**不随公开仓库发布**：它们包含第三方专辑封面、用户收听记录和真实歌词。对应结论已整理进 `docs/apk-analysis.md` 与 `docs/style-audit.md`。

### Decro 桌面截图

| 首页（深色） | 首页（浅色） |
|---|---|
| ![home dark](docs/screenshots/home-dark.png) | ![home light](docs/screenshots/home-light.png) |

| 沉浸播放 | 歌单详情 |
|---|---|
| ![player](docs/screenshots/player.png) | ![detail](docs/screenshots/detail.png) |

| Splash | 设置 |
|---|---|
| ![splash](docs/screenshots/splash.png) | ![settings](docs/screenshots/settings.png) |

## 为什么是这套技术栈

| 方案 | 预估包体 | 取舍 |
|---|---:|---|
| **Tauri 2 + Rust + SolidJS** | **8–12 MB** | 使用 Windows 自带 WebView2；CSS/WebGL 做动效；Rust 做网络、缓存与系统集成 |
| Electron | 100 MB+ | 包体直接失控 |
| Flutter | 25–35 MB | 动效好，但没有必要为这个 UI 付出额外运行时 |
| Qt 6 QML | 30–45 MB | 原生、无 WebView 依赖，但迭代成本高 |
| Compose Desktop | 60 MB+ | 最接近 Android 源，但 JRE 太大 |

“使用内置的”是硬约束：WebView2、DWM/Mica、SMTC、系统通知、系统字体都直接使用 Windows 自带的，不额外打包 Chromium、Node、JRE 或媒体运行库。

## 快速开始

```bash
npm install
npm run dev
```

打开 <http://127.0.0.1:1420>。加 `?nosplash` 可跳过开屏。

```bash
npm run build       # 类型检查 + 生产构建
npm run preview     # 预览构建产物
npm run screenshots # 生成 docs/screenshots（需先启动 dev server）
npm run tauri dev   # 需要 Rust、WebView2 与 Windows（或 Linux WebKitGTK）
```

## 目录

```text
src/
  components/     # 壳、标题栏、dock、播放页、图标、封面、进度条
  pages/          # 主页 / 分类 / 资料库 / 搜索 / 详情 / 设置
  data/           # 浏览器预览数据
  lib/            # 扫码登录、在线 API 适配、播放配置、时间/插值
  styles/         # tokens / base / app / pages
src-tauri/        # Rust 后端：libnetease 子模块、在线 API、本地音频代理、DPAPI
docs/             # 设计、动效、APK 分析、架构、构建、登录
public/fonts/     # Inter（OFL）
```

## 设计文档

- [docs/apk-analysis.md](docs/apk-analysis.md) — 从 APK 解包得到的结构与设计证据
- [docs/design-system.md](docs/design-system.md) — 颜色、字体、形状、布局、组件
- [docs/motion.md](docs/motion.md) — 动效令牌、Splash、共享封面、播放页展开
- [docs/desktop-adaptation.md](docs/desktop-adaptation.md) — 为什么不是“放大的手机”
- [docs/style-audit.md](docs/style-audit.md) — 与源版本的逐项一致性审计
- [docs/architecture.md](docs/architecture.md) — 当前结构与 Tauri 后端规划
- [docs/auth.md](docs/auth.md) — 扫码登录流程、凭证存储与安全边界
- [docs/build.md](docs/build.md) — Windows 构建、CI、包体预算
- [docs/README.md](docs/README.md) — 文档索引

## 重要说明

- 这是一个**非官方**项目，与 Cirro 原作者无关。
- 上游 Cirro 仓库没有提供 LICENSE；本项目不直接复制其代码、Logo、图标或字体资产。图标为自绘 SVG，字体 Inter 使用 OFL 授权。
- 本仓库的代码以 MIT License 发布；上游的专辑封面、歌词与真机截图不属于本仓库。
- 网易云音乐接口属于第三方非官方接口，登录、曲库与播放的可用性由平台策略决定；风险由使用者自行承担。
- 登录优先使用扫码；若网络被风控，可在登录弹窗内导入网页版 `MUSIC_U` 凭证。应用不绕过验证码、风控或版权限制。
- 登录凭证只保存在本机 `%APPDATA%`，由 Windows DPAPI 加密；前端与日志都拿不到 Cookie。
- 音频通过只监听 `127.0.0.1` 的 Rust 代理播放，代理带随机 token；浏览器/前端不直接接触音源签名 URL。
- 当前没有捆绑任何 ONNX 模型；设置页也已移除人声分离入口。

## License

代码：[MIT](LICENSE)。第三方组件与字体许可见 [THIRD_PARTY.md](THIRD_PARTY.md)。
