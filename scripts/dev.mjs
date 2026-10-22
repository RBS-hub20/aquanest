#!/usr/bin/env node
/**
 * AquaNest one-command dev bootstrap.
 *   npm run dev
 * 1. Creates .env from .env.example on first run (local Docker Postgres + demo mode)
 * 2. Starts the bundled Postgres container when DATABASE_URL points at it
 * 3. Syncs the Prisma schema and seeds an empty database
 * 4. Starts `next dev`
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import net from "node:net";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const c = { blue: "\x1b[38;5;32m", aqua: "\x1b[38;5;39m", dim: "\x1b[2m", red: "\x1b[31m", reset: "\x1b[0m", bold: "\x1b[1m" };
const log = (msg) => console.log(`${c.aqua}💧 AquaNest${c.reset} ${msg}`);
const LOCAL_DB = "postgresql://aquanest:aquanest@localhost:54329/aquanest";

function parseEnv(file) {
  const out = {};
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

process.env.PRISMA_HIDE_UPDATE_MESSAGE = "1";

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: root, shell: process.platform === "win32", ...opts });
  return r.status === 0;
}

function waitForPort(port, host = "127.0.0.1", timeoutMs = 60_000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const tryOnce = () => {
      const s = net.connect(port, host);
      s.once("connect", () => { s.end(); resolve(true); });
      s.once("error", () => {
        s.destroy();
        if (Date.now() - start > timeoutMs) resolve(false);
        else setTimeout(tryOnce, 1000);
      });
    };
    tryOnce();
  });
}

// Remove macOS AppleDouble files (exFAT/NTFS drives) that confuse TypeScript/Next.
function cleanAppleDouble(dir) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".git") continue;
    const p = join(dir, name);
    if (name.startsWith("._")) { try { unlinkSync(p); } catch {} continue; }
    try { if (statSync(p).isDirectory()) cleanAppleDouble(p); } catch {}
  }
}

async function main() {
  console.log(`\n${c.bold}${c.blue}  AquaNest™${c.reset}  ${c.dim}Water Refilling Station & Delivery — Pure Water. Happy Home.${c.reset}\n`);
  cleanAppleDouble(root);

  const envPath = join(root, ".env");
  if (!existsSync(envPath)) {
    let tpl = readFileSync(join(root, ".env.example"), "utf8");
    tpl = tpl
      .replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${LOCAL_DB}"`)
      .replace(/^DIRECT_URL=.*$/m, `DIRECT_URL="${LOCAL_DB}"`)
      .replace(/^AUTH_SECRET=.*$/m, `AUTH_SECRET="${randomBytes(32).toString("hex")}"`);
    writeFileSync(envPath, tpl);
    log("Created .env (local Postgres + Demo Mode). Add your Supabase keys there any time.");
  }

  const env = parseEnv(envPath);
  const dbUrl = env.DATABASE_URL || "";
  if (!dbUrl || dbUrl.includes("[project-ref]")) {
    console.error(`${c.red}DATABASE_URL is not set in .env.${c.reset} Paste your Supabase connection string or use ${LOCAL_DB}`);
    process.exit(1);
  }

  if (dbUrl.includes("localhost:54329")) {
    const up = await waitForPort(54329, "127.0.0.1", 1500);
    if (!up) {
      log("Starting local Postgres (docker compose)…");
      const ok = run("docker", ["compose", "up", "-d", "db"]);
      if (!ok) {
        console.error(`${c.red}Could not start Docker Postgres.${c.reset} Start Docker Desktop, or set DATABASE_URL to your Supabase database.`);
        process.exit(1);
      }
      if (!(await waitForPort(54329))) { console.error("Postgres did not come up in time."); process.exit(1); }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  log("Syncing database schema…");
  if (!run("npx", ["prisma", "db", "push", "--skip-generate"])) process.exit(1);
  if (!run("npx", ["prisma", "generate"], { stdio: ["inherit", "ignore", "inherit"] })) process.exit(1);

  log("Seeding (only if empty)…");
  run("npx", ["tsx", "prisma/seed.ts", "--if-empty"]);

  log("Starting Next.js (http://localhost:3000, or the next free port)…");
  const child = spawn("npx", ["next", "dev"], { stdio: "inherit", cwd: root, shell: process.platform === "win32" });
  const stop = () => child.kill("SIGINT");
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  child.on("exit", (code) => process.exit(code ?? 0));
}

main();
