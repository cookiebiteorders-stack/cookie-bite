/**
 * يجمّع كل التغييرات، ينشئ commit (إن وُجدت)، ويدفع إلى origin على الفرع الحالي.
 * استخدام: npm run deploy:github
 *         npm run deploy:github -- "feat: وصف مختصر"
 */
import { execSync } from "node:child_process";

const cwd = process.cwd();

function run(cmd) {
  execSync(cmd, { stdio: "inherit", cwd, shell: true });
}

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", cwd, shell: true }).trim();
}

function hasStagedChangesAfterAdd() {
  try {
    execSync("git diff --cached --quiet", { cwd });
    return false;
  } catch {
    return true;
  }
}

const messageFromCli = process.argv.slice(2).join(" ").trim();
const defaultMessage = `chore: sync ${new Date().toISOString()}`;

run("git add -A");

if (!hasStagedChangesAfterAdd()) {
  console.log("git-sync: لا يوجد تغييرات للالتزام.");
} else {
  const msg = messageFromCli || defaultMessage;
  run(`git commit -m ${JSON.stringify(msg)}`);
}

const branch = sh("git rev-parse --abbrev-ref HEAD");
console.log(`git-sync: دفع الفرع ${branch} إلى origin...`);
run(`git push origin ${branch}`);
