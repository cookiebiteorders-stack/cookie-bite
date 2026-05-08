import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const standaloneEntry = path.join(process.cwd(), ".next", "standalone", "server.js");

if (!fs.existsSync(standaloneEntry)) {
  console.error(
    "Standalone build not found. Run `npm run build` before starting production server.",
  );
  process.exit(1);
}

await import(pathToFileURL(standaloneEntry).href);
