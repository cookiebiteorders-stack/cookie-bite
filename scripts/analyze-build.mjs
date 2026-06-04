#!/usr/bin/env node
/**
 * Production build with @next/bundle-analyzer (ANALYZE=true).
 * Usage: npm run analyze
 */
import { spawnSync } from "node:child_process";

const env = { ...process.env, ANALYZE: "true" };
const result = spawnSync("npm", ["run", "build"], {
  stdio: "inherit",
  shell: true,
  env,
  cwd: process.cwd(),
});
process.exit(result.status ?? 1);
