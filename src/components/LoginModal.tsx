import { createEffect, createSignal, on, onCleanup, Show } from "solid-js";
import { BrandMark } from "./CoverArt";
import { Icon } from "./Icon";
import {
  getAuthStatus,
  importCookie,
  isTauri,
  pollQrLogin,
  qrDataUrl,
  startQrLogin,
  type Account,
} from "../lib/auth";

type Phase = "loading" | "waiting" | "scanned" | "success" | "expired" | "error";

export function LoginModal(props: {
  open: boolean;
  onClose: () => void;
  onSuccess: (account: Account) => void;
}) {
  const [phase, setPhase] = createSignal<Phase>("loading");
  const [qr, setQr] = createSignal("");
  const [status, setStatus] = createSignal("正在获取二维码…");
  const [account, setAccount] = createSignal<Account | null>(null);
  const [importOpen, setImportOpen] = createSignal(false);
  const [cookieText, setCookieText] = createSignal("");
  const [importBusy, setImportBusy] = createSignal(false);
  const [importError, setImportError] = createSignal<string | null>(null);
  let key = "";
  let poll: number | undefined;
  let closed = false;
  let polling = false;
  let generation = 0;

  const stopPolling = () => {
    if (poll !== undefined) {
      window.clearInterval(poll);
      poll = undefined;
    }
    polling = false;
  };

  const finishSuccess = (next: Account) => {
    generation += 1;
    stopPolling();
    setAccount(next);
    setPhase("success");
    setStatus("登录成功");
    props.onSuccess(next);
    window.setTimeout(() => {
      if (!closed) props.onClose();
    }, 900);
  };

  const submitCookie = async () => {
    if (!cookieText().trim() || importBusy()) return;
    const request = generation;
    setImportBusy(true);
    setImportError(null);
    try {
      const next = await importCookie(cookieText());
      if (closed || request !== generation) return;
      setCookieText("");
      finishSuccess(next);
    } catch (error) {
      setImportError(typeof error === "string" ? error : "凭证导入失败，请检查后重试");
    } finally {
      setImportBusy(false);
    }
  };

  const begin = async () => {
    const request = ++generation;
    stopPolling();
    closed = false;
    setPhase("loading");
    setStatus("正在获取二维码…");
    setQr("");
    setAccount(null);
    try {
      const start = await startQrLogin();
      if (closed || request !== generation) return;
      key = start.unikey;
      setQr(await qrDataUrl(start.qrUrl));
      setPhase("waiting");
      setStatus(
        isTauri()
          ? "打开网易云音乐 App，扫描二维码"
          : "浏览器预览：请安装 Windows 客户端后扫码",
      );
      poll = window.setInterval(async () => {
        if (closed || request !== generation || !key || polling) return;
        polling = true;
        try {
          const result = await pollQrLogin(key);
          if (closed || request !== generation) return;
          if (result.code === 801) {
            setPhase("waiting");
            setStatus("等待扫码…");
          } else if (result.code === 802) {
            setPhase("scanned");
            setStatus("已扫码，请在手机上确认登录");
          } else if (result.code === 803) {
            stopPolling();
            if (result.account) {
              finishSuccess(result.account);
            } else {
              setPhase("success");
              setStatus("登录成功，正在同步账号资料…");
              const next = await getAuthStatus().catch(() => null);
              if (closed) return;
              if (next) finishSuccess(next);
              else {
                setPhase("error");
                setStatus("登录成功，但账号资料同步失败；请重启应用后再试");
              }
            }
          } else if (result.code === 800) {
            stopPolling();
            setPhase("expired");
            setStatus("二维码已过期，请刷新");
          } else {
            stopPolling();
            setPhase("error");
            setStatus(result.message || `登录状态异常（${result.code}）`);
          }
        } catch (error) {
          if (closed) return;
          stopPolling();
          setPhase("error");
          setStatus(typeof error === "string" ? error : "登录状态查询失败");
        } finally {
          polling = false;
        }
      }, 1800);
    } catch (error) {
      if (closed || request !== generation) return;
      setPhase("error");
      setStatus(
        typeof error === "string"
          ? error
          : error instanceof Error
            ? error.message
            : "无法获取二维码，请稍后重试",
      );
    }
  };

  createEffect(on(
    () => props.open,
    (open) => {
      if (open) void begin();
      else {
        closed = true;
        generation += 1;
        stopPolling();
      }
    },
  ));

  onCleanup(() => {
    closed = true;
    generation += 1;
    stopPolling();
  });

  const close = () => {
    closed = true;
    generation += 1;
    stopPolling();
    setCookieText("");
    setImportError(null);
    setImportOpen(false);
    props.onClose();
  };

  return (
    <Show when={props.open}>
      <div class="login-layer" role="dialog" aria-modal="true" aria-label="网易云音乐扫码登录">
        <div class="login-scrim" onClick={close} />
        <div class="login-modal">
          <button class="login-close" aria-label="关闭登录" onClick={close}>
            <Icon name="close" size={20} />
          </button>

          <div class="login-brand">
            <span class="login-brand__mark">
              <BrandMark size={25} />
            </span>
            <span>Decro</span>
          </div>

          <h2>扫码登录</h2>
          <p class="login-sub">登录后账号信息只保存在本机，不会上传到任何第三方服务。</p>

          <div class="login-qr" classList={{ "is-scanned": phase() === "scanned", "is-success": phase() === "success" }}>
            <Show
              when={qr()}
              fallback={
                <div class="login-qr__loading">
                  <span class="login-spinner" />
                  正在生成二维码
                </div>
              }
            >
              <img src={qr()} alt="网易云音乐登录二维码" />
            </Show>
            <Show when={phase() === "scanned"}>
              <div class="login-qr__overlay">
                <Icon name="check" size={24} />
                已扫码
              </div>
            </Show>
            <Show when={phase() === "success"}>
              <div class="login-qr__overlay login-qr__overlay--success">
                <Icon name="check" size={26} />
                登录成功
              </div>
            </Show>
            <Show when={phase() === "expired"}>
              <div class="login-qr__overlay">
                <Icon name="clock" size={22} />
                已过期
              </div>
            </Show>
          </div>

          <div class="login-status" aria-live="polite">
            <span
              class="login-status__dot"
              classList={{
                "is-ok": phase() === "success",
                "is-scanned": phase() === "scanned",
                "is-error": phase() === "error" || phase() === "expired",
              }}
            />
            {phase() === "success" && account()
              ? `${account()!.nickname}，欢迎回来`
              : status()}
          </div>

          <Show when={phase() === "error"}>
            <p class="login-hint">可以尝试更换网络后刷新二维码，或使用下面的网页版凭证导入。</p>
          </Show>

          <div class="login-actions">
            <button class="login-refresh" onClick={() => void begin()}>
              <Icon name="refresh" size={16} />
              刷新二维码
            </button>
            <button class="login-cancel" onClick={close}>取消</button>
          </div>

          <button class="login-import-toggle" onClick={() => setImportOpen((value) => !value)}>
            {importOpen() ? "收起网页版登录" : "扫码被风控？导入网页版登录凭证"}
          </button>

          <Show when={importOpen()}>
            <div class="login-import">
              <p>
                在浏览器打开 music.163.com 并登录，按 F12 → Application → Cookies，复制
                <code>MUSIC_U</code>（建议连同 <code>__csrf</code>）粘贴到这里。凭证只保存在本机，
                由 Windows DPAPI 加密。
              </p>
              <textarea
                class="login-import__input"
                value={cookieText()}
                placeholder="MUSIC_U=...; __csrf=..."
                spellcheck={false}
                onInput={(event) => setCookieText(event.currentTarget.value)}
              />
              <Show when={importError()}>
                <p class="login-import__error">{importError()}</p>
              </Show>
              <button
                class="login-import__submit"
                disabled={importBusy() || !cookieText().trim()}
                onClick={() => void submitCookie()}
              >
                {importBusy() ? "正在验证…" : "导入并登录"}
              </button>
            </div>
          </Show>

          <p class="login-legal">
            非官方客户端 · 感谢 Cirro 原项目 · 登录使用网易云音乐官方扫码接口 · 账号风险自担
          </p>
        </div>
      </div>
    </Show>
  );
}
