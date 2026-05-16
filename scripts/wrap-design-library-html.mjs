import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "public", "design-library");

const head = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.34.0/dist/tabler-icons.min.css"/>
<style>
:root{
  --font-sans:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --color-text-primary:#1c1917;
  --color-text-secondary:#57534e;
  --color-text-tertiary:#78716c;
  --color-text-info:#1d4ed8;
  --color-text-success:#15803d;
  --color-text-warning:#9a3412;
  --color-background-primary:#fafaf9;
  --color-background-secondary:#f5f5f4;
  --color-background-info:#eff6ff;
  --color-background-success:#f0fdf4;
  --color-background-warning:#fff7ed;
  --color-border-secondary:#d6d3d1;
  --color-border-tertiary:#e7e5e4;
  --color-border-success:#86efac;
  --border-radius-md:8px;
  --border-radius-lg:12px;
}
html,body{min-height:100%;margin:0;background:var(--color-background-secondary);font-family:var(--font-sans);}
body{padding:10px 12px 16px;}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
</style>
</head>
<body>
`;

const foot = "</body></html>";

const wrap = [
  "delivery_zones_manager.html",
  "ecommerce_email_templates.html",
  "ecommerce_report_templates.html",
  "missing_email_templates.html",
  "missing_report_templates.html",
];

for (const f of wrap) {
  const p = path.join(dir, f);
  let c = fs.readFileSync(p, "utf8");
  if (c.trimStart().startsWith("<!DOCTYPE")) {
    console.log("skip", f);
    continue;
  }
  fs.writeFileSync(p, head + c + foot);
  console.log("wrapped", f);
}
