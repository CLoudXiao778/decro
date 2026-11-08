# 扫码登录与凭证

> 从 0.1.1 起，应用提供**真实**的网易云音乐扫码登录入口。
> 登录只解决“账号身份”这一层：曲库、播放与歌单仍使用 mock 数据，尚未接入网易云 API。

## 1. 范围

已实现：

- 二维码获取与展示（网易云音乐官方扫码页）。
- 轮询扫码状态：等待、已扫码待确认、成功、过期。
- 成功后读取账号资料（昵称、数字 ID、头像 URL）。
- 登录态在应用重启后恢复；支持退出登录。
- 标题栏、侧栏、设置页、页面头像四个入口。

未实现：

- 搜索、首页、歌单、歌词、播放 URL。
- 喜欢/收藏写回账号。
- 多账号、手机号/邮箱登录。
- Cookie 导入或导出。

这是一条**临时的真实登录切片**，不是对目标架构的替换。目标架构仍是
`docs/architecture.md` 中的 libnetease FFI + 本地流代理；等 libnetease 接入后，
登录流程可以平移到它的 cookie jar，而 UI 与安全边界不变。

## 2. 流程

```text
前端 LoginModal                 Rust auth.rs                   music.163.com
     │                              │                              │
     │ invoke qr_login_start        │                              │
     ├─────────────────────────────>│ GET /api/login/qrcode/unikey │
     │                              ├─────────────────────────────>│
     │<── { unikey, qrUrl } ────────┤<── unikey + Set-Cookie ──────┤
     │                              │ 内存 map: unikey → cookie jar │
     │ qrcode 库渲染 data URL        │                              │
     │                              │                              │
     │ 每 1.8s invoke qr_login_poll │                              │
     ├─────────────────────────────>│ GET /api/login/qrcode/       │
     │                              │     client/login?key&type=1  │
     │                              ├─────────────────────────────>│
     │<── { code, message } ────────┤<── code + Set-Cookie ────────┤
     │                              │                              │
     │            code 803 ─────────>│ GET /api/nuser/account/get   │
     │                              ├─────────────────────────────>│
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

实现细节：

- 轮询使用 `setInterval`，并有 `polling` 互斥标记，避免慢请求叠加。
- 关闭弹窗、刷新二维码、组件卸载都会清理定时器；过期后停止轮询。
- 刷新会清空上一轮的内存 cookie jar，避免 key 无限累积。
- 只有在 **803 + 账号资料读取成功** 后才落盘；等待中途的 Cookie 只留在内存。
- 前端只收到 `{ userId, nickname, avatarUrl }`，永远拿不到 Cookie 或 token。

## 3. 凭证存储

- 位置：`%APPDATA%\io.github.cloudxiao778.cirrodesktop\netease-auth.bin`
  （Tauri `app_data_dir`，不写入项目目录，也不写入 `localStorage`）。
- 内容：登录后的 Cookie 请求头字符串。
- 加密：Windows DPAPI `CryptProtectData`（CurrentUser），读取时
  `CryptUnprotectData`。密文与当前 Windows 用户绑定，复制到其他用户或电脑无法解密。
- 退出登录：删除该文件，并清空 Rust 内存中的 cookie / account。
- 启动恢复：`auth_status` 读取并解密文件，然后请求账号资料验证；失效则返回未登录，
  不把坏数据当作已登录状态。
- 非 Windows 开发构建不把凭证写盘：`protect` 返回错误，登录仅在当前进程内有效。
  公开发布只构建 Windows。

> DPAPI 防的是“文件被复制走”和“其他 Windows 用户读取”，防不了同一用户会话内
> 已经运行的恶意软件。应用不记录 Cookie，不发送遥测，也不把登录态暴露给 WebView。

## 4. 安全与合规

- **非官方接口**：扫码与账号接口来自网易云音乐 Web 端，未公开承诺稳定；接口变更
  可能导致登录失败。应用不绕过验证码、风控或地域限制，不伪造 IP。
- **账号风险**：第三方客户端登录可能触发平台风控；风险由使用者承担，登录弹窗内已提示。
- **最小权限**：登录后只调用账号资料接口，不拉取用户歌单、听歌记录或社交数据。
- **CSP 不变**：所有登录网络请求都在 Rust 侧完成；WebView 的 `connect-src` 不需要
  放行 `music.163.com`。
- **日志**：不打印请求头、Cookie、Set-Cookie 或 unikey 之外的敏感内容；错误信息只说明
  失败阶段。
- **头像**：只保存 `avatarUrl` 字符串，当前 UI 用昵称首字显示，不加载远程头像；若以后
  显示远程头像，需要同步收紧 `img-src` CSP。

## 5. 已知限制

- 尚未在真实 Windows 安装包上完成“手机扫码 → 成功”的端到端验收；0.1.1 的 CI 构建
  会验证 Rust 编译与打包，但扫码需要真实账号手工验证。
- 二维码过期后必须手动刷新，没有自动换码。
- 退出登录只清本地凭证，不调用网易云注销接口；服务端 session 会在自然过期后失效。
- 如果账号资料接口暂时失败，会提示“扫码成功，但未能读取账号资料”，此时不落盘，
  需要重新扫码。

## 6. 与目标架构的关系

| 现在（0.1.1） | 目标 |
|---|---|
| `src-tauri/src/auth.rs` 直接 `reqwest` 调 Web 接口 | `netease/ffi.rs` 调 libnetease |
| 手动解析 `Set-Cookie` 到内存 map | libnetease 内部 cookie jar |
| DPAPI 文件存 Cookie 字符串 | 同一 DPAPI 文件，或 libnetease 可加载的 jar |
| 前端 `lib/auth.ts` 四个 invoke | 命令名与返回模型保持稳定，前端无需重写 |

前端命令边界（`qr_login_start` / `qr_login_poll` / `auth_status` / `logout`）是稳定的；
替换后端实现时不要改变返回给前端的字段。
