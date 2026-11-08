import { createEffect, createSignal, on, onCleanup, Show } from "solid-js";
import { BrandMark } from "./CoverArt";
import { Icon } from "./Icon";
import {
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
  let key = "";
  let poll: number | undefined;
  let closed = false;
  let polling = false;

  const stopPolling = () => {
    if (poll !== undefined) {
      window.clearInterval(poll);
      poll = undefined;
    }
  };

  const begin = async () => {
    stopPolling();
    closed = false;
    setPhase("loading");
    setStatus("正在获取二维码…");
    setQr("");
    setAccount(null);
    try {
      const start = await startQrLogin();
      if (closed) return;
      key = start.unikey;
      setQr(await qrDataUrl(start.qrUrl));
      setPhase("waiting");
      setStatus(
        isTauri()
          ? "打开网易云音乐 App，扫描二维码"
          : "浏览器预览：请安装 Windows 客户端后扫码",
      );
      poll = window.setInterval(async () => {
        if (closed || !key || polling) return;
        polling = true;
        try {
          const result = await pollQrLogin(key);
          if (closed) return;
          if (result.code === 801) {
            setPhase("waiting");
            setStatus("等待扫码…");
          } else if (result.code === 802) {
            setPhase("scanned");
            setStatus("已扫码，请在手机上确认登录");
          } else if (result.code === 803 && result.account) {
            stopPolling();
            setPhase("success");
            setAccount(result.account);
            setStatus(result.message || "登录成功");
            props.onSuccess(result.account);
            window.setTimeout(() => {
              if (!closed) props.onClose();
            }, 800);
          } else if (result.code === 800) {
            stopPolling();
            setPhase("expired");
            setStatus("二维码已过期，请刷新");
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
      setPhase("error");
      setStatus(error instanceof Error ? error.message : "无法获取二维码，请稍后重试");
    }
  };

  createEffect(on(
    () => props.open,
    (open) => {
      if (open) void begin();
      else {
        closed = true;
        stopPolling();
      }
    },
  ));

  onCleanup(() => {
    closed = true;
    stopPolling();
  });

  const close = () => {
    closed = true;
    stopPolling();
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
            <span>Cirro</span>
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

          <div class="login-actions">
            <button class="login-refresh" onClick={() => void begin()}>
              <Icon name="refresh" size={16} />
              刷新二维码
            </button>
            <button class="login-cancel" onClick={close}>取消</button>
          </div>

          <p class="login-legal">
            非官方客户端 · 登录使用网易云音乐官方扫码接口 · 账号风险自担
          </p>
        </div>
      </div>
    </Show>
  );
}
