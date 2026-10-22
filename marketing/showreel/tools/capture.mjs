// Captures real AquaNest screens from the running app for the showreel.
import puppeteer from "puppeteer-core";
import { readFileSync, mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3100";
const OUT = new URL("../public/screens/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const sessions = JSON.parse(readFileSync(new URL("./sessions.json", import.meta.url)));

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--hide-scrollbars", "--force-color-profile=srgb"],
});

async function shot(name, path, { session, width = 1440, height = 900, scale = 2, mobile = false, fullPage = false, wait = 5000, before } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: scale, isMobile: mobile, hasTouch: mobile });
  const cookies = [{ name: "NEXT_LOCALE", value: "en", url: BASE }];
  if (session) cookies.push({ name: "an_session", value: sessions[session], url: BASE, httpOnly: true });
  await page.setCookie(...cookies);
  await page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 180000 });
  // hide Next dev indicators / toasts
  await page.addStyleTag({ content: "nextjs-portal,[data-nextjs-toast],[data-sonner-toaster]{display:none!important}" });
  if (before) await before(page);
  await new Promise((r) => setTimeout(r, wait));
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage });
  console.log("✓", name);
  await page.close();
}

await shot("landing", "/");
await shot("landing-pricing", "/", { before: (p) => p.evaluate(() => document.querySelector("#pricing").scrollIntoView()) });
await shot("customer", "/dashboard", { session: "customer" });
await shot("customer-full", "/dashboard", { session: "customer", fullPage: true });
await shot("order", "/order", { session: "customer" });
await shot("admin", "/admin", { session: "admin" });
await shot("admin-full", "/admin", { session: "admin", fullPage: true });
await shot("admin-board", "/admin/orders", { session: "admin" });
await shot("rider", "/rider", { session: "rider", width: 390, height: 844, scale: 3, mobile: true });
await browser.close();
