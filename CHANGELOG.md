# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 与语义化版本。

## [Unreleased]

### Planned

- 评论、下载/离线、播客/MV、云盘、听歌上报。
- 系统托盘、登录状态与主窗口播放状态同步。
- 更完整的歌单管理（创建、收藏、排序）与逐字歌词。

## [0.4.6] - 2026-11-09

修复打开播放页时封面硬切归位，并删除封面下方多余的一行信息。

### Fixed

- 打开播放页时，morph 克隆改为在播放页重绘前启动；真实封面在克隆落位前保持隐藏，落位后再瞬间显示，避免克隆迟到、真实封面先出现造成的双封面与硬切。
- 播放页内容不再整体上移 12px：`.player-body` 只做透明度淡入，避免封面在测量克隆终点后再次位移，导致最后一帧对不上。
- 真实封面不再做 `scale(0.985) → 1` 和透明度过渡；克隆落位时两处封面矩形完全一致，切换无位移。
- 删除封面下方「专辑 · 艺人」那一行（`.player-under`），右侧标题区已有完整信息。

### Changed

- 版本号 0.4.6；其余功能与 0.4.5 相同。

## [0.4.5] - 2026-11-09

修复每次进入歌词页都从第一行滚动到当前位置。

### Fixed

- 歌词视图挂载时，在首帧绘制前直接把内容定位到当前进度对应的歌词行；初始进入不再播放「第一行 → 当前行」的 450ms 滚动动画。
- 初始定位使用歌词容器 ref + `queueMicrotask`，避免 `requestAnimationFrame` 被 WebView2 节流时先画出第一行。
- 进入后歌词继续随播放进度换行时，仍保留原来的 450ms 平滑滚动。
- 关闭再打开播放页、退出再进入歌词模式，都会按当前进度恢复位置。

### Changed

- 版本号 0.4.5；其余功能与 0.4.4 相同。
- 发布 Windows 10/11 x64 NSIS 安装包 `v0.4.5`，约 **2.49 MiB**（2,611,507 bytes），由 GitHub Actions `windows-latest` 构建；未签名。
- SHA256：`519ad12217ea81d7fac9d71eb632834ad4a8a8d3c2adaf4f5d941125651c2259`。

## [0.4.4] - 2026-11-09

资料库/主页歌单支持滚轮横向翻页，并精简页面头像。

### Added

- 横向歌单（最近播放、我的歌单、为你推荐、热门歌单等）支持鼠标滚轮左右滚动：指针在歌单上时，向下滚向右翻、向上滚向左翻；到两端后恢复页面纵向滚动。
- 保留触摸屏/触控板原生的横向滑动，不增加翻页按钮或额外滚动条。

### Changed

- 移除主页、分类、资料库、搜索页标题右侧的账号头像/登录标记；账号入口只保留标题栏那一处。
- 版本号 0.4.4；播放、媒体控制、歌词与进度条逻辑不变。
- 发布 Windows 10/11 x64 NSIS 安装包 `v0.4.4`，约 **2.49 MiB**（2,612,495 bytes），由 GitHub Actions `windows-latest` 构建；未签名。
- SHA256：`fd632e5aac76132c65ae349aad4012974195da42e357188919efa58a4bd8fb02`。

## [0.4.3] - 2026-11-09

修复退出歌词模式后左上角残留大封面。

### Fixed

- 移除 `.player-backdrop__cover` 的 `20vmax` + `scale(10)` 巨型缩放层。它会在歌词模式切换重绘后留下一个未模糊的封面磁贴（截图中左上角的大封面）；现在改为普通全屏大小 + `blur(64px)` 的封面背景。
- 低性能模式保留 `blur(7px)`，但不再使用 `scale(10)`，避免同样的合成层残留。
- `morph-cover` 克隆层在隐藏时改为 `display:none`，并在切换歌词/打开歌词时主动清理；不再只设置 `visibility:hidden`，避免 WebView2 留下可复用的旧图层。
- 版本号 0.4.3；播放/登录/媒体控制逻辑不变。
- 发布 Windows 10/11 x64 NSIS 安装包 `v0.4.3`，约 **2.49 MiB**（2,612,372 bytes），由 GitHub Actions `windows-latest` 构建；未签名。
- SHA256：`3090bc0d6f8e043cb4c200c77730a72dfe00308060c55d5c5127066a88560079`。

