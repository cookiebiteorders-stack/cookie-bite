#!/usr/bin/env node
/**
 * Lists supabase/migrations/*.sql in lexical order (matches run script).
 * Use before production to verify 0011–0015 are present.
 */
import { readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dir = resolve(root, "supabase", "migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

console.log("Supabase migrations (apply in this order):\n");
files.forEach((f, i) => console.log(`${String(i + 1).padStart(2, " ")}. ${f}`));
