# 架构

> 当前仓库是**前端视觉原型 + 一条真实登录切片**：曲库与播放仍为 mock；
> Tauri/Rust 侧已实现扫码登录与 DPAPI 凭证存储。本文件同时描述当前实现与目标模块边界，
> 避免后续把网络、播放、UI 混在一起。

## 1. 分层

```text
┌─────────────────────────────────────────────────────────────┐
│ SolidJS UI                                                   │
│  pages / components / styles / design tokens                 │
│  只负责渲染与交互；不直接碰 token、cookie、文件路径             │
└──────────────────────────┬──────────────────────────────────┘
                           │ Tauri invoke / events
┌──────────────────────────▼──────────────────────────────────┐
│ Tauri Rust Core                                              │
│  auth.rs      二维码登录 + 账号资料（0.1.1 已实现）             │
│  secure_store.rs  Windows DPAPI 凭证加密（0.1.1 已实现）        │
│  netease/   libnetease FFI + 自定义 HTTP transport（目标）     │
│  playback/  本地流代理、Range、缓存、队列状态（目标）           │
│  db/        SQLite：歌单/喜欢/历史/歌词/设置（目标）            │
│  system/    SMTC、托盘、媒体键、窗口、更新（目标）              │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│ 外部                                                          │
│  网易云 API（当前登录直连；目标经 libnetease 签名/解析）        │
│  WebView2（系统）                                              │
│  Windows Shell / DWM / SMTC                                   │
└─────────────────────────────────────────────────────────────┘
```

## 2. 当前前端结构

```text
src/
  App.tsx                 # 应用状态、导航、键盘、播放状态、主题
  main.tsx                # Solid 入口 + CSS 引入
  components/
    LoginModal.tsx        # 扫码登录弹窗 + 轮询状态
    Titlebar.tsx          # 自定义标题栏 + 账号入口
    Sidebar.tsx           # 左侧导航 + 歌单 + 账号入口
    PlayerDock.tsx        # 底部胶囊
    NowPlayingRail.tsx    # 右侧播放栏
    FullPlayer.tsx        # 沉浸播放页 + 共享封面 + 队列抽屉
    Splash.tsx            # 开屏
    CommandPalette.tsx    # 全局搜索
    Cards.tsx             # 卡片 / 曲目行
    CoverArt.tsx          # 抽象封面 + 品牌 mark
    Icon.tsx              # 自绘 SVG 图标
    ProgressBar.tsx       # 进度/音量
  pages/
    Explore.tsx / Search.tsx / Library.tsx / Detail.tsx
    Podcast.tsx / Settings.tsx
  data/mock.ts            # 占位数据 + 歌词 + 调色板
  lib/auth.ts             # 登录 invoke、二维码 data URL、浏览器预览降级
  lib/format.ts           # 时间、插值、smoothstep
  styles/
    tokens.css            # 设计令牌（单一事实源）
    base.css              # reset / 滚动条 / 焦点
    app.css               # 壳、标题栏、侧栏、dock、播放页
    pages.css             # 页面与组件
```

### 状态边界

- `App.tsx` 持有全局播放状态（当前曲目、队列、进度、播放、音量、喜欢集合）。
- 页面只接收 props / 回调；不直接改全局状态。
- `FullPlayer` 只负责播放页的转场与队列抽屉；不拥有播放状态。
- 主题、侧栏折叠、右侧栏开关、低配性能模式是 UI 状态，留在 `App`。
- 登录账号状态由 Rust `AuthState` 持有；`App` 只缓存前端展示所需的 `Account`
  （昵称/ID/头像 URL），不接触 Cookie。
- 后续接入 Tauri 时，把“当前曲目/队列/进度”的真相源移到 Rust，UI 只订阅事件。

## 3. Rust 模块

### 0.1.1 已实现

```text
src-tauri/
  src/
    main.rs
    lib.rs              # AuthState + command 注册
    auth.rs             # 二维码 start/poll、账号资料、恢复、退出
    secure_store.rs     # Windows DPAPI protect/unprotect
```

### 目标结构