## [0.4.2] - 2026-11-09

修复 Windows 媒体控制播放/暂停与界面状态不同步。

### Fixed

- 修复点击暂停后进度条继续跑：暂停 effect 在首次运行时 `audio` 还是 `null`，在读取 `playing()` 之前就 return，导致 effect 永远没有订阅播放状态；点击暂停只改了 UI/波形，`<audio>` 实际仍在播放。现在先读取 `playing()` 再判断 `audio`，恢复播放也走同一条路径。
- 顺带修复音量 effect 的同类问题：首次运行未订阅 `volume()`，初始化后的音量变化可能不生效。
- 不再为 Media Session 的 `play`/`pause` 注册自定义 handler。WebView2 会优先用原生媒体行为控制 `<audio>`，自定义 handler 被绕过时会出现「界面显示暂停但进度继续跑」或系统播放/暂停无效。
- 播放/暂停交回 WebView2 原生行为；监听 `<audio>` 的 `play` / `playing` / `pause` 事件回写 `playing` 状态，界面、波形动画与系统媒体状态保持一致。
- 所有 `<audio>` 的真实 `pause` 事件都会回写状态；切歌通过 `src`/`load()` 不会产生 `pause`，不会误判。
- 上一首/下一首仍由 `nexttrack` / `previoustrack` 自定义 handler 控制；歌名、专辑、封面与进度同步保持不变。

### Changed

- 版本号 0.4.2；其余功能与 0.4.1 相同。
- 发布 Windows 10/11 x64 NSIS 安装包 `v0.4.2`，约 **2.49 MiB**（2,611,200 bytes），由 GitHub Actions `windows-latest` 构建；未签名。
- SHA256：`4568b7b09e5d0f5c9ef6fc82f238c9904e38b4301e19a7bf468ae17019e635b0`。

## [0.4.1] - 2026-11-09

进度条由交叉淡入淡出改为单条路径形变。

### Changed

- 播放页进度条不再用「波形元素 + 直线元素」500ms 透明度交叉淡入淡出，也不再隐藏任一元素。
- 改为同一个 SVG `path`：播放时是持续横向流动的波浪线，暂停时在 500ms 内从曲线形变为直线，恢复时再形变为曲线。
- 波形滚动改用 `transform: translateX`，低性能模式仍为 2.4s；`prefers-reduced-motion` 下关闭滚动并即时切换形态。
- 版本号 0.4.1；其余功能与 0.4.0 相同。
- 发布 Windows 10/11 x64 NSIS 安装包 `v0.4.1`，约 **2.49 MiB**（2,610,536 bytes），由 GitHub Actions `windows-latest` 构建；未签名。
- SHA256：`1449073959a505ec744beafb6df945cef5503d94873b2ededb9d7c6dd84cc562`。

## [0.4.0] - 2026-11-09

Windows 系统媒体集成，并移除未使用的迷你播放器。

### Added

- 接入 Windows **System Media Transport Controls (SMTC)**：系统媒体浮层显示歌曲名、歌手、专辑、封面、播放状态与进度。
- 键盘媒体键与 Windows 媒体浮层的播放/暂停、上一首、下一首现在会直接控制 Decro；暂停/播放状态会回写系统。
- 通过 WebView2 自带的 Media Session → SMTC 桥接，封面直接由歌曲封面 URL 提供；不再额外创建原生会话，避免重复媒体条目和双重按键。
- 前端新增 `src/lib/media.ts`：同步元数据/播放状态/进度，并绑定播放、暂停、上一首、下一首和停止动作；日志记录按键与 Media Session 错误。

### Removed

- 移除未使用的迷你播放器：标题栏入口、440×160 迷你窗口、`?mini` 浏览器预览、`MiniPlayer` 组件及相关样式/截图全部删除。

### Changed

- 版本号 0.4.0；播放与登录架构不变。
- 发布 Windows 10/11 x64 NSIS 安装包 `v0.4.0`，约 **2.49 MiB**（2,610,783 bytes），由 GitHub Actions `windows-latest` 构建；未签名。
- SHA256：`5920865d8bc4a0d2f2064c702dc2073da8ea0204363771e7f9cf5a26c1600f3f`。

