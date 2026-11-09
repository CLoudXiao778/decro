# 动效系统

Cirro 的动效不是装饰，而是“同一个物体在连续变形”的叙事。桌面重制保留这套时间与曲线，不重新发明。

## 1. 全局曲线

| Token | 值 | 用途 |
|---|---|---|
| Emphasized Decelerate | `cubic-bezier(.05,.7,.1,1)` | 展开、进入、共享封面 |
| Emphasized | `cubic-bezier(.2,0,0,1)` | 收起、归位 |
| Standard | `cubic-bezier(.4,0,.2,1)` | 微交互、颜色、淡入淡出 |
| Reveal Exit | `cubic-bezier(.33,0,.33,1)` | 收缩/回到起点 |

这四条直接取自 Cirro `Motion.kt` 的 Material 3 Emphasized 家族。**不要**随意用 `ease-in-out` 替代展开/收起：前段速度和尾段收敛是“质量感”的来源。

## 2. 时长

| 场景 | 时长 | 曲线 |
|---|---:|---|
| hover / 按压 | 120–160ms | Standard |
| 主题/颜色 | 320–600ms | Standard |
| 页面进入 | 220ms | Emphasized Decelerate |
| 页面退出 | 90–160ms | Standard / Emphasized |
| dock 展开为播放页 | 420ms | Emphasized Decelerate |
| 播放页收起 | 320ms | Emphasized |
| 共享封面 | 360ms | Emphasized / Emphasized Decelerate |
| 播放页面板淡入 | 200ms | Emphasized Decelerate |
| 浮层进入 | 240ms | Emphasized Decelerate |
| 浮层退出 | 180ms | Emphasized |
| Splash 入场 | 190ms | Standard |
| Splash 描边 | 880ms | Standard |
| Splash 填充 | 340ms | Standard，描边结束后开始 |
| Splash 退场 | 380ms | Emphasized |
| 歌词当前行 | 220ms | Standard |
| 歌词滚动 | 450ms | Emphasized |

## 3. Splash 时间线

源实现：

```text
0ms     整层淡入 + scale 0.9 → 1（190ms）
0ms     mark 描边生长 0 → 1（880ms）
880ms   填充显现 0 → 1（340ms）
1220ms  保持（等待启动就绪，整段最多 3000ms）
结束    淡出 + scale 1 → 1.06（380ms）
```

桌面实现（`src/components/Splash.tsx` + `app.css`）：

- 背景 `#F51F43`；
- mark 40vmin（最大 240px）；
- 使用 `pathLength="1"` + `stroke-dasharray/offset`，纯 CSS 绘制；
- 填充路径在 880ms 后淡入；
- 1.62s 开始退场，2.05s 卸载；
- 点击任意处跳过（200ms 快速退场）；
- `prefers-reduced-motion` 时 450ms 内直接结束。

**硬约束**：描边与填充必须“长完再填”，不能同时淡入；退场必须轻微放大到 1.06，而不是缩小。

## 4. 共享封面：卡片 / dock → 沉浸播放页

源实现的 `ExpandableShell` 与 `PlayerDock` 做的是：

1. 整只壳只有一个 `progress 0..1` 时钟；
2. 宽/高/位移/圆角/hero/scrim 全部由它派生；
3. 圆角在 `t <= 0.85` 保持父级真圆角，之后 smoothstep 收敛到 0；
4. 内容在 `t = 0.62..0.92` 上浮 12dp，读作“壳先就位、内容再流入”；
5. hero 封面从起点矩形插值到终点矩形，展开完成后 220ms 淡出交接；
6. 收起时内容淡出 + 下拖 6dp。

桌面实现（`src/components/FullPlayer.tsx`）：

- 点击 dock 后捕获 **dock 矩形**与 **dock 封面矩形**；
- 播放页是一个 `position: fixed` 的层，初始 `clip-path: inset(... round 22px)` 精确等于 dock 矩形；
- 下一帧把 `clip-path` 过渡到 `inset(0 round 0)`，420ms Emphasized Decelerate；
- 同时创建一个 `morph-cover` 克隆，从 dock 封面矩形 **FLIP** 到播放页大封面矩形，360ms；
- 动画结束后克隆隐藏，真实大封面淡入 200ms；
- 内容层在面板展开后淡入/上浮；
- 关闭时反向：面板 clip 回 dock 矩形 320ms，克隆从大封面飞回 dock 封面，结束后卸载。

为什么不用 View Transitions API：WebView2 版本差异较大，且面板 clip 与封面 hero 需要共用同一条时间线；自定义 FLIP 更可控。

**首帧契约**：面板第一帧必须与 dock 胶囊逐像素重叠；封面克隆第一帧必须与 dock 封面逐像素重叠。否则会出现“从空白处飞出来”的断裂。

### 卡片 → 歌单详情（当前简化）

当前 `DetailPage` 使用 300ms `opacity + translateY(10px)` 进入，并保留全屏模糊封面背景；
卡片封面 → 头图的共享元素 FLIP 尚未实现。

