/**
 * يحوّل البكسل شبه السوداء (خلفية الشعار) إلى شفافة مع حواف ناعمة قليلاً.
 * تشغيل: node scripts/knock-logo-bg.cjs
 */
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const root = path.join(__dirname, "..");

function knockOutBackground(data) {
  const out = Buffer.from(data);
  for (let i = 0; i < out.length; i += 4) {
    const r = out[i];
    const g = out[i + 1];
    const b = out[i + 2];
    const a = out[i + 3];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const maxc = Math.max(r, g, b);
    if (maxc < 62 && lum < 78) {
      if (lum < 20 && maxc < 32) {
        out[i + 3] = 0;
      } else {
        const t = (lum - 20) / 58;
        out[i + 3] = Math.round(a * Math.max(0, Math.min(1, t)));
      }
    }
  }
  return out;
}

async function processFile(rel) {
  const abs = path.join(root, rel);
  const tmp = `${abs}.tmp.png`;
  const { data, info } = await sharp(abs)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.channels !== 4) {
    throw new Error(`${rel}: expected RGBA`);
  }
  const processed = knockOutBackground(data);
  await sharp(processed, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9 })
    .toFile(tmp);
  fs.renameSync(tmp, abs);
  console.log("ok:", rel);
}

(async () => {
  await processFile("public/brand/cookie-bite-wordmark.png");
  await processFile("public/brand/cookie-bite-icon.png");
  await processFile("app/icon.png");
})();
