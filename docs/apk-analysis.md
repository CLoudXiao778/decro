# APK 分析：`Cirro-alpha42.APK`

> 目的：从 APK 中提取“视觉与动效”事实，作为桌面重制的依据。
> 不是功能复刻清单。

## 1. 基本信息

| 项 | 值 |
|---|---|
| 文件 | `Cirro-alpha42.APK` |
| 大小 | 47,609,044 字节（约 45.4 MiB） |
| 包名 | `com.nevoit.cirro` |
| 应用名 | Cirro |
| versionName | 1.0 |
| versionCode | 5 |
| minSdk / targetSdk | 28 / 37 |
| 构建 | AGP 9.5.0，Kotlin，Jetpack Compose，Material 3，Media3 |
| Git revision | `f2b048d41a0470c39dce17059a0ca51771c89f82` |

`version-control-info.textproto` 里记录的 revision **不在公开仓库 `ThripleQ/cirro` 的 main 上**。公开仓库当前到 `v0.4.3`，是同一系列但不同分支/阶段。因此：

- 公开源码可以用来理解设计语言、动效令牌与架构；
- 不能假设这个 APK 的每个界面与公开源码逐像素对应；
- 视觉判断以 APK 资源 + 字符串 + 公开仓库设计文档 + 运行截图（如可获得）交叉验证。

## 2. 体积构成

APK 之所以 47.6 MB，主要不是 UI：

| 组成 | 约大小 |
|---|---:|
| `libonnxruntime.so` | 34.2 MB |
| `assets/sing/vi-nnet.onnx` | 31.2 MB |
| `assets/sing/mss-model.onnx` | 4.9 MB |
| `libcirro_lyrics.so` | 3.4 MB |
| `libncm_android.so` | 2.8 MB |
| `classes.dex` | 5.9 MB |
| 其余资源/字体/图标 | 约 3.5 MB |

结论：桌面版默认不打包 ONNX 模型，包体可以下降一个数量级。人声分离若以后要做，作为可下载模型包，而不是主安装包的一部分。

## 3. 资源里的设计证据

### 字体

- `res/font/inter_display_regular.ttf`
- `res/font/inter_medium.ttf`
- `res/font/inter_bold.ttf`
- `assets/fonts/Inter-OFL.txt`

→ 拉丁/数字使用 Inter；中文回落到系统字体。桌面版延续这个策略：Inter（OFL）+ 微软雅黑 UI，避免打包 CJK 字体。

### 图标

`res/drawable/` 下约 50 个自定义矢量图标，命名风格接近 SF Symbols：

- `chevron_left_nav`、`chevron_right_semibold`
- `magnifyingglass`、`xmark`、`xmark_bold_circle_fill`
- `heart` / `heart_slash` / `star` / `star_fill`
- `person` / `person_fill`
- `airplay` / `dolby` / `lossless` / `infinity`
- `lyrics` / `microphone_stand` / `sing_sparkle`
- `music_note` / `music_note_list` / `music_note_square_stack`
- `a_to_z` / `z_to_a` / `sort` / `list_*`

→ 图标是**细描边、圆角端点、32×32 视觉网格**的体系，不是 Material 默认图标。桌面版使用自绘 SVG，笔画 1.75px / 24px 网格，保留同样的“细、圆、克制”。

### 品牌图

- `res/drawable/cirro_header.png`（1024×640）：红/橙/粉流体渐变 + 半透明玻璃质感的 `Cirro` 字标 + 有机星形/圆形。
- 启动图标有 `default`、`water`、`crimson`、`classic` 四套，`water` 是一颗红色胶囊/水滴里的白色 C。
- `splash` 背景色在源码中为 `#F51F43`，mark 墨色为 `#FFFAF6`。

→ 品牌不是纯红平面，而是“红色底 + 流体/玻璃 + 暖白”的组合。桌面版用 CSS 渐变/模糊重建，不直接复制作者的 PNG。

### 着色器

- `assets/pearmesh/shaders/{blur,material,moru,pinch,rotation,fullscreen}.{vert,frag}`
- `assets/shaders/artist_*.frag`、`reflection_*.frag`
- `assets/pearmesh/moru/*.png`