```text
src-tauri/
  src/
    main.rs
    lib.rs
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

### libnetease

- 跨平台 C 库，覆盖登录、搜索、歌单、专辑、歌手、歌词、评论、首页 block、雷达、私人 FM、喜欢/收藏等。
- 通过 `ne_http_set_transport()` 注入 Rust 的 HTTP transport，编译时 `NE_USE_CURL=OFF`，不引入 libcurl/OpenSSL。
- 请求内核内部有 cookie jar 锁，支持多线程；Rust 侧用 `spawn_blocking` + 信号量限制并发。
- C 侧返回 JSON 字符串；Rust 用 `serde_json` 解析为模型。

### 登录

当前（0.1.1，临时切片，详见 [auth.md](auth.md)）：

- Rust `reqwest` 直接请求网易云 Web 接口：`/api/login/qrcode/unikey` →
  前端用 `qrcode` 渲染二维码 → 轮询 `/api/login/qrcode/client/login`。
- 扫码成功后先请求 `/api/nuser/account/get` 验证，再落盘；失败不保存。
- 手动解析 `Set-Cookie` 到内存 jar；前端只收到昵称/ID/头像 URL。
- Cookie 用 Windows DPAPI 加密后写入应用数据目录；退出删除文件并清空内存。
- 非 Windows 开发构建拒绝落盘，避免明文凭证。

目标：

- 二维码：`ne_qr_get_key` → 前端渲染二维码 → 轮询 `ne_qr_check` → 成功后 cookie jar 落盘。
- 登录 command 名与返回模型保持与 0.1.1 一致，平滑替换为 libnetease cookie jar。
- Cookie 存在应用数据目录；退出时删除文件 + `ne_jar_reload()`。
- 不在日志中输出 cookie / token。

### 播放

- UI 请求播放某曲目 → Rust 调 `ne_song_url_v1` 取签名 URL。
- Rust 启动本地 `127.0.0.1` HTTP 服务，前端 `<audio>` 指向 `http://127.0.0.1:<port>/stream/<id>?quality=...`。
- 代理负责：
  - 注入 Referer / User-Agent / Cookie；
  - 转发 Range，支持 seek；
  - 命中磁盘缓存；未命中时分段下载；
  - 处理 302/206/416；
  - 只绑定 loopback，校验随机 token。
- 选择本地代理而不是直接 `<audio src="https://...">`：避免 CORS、Cookie、Referer、缓存与签名 URL 过期问题。

### 缓存

- 音频分段 + 原子索引；LRU 上限可设置（默认 8 GB）。
- 封面：CDN 尺寸参数 + 本地缓存；小图用于模糊背景。
- 歌词：JSON / LRC 原文 + 解析结果，按曲目缓存。
- 元数据：SQLite；歌单/专辑/喜欢/历史/设置。

## 5. 系统集成

- **SMTC**：Rust `windows` crate 创建 `SystemMediaTransportControls`，更新标题/艺人/封面/进度，接收播放/暂停/上一首/下一首。
- **托盘**：显示/隐藏、播放/暂停、上一首/下一首、退出。
- **窗口**：Mica/Acrylic、圆角、状态记忆、单实例、关闭到托盘。
- **媒体键**：SMTC 优先；global-shortcut 作为补充。
- **自动更新**：Tauri updater + 签名；默认手动检查。

## 6. 安全与隐私

- 不收集遥测；默认无分析。
- Cookie 只落本地应用数据，使用 Windows DPAPI（CurrentUser）加密；日志脱敏。
- 登录网络请求只在 Rust 侧发出，WebView CSP 不需要放行网易云域名。
- CSP 禁止远程脚本；前端不加载任意 URL。
- 本地流服务只监听 127.0.0.1，随机端口 + token。
- 更新包签名校验。
- 第三方接口的使用风险由用户承担；不默认伪造 IP/绕过风控。

## 7. 后续演进

1. 把 `App.tsx` 的播放状态迁到 Rust `PlayerState`，UI 通过事件订阅。
2. 用 SQLite 替换 mock 数据；保留 mock 作为离线演示。
3. 接入 libnetease，并把 `auth.rs` 的扫码/凭证流程迁入其 cookie jar；前端命令边界不变。
4. 增加 mini player 窗口、SMTC、托盘。
5. 补充评论/播客/下载/本地音乐。
