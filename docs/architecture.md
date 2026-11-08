# 架构

> 当前仓库是**视觉原型 + 可用的在线音乐核心**：扫码登录、在线歌单/搜索/歌词、
> 真实音源播放均已落地。Rust 侧仍是直接调用网易云 Web 接口的临时实现，
> 目标架构中的 libnetease FFI 与 SQLite 尚未接入。

## 1. 分层

```text
┌─────────────────────────────────────────────────────────────┐
│ SolidJS UI                                                   │
│  pages / components / styles / design tokens                 │
│  只负责渲染与交互；不直接碰 cookie、文件路径、音源签名 URL     │
└──────────────────────────┬──────────────────────────────────┘
                           │ Tauri invoke / events
┌──────────────────────────▼──────────────────────────────────┐
│ Tauri Rust Core                                              │
│  state.rs     共享状态：cookie/account/音源缓存/代理 token     │
│  auth.rs      二维码登录、Cookie 导入、账号资料、DPAPI 落盘    │
│  netease.rs   首页/歌单/最近/搜索/歌词/喜欢/音源解析           │
│  proxy.rs     127.0.0.1 音频代理：Range、seek、流式转发        │
│  secure_store.rs  Windows DPAPI 凭证加密                      │
│  netease/     libnetease FFI（目标，未接入）                   │
│  db/ system/  SQLite、SMTC、托盘、窗口（目标，未接入）          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ 外部                                                          │
│  网易云 Web API（Rust 直连；目标经 libnetease 签名/解析）      │
│  网易云 CDN（音频/封面，经本地代理或 CSP 白名单）              │
│  WebView2（系统）                                              │
│  Windows Shell / DWM / SMTC                                   │
└─────────────────────────────────────────────────────────────┘
```

## 2. 当前前端结构

```text
src/
  App.tsx                 # 导航、在线数据加载、播放引擎、主题、键盘
  main.tsx                # Solid 入口 + CSS 引入
  components/
    LoginModal.tsx        # 扫码登录 + 风控提示 + Cookie 导入
    Titlebar.tsx          # 自定义标题栏 + 账号入口
    Sidebar.tsx           # 左侧导航 + 在线歌单 + 账号入口
    PlayerDock.tsx        # 底部胶囊
    NowPlayingRail.tsx    # 右侧播放栏
    FullPlayer.tsx        # 沉浸播放页 + 共享封面 + 队列抽屉
    CoverArt.tsx          # 真实封面 + 生成式回退
    CommandPalette.tsx    # 最近播放/歌单快捷跳转
    Cards.tsx             # 卡片 / 曲目行
    ProgressBar.tsx       # 进度/音量
  pages/
    Explore.tsx           # 推荐歌单/新歌/每日推荐/最近播放
    Search.tsx            # 在线歌曲 + 歌单搜索
    Library.tsx           # 我的歌单/喜欢/最近播放
    Detail.tsx            # 在线歌单详情
    Podcast.tsx / Settings.tsx
  data/mock.ts            # 浏览器预览/离线回退数据
  lib/auth.ts             # 登录 invoke、二维码、Cookie 导入
  lib/netease.ts          # 在线 API 适配、DTO → Track/Playlist、音源 URL
  lib/format.ts           # 时间、插值、smoothstep
  styles/
    tokens.css            # 设计令牌（单一事实源）
    base.css / app.css / pages.css
```

### 状态边界

- `App.tsx` 持有前端播放状态（当前曲目、队列、进度、播放、音量、喜欢集合）、
  在线首页/资料库数据，以及 `<audio>` 引擎。
- 页面只接收 props / 回调；不直接改全局状态。
- `FullPlayer` 只负责播放页的转场与队列抽屉；不拥有播放状态。
- Rust `AppState` 是 cookie、账号与音源缓存的事实源；前端只缓存展示模型。
- 本地音频代理持有随机 token；前端通过 `playback_config` 拿 base/token，
  不接触网易云 CDN 签名 URL。
- 后续接入 libnetease 时，把“当前曲目/队列/进度”的真相源移到 Rust，UI 只订阅事件。

## 3. Rust 模块

### 0.2.0 已实现

```text
src-tauri/
  src/
    main.rs
    lib.rs              # 启动本地代理 + command 注册
    state.rs            # AppState / Account / ProxyInfo
    auth.rs             # 二维码 type=3、Cookie 导入、账号、DPAPI
    netease.rs          # 首页/歌单/搜索/歌词/喜欢/音源解析
    proxy.rs            # axum 本地音频代理（127.0.0.1 随机端口）
    secure_store.rs     # Windows DPAPI protect/unprotect
```

### 目标结构