→ 用于封面/艺人页的流体背景、倒影、模糊。桌面版不逐字移植 GLSL；用 CSS 渐变 + `filter: blur` + WebGL/Canvas（后续）实现同等观感，默认只在播放页启用，列表页保持静态表面以控制性能。

## 4. 功能线索（仅记录，不作为首版范围）

从 dex 字符串与类名可以确认：

- 主页/探索、搜索、音乐库、歌单/专辑/歌手、播客/电台、评论。
- 二维码登录、网易云账号、Apple Music 账号与歌词匹配。
- 队列、播放历史、无限播放、睡眠定时、音频输出、音量平衡。
- 逐行歌词 + 翻译 + 逐字歌词（`yrc` 系列）。
- 人声分离/分轨（ONNX）、艺人视频、动态封面、回忆歌单、听歌统计。
- 大量“实验”设置：流体背景模糊、列表渐变模糊、一镜到底动画、歌词模糊。

`MainDestination` 枚举包含：

```text
Tabs / Collection / ArtistShelf / SongCredits
LibraryLikedSongs / LibraryPlaylists / LibraryAlbums / LibraryArtists / LibrarySongs
```

→ 桌面版的导航应当能承载这些目的地；首版只实现最常用的探索、搜索、音乐库、详情、播放、歌词、设置。

## 5. 与公开源码的对应

公开仓库 `ThripleQ/cirro` 的 `docs/architecture.md` 与 `ui/theme/Motion.kt` 是设计约束的重要来源：

- 品牌 seed `#C92027`；
- 形状令牌：Capsule 22dp / Card 16dp / CardSmall 12dp / Chip 8dp / SheetTop 28dp / Badge 2dp；
- 动效：Emphasized Decelerate `(0.05, 0.7, 0.1, 1)`、Emphasized `(0.2, 0, 0, 1)`、Standard `(0.4, 0, 0.2, 1)`；
- 壳展开 420ms、收起 320ms、共享元素 350ms；
- 展开期内容编排：`t=0.62..0.92` 上浮 12dp；
- 圆角保持：`t <= 0.85` 保持父级圆角，后段 smoothstep 收敛；
- Splash：190ms 入场 + 880ms 描边 + 340ms 填充 + 380ms 退场，总预算 3s；
- 底部 PlayerDock 三档：Closed / Half / Full，几何与内容分别跟随、内容有 180ms 相位滞后。

这些值被直接转写到桌面的 CSS/TS 动效层（见 [motion.md](motion.md)），而不是凭感觉重新调。

## 6. 运行 APK 的尝试与限制

APK 只包含 `arm64-v8a` 原生库（`libncm_android.so`、`libcirro_lyrics.so`、`libonnxruntime.so`）。当前开发机是 x86_64：

- Android Emulator 的 `arm64-v8a` 系统镜像在 x86_64 宿主上被明确拒绝：
  `Avd's CPU Architecture 'arm64' is not supported by the QEMU2 emulator on x86_64 host.`
- 因此无法直接用 arm64 AVD 启动这个 APK。
- 又尝试了 **Google Play x86_64 系统镜像**（API 35）。该镜像的 `build.prop` 确实包含：
  `ro.dalvik.vm.native.bridge=libndk_translation.so`
  理论上可以运行 arm64 应用；但在无 KVM 的 TCG 模式下，Play Store 首次启动的 dex2oat 极其缓慢，20+ 分钟后模拟器掉线，未完成启动，未能取得截图。
- 备选路径：ReDroid + libndk/houdini（需要宿主 binder 内核模块与 Docker 特权容器）；或你在真机上截 5–8 张关键界面图。

在设计文档中，任何“未经运行截图验证”的细节都会标注为“源码推断”，不冒充实测。

## 7. 对桌面重制的直接影响

1. **保留**：品牌红/流体、Inter、细图标、胶囊、28dp 纸面、封面取色、共享封面、歌词排版、Splash 节奏。
2. **改造**：把手机底部三 tab 改为桌面左侧栏；把单列内容改为三栏；把全屏播放页改为横向布局；把触控手势改为鼠标/键盘。
3. **舍弃/延后**：36 MB ONNX 人声分离、Apple Music、艺人视频、逐字歌词、评论/播客首版。
4. **不复制**：作者 Logo、PNG 品牌图、原始图标路径、源码。使用自绘 mark、SVG 图标与自建 CSS。

