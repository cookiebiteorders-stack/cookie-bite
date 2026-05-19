import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = process.argv[2] || path.join(process.env.USERPROFILE ?? "", "Downloads", "whatsapp_server_full.txt");
const text = fs.readFileSync(src, "utf8");
const lines = text.split(/\r?\n/);
const start = lines.findIndex((l) => l.startsWith("const { Client"));
const end = lines.findIndex((l, i) => i > 1100 && l.startsWith("===="));
let body = lines.slice(start, end).join("\n");

const repl = [
  [/\[Your Store\]/g, "Cookie Bite"],
  [/\{\{store_link\}\}/g, "https://cookie-bite.com/shop"],
  [/\{\{tracking_link\}\}/g, "https://cookie-bite.com/track"],
  [/\{\{invoice_link\}\}/g, "https://cookie-bite.com/account#orders"],
  [/\{\{support_link\}\}/g, "https://cookie-bite.com/contact"],
  [/\{\{cart_link\}\}/g, "https://cookie-bite.com/cart"],
  [/\{\{verify_link\}\}/g, "https://cookie-bite.com/verify"],
  [/\{\{order_link\}\}/g, "https://cookie-bite.com/account#orders"],
];
for (const [re, v] of repl) body = body.replace(re, v);

const authMw = `
// Optional API secret (set WHATSAPP_BRIDGE_SECRET on bridge + Next.js)
app.use((req, res, next) => {
  if (!BRIDGE_SECRET || req.path === "/status") return next();
  const key =
    req.headers["x-bridge-secret"] ||
    (typeof req.headers.authorization === "string"
      ? req.headers.authorization.replace(/^Bearer\\s+/i, "")
      : "");
  if (key !== BRIDGE_SECRET) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  next();
});
`;

const header = `require("dotenv").config();
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET?.trim();
const PORT = Number(process.env.WHATSAPP_BRIDGE_PORT || 3000);

`;

body = header + body;
body = body.replace(
  "const app = express();\napp.use(express.json());",
  `const app = express();\napp.use(express.json());${authMw}`,
);
body = body.replace("app.listen(3000,", "app.listen(PORT,");
body = body.replace(
  "http://localhost:3000/status",
  "http://localhost:${PORT}/status",
);
body = body.replace(
  "WhatsApp Server running on port 3000",
  "WhatsApp Bridge running on port ${PORT}",
);

const dest = path.join(root, "services", "whatsapp-bridge", "server.mjs");
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, body, "utf8");
console.log("Wrote", dest, "bytes:", body.length);
