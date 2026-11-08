# Third-party notices

本项目代码以 **MIT License** 发布，见 `LICENSE`。以下组件/资源各自保留其原始许可证。

## Fonts

- **Inter** — Copyright (c) 2016 The Inter Project Authors.
  Licensed under the SIL Open Font License 1.1.
  The license text is at `public/fonts/Inter-OFL.txt`.

## Runtime / future backend

- **Tauri** — MIT / Apache-2.0.
- **libnetease** — 暂未接入或随包分发；后续接入前需确认其许可证。
- **Rust crates / npm packages** — 各自许可证见 `Cargo.lock` / `package-lock.json`。

## Design reference

Cirro 的 Android 源码与 APK 仅作为设计与交互研究参考。本仓库不包含其原始代码、Logo、图标路径或 PNG 品牌图；所有界面资产均为本项目自绘或使用可再分发字体。

`docs/screenshots/` 中的原型截图来自本仓库前端；alpha42 真机截图仅本地保留，不随仓库发布。

## CI tooling

- **nsis_tauri_utils.dll** from the Tauri project — MIT licensed. Vendored only under
  `.github/nsis/` so GitHub Actions can recover when the upstream NSIS plugin download
  returns a transient 504. SHA1: `75197FEE3C6A814FE035788D1C34EAD39349B860`.
