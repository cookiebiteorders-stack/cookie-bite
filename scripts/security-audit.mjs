#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Cookie Bite — Security audit (no external deps).
 *
 * يجمع كل الفحوص الأمنية الأساسية في تقرير واحد:
 *  1) Secret leak scan في الملفات المُتعقَّبة (git ls-files)
 *  2) فحص .env و .gitignore
 *  3) فحص dependencies (npm audit)
 *  4) فحص ملفات API و middleware/proxy عن أنماط معروفة
 *     (dangerouslySetInnerHTML, eval, raw `.or(` template literals…)
 *  5) فحص رؤوس الإعداد في next.config.ts
 *  6) فحص Supabase: tables بدون RLS (إذا توفّر SUPABASE_ACCESS_TOKEN)
 *
 * Output:
 *   - يطبع تقريراً واضحاً للـ console
 *   - يحفظ نسخة Markdown في docs/security-audit-<stamp>.md
 *
 * Exit code:
 *   0 = لا مشاكل HIGH
 *   1 = مشاكل HIGH أو CRITICAL وُجدت
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  const txt = fs.readFileSync(file, "utf8");
  for (const line of txt.split(/\r?\n/)) {
    const raw = line.trim();
    if (!raw || raw.startsWith("#")) continue;
    const idx = raw.indexOf("=");
    if (idx === -1) continue;
    const key = raw.slice(0, idx).trim();
    let value = raw.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnv(path.join(process.cwd(), ".env.local"));
loadEnv(path.join(process.cwd(), ".env"));

const findings = []; // { severity, area, message, file?, line? }

function add(severity, area, message, extra = {}) {
  findings.push({ severity, area, message, ...extra });
}

// ----- 1) Secret patterns scan -----
const SECRET_PATTERNS = [
  { name: "OPENAI_API_KEY", re: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/g },
  { name: "GITHUB_TOKEN", re: /ghp_[A-Za-z0-9]{36,}/g },
  { name: "STRIPE_LIVE_KEY", re: /sk_live_[A-Za-z0-9]{20,}/g },
  { name: "GOOGLE_API_KEY", re: /AIza[0-9A-Za-z_-]{30,}/g },
  { name: "JWT_SUPABASE", re: /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{40,}\.[A-Za-z0-9_-]{20,}/g },
  { name: "PRIVATE_KEY_BEGIN", re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: "RESEND_API_KEY", re: /re_[A-Za-z0-9_]{20,}/g },
  { name: "CLERK_SECRET", re: /sk_(test|live)_[A-Za-z0-9]{30,}/g },
];

function listTrackedFiles() {
  try {
    return execSync("git ls-files", { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
  } catch {
    return [];
  }
}

const trackedFiles = listTrackedFiles();
console.log(`[1/6] Secret scan over ${trackedFiles.length} tracked files…`);
for (const file of trackedFiles) {
  if (/(node_modules|\.next|coverage|playwright|\.lock|package-lock|\.git)/.test(file)) continue;
  if (!/\.(ts|tsx|js|mjs|cjs|json|md|env|sql|yml|yaml)$/.test(file) && !file.includes("/")) continue;
  let content = "";
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (content.length > 2_000_000) continue;
  for (const pat of SECRET_PATTERNS) {
    pat.re.lastIndex = 0;
    const m = pat.re.exec(content);
    if (m) {
      add("HIGH", "secret", `Possible ${pat.name} committed to repo`, {
        file,
        snippet: m[0].slice(0, 24) + "…",
      });
    }
  }
}

// ----- 2) .env & .gitignore -----
console.log("[2/6] Checking .env / .gitignore…");
const gitignore = fs.existsSync(".gitignore") ? fs.readFileSync(".gitignore", "utf8") : "";
if (!/^\.env\*?$/m.test(gitignore) && !/^\.env\*/m.test(gitignore)) {
  add("HIGH", "env", ".env* not ignored in .gitignore");
}
for (const candidate of [".env", ".env.local", ".env.production", "hostinger-production.env"]) {
  if (fs.existsSync(candidate)) {
    const stat = fs.statSync(candidate);
    if (stat.size > 6000) {
      add("MEDIUM", "env", `${candidate} is large (${stat.size}B) — rotate any committed secrets`);
    }
  }
}

// ----- 3) npm audit -----
console.log("[3/6] Running `npm audit` (this may take ~30s)…");
try {
  const out = execSync("npm audit --json", { encoding: "utf8", maxBuffer: 50 * 1024 * 1024 });
  const j = JSON.parse(out);
  const vulns = j.vulnerabilities ?? {};
  const total = j.metadata?.vulnerabilities ?? {};
  add(
    total.high || total.critical ? "HIGH" : total.moderate ? "MEDIUM" : "INFO",
    "dependencies",
    `npm audit — total: critical ${total.critical ?? 0}, high ${total.high ?? 0}, moderate ${total.moderate ?? 0}, low ${total.low ?? 0}`,
  );
  const top = Object.entries(vulns)
    .filter(([, v]) => v.severity === "high" || v.severity === "critical")
    .slice(0, 15);
  for (const [name, v] of top) {
    add(
      v.severity === "critical" ? "CRITICAL" : "HIGH",
      "dependencies",
      `${name} (${v.severity}) — range: ${v.range}`,
    );
  }
} catch (e) {
  // npm audit returns non-zero when vulns exist
  try {
    const j = JSON.parse(e.stdout?.toString() || "{}");
    const total = j.metadata?.vulnerabilities ?? {};
    add(
      total.high || total.critical ? "HIGH" : "MEDIUM",
      "dependencies",
      `npm audit — critical ${total.critical ?? 0}, high ${total.high ?? 0}, moderate ${total.moderate ?? 0}`,
    );
  } catch {
    add("MEDIUM", "dependencies", "npm audit failed: " + (e.message ?? "unknown"));
  }
}

// ----- 4) Code patterns -----
console.log("[4/6] Scanning code patterns…");
const PATTERN_RULES = [
  {
    glob: /\.(tsx?|jsx?)$/,
    re: /dangerouslySetInnerHTML/g,
    severity: "MEDIUM",
    msg: "dangerouslySetInnerHTML — ensure input is sanitized",
  },
  {
    glob: /\.(tsx?|jsx?|mjs)$/,
    re: /\beval\s*\(/g,
    severity: "HIGH",
    msg: "eval() detected",
    // تجاهل التعليقات (السطر الذي يحوي // أو * قبل eval)
    skipIfLine: /^\s*(\/\/|\*|\/\*)/,
  },
  {
    glob: /\.(tsx?|mjs|jsx?)$/,
    re: /\.or\(\s*`[^`]*\$\{[^}]+\}/g,
    severity: "HIGH",
    msg: "Raw template literal inside Supabase .or() — possible PostgREST filter injection. Use lib/security/sanitize-filter.ts",
  },
  {
    glob: /route\.(ts|js)$/,
    re: /searchParams\.get\(\s*['"]secret['"]/g,
    severity: "MEDIUM",
    msg: "Secret read from URL query — prefer header to avoid leaking in logs",
  },
];

for (const file of trackedFiles) {
  if (!/\.(ts|tsx|js|mjs|jsx)$/.test(file)) continue;
  let content = "";
  try {
    content = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  const linesArr = content.split(/\r?\n/);
  for (const rule of PATTERN_RULES) {
    if (!rule.glob.test(file)) continue;
    rule.re.lastIndex = 0;
    let m;
    let matched = false;
    while ((m = rule.re.exec(content)) !== null) {
      // اعرف السطر الذي يحتوي على المطابقة
      const upto = content.slice(0, m.index);
      const lineNo = upto.split("\n").length - 1;
      const line = linesArr[lineNo] ?? "";
      if (rule.skipIfLine && rule.skipIfLine.test(line)) continue;
      matched = true;
      break;
    }
    if (matched) add(rule.severity, "code", rule.msg, { file });
  }
}

// ----- 5) next.config.ts headers -----
console.log("[5/6] Reviewing next.config.ts headers…");
if (fs.existsSync("next.config.ts")) {
  const nc = fs.readFileSync("next.config.ts", "utf8");
  if (!/Strict-Transport-Security/.test(nc)) add("HIGH", "headers", "HSTS header missing");
  if (!/Content-Security-Policy/.test(nc)) add("HIGH", "headers", "CSP header missing");
  if (/script-src[^"']*'unsafe-inline'/.test(nc))
    add("MEDIUM", "headers", "CSP allows 'unsafe-inline' for scripts — prefer nonces.");
  if (!/X-Content-Type-Options/.test(nc)) add("MEDIUM", "headers", "X-Content-Type-Options missing");
  if (!/X-Frame-Options/.test(nc)) add("MEDIUM", "headers", "X-Frame-Options missing");
  if (!/Permissions-Policy/.test(nc)) add("MEDIUM", "headers", "Permissions-Policy missing");
}

// ----- 6) Supabase RLS check -----
console.log("[6/6] Supabase RLS health check…");
if (process.env.SUPABASE_ACCESS_TOKEN && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${ref}/database/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query:
            "select tablename from pg_tables where schemaname='public' and rowsecurity=false order by tablename;",
          read_only: true,
        }),
      },
    );
    if (res.ok) {
      const j = await res.json();
      const rows = Array.isArray(j) ? j : j.result ?? [];
      if (rows.length > 0) {
        add(
          "HIGH",
          "supabase",
          `Tables without RLS: ${rows.map((r) => r.tablename).join(", ")}`,
        );
      } else {
        add("INFO", "supabase", "All public tables have RLS enabled.");
      }
    } else {
      add("MEDIUM", "supabase", `Mgmt API HTTP ${res.status}`);
    }
  } catch (e) {
    add("MEDIUM", "supabase", "RLS check failed: " + e.message);
  }
} else {
  add("INFO", "supabase", "Skipped — SUPABASE_ACCESS_TOKEN missing");
}

// ----- Report -----
const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, INFO: 3 };
findings.sort((a, b) => (order[a.severity] - order[b.severity]) || a.area.localeCompare(b.area));

const ts = new Date().toISOString().replace(/[:.]/g, "-");
const outPath = path.join("docs", `security-audit-${ts}.md`);
fs.mkdirSync("docs", { recursive: true });

const lines = [
  `# Cookie Bite — Security audit ${new Date().toISOString()}`,
  "",
  "| Severity | Area | Message | File |",
  "|----------|------|---------|------|",
  ...findings.map(
    (f) =>
      `| ${f.severity} | ${f.area} | ${f.message.replace(/\|/g, "\\|")} | ${f.file ?? ""} |`,
  ),
];
fs.writeFileSync(outPath, lines.join("\n"), "utf8");

const counts = findings.reduce((acc, f) => {
  acc[f.severity] = (acc[f.severity] || 0) + 1;
  return acc;
}, {});

console.log("\n========= Audit summary =========");
for (const [k, v] of Object.entries(counts)) console.log(`  ${k.padEnd(8)} ${v}`);
console.log(`\n→ Full report: ${outPath}\n`);

if ((counts.HIGH ?? 0) > 0 || (counts.CRITICAL ?? 0) > 0) {
  console.log("✖ Audit failed: HIGH/CRITICAL findings present.");
  process.exit(1);
}
console.log("✓ No HIGH/CRITICAL findings.");
