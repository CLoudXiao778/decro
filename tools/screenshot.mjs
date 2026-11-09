import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.BASE_URL ?? "http://127.0.0.1:1420";
const out = new URL("../docs/screenshots/", import.meta.url).pathname;

await mkdir(out, { recursive: true });
const browser = await chromium.launch();

async function pageWith(viewport, theme) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.addInitScript((value) => { localStorage.setItem("decro.theme", value); localStorage.setItem("decro.lowPower", "false"); }, theme);
  return page;
}

async function mainPage(theme = "dark") {
  const page = await pageWith({ width: 1440, height: 900 }, theme);
  await page.goto(`${base}/?nosplash`, { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  return page;
}

const home = await mainPage();
await home.screenshot({ path: `${out}/home-dark.png` });

await home.locator(".nav-item").nth(3).click();
await home.waitForTimeout(400);
await home.screenshot({ path: `${out}/search.png` });
await home.locator(".search-source-pill").click();
await home.waitForTimeout(200);
await home.keyboard.type("daft");
await home.waitForTimeout(500);
await home.screenshot({ path: `${out}/search-results.png` });

await home.locator(".nav-item").nth(2).click();
await home.waitForTimeout(500);
await home.screenshot({ path: `${out}/library.png` });

await home.locator(".titlebar__actions .icon-btn").nth(3).click();
await home.waitForTimeout(500);
await home.screenshot({ path: `${out}/settings.png` });

await home.locator(".nav-item").nth(0).click();
await home.waitForTimeout(350);
await home.locator(".feature-card").first().click();
await home.waitForTimeout(700);
await home.screenshot({ path: `${out}/detail.png` });

await home.locator(".detail-circle").first().click();
await home.waitForTimeout(400);
await home.locator("#player-dock").click({ position: { x: 50, y: 50 } });
await home.waitForTimeout(1400);
await home.screenshot({ path: `${out}/player.png` });
await home.locator(".player-cover").click();
await home.waitForTimeout(700);
await home.screenshot({ path: `${out}/lyrics.png` });
await home.close();

const light = await mainPage("light");
await light.screenshot({ path: `${out}/home-light.png` });
await light.close();

const splash = await pageWith({ width: 1440, height: 900 }, "dark");
await splash.goto(`${base}/`, { waitUntil: "domcontentloaded" });
await splash.waitForTimeout(1050);
await splash.screenshot({ path: `${out}/splash.png` });
await splash.close();

await browser.close();
console.log(`Screenshots written to ${out}`);
