/**
 * Compress hero images for faster LCP (safe to re-run).
 * Outputs:
 *   public/images/hero-640.webp — mobile
 *   public/images/hero.webp     — desktop (max 960px wide)
 * Usage: npm run optimize:hero
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const imagesDir = path.join(process.cwd(), "public", "images");
const heroPath = path.join(imagesDir, "hero.webp");

if (!fs.existsSync(heroPath)) {
  console.error("hero.webp not found at", heroPath);
  process.exit(1);
}

const variants = [
  { file: "hero-640.webp", width: 640, quality: 56 },
  { file: "hero.webp", width: 960, quality: 64 },
];

const before = fs.statSync(heroPath).size;
const inputMeta = await sharp(heroPath).metadata();

for (const variant of variants) {
  const outPath = path.join(imagesDir, variant.file);
  const buffer = await sharp(heroPath)
    .resize(variant.width, null, { withoutEnlargement: true, fit: "inside" })
    .webp({ quality: variant.quality, effort: 6, smartSubsample: true })
    .toBuffer();

  try {
    fs.writeFileSync(outPath, buffer);
  } catch (err) {
    const sidecar = path.join(imagesDir, `${variant.file}.optimized`);
    fs.writeFileSync(sidecar, buffer);
    console.warn(
      `${variant.file} locked; wrote ${sidecar} (${(buffer.length / 1024).toFixed(1)}KB). Close apps using the file and re-run.`,
    );
    continue;
  }
  console.log(
    `${variant.file}: ${(buffer.length / 1024).toFixed(1)}KB (${variant.width}px max, was ${inputMeta.width ?? "?"}x${inputMeta.height ?? "?"})`,
  );
}

const afterDesktop = fs.statSync(heroPath).size;
console.log(
  `Done. Previous hero.webp on disk: ${(before / 1024).toFixed(1)}KB → desktop ${(afterDesktop / 1024).toFixed(1)}KB`,
);
