import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const globalsPath = path.join(root, "app", "globals.css");
const stylesDir = path.join(root, "app", "styles");
const lines = fs.readFileSync(globalsPath, "utf8").split(/\r?\n/);

function sliceLines(start, end) {
  return lines.slice(start - 1, end).join("\n") + "\n";
}

if (!fs.existsSync(stylesDir)) fs.mkdirSync(stylesDir, { recursive: true });

const motion =
  sliceLines(3, 206) + sliceLines(578, 706) + sliceLines(1223, 1240);

const tokens = sliceLines(208, 346) + sliceLines(366, 370) + sliceLines(372, 531);

const base =
  sliceLines(348, 364) +
  sliceLines(533, 576) +
  sliceLines(708, 1103) +
  sliceLines(1242, 1275);

const admin = sliceLines(1105, 1221) + sliceLines(1277, 1284);

fs.writeFileSync(path.join(stylesDir, "motion.css"), motion);
fs.writeFileSync(path.join(stylesDir, "tokens.css"), tokens);
fs.writeFileSync(path.join(stylesDir, "base.css"), base);
fs.writeFileSync(path.join(stylesDir, "admin.css"), admin);

console.log("Wrote app/styles/*.css");