## [0.3.2] - 2026-11-09

修复点击播放后始终无声的问题。

### Fixed

- 修复播放源 effect 误订阅整个 `current()` 歌曲对象的问题：`loadedmetadata` 更新时长会创建新对象，触发 effect 重新设置 `audio.src` 并 `load()`，形成无限循环。0.3.1 日志实测 17 秒内重载同一首歌 5688 次。
- 该循环会让每次 `audio.play()` 都被新的 load 中断（`AbortError: The play() request was interrupted by a new load request.`），因此没有声音、也没有可用的播放状态。
- 音源依赖改为 `id + token` 的 `createMemo`，只在歌曲或代理 token 真正变化时重载；`loadedmetadata` 的时长更新加入 0.25s 容差，避免无意义的状态写入。
- `AbortError` 不再当作播放失败弹窗或停止播放；`canplay` 时如果仍处于暂停状态会自动重试播放。
- 新增 `audio canplay`、`audio playing` 日志，便于确认播放链路是否走完。

### Changed

- 版本号 0.3.2；其余功能与 0.3.1 相同。
- 发布 Windows 10/11 x64 NSIS 安装包 `v0.3.2`，约 **2.49 MiB**（2,612,546 bytes），由 GitHub Actions `windows-latest` 构建；未签名。
- SHA256：`f1b11986743c20a1550804e5df4b742aeedb2eec212e2a1e72a0269e1fe71013`。

## [0.3.1] - 2026-11-09

播放诊断与界面收尾修复。

### Fixed

- 修复关闭沉浸播放页后播放层/封面克隆残留在页面上的问题：关闭动画改为从播放页封面飞回 dock，动画结束后强制隐藏播放层与克隆层，并设置 `display:none` 兜底。
- 为 WebView2 增加 `--autoplay-policy=no-user-gesture-required`；`audio.play()` 被拒绝时不再静默失败，会显示提示。
- 增加 debug 日志：登录 QR 状态、libnetease HTTP 路径/状态/body 长度、音源解析、代理 Range/上游状态、audio 生命周期/错误码、播放拒绝原因。
- 设置 → 实验新增「调试日志」，可直接打开日志目录；日志文件为 `decro.log`，不记录 Cookie、token 或签名 URL。

### Changed

- 版本号 0.3.1；其余功能与 0.3.0 相同。
- 发布 Windows 10/11 x64 NSIS 安装包 `v0.3.1`，约 **2.49 MiB**（2,612,300 bytes），由 GitHub Actions `windows-latest` 构建；未签名。
- SHA256：`2fae757d1e6937439f15c1218b3a0ff7921d8094a037847af089f78ab5084fcb`。

## [0.3.0] - 2026-11-09

修复扫码登录与播放，改用 Cirro 原项目的 `libnetease` C 库，而不是手写网易云请求/加密。

### Fixed

- 接入 `ThripleQ/libnetease`（C 子模块）处理二维码获取/轮询、`song/enhance/player/url/v1`、红心；使用其 weapi/eapi 签名与 `os/appver` cookie 策略。
- 修复 weapi 请求缺少 `Content-Type: application/x-www-form-urlencoded` 导致网易云返回空 body 的问题。
- 修复非会员/免费歌曲也提示“暂不可播放”的问题；音源 URL 现在由 libnetease 解析，Cookie 会同步到其内存 jar。
- 扫码登录改用 libnetease 的 weapi QR 流程（含 chainId），避免此前 type=3 接口被风控/空响应卡住。
- 网页版 Cookie 导入后同时同步给 libnetease；退出登录清空其内存 jar。
- libnetease 的 cookie jar 只使用 `NUL`/`/dev/null`，不落明文；DPAPI 文件仍是唯一持久化副本。

### Changed

- Windows 构建通过 `cc` 编译 libnetease 静态库，源码以 git submodule 引入；CI checkout 递归拉取子模块。
- 保留 Rust 直连的首页/歌单/搜索/歌词读取，后续可逐步迁入 libnetease。

### Release

- 发布 Windows 10/11 x64 NSIS 安装包 `v0.3.0`，约 **2.49 MiB**（2,607,983 bytes），由 GitHub Actions `windows-latest` 构建；未签名。
- SHA256：`52876d9029e360bcee66eb6c3ad274fe92e62b00aad70059bb331942b621ea0b`。