## 8. 参考文件

- `app/src/main/java/com/thripleq/cirro/ui/theme/Motion.kt`
- `app/src/main/java/com/thripleq/cirro/ui/theme/Palette.kt`
- `app/src/main/java/com/thripleq/cirro/ui/theme/Shape.kt`
- `app/src/main/java/com/thripleq/cirro/ui/splash/SplashOverlay.kt`
- `app/src/main/java/com/thripleq/cirro/ui/components/ExpandableShell.kt`
- `app/src/main/java/com/thripleq/cirro/ui/playerbar/PlayerDock.kt`
- `app/src/main/java/com/thripleq/cirro/ui/playerbar/PlayerPage.kt`
- `docs/architecture.md`（公开仓库）

## 9. 真机运行截图（2026-11-08 补充）

通过无线 ADB 连接一台已安装 Cirro 的 Android 16 真机（型号 `25060RK16C`，1280×2772，density 520），补到了实际界面截图。真机截图保存在本地 `docs/screenshots/apk/`，**因包含第三方专辑封面、收听记录和真实歌词，不随公开仓库发布**。

这一步非常关键：**alpha42 的实际界面与公开仓库的 Android UI 并不相同**。公开仓库更接近旧版/另一条设计线；alpha42 是更彻底的“大图 + 纯黑 + 玻璃”风格。桌面重制在 2026-11-08 按真机截图做了一次校正。

### 实际观察

| 页面 | 关键事实 |
|---|---|
| 主页 | 纯黑背景；左上超大「主页」；右上圆形头像；两张近方/竖版大卡「每日推荐」「私人雷达」，图片铺满、底部渐变文字；「最近播放」「雷达播放列表」横向大卡；「一秒中毒的抖腿电音」双列曲目行；底部迷你播放器 + 四项底栏（主页/网格/资料库/搜索） |
| 搜索 | 未聚焦时只有超大「搜索」+ 胶囊输入框；聚焦后输入框置顶、右侧红色 X、`Cloud Music / 资料库` 分段控件、搜索建议、圆角结果卡；没有热门搜索网格 |
| 资料库 | 超大「资料库」；5 条整行大卡（喜爱歌曲 / 播放列表 / 艺人 / 专辑 / 歌曲），红色图标 + 右箭头；下方「最近添加」横向封面 |
| 歌单详情 | 封面**全屏模糊**铺底，无独立方形封面；标题/副标题/日期居中；云形 shuffle、巨大白色圆角矩形播放键、星标；描述；圆角半透明曲目行；顶部圆形返回/分享/更多 |
| 播放器 | 封面高度接近屏宽、24dp 圆角，覆有斜向玻璃反光；标题/艺人在左侧，白描边星标与更多在右；波形进度条 + 竖向白色 thumb；巨大白色圆角矩形播放键；左右大圆形上一首/下一首；底部评论/音频输出/队列图标；整页是封面的强模糊背景 |
| 歌词 | 封面被替换为全屏歌词；当前行大号白色粗体，非当前行低透明度，翻译小一号；底部保留缩略封面/标题/星标/波形/控制 |

### 设计结论

- 真机 alpha 的主视觉不是“红色卡片”，而是**纯黑画布 + 大幅照片/封面 + 白色大字号 + 红色只做图标/状态强调**。
- 播放键不是圆形，而是**大号白色圆角矩形**；喜欢是**星标**而不是心形；进度条是**波形**。
- 详情页没有清晰的方形封面；它是**全屏模糊封面** + 居中信息。
- 底栏是 4 个图标（主页/网格/资料库/搜索）+ 迷你播放器；不是我们最初做的桌面三栏。
- 桌面版保留这些组件语言，但将底栏改成左侧图标栏、将播放器自适应为两栏（封面 + 标题/歌词），这是有意的桌面化。

### 仍未确认

- 登录页、评论页还未截图；设置页已补（本地参考）。
- 主页下方更靠后的模块（榜单等）未完整滚动截图。
- 动态颜色/浅色主题在真机上的表现未验证；桌面原型保留亮色模式作为扩展。
