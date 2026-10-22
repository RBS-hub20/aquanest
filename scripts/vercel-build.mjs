#!/usr/bin/env node
/**
 * Vercel build: prisma generate → (if a database is configured) sync schema + seed an empty DB → next build.
 * Seeding uses --if-empty, so existing production data is never wiped.
 */
import { spawnSync } from "node:child_process";

const run = (cmd, args) => {
  console.log(`\n▶ ${cmd} ${args.join(" ")}`);
  const r = spawnSync(cmd, args, { stdio: "inherit", env: { ...process.env, PRISMA_HIDE_UPDATE_MESSAGE: "1" } });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

run("npx", ["prisma", "generate"]);

const db = process.env.DATABASE_URL || "";
if (!db || db.includes("[project-ref]") || db.includes("localhost")) {
  console.warn("\n⚠ DATABASE_URL is not set for this environment — skipping schema sync & seed. The app will not work until it is set.");
} else if (!process.env.DIRECT_URL) {
  console.warn("\n⚠ DIRECT_URL is missing — Supabase needs the direct (port 5432) connection for schema sync. Skipping DB setup.");
} else {
  run("npx", ["prisma", "db", "push", "--skip-generate"]);
  run("npx", ["tsx", "prisma/seed.ts", "--if-empty"]);
}

run("npx", ["next", "build"]);