## [0.2.1] - 2026-11-08

品牌与仓库完整改名为 **Decro**（Desktop + Cirro），并保留对 Cirro 原项目的明确致敬。

### Changed

- GitHub 仓库从 `cirro-desktop` 改名为 `decro`；旧 URL 由 GitHub 重定向。
- 应用显示名、窗口标题、`productName`、Rust crate、npm 包名、安装包名统一改为 Decro。
- Tauri identifier 从 `io.github.cloudxiao778.cirrodesktop` 改为 `io.github.cloudxiao778.decrodesktop`。
- 新的 D 字品牌标记；标题栏、登录弹窗、搜索面板、封面水印、关于文案改为 Decro。
- 旧版登录凭证自动从 `cirrodesktop` 数据目录迁移到 `decrodesktop`；旧 `cirro.*` 本地设置键迁移到 `decro.*`。
- README、架构、登录、构建、风格审计文档同步更名；新增「致谢」章节，感谢 Cirro 原项目与 alpha42 参考。

### Release

- 发布 Windows 10/11 x64 NSIS 安装包 `v0.2.1`，约 **1.83 MiB**（1,914,404 bytes），由 GitHub Actions `windows-latest` 构建；未签名。
- SHA256：`9d4f05dc4c7686b54717c9cc5e57f98b797b1363083769109cedf4170867b7db`。
- 旧 `v0.2.0` 安装包仍保留，下载链接会随仓库改名重定向。

## [0.2.0] - 2026-11-08

从视觉原型升级为可登录、可浏览在线曲库、可播放的音乐客户端。

### Added

- 在线首页：推荐歌单、新歌速递、每日推荐、最近播放。
- 资料库：我的歌单、收藏歌单、我喜欢的音乐、最近播放；登录后自动同步。
- 在线搜索：歌曲与歌单，支持直接播放或打开详情。
- 真实播放：Rust 本地音频代理（`127.0.0.1` + 随机 token）、Range/seek、播放/暂停、上一首/下一首、队列、音量。
- 真实歌词：按曲目拉取 LRC 与翻译，接入现有歌词页/侧栏。
- 喜欢/取消喜欢：登录后写回网易云。
- 网页版 Cookie 导入：二维码被风控时的兜底登录方式。
- 播放/暂停波形改为 **500ms** 透明度交叉淡入淡出。

### Changed

- 登录切换到新版桌面接口：`interface.music.163.com` 的 `type=3` 二维码流程，并在扫码成功后自动同步账号与音乐库。
- 明确的登录错误状态：-462 / 8810 / 8821 / -460 等风控码不再静默卡在“已扫码”。
- 在线封面接入真实 CDN 图片，CSP 只放行网易云图片域名。
- 首页/资料库/搜索/详情从 mock 数据切换为在线数据；浏览器预览保留 mock 回退。

### Fixed

- 修复 0.1.1 扫码确认后一直停留在“已扫码，请在手机上确认登录”的问题。
- 修复播放/暂停进度波形硬切；现在为 500ms 交叉淡入淡出。
- 修复账户卡、侧栏、页面头像在登录后不显示账号状态的问题。

### Removed

- 设置页的三个「人声分离」行（开关、模型、性能）；主包从未包含 ONNX 模型。

### Release

- 发布 Windows 10/11 x64 NSIS 安装包 `v0.2.0`，约 **1.83 MiB**（1,914,879 bytes），由 GitHub Actions `windows-latest` 构建；未签名。
- SHA256：`db2ceee63595d86a0b43efdab80a1e046d8b9a46469f38e4b970849a5b52c315`。
- 在线接口为非官方 Web 接口，扫码/搜索/播放可能随平台策略变化；登录凭证仅保存在本机 DPAPI 文件。

## [0.1.1] - 2026-11-08

真实扫码登录 + 低配性能优化。曲库与播放仍为 mock。

### Added

