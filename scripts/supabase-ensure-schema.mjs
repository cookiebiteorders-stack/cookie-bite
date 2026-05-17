#!/usr/bin/env node
/**
 * One command: apply pending migrations via Supabase API, then verify core tables.
 *
 *   npm run supabase:ensure-schema
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_ACCESS_TOKEN
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function runNode(script, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, "scripts", script), ...args], {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${script} exited with ${code}`));
    });
  });
}

console.log("=== Step 1/2: Apply migrations (Supabase Management API) ===\n");
await runNode("supabase-run-migrations.mjs");

console.log("\n=== Step 2/2: Verify core tables ===\n");
await runNode("supabase-schema-snapshot-check.mjs");

console.log("\n[supabase:ensure-schema] All core tables present.");
