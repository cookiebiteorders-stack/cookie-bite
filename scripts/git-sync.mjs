/**
 * يجمّع كل التغييرات، ينشئ commit (إن وُجدت)، ويدفع إلى origin على الفرع الحالي.
 * استخدام: npm run deploy:github
 *         npm run deploy:github -- "feat: وصف مختصر"
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const DEBUG_LOG = path.join(cwd, "debug-2ec85c.log");

// #region agent log
function dlog(hypothesisId, location, message, data) {
  const payload = {
    sessionId: "2ec85c",
    runId: "git-sync-debug",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  try {
    fs.appendFileSync(DEBUG_LOG, `${JSON.stringify(payload)}\n`, "utf8");
  } catch {}
  void fetch("http://127.0.0.1:7658/ingest/67338b6d-5205-4259-aa6b-76125a46a5f0", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "2ec85c",
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}
function safeSh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", cwd, shell: true }).trim();
  } catch (e) {
    const stderr = (e?.stderr?.toString?.() || "").slice(0, 400);
    return `__ERR__(${e?.status ?? "?"}):${stderr || e?.message || ""}`;
  }
}
// #endregion

function run(cmd) {
  execSync(cmd, { stdio: "inherit", cwd, shell: true });
}

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", cwd, shell: true }).trim();
}

function enforceGiftPreviewVideoSafeStart() {
  const builderFile = path.join(cwd, "components/gift-box-builder/gift-box-builder.tsx");
  if (!fs.existsSync(builderFile)) return;

  const source = fs.readFileSync(builderFile, "utf8");
  const hasSafeStartFragment = /const\s+previewVideo\s*=\s*`[^`]*#t=\d+(\.\d+)?`;/m.test(source);
  if (hasSafeStartFragment) return;

  const next = source.replace(
    /const\s+previewVideo\s*=\s*`?\$\{previewVideoBase\}`?;/m,
    "const previewVideo = `${previewVideoBase}#t=1.8`;",
  );

  if (next !== source) {
    fs.writeFileSync(builderFile, next, "utf8");
    console.log("git-sync: تم تطبيق حماية بداية الفيديو (#t=1.8) تلقائياً قبل النشر.");
    dlog("H-VIDEO", "git-sync.mjs:enforceGiftPreviewVideoSafeStart", "auto-applied safe video start fragment", {
      file: "components/gift-box-builder/gift-box-builder.tsx",
      fragment: "#t=1.8",
    });
  } else {
    console.warn("git-sync: تحذير — لم أتمكن من التحقق تلقائياً من إزاحة بداية فيديو المعاينة.");
    dlog("H-VIDEO", "git-sync.mjs:enforceGiftPreviewVideoSafeStart", "safe video start check could not match target pattern", {
      file: "components/gift-box-builder/gift-box-builder.tsx",
    });
  }
}

function enforceGiftPreviewMediaBudget() {
  const mediaPath = path.join(cwd, "public/media/gift-box-preview.mp4");
  if (!fs.existsSync(mediaPath)) return;

  const sizeBytes = fs.statSync(mediaPath).size;
  const maxBytes = 4 * 1024 * 1024; // 4MB budget for fast sidebar preview
  if (sizeBytes > maxBytes) {
    const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
    const maxMb = (maxBytes / (1024 * 1024)).toFixed(2);
    throw new Error(
      `gift-box preview video is too large (${sizeMb}MB). Max allowed before deploy is ${maxMb}MB.`,
    );
  }
  dlog("H-VIDEO", "git-sync.mjs:enforceGiftPreviewMediaBudget", "preview video size within budget", {
    file: "public/media/gift-box-preview.mp4",
    sizeBytes,
    maxBytes,
  });
}

function hasStagedChangesAfterAdd() {
  try {
    execSync("git diff --cached --quiet", { cwd });
    // #region agent log
    dlog("H-A,H-C", "git-sync.mjs:hasStagedChangesAfterAdd", "diff --cached --quiet exited 0 → NO staged changes", {
      result: false,
    });
    // #endregion
    return false;
  } catch (e) {
    // #region agent log
    dlog("H-A,H-C", "git-sync.mjs:hasStagedChangesAfterAdd", "diff --cached --quiet exited non-zero → has staged changes", {
      result: true,
      exitStatus: e?.status ?? null,
    });
    // #endregion
    return true;
  }
}

const messageFromCli = process.argv.slice(2).join(" ").trim();
const defaultMessage = `chore: sync ${new Date().toISOString()}`;

// #region agent log
dlog("H-A,H-B,H-C,H-D", "git-sync.mjs:entry", "git-sync script started", {
  cwd,
  argv: process.argv.slice(2),
  branch: safeSh("git rev-parse --abbrev-ref HEAD"),
  upstream: safeSh("git rev-parse --abbrev-ref --symbolic-full-name @{u}"),
  headDetached: safeSh("git symbolic-ref -q HEAD") === "" ? "yes" : "no",
  statusPorcelain: safeSh("git status --porcelain=v1").split(/\r?\n/).filter(Boolean).slice(0, 50),
  statusPorcelainCount: safeSh("git status --porcelain=v1").split(/\r?\n/).filter(Boolean).length,
  ignoredCount: safeSh("git status --porcelain=v1 --ignored").split(/\r?\n/).filter((l) => l.startsWith("!!")).length,
  ignoredSample: safeSh("git status --porcelain=v1 --ignored").split(/\r?\n/).filter((l) => l.startsWith("!!")).slice(0, 10),
  coreAutocrlf: safeSh("git config --get core.autocrlf"),
  coreEol: safeSh("git config --get core.eol"),
  remoteUrl: safeSh("git config --get remote.origin.url"),
});
// #endregion

enforceGiftPreviewVideoSafeStart();
enforceGiftPreviewMediaBudget();

run("git add -A");

// #region agent log
dlog("H-A,H-B,H-C", "git-sync.mjs:afterAdd", "post-add diagnostic snapshot", {
  stagedNameOnly: safeSh("git diff --cached --name-only").split(/\r?\n/).filter(Boolean),
  stagedCount: safeSh("git diff --cached --name-only").split(/\r?\n/).filter(Boolean).length,
  workingChangesRemaining: safeSh("git status --porcelain=v1").split(/\r?\n/).filter(Boolean),
});
// #endregion

if (!hasStagedChangesAfterAdd()) {
  console.log("git-sync: لا يوجد تغييرات للالتزام.");
  const sb = safeSh("git status -sb");
  const ign = safeSh("git status --porcelain=v1 --ignored").split(/\r?\n/).filter((l) => l.startsWith("!!")).length;
  console.log(`git-sync: حالة الفرع: ${sb || "(فارغ)"}`);
  if (ign > 0) {
    console.log(
      `git-sync: ملاحظة: يوجد ${ign} مساراً في .gitignore فقط (تعديلات عليها لا تُلتزم). جرّب git status --ignored`,
    );
  }
} else {
  const msg = messageFromCli || defaultMessage;
  run(`git commit -m ${JSON.stringify(msg)}`);
}

const branch = sh("git rev-parse --abbrev-ref HEAD");
console.log(`git-sync: دفع الفرع ${branch} إلى origin...`);

// #region agent log
dlog("H-D,H-F", "git-sync.mjs:beforePush", "state right before git push", {
  branch,
  upstream: safeSh("git rev-parse --abbrev-ref --symbolic-full-name @{u}"),
  aheadBehind: safeSh(`git rev-list --left-right --count origin/${branch}...HEAD`),
  lastLocalCommit: safeSh("git log -1 --pretty=%h%x20%s"),
});
// #endregion

let pushOk = true;
let pushStderr = "";
let pushStdout = "";
try {
  pushStdout = execSync(`git push origin ${branch} 2>&1`, {
    encoding: "utf8",
    cwd,
    shell: true,
  });
  process.stdout.write(pushStdout);
} catch (e) {
  pushOk = false;
  pushStderr = (e?.stderr?.toString?.() || "") + (e?.stdout?.toString?.() || "");
  process.stderr.write(pushStderr);
}

// #region agent log
dlog("H-D,H-F", "git-sync.mjs:afterPush", "git push result", {
  pushOk,
  upToDate: /Everything up-to-date/i.test(pushStdout + pushStderr),
  pushOutputTail: (pushStdout + pushStderr).slice(-600),
});
dlog("H-F", "git-sync.mjs:end", "script done — note: Hostinger is NOT invoked by this script", {
  hostingerInvoked: false,
});
// #endregion

const combined = pushStdout + pushStderr;
if (pushOk && /Everything up-to-date/i.test(combined)) {
  console.log("git-sync: لم يُرفع شيء جديد — الفرع على origin يطابق HEAD (لا commit جديد بعد آخر دفع).");
}
