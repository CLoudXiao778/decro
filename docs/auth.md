# 扫码登录与凭证

> 从 0.2.0 起，登录不仅解决账号身份，还会同步在线歌单、最近播放与每日推荐，
> 并用于获取可播放音源。0.2.1 起项目更名为 Decro；0.3.0 起登录、音源与红心改用 Cirro 原项目的 `libnetease` C 库。

## 1. 范围

已实现：

- 二维码登录：Cirro 原项目 `libnetease` 的 weapi 流程（`ne_qr_get_key` / `ne_qr_check`，含 chainId）。
- 轮询扫码状态：等待、已扫码待确认、成功、过期、风控错误。
- 成功后读取账号资料（昵称、数字 ID、头像 URL），并同步音乐库。
- 登录态在应用重启后恢复；支持退出登录。
- 标题栏、侧栏、设置页、页面头像四个入口。
- 二维码被风控时的兜底：网页版 `MUSIC_U` 凭证导入。

未实现：

- 手机号/邮箱登录、多账号切换。
- Cookie 导出（只允许导入）。
- 评论、下载、云盘、听歌上报等社交/增值能力。

## 2. 流程

```text
前端 LoginModal                 Rust auth.rs                  libnetease (C)
     │                              │                              │
     │ invoke qr_login_start        │                              │
     ├─────────────────────────────>│ ne_qr_get_key()              │
     │                              ├─────────────────────────────>│
     │                              │ weapi /login/qrcode/unikey   │
     │                              │                              │
     │<── { unikey, qrUrl } ────────┤ ne_qr_build_url() + chainId  │
     │ qrcode 库渲染 data URL        │                              │
     │                              │                              │
     │ 每 1.8s invoke qr_login_poll │                              │
     ├─────────────────────────────>│ ne_qr_check(key)             │
     │                              ├─────────────────────────────>│
     │<── { code, message } ────────┤ weapi /client/login          │
     │                              │ 全局 cookie jar (内存)        │
     │            code 803 ─────────>│ cookie_header()              │
     │                              │ GET /api/nuser/account/get   │
     │                              │<── profile ──────────────────┤
     │                              │ DPAPI 加密落盘                │
     │<── { code, message, account }┤                              │
```

状态码：

| code | 含义 | UI |
|---:|---|---|
| 800 | 二维码过期 | 显示“已过期”，可刷新 |
| 801 | 等待扫码 | 继续轮询 |
| 802 | 已扫码，等待手机确认 | 继续轮询，显示确认提示 |
| 803 | 登录成功 | 读取资料、持久化、关闭弹窗 |
| -462 / 8821 / 8810 / -460 | 网易风控/验证要求 | 停止轮询，显示原因，提供凭证导入 |

实现细节：

- 轮询使用 `setInterval`，并有 `polling` 互斥标记，避免慢请求叠加。
- 关闭弹窗、刷新二维码、组件卸载都会清理定时器；过期或风控错误后停止轮询。
- 刷新会清空上一轮的内存 cookie jar，避免 key 无限累积。
- 803 之前只把 Cookie 留在内存；803 后立即保存（即使资料接口暂时失败），
  避免“扫码成功但重启后又要重扫”。
- 803 后资料接口会重试 3 次；仍失败则前端再调用一次 `auth_status` 尝试恢复。
- 令牌比较、登录 epoch 与互斥锁用于避免旧轮询/旧 `auth_status` 覆盖新会话。
- 前端只收到 `{ userId, nickname, avatarUrl }`；拿不到网易云 Cookie 或音源签名 URL，只会拿到本地音频代理 token。
- 音源 URL、红心与扫码都由 `libnetease` 的 weapi/eapi 实现；Rust 只做 FFI 与 JSON 适配。

## 3. 网页版凭证导入

当二维码出码或确认阶段被网易风控拦截时，登录弹窗提供“导入网页版登录凭证”：

1. 在浏览器打开 `https://music.163.com` 并登录。
2. DevTools → Application → Cookies → `https://music.163.com`。
3. 复制 `MUSIC_U`（建议连同 `__csrf`），粘贴到登录弹窗。
4. Rust 侧校验 `MUSIC_U`、请求 `/api/nuser/account/get` 验证，成功后 DPAPI 落盘，
   并同步到 libnetease 的内存 jar。

限制：