- 网易云扫码登录：标题栏、侧栏、设置页、页面头像四个入口。
- Rust 登录后端：二维码获取/轮询、账号资料、重启恢复、退出登录。
- 登录凭证使用 Windows DPAPI（CurrentUser）加密，保存在应用数据目录；前端与日志不接触 Cookie。
- 低配自动性能模式：`navigator.hardwareConcurrency <= 4` 时默认开启，减少背景模糊、玻璃与动效开销；设置页可手动切换。
- 播放/暂停波形改为 180ms 透明度交叉淡入淡出，不再硬切高度与背景。

### Changed

- 设置页账户卡显示真实昵称与数字 ID；未登录时显示扫码入口；退出登录仅在已登录时出现。
- 页面右上头像、标题栏用户按钮都可触发登录。
- 性能清理：移除列表/卡片级 `backdrop-filter`，降低播放页与详情页背景模糊开销，减少 `will-change` 常驻。

### Removed

- 设置页的三个「人声分离」行（开关、模型、性能）；主包从未包含 ONNX 模型，入口不再伪装可用。

### Release

- 发布 Windows 10/11 x64 NSIS 安装包 `v0.1.1`，约 **1.72 MiB**，由 GitHub Actions `windows-latest` 构建；未签名。
- SHA256：`df54337cdfa42a2fc27e112d95db395d71d70619ced323b511928fb0b3ad212a`。
- 扫码步骤需要真实网易云账号手工验收；登录接口为非官方 Web 接口，可能随平台调整而失效。

## [0.1.0] - 2026-11-08

首个“视觉与动效探索”版本。数据为 mock，不连接网易云。

### Added

- 桌面三栏应用壳：自定义标题栏、可折叠侧栏、内容区、正在播放栏。
- Cirro 设计令牌：品牌红、亮/暗表面、形状、字体、间距、阴影。
- 底部胶囊 dock：封面、歌曲信息、播放控制、进度、音量、喜欢、队列。
- 沉浸播放页：大封面、当前曲目、歌词、环境光、进度、控制、队列抽屉。
- 卡片 → 播放页的共享封面 / 面板 clip-path 展开动效。
- 歌单卡片 → 详情头图的共享封面 FLIP 动效。
- 420×128 迷你播放器（`?mini`）。
- Splash：品牌红底 + 标记描边生长 → 填充 → 退场。
- 歌词跟随：当前行高亮、翻译、自动滚动。
- 搜索命令面板（Ctrl/Cmd + K）、热门搜索、结果分组。
- 探索、搜索、音乐库、歌单详情、播客、设置页面。
- 亮/暗主题、封面取色环境光、响应式断点。
- 自定义 SVG 图标集、Inter 字体、抽象封面生成。
- Playwright 截图脚本与 `docs/screenshots/` 视觉记录。
- 通过无线 ADB 获取 alpha42 真机截图，保存于 `docs/screenshots/apk/`。
- 按真机截图校正：纯黑画布、大幅推荐卡、5 行资料库、极简搜索、全屏模糊详情、玻璃反光封面、星标、白色圆角矩形播放键、波形进度、全屏歌词。
- 迷你播放器改为单行胶囊 + 底部红色进度线。
- 播放页进度条改为真机同款波形：播放时已播段波浪持续流动，暂停时收成直线；未播段直线从 thumb 开始，不再与波浪重叠。
- 默认侧栏折叠为图标栏，右侧播放栏默认收起。
- 补抓真机设置页，重做为「账户与设置」sheet：sticky 顶栏、账户卡、个性化/音频/歌词/实验分组、红色开关、退出登录；设置页隐藏迷你播放器。
- 键盘快捷键：Space、方向键、L、F、M、Alt+1/2/3、Ctrl+K、Esc。
- 文档：APK 分析、设计系统、动效系统、桌面适配、架构、构建。
- `README.md`、`CHANGELOG.md`、`docs/`。

### Release

- 发布 Windows 10/11 x64 NSIS 安装包 `v0.1.0`，约 1.53 MiB。
- 安装包由 GitHub Actions `windows-latest` 构建，产物通过体积检查后上传 Release；安装包未签名。
- 当前仅包含视觉原型与 mock 数据；网易云登录、API 与真实播放尚未接入。

### Notes

- 对比 APK 的 alpha 分支，部分内部动效（例如细胞分裂式 dock、逐字歌词）尚未实现。
- `src-tauri/` 与 Tauri 配置已落地；真实后端尚未接入，当前数据为 mock。