```text
src-tauri/
  src/
    netease/
      ffi.rs          # libnetease 绑定
      transport.rs    # reqwest 自定义 transport（替代 libcurl）
      api.rs          # 高层命令：search/home/detail/lyric/...
      models.rs       # serde 模型
      cookies.rs      # cookie jar 路径 / 登录态
    playback/
      stream_server.rs# 127.0.0.1 本地 HTTP，Range/seek
      cache.rs        # 分段缓存 + LRU
      queue.rs        # 队列/循环/随机
      state.rs        # 持久化播放状态
    db/
      mod.rs          # SQLite / migrations
    system/
      smtc.rs         # SystemMediaTransportControls
      tray.rs
      window.rs       # Mica / 窗口状态 / 迷你播放器
      shortcuts.rs
    commands.rs       # Tauri command 注册
  build.rs
```

## 4. 数据与网络

### 当前直接 HTTP 切片（0.2.0）

| 能力 | 接口 |
|---|---|
| 二维码 | `POST interface.music.163.com/api/login/qrcode/unikey`（type=3） |
| 扫码状态 | `POST interface.music.163.com/api/login/qrcode/client/login` |
| 账号 | `GET music.163.com/api/nuser/account/get` |
| 首页推荐 | `/api/personalized/playlist`、`/api/personalized/newsong` |
| 每日推荐 | `/api/v3/discovery/recommend/songs` |
| 最近播放 | `/api/v1/play/record` |
| 用户歌单 | `/api/user/playlist` |
| 歌单详情 | `/api/v6/playlist/detail` |
| 搜索 | `/api/cloudsearch/pc`（歌曲/歌单） |
| 歌词 | `/api/song/lyric` |
| 喜欢 | `/api/song/like` |
| 音源 | `/api/song/enhance/player/url/v1` |

实现约定：

- 所有请求在 Rust 侧发出，带固定 UA / Referer / Cookie；前端 CSP 不需要放行网易云域名。
- 响应统一归一化为 `TrackDto` / `PlaylistDto` 再交给前端，前端不解析原始 JSON。
- `check_code()` 把 `-462 / 8821 / 8810 / -460` 等平台错误转成可读错误，避免静默卡死。
- 音源 URL 缓存 4 分钟，只允许 `.music.126.net` / `.126.net` / `.netease.com` / `.127.net` 域名。

### 本地音频代理

- `lib.rs` 在启动时绑定 `127.0.0.1:0`（随机端口），生成 24 字节随机 token；
  token 只用于本机音频 URL，不是网易云会话 token。
- 前端 `<audio>` 指向 `http://127.0.0.1:<port>/stream/<songId>?token=...`。
- 代理校验 token → 解析最新音源 URL → 转发 `Range` 请求 → 流式返回 200/206。
- 只监听 loopback；不暴露公网；不记录 token 或签名 URL。
- 独立 `reqwest` 客户端不带总超时，避免长音频被 20s 超时截断。
- 选本地代理而不是直接 `<audio src="https://...">`：统一注入 Referer/Accept、
  处理 302/206/416、避免签名 URL 暴露与过期。代理不转发网易云会话 Cookie；
  签名 URL 自身携带授权。

### 目标 libnetease

- 跨平台 C 库，覆盖登录、搜索、歌单、专辑、歌手、歌词、评论、首页 block 等。
- 通过 `ne_http_set_transport()` 注入 Rust transport，编译时 `NE_USE_CURL=OFF`。
- 请求内核内部有 cookie jar 锁；Rust 侧用 `spawn_blocking` + 信号量限制并发。
- 登录/曲库命令平移到 libnetease 后，前端命令名与返回模型保持不变。

### 缓存

- 当前：音源 URL 内存缓存 4 分钟；封面由 WebView 缓存。
- 目标：音频分段 + LRU 磁盘缓存、SQLite 元数据、歌词/封面缓存。

## 5. 系统集成

- **SMTC**：Rust `windows` crate 创建 `SystemMediaTransportControls`（目标）。
- **托盘**：显示/隐藏、播放/暂停、上一首/下一首、退出（目标）。
- **窗口**：Mica/Acrylic、圆角、状态记忆、单实例、关闭到托盘（目标）。
- **迷你播放器**：当前仍是独立 `?mini` 预览页，尚未与主窗口播放状态同步。

## 6. 安全与隐私

- 不收集遥测；默认无分析。
- Cookie 只落本地应用数据，使用 Windows DPAPI（CurrentUser）加密；日志脱敏。
- 登录网络请求只在 Rust 侧发出；前端只拿 `Account` 与展示模型。
- 音源 CDN URL 只存在于 Rust 代理内存；前端只拿本地代理 URL + token。
- CSP 禁止远程脚本；`img-src` 只额外放行网易云图片 CDN；`media-src` 只放行本地代理。
- 更新包签名校验（目标）；当前安装包未签名。

## 7. 后续演进

1. 用 libnetease 替换 `netease.rs` 的直接 HTTP，保留命令边界。
2. 把播放队列/进度迁到 Rust，主窗口与迷你播放器共享状态。
3. SQLite 缓存歌单/歌词/喜欢；音频分段缓存。
4. 增加 SMTC、媒体键、托盘、听歌上报。
5. 补齐评论、下载、播客/MV、云盘等外围能力。
