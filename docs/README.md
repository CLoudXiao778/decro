# 文档索引

本目录记录“为什么这样做”，而不是重复代码注释。实现改动时优先更新这里的约束与令牌，再改代码。

| 文档 | 内容 |
|---|---|
| [apk-analysis.md](apk-analysis.md) | APK 解包结果、资源、原生库、功能线索、与公开源码的关系 |
| [design-system.md](design-system.md) | 颜色、字体、形状、布局、组件、封面生成 |
| [motion.md](motion.md) | 动效令牌、Splash、共享封面、播放页展开、性能约束 |
| [desktop-adaptation.md](desktop-adaptation.md) | 桌面信息架构、响应式、鼠标/键盘、Windows 集成 |
| [architecture.md](architecture.md) | 当前前端结构、Tauri/Rust 目标架构、数据流 |
| [style-audit.md](style-audit.md) | 与 APK/源码的逐项一致性审计、已知偏差 |
| [build.md](build.md) | 本地开发、Windows CI、包体预算、发布 |
| [screenshots/](screenshots/) | 当前原型截图 + `apk/` 下的 alpha42 真机截图 |

## 阅读顺序

1. 先看 [apk-analysis.md](apk-analysis.md)：我们到底在还原什么。
2. 再看 [design-system.md](design-system.md) 与 [motion.md](motion.md)：视觉与动效的硬约束。
3. 最后看 [desktop-adaptation.md](desktop-adaptation.md) 与 [architecture.md](architecture.md)：如何把它变成桌面应用。

## 约束摘要

- **不做手机比例的放大**：桌面三栏、曲目表格、hover/右键/键盘、自定义无边框标题栏。
- **动效是产品的一部分**：展开 420ms / 收起 320ms / 共享封面 360ms，曲线用 Material 3 Emphasized 家族。
- **默认包不包含大模型**：ONNX 人声分离约 36 MB，后续按需下载。
- **不打包浏览器/运行时**：使用系统 WebView2；不引入 Electron。
- **封面取色只影响播放语境**：列表页保持中性表面，播放页/沉浸页才让环境光跟随封面。
- **降低动态效果**：`prefers-reduced-motion` 下动效退化为淡入淡出。
