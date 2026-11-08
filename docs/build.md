# 构建与发布

## 1. 本地开发（当前前端）

要求：Node.js ≥ 20（当前验证 24），npm。

```bash
npm install
npm run dev
```

- 开发地址：<http://127.0.0.1:1420>
- `?nosplash` 跳过开屏（截图/联调时使用）。
- 主题跟随系统；也可在设置中切换。选择会写入 `localStorage`。

### 截图 / 视觉检查

Playwright 只作为开发依赖，不进入最终包：

```bash
npm i -D playwright
npx playwright install chromium
npm run dev          # 另一个终端
npm run screenshots
```

脚本会生成 `docs/screenshots/` 下的深/浅色首页、搜索、音乐库、设置、详情、播放页、歌词、Splash 与迷你播放器。

alpha42 真机截图单独放在本地 `docs/screenshots/apk/`（已 gitignore），通过无线 ADB 获取；它们是源版本参考，不随公开仓库发布。

## 2. Tauri 桌面开发（规划）

### Windows

需要：

- Rust stable + `x86_64-pc-windows-msvc`
- Visual Studio Build Tools（C++ 桌面开发）
- WebView2 Runtime（Windows 10/11 通常已内置）
- Node.js + npm

```bash
npm install
npm run tauri dev
```

### Linux

需要 WebKitGTK 开发包：

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Linux 上只能验证壳与 Web 逻辑；Mica、SMTC、媒体键、WebView2 必须在 Windows 验收。

## 3. Windows 构建

### 本地

```bash
npm run build
npm run tauri build -- --bundles nsis
```

产物：

- `src-tauri/target/release/bundle/nsis/*.exe`（0.1.0 产物：`Cirro Desktop_0.1.0_x64-setup.exe`，约 1.53 MiB）
- 可选：portable zip（复制 exe + WebView2 引导）

### GitHub Actions（推荐）

`windows-latest` 工作流：

1. checkout（含 submodule；若接入 libnetease）
2. setup Node + Rust + CMake/MSVC
3. `npm ci`
4. `npm run build`
5. `cargo tauri build --bundles nsis`
6. 上传安装包 / portable
7. 包体门禁：安装包 > 15 MB 失败
8. tag 时创建 GitHub Release

示例（伪代码）：

```yaml
name: build-windows
on:
  push:
    branches: [main]
  workflow_dispatch:
jobs:
  build:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
        with: { submodules: recursive }
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - uses: dtolnay/rust-toolchain@stable
      - run: npm ci
      - run: npm run build
      - run: npm run tauri build -- --bundles nsis
      - uses: actions/upload-artifact@v4
        with:
          name: cirro-desktop-windows
          path: src-tauri/target/release/bundle/nsis/*.exe
```

## 4. 包体预算

| 组成 | 目标 |
|---|---:|
| Tauri/Rust exe（strip + LTO + opt-level=z） | 4–6 MB |
| Web 资源（JS/CSS/字体子集/图标） | 0.6–1.2 MB |
| SQLite + libnetease + QR | 1.5–2.5 MB |
| **NSIS 安装包** | **8–12 MB（上限 15 MB；0.1.0 实测 1.53 MiB）** |
| 安装后 | 20–35 MB |
| WebView2 | 系统自带；缺失时引导安装 |
| ONNX 人声分离 | 不打包；可选下载约 36 MB |

优化清单：

- `opt-level = "z"`、LTO、`strip = true`、`panic = "abort"`；
- 只保留需要的 Inter 字重/字符子集；
- 图片 WebP/AVIF；封面运行时从 CDN 取，不打进包；
- 不引入图标字体、UI 组件库、动画库；
- 不打包 Chromium/Node/JRE；
- CI 中检查安装包大小。

## 5. 版本与发布

- 语义化版本：`0.x.y` 风格原型阶段，`1.0.0` 为可日常使用。
- `CHANGELOG.md` 使用 Keep a Changelog。
- Release 说明包含：变更、已知问题、包体、WebView2 要求。
- 可选代码签名；未签名安装包会触发 SmartScreen 提示。

## 6. 测试

- 前端：`tsc --noEmit`、Vitest（后续加入歌词解析/颜色量化）。
- Rust：`cargo test`，覆盖 transport、Range、缓存、cookie、模型解析。
- 视觉：Playwright 截图对比（亮/暗、1440/1120/960、播放页打开）。
- 手工：Windows 10/11、125%/150% DPI、多显示器、睡眠恢复、断网、错误登录。
- 性能：启动 < 2s、交互 60fps、内存 < 300MB（不含缓存）。
