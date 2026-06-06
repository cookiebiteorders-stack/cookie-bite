#!/usr/bin/env node
/**
 * Run Cookie Bite Python API locally without Docker.
 * Creates venv, installs deps, starts uvicorn on :8000.
 *
 * Usage: npm run python:dev
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pyRoot = resolve(root, "cookie-bite-python");
const gateway = resolve(pyRoot, "services", "api-gateway");
const venvDir = resolve(pyRoot, ".venv");
const isWin = process.platform === "win32";
const pyExe = resolve(venvDir, isWin ? "Scripts/python.exe" : "bin/python");
const pipExe = resolve(venvDir, isWin ? "Scripts/pip.exe" : "bin/pip");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", cwd: opts.cwd ?? root, env: opts.env ?? process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function patchRedisUrl() {
  const envPath = resolve(pyRoot, ".env");
  if (!existsSync(envPath)) {
    run("npm", ["run", "python:setup"], { cwd: root });
  }
  let content = readFileSync(envPath, "utf8");
  if (/^REDIS_URL=redis:\/\/redis:/m.test(content)) {
    content = content.replace(/^REDIS_URL=redis:\/\/redis:6379\/0$/m, "REDIS_URL=redis://127.0.0.1:6379/0");
    writeFileSync(envPath, content, "utf8");
    console.log("Updated REDIS_URL → redis://127.0.0.1:6379/0");
  }
}

function findPython() {
  for (const cmd of ["py -3.12", "py -3.13", "python3", "python"]) {
    const [bin, ...rest] = cmd.split(" ");
    const r = spawnSync(bin, [...rest, "--version"], { encoding: "utf8" });
    if (r.status === 0) return { bin, extra: rest };
  }
  console.error("Python 3.12+ not found. Install from https://www.python.org/downloads/");
  process.exit(1);
}

if (!existsSync(resolve(pyRoot, ".env"))) {
  run("npm", ["run", "python:setup"], { cwd: root });
}
patchRedisUrl();

if (!existsSync(pyExe)) {
  const py = findPython();
  console.log("Creating virtualenv…");
  run(py.bin, [...py.extra, "-m", "venv", venvDir], { cwd: pyRoot });
}

console.log("Installing Python dependencies…");
run(pipExe, ["install", "-r", "requirements.txt"], { cwd: pyRoot });

console.log("\nStarting Python API on http://127.0.0.1:8000 …");
console.log("Press Ctrl+C to stop.\n");

const env = {
  ...process.env,
  PYTHONPATH: pyRoot,
};

const uvicorn = spawn(pyExe, ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"], {
  cwd: gateway,
  env,
  stdio: "inherit",
});

uvicorn.on("exit", (code) => process.exit(code ?? 0));
