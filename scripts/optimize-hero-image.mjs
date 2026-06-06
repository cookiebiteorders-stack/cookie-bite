/**
 * Compress public/images/hero.webp for faster LCP (safe to re-run).
 * Usage: node scripts/optimize-hero-image.mjs
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const heroPath = path.join(process.cwd(), "public", "images", "hero.webp");

if (!fs.existsSync(heroPath)) {
  console.error("hero.webp not found at", heroPath);
  process.exit(1);
}

const before = fs.statSync(heroPath).size;
const input = await sharp(heroPath).metadata();
const width = Math.min(input.width ?? 1920, 1920);

const output = await sharp(heroPath)
  .resize(width, null, { withoutEnlargement: true, fit: "inside" })
  .webp({ quality: 68, effort: 6, smartSubsample: true })
  .toBuffer();

const backupPath = `${heroPath}.bak`;
try {
  if (fs.existsSync(heroPath)) {
    try {
      fs.unlinkSync(backupPath);
    } catch {
      /* no prior backup */
    }
    try {
      fs.renameSync(heroPath, backupPath);
    } catch {
      /* locked — write sidecar instead */
      const sidecar = path.join(path.dirname(heroPath), "hero.optimized.webp");
      fs.writeFileSync(sidecar, output);
      console.log(
        `hero.webp locked; wrote ${sidecar} (${(output.length / 1024).toFixed(1)}KB). Replace hero.webp manually or close apps using the file.`,
      );
      process.exit(0);
    }
  }
  fs.writeFileSync(heroPath, output);
  try {
    fs.unlinkSync(backupPath);
  } catch {
    /* keep backup */
  }
} catch (err) {
  console.error("Failed to write hero.webp:", err.message);
  process.exit(1);
}
const after = output.length;
console.log(
  `hero.webp: ${(before / 1024).toFixed(1)}KB → ${(after / 1024).toFixed(1)}KB (${width}px wide)`,
);
