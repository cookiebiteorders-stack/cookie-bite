#!/usr/bin/env node
/**
 * اختبار جودة Mr. Brownie محلياً (intent + few-shot + quality score)
 * بدون استدعاء Gemini — سريع للـ CI.
 *
 * Usage: node scripts/mr-brownie-bot-tester.mjs
 */

const TEST_CASES = [
  { id: "gift", msg: "عايز هدية لبنت", intent: "gift_request" },
  { id: "box", msg: "عايز بوكس هدية", intent: "gift_request" },
  { id: "fast", msg: "عايز بوكس سريع", intent: "fast_gift" },
  { id: "delivery", msg: "التوصيل بكام", intent: "delivery_faq" },
  { id: "order", msg: "فين الأوردر", intent: "order_status" },
  { id: "bad", msg: "الطلب وصل بايظ", intent: "complaint" },
  { id: "nav", msg: "فين صفحة الهدايا", intent: "navigation" },
  { id: "browse", msg: "إيه أحسن كوكيز", intent: "product_browse" },
];

// Minimal inline detect (mirror detect-intent.js logic) — or exec jest
import { spawnSync } from "node:child_process";

console.log("\n=== Mr. Brownie Bot Tester ===\n");

const jest = spawnSync(
  "npm",
  ["test", "--", "__tests__/mr-brownie-training.test.ts", "__tests__/mr-brownie-brain.test.ts", "--silent"],
  { stdio: "inherit", shell: true, cwd: process.cwd() },
);

if (jest.status !== 0) {
  console.error("Unit tests failed.");
  process.exit(1);
}

console.log("\nManual intent checklist (run full E2E against /api/mr-brownie/chat with GEMINI_API_KEY):");
for (const tc of TEST_CASES) {
  console.log(`  [ ] ${tc.id}: "${tc.msg}" → expect ${tc.intent}`);
}

console.log("\nScore: unit tests passed. For live scoring, enable turn logs + /admin/mr-brownie dashboard.\n");