目标（后续补）：

- 详情页测量 `.detail-cover` 终态；
- `position: fixed` 克隆从卡片封面矩形飞到头图矩形，360ms Emphasized Decelerate；
- 真实头图在克隆落位后 200ms 淡入；
- 反向（返回）补“头图飞回卡片”的逆动画。

## 5. 页面转场

- 页面切换：`pageIn` 220ms，`opacity 0→1` + `translateY(8px→0)`。
- 详情页：同一套，但内容区有封面糊底随页面进入淡入。
- 命令面板：240ms，`opacity + translateY(-8px) + scale(.985)`。
- 右侧播放栏出现：260ms，`opacity + translateX(12px)`。
- 不支持 View Transitions 时不需要 polyfill；页面转场本身就是 CSS 动画。

## 6. 微交互

- 卡片 hover：上移 3px，320ms Emphasized Decelerate；封面 scale 1.035，520ms。
- 播放按钮：hover scale 1.05，按压 0.95，120ms Standard。
- 喜欢：颜色 200ms；不做弹跳（桌面不做手机式 overshoot）。
- 进度条：hover 出现 8px thumb；拖动时 primary，轨道 3px。
- 侧栏折叠：220ms；只改宽度和标签透明度，不改内容布局。
- 歌词行：active 220ms，字号 16→23px，透明度 0.34→1，位移 4px。

## 7. 性能约束

1. 动画只动 `transform` / `opacity` / `clip-path`；不逐帧改宽高、不改布局。
2. `backdrop-filter` 只用于固定层（dock、命令面板、播放页顶栏、队列抽屉），不用于滚动列表。
3. 封面背景使用**预模糊的小图**或 CSS 渐变，不在滚动时实时大半径模糊。
4. `will-change` 只在动画期间使用；结束后移除。
5. 环境 blob 使用 `transform` 动画，避免 `background-position` 重绘。
6. 播放页的歌词滚动只改 `transform`，不触发重排。
7. 动画期间不读取布局；面板/克隆的尺寸只在开始/结束时测量一次。
8. `prefers-reduced-motion` 下：Splash 450ms 结束；面板淡入淡出；不播放环境 blob；歌词不滚动。
9. **性能模式**（设置 → 实验，`hardwareConcurrency <= 4` 时默认开启）：关闭卡片级
   `backdrop-filter`、grain 与 splash glow，降低播放页/详情页背景模糊半径与环境 blob
   动画；波形流速减半。保留共享封面、面板展开与歌词跟随等核心叙事动效。

## 8. 与源实现的差异

| 源实现 | 桌面实现 | 原因 |
|---|---|---|
| 三档 dock：Closed / Half / Full，手势跟手 | 点击直接全屏；无半档拖拽 | 桌面鼠标不需要手机式拖拽；后续可加 |
| 细胞分裂几何（挤腰/断缝） | 简化为胶囊 clip 展开 | 桌面没有底部导航/安全区，分裂语义不成立 |
| 共享元素 `sharedBounds` | 自定义 FLIP + clone | WebView2 版本与面板 clip 同步更可控 |
| 运行时 hero 模糊 28px | 不做逐帧模糊 | 桌面性能预算；模糊放在静态背景层 |
| 逐字歌词 | 行级 + 翻译 | 首版；后续接入 YRC |
| 触觉反馈 | 无 | 桌面无触觉；用视觉/声音确认替代 |

## 9. alpha42 真机校正

真机截图确认了以下动效/组件事实，桌面实现已据此调整：

- 播放页不是独立新页面，而是从迷你播放器长出来的整层；背景是封面的强模糊。
- 封面从 dock 封面飞到大封面时，真机有玻璃材质反光；桌面用 `.player-cover__glass` 的宽斜向高光近似。
- 播放键是白色圆角矩形，按下态轻微缩放；不是圆形。
- 进度是波形：播放时已播段是**持续横向流动的波浪线**，未播段是直线；暂停时同一条 SVG 路径在 500ms 内从曲线**形变**为直线，恢复时再形变为曲线。不再用两个元素透明度交叉淡入淡出，波形元素也不会被隐藏。thumb 是竖向白条。
- 喜欢是星标，点击切换填充；没有心形。
- 歌词模式是同一播放层的第二形态：封面消失、歌词铺满，当前行放大加粗、翻译缩小；再点封面/歌词按钮回到封面。
- 桌面把“封面→歌词”做成模式切换，并把标题/星标/更多放在右栏顶部；底部进度/控制保持真机语言。
- 底部播放条只保留封面、标题/艺人、播放/下一首和底部红色进度线；桌面侧栏承担导航。
- 详情页背景直接使用封面强模糊，不展示清晰方形封面；标题/动作居中，曲目行是玻璃卡片。
- 卡片→详情保留 300ms 淡入/上移；真机的“从卡片长成详情”逆向动画待补。