- 只接受包含 `MUSIC_U` 的 Cookie；只保留网易云相关 cookie 名（`MUSIC_U`、`__csrf`、`NMTID` 等），其他站点 cookie 会被丢弃；不提供导出。
- 凭证不会写日志、不会进入前端存储；输入框内容只存在于当前弹窗内存。
- `__csrf` 用于喜欢/取消喜欢；缺少它时登录可用，但写操作可能失败。

## 4. 凭证存储

- 位置：`%APPDATA%\io.github.cloudxiao778.decrodesktop\netease-auth.bin`
  （Tauri `app_data_dir`，不写入项目目录，也不写入 `localStorage`）。
- 内容：登录后的 Cookie 请求头字符串（libnetease 的 jar 只在内存，写盘目标是 `NUL`/`/dev/null`）。
- 加密：Windows DPAPI `CryptProtectData`（CurrentUser），读取时
  `CryptUnprotectData`。密文与当前 Windows 用户绑定，复制到其他用户或电脑无法解密。
- 退出登录：删除该文件，并清空 Rust 内存中的 cookie / account / 音源缓存。
- 启动恢复：`auth_status` 读取并解密文件，然后请求账号资料验证；失效则返回未登录。
- 从 0.2.0 升级时，若新标识符目录没有凭证，会读取旧 `io.github.cloudxiao778.cirrodesktop` 文件并迁移到新目录；成功后删除旧文件。
- 非 Windows 开发构建不把凭证写盘：`protect` 返回错误，扫码/导入的登录仅在当前进程内有效。
  公开发布只构建 Windows。

> DPAPI 防的是“文件被复制走”和“其他 Windows 用户读取”，防不了同一用户会话内
> 已经运行的恶意软件。应用不记录 Cookie，不发送遥测，也不把登录态暴露给 WebView。

## 5. 安全与合规

- **非官方接口**：扫码、账号、歌单、搜索、歌词、音源均来自网易云音乐接口，
  未公开承诺稳定；接口变更可能导致功能失效。应用不绕过验证码、风控或版权限制。
- **libnetease**：0.3.0 起使用 Cirro 原项目的 `libnetease`（C 子模块）做 weapi/eapi 签名；
  它来自 https://github.com/ThripleQ/libnetease ，感谢原作者。
- **账号风险**：第三方客户端登录可能触发平台风控；风险由使用者承担，登录弹窗内已提示。
- **最小暴露**：所有网易云网络请求都在 Rust 侧完成；前端只拿展示模型。
  音频经本地 `127.0.0.1` 代理转发，前端不接触带签名的 CDN URL。
- **CSP**：`connect-src` 不放行 `music.163.com`；`img-src` 只额外放行网易云图片 CDN；
  `media-src` 只放行本地代理。前端会拿到本地代理 token（用于 `127.0.0.1` 音频 URL），
  但拿不到网易云会话 Cookie 或带签名的 CDN URL。
- **日志**：debug 日志写入应用日志目录的 `decro.log`；不打印 Cookie、token、Set-Cookie 或签名音源 URL；错误信息只说明失败阶段。设置 → 实验可打开日志目录。
- **头像**：保存 `avatarUrl` 字符串但当前 UI 使用昵称首字，不加载远程头像。

## 6. 已知限制

- 扫码成功需要在真实 Windows 安装包上用真实账号手工验证；CI 只验证编译与打包。
- 网易风控与 IP/网络环境相关，二维码可能出码成功但在确认阶段被拦截。
- 二维码过期后必须手动刷新，没有自动换码。
- 退出登录只清本地凭证，不调用网易云注销接口；服务端 session 会在自然过期后失效。
- 没有实现听歌上报，因此本应用播放不会写入网易云的“最近播放”。

## 7. 与目标架构的关系

| 现在（0.3.0） | 目标 |
|---|---|
| `auth.rs` / `netease.rs` 通过 `libnetease.rs` FFI 调 C 库 | 保持 FFI，补齐更多服务 |
| libnetease 内部 cookie jar（内存） | 保持；DPAPI 仍是唯一持久化副本 |
| 首页/歌单/搜索/歌词仍由 Rust 直连 Web 接口 | 逐步迁入 libnetease 高层命令 |
| `proxy.rs` 本地音频代理 | 保留，接 libnetease 音源 URL |
| 前端 `lib/auth.ts` / `lib/netease.ts` invoke | 命令名与返回模型保持稳定，前端无需重写 |

前端命令边界是稳定的；替换后端实现时不要改变返回给前端的字段。
