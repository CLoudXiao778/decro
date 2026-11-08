import { invoke } from "@tauri-apps/api/core";
import QRCode from "qrcode";

export type Account = {
  userId: string;
  nickname: string;
  avatarUrl: string;
};

export type QrStart = {
  unikey: string;
  qrUrl: string;
};

export type QrPoll = {
  code: number;
  message: string;
  account: Account | null;
};

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/**
 * Browser preview has no Rust backend. It still renders a real NetEase login
 * QR shape so the entry and visual states can be inspected; it never claims
 * a login succeeded.
 */
export async function startQrLogin(): Promise<QrStart> {
  if (!isTauri()) {
    const key = `preview-${Date.now()}`;
    return { unikey: key, qrUrl: `https://music.163.com/login?codekey=${key}` };
  }
  return invoke<QrStart>("qr_login_start");
}

export async function pollQrLogin(key: string): Promise<QrPoll> {
  if (!isTauri()) {
    return { code: 801, message: "浏览器预览：请在安装后的 Windows 客户端扫码", account: null };
  }
  return invoke<QrPoll>("qr_login_poll", { key });
}

export async function getAuthStatus(): Promise<Account | null> {
  if (!isTauri()) return null;
  return invoke<Account | null>("auth_status");
}

export async function logout(): Promise<void> {
  if (!isTauri()) return;
  await invoke("logout");
}

/** Fallback for networks where NetEase risk-control blocks the QR flow. */
export async function importCookie(cookie: string): Promise<Account> {
  if (!isTauri()) {
    throw new Error("浏览器预览无法导入登录凭证，请在安装后的 Windows 客户端操作");
  }
  return invoke<Account>("import_cookie", { cookie });
}

export function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 512,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#111111", light: "#ffffff" },
  });
}
