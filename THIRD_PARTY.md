# Third-party notices

本项目代码以 **MIT License** 发布，见 `LICENSE`。以下组件/资源各自保留其原始许可证。

## Fonts

- **Inter** — Copyright (c) 2016 The Inter Project Authors.
  Licensed under the SIL Open Font License 1.1.
  The license text is at `public/fonts/Inter-OFL.txt`.

## Runtime / backend

- **Tauri** — MIT / Apache-2.0.
- **libnetease** — Cirro 原项目的 C 请求内核，以 git submodule 引入：
  https://github.com/ThripleQ/libnetease 。上游当前没有单独的 LICENSE 文件；
  Decro 按项目方向复用并保留署名。若再分发，请向原项目作者确认授权。
- **libnetease 的 weapi/eapi 实现** 基于 `go-musicfox/netease-music` 与
  `Binaryify/NeteaseCloudMusicApi` 等开源实现，详见其仓库文档。
- **Rust crates / npm packages** — 各自许可证见 `Cargo.lock` / `package-lock.json`。

## Design reference / thanks

Decro 是非官方重制，感谢 **Cirro 原项目**（https://github.com/ThripleQ/cirro）提供的设计语言、交互与动效参考。Cirro 的 Android 源码与 APK 仅作为设计与交互研究参考。本仓库不包含其原始代码、Logo、图标路径或 PNG 品牌图；所有界面资产均为本项目自绘或使用可再分发字体。

`docs/screenshots/` 中的原型截图来自本仓库前端；alpha42 真机截图仅本地保留，不随仓库发布。

## CI tooling

- **nsis_tauri_utils.dll** from the Tauri project — MIT licensed. Vendored only under
  `.github/nsis/` so GitHub Actions can recover when the upstream NSIS plugin download
  returns a transient 504. SHA1: `75197FEE3C6A814FE035788D1C34EAD39349B860`.
- **NSIS 3.13** — zlib/libpng licensed. Vendored as `nsis-3.13.zip` solely for the
  GitHub Actions NSIS cache. SHA1: `DB14F8AF2EA346B786C6AE19343F61AAF5E09B8E`.
