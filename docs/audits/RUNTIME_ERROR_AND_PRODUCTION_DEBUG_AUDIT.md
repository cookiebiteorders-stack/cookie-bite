# RUNTIME ERROR & PRODUCTION DEBUG AUDIT
Repository: cookiebiteorders-stack/cookie-bite
Commit inspected: main (post-patch branch fix/middleware-edge-compat applied)
Date: 2026-08-02

---

Table of contents
- Executive Summary
- What I scanned
- Major Findings (critical/high/medium)
- Full Issue List (detailed per the required output format)
- Version Audit (summary table)
- Environment Variables Audit
- Build & Runtime Audit
- API & Middleware Audit
- Supabase & Auth Audit
- Cloudinary Audit
- Database Audit (what I could inspect)
- Dependency & Security notes
- Fixes applied (branch + commit)
- Recommended immediate actions (PR/CI/deploy steps)
- Complete TODO list (GitHub task lists)
- Final validation & next steps

---

Executive Summary

I performed a repository-wide production debugging audit focused on runtime 500s, middleware, Supabase, Cloudinary, database, and dependency issues. The audit uncovered critical middleware runtime faults that would lead to HTTP 500s in production (Edge runtime incompatibilities and invalid cookie mutation). I implemented and pushed fixes on branch `fix/middleware-edge-compat` to address these critical faults. This document records all findings, root causes, reproduction steps, permanent fixes, and a prioritized TODO list. Any findings marked REQUIRES_VERIFICATION need runtime logs or access to production/staging environment to confirm.

What I scanned
- Entire repository root listing and most server-side folders:
  - app/
  - lib/ (all subfolders enumerated)
  - middleware.ts
  - package.json
  - .env.example
  - services/whatsapp-bridge/
  - supabase/ (directory present)
- Focused file reads: middleware.ts, lib/rate-limit/redis-rate-limiter.ts, lib/supabase/middleware.ts, lib/config/production-lock.ts, package.json, .env.example, various lib files referenced by middleware.

Notes on methodology
- Static code inspection plus targeted file reads via the repository content API.
- Where runtime or environment evidence is needed (build logs, Sentry traces, production host behavior), I mark findings as REQUIRES_VERIFICATION or NOT FOUND as required.

Major Findings (summary)
- Critical (must fix before production):
  1) Middleware crash risk due to top-level Node-only imports (ioredis) used by middleware -> 500s. (Fixed)
  2) Mutation of request.cookies in Supabase cookies handler -> TypeError in middleware -> 500s. (Fixed)
  3) Unprotected calls in middleware to session refresh and rate limiter could throw and cause 500s; need safe guards and dynamic imports. (Fixed + guarded)

- High:
  4) In-memory rate limiter fallback is not a global solution in multi-instance production — behavior differs vs Redis.
  5) Native modules (sharp) and other native deps require correct build/binary in CI/host; may break next build/start.
  6) Many modules imported by middleware must be audited for Node/Edge compatibility.

- Medium/Low:
  7) env var checklist and fail-fast behavior needs strengthening for production.
  8) Missing E2E/CI tests for middleware behavior.
  9) Observability (Sentry) must be configured to capture middleware errors.

Full Issue List (detailed)

Issue ID: MIDDLEWARE-001
- Severity: Critical
- Category: Middleware / Runtime
- Status: Fixed (commit applied on branch `fix/middleware-edge-compat`)
- Affected Files: lib/rate-limit/redis-rate-limiter.ts, middleware.ts
- Affected Functions: getRedisClient(), rateOk(), middleware()
- Root Cause: top-level import of "ioredis" in a module imported by middleware. Edge runtime bundles/evaluates modules and cannot handle Node-only native imports, producing startup/runtime errors causing 500 responses.
- Technical Explanation: middleware runs in Next.js Edge runtime (or at least may be executed in environment that forbids Node 'net' APIs). Top-level import triggers evaluation during module load; dynamic import is required to avoid bundling Node-only modules into Edge code.
- When it happens: Any request matching middleware's matcher; middleware module gets evaluated.
- How to reproduce: Deploy or start app in environment where middleware runs in Edge; request a path matched by middleware. Observe module load errors referencing ioredis or native binding failures.
- Permanent Fix: convert top-level import to dynamic import inside getRedisClient; keep in-memory fallback. Already implemented: dynamic import and error handling.
- Example Code Patch: See commit af060700e344f4ddb1ad8fd765ca5c99926eb217.
- Estimated Effort: 2–4 hours (implemented)
- Priority: 🔴 Critical

Issue ID: MIDDLEWARE-002
- Severity: Critical
- Category: Middleware / Supabase cookie handling
- Status: Fixed (commit applied)
- Affected Files: lib/supabase/middleware.ts, middleware.ts
- Affected Functions: updateSupabaseSession()
- Root Cause: calling request.cookies.set(...) which is not part of NextRequest cookie API in middleware/Edge. This throws a TypeError and results in a 500.
- Technical Explanation: request.cookies is an immutable view; cookie writes must be performed on NextResponse.cookies.
- When it happens: When updateSupabaseSession runs and Supabase library attempts to set cookies via provided cookie helper setAll.
- How to reproduce: Set Supabase env vars and request a protected route to trigger updateSupabaseSession in middleware; inspect logs for TypeError: request.cookies.set is not a function.
- Permanent Fix: modify the cookie helper provided to createServerClient so it sets cookies on response only. Implemented in commit af0607...
- Estimated Effort: 1–2 hours (implemented)
- Priority: 🔴 Critical

Issue ID: MIDDLEWARE-003
- Severity: High
- Category: Middleware imports / runtime assumptions
- Status: Open (partially mitigated)
- Affected Files: middleware.ts and modules imported by it (rbac, auth-role, getOwnerFlags, observability)
- Root Cause: middleware imports many helpers; any of these may import Node-only libs (fs, path, etc.) causing runtime/bundle issues.
- Technical Explanation: dynamic import approach used for rate limiter reduces risk; other imports still risk inclusion of Node-only code.
- When it happens: On middleware module evaluation or when called functions attempt Node-only operations.
- How to reproduce: Run static bundler for Edge profile or request matched routes in Edge environment and watch errors referencing unsupported Node APIs.
- Permanent Fix: audit all middleware imports; ensure they are Edge-safe (web-standard APIs only) or lazy-load Node-only code only when running in Node.
- Estimated Effort: 4–8 hours
- Priority: 🟠 High

Issue ID: REDIS-FALLBACK-001
- Severity: Medium
- Category: Rate limiting / Resiliency
- Status: Open
- Affected Files: lib/rate-limit/redis-rate-limiter.ts
- Root Cause: in-memory fallback is local to single Node process; not a distributed global rate-limiter. This is expected but must be explicit in docs and monitored.
- Permanent Fix: deploy Redis in production (recommended) and add monitoring. Consider using a distributed rate-limiting system if global behavior required.
- Estimated Effort: 2–8 hours
- Priority: 🟠 High

Issue ID: NATIVE-BUILD-001
- Severity: High
- Category: Build / Native dependencies
- Status: Open
- Affected Files: package.json (sharp, other native deps)
- Root Cause: sharp and other native libs require correct build environment and binaries during npm install or CI. If missing, next build or start will fail.
- How to reproduce: Run npm ci/build in an environment lacking required environment or prebuilt binaries; observe errors.
- Permanent Fix: Ensure CI uses Node 20+ and installs prebuilt binaries or compiles native modules; pin/recommend supported versions; add CI smoke tests.
- Estimated Effort: 2–8 hours
- Priority: 🔴 Critical (for build reliability)

Issue ID: ENV-001
- Severity: High
- Category: Environment variables / Configuration
- Status: Open
- Affected Files: .env.example, lib/config/production-lock.ts
- Root Cause: Production-critical environment variables are required; default template sets COOKIE_BITE_FAIL_ON_MISSING_ENV=false. This can allow silent misconfiguration.
- Permanent Fix: Enforce fail-fast behavior in CI or set COOKIE_BITE_FAIL_ON_MISSING_ENV=true in production; add hostinger and CI pre-flight checks.
- Estimated Effort: 1–2 hours
- Priority: 🟠 High

Issue ID: OBSERVABILITY-001
- Severity: Medium
- Category: Logging / Monitoring
- Status: Open
- Affected Files: sentry.server.config.ts, sentry.edge.config.ts, lib/logger.ts
- Root Cause: Sentry configs exist but DSN/production config may be unset — without Sentry middleware errors may be missed.
- Permanent Fix: Enable Sentry DSN in production and ensure middleware catches and reports errors with requestId.
- Estimated Effort: 1–3 hours
- Priority: 🟡 Medium

(Other smaller and verification issues listed later)

---

Version Audit (summary table)
| Package | Current Version | Recommended Version | Status | Notes |
|---|---:|---|---|---|
| next | ^16.2.11 | REQUIRES_VERIFICATION | CHECK | Confirm Next 16 compatibility with React 19 in your environment.
| react | 19.2.8 | REQUIRES_VERIFICATION | CHECK | Ensure peer compatibility.
| typescript | ^5 | latest 5.x | OK | Keep on v5.
| @supabase/supabase-js | ^2.105.3 | latest 2.x | OK | Verify compatibility with @supabase/ssr.
| @supabase/ssr | ^0.10.2 | REQUIRES_VERIFICATION | CHECK | Ensure helpers match Next.js runtime APIs.
| ioredis (used) | ^5.10.1 | latest 5.x | RISK | Node-only; avoid top-level import in Edge contexts.
| sharp | ^0.35.3 | REQUIRES_VERIFICATION | RISK | Native binary — ensure CI builds properly.
| tailwindcss | ^4 | REQUIRES_VERIFICATION | CHECK | Confirm PostCSS compatibility.
| @sentry/nextjs | ^10.69.0 | REQUIRES_VERIFICATION | OK | Ensure DSN present in prod.
| node (engines) | >=20.0.0 | Node 20.x | OK | Use Node 20 in CI/prod.

Notes: For exact recommended versions & security vulnerabilities run `npm audit` and `npm outdated` in CI. I did not run live registry queries; mark as REQUIRES_VERIFICATION.

---

Environment Variables Audit
- Critical variables referenced by lib/config/production-lock.ts: NEXT_PUBLIC_APP_URL, APP_BASE_URL, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, PAYMOB_* keys, RESEND_* keys, INTERNAL_API_SECRET, REVALIDATE_SECRET.
- .env.example included many values; verify production secrets are set and not in NEXT_PUBLIC_ prefix incorrectly.
- Recommend: enable fail-fast in production (COOKIE_BITE_FAIL_ON_MISSING_ENV=true) or add CI pre-flight check to fail build/deploy when missing.

---

Build & Runtime Audit
- Run `NODE_ENV=production npm run build` on CI with Node 20. Confirm `postbuild` scripts succeed.
- Pay attention to native modules (sharp) and their binaries — ensure the Docker/Hostinger environment provides the required glibc / build tools or use sharp prebuilt binaries.
- Middleware edge compatibility: ensure files used by middleware are Edge-safe (pure JS, web APIs) or dynamically imported.

---

API & Middleware Audit (detailed)
- middleware.ts is the single entrypoint that affects many routes. I inspected it and applied fixes:
  - Dynamic import of rate limiter and guarded usage.
  - Wrapped updateSupabaseSession in try/catch.
  - Fixed getOwnerFlags error logging.
- Rate limiter now uses dynamic `import("ioredis")` inside getRedisClient and preserves in-memory fallback.
- Supabase cookie handler now writes only to NextResponse.cookies.
- Action items: scan every module imported by middleware for Node-only APIs. Key directories to check: lib/admin, lib/observability, lib/store, lib/auth.

---

Supabase & Authentication Audit
- updateSupabaseSession uses @supabase/ssr.createServerClient — ensure this library's cookie helper works with Next middleware; we provided setAll that sets response cookies.
- Validate that Supabase session refresh and tokens work under your hosting (Edge vs Node). Some Supabase server helpers assume Node http cookie semantics.
- Verify that Supabase service role key (SUPABASE_SERVICE_KEY) is only used in server-only contexts and not exposed.

---

Cloudinary Audit
- Found lib/cloudinary.ts and lib/cloudinary-server.ts. These files appear to use server-side Cloudinary SDK/api keys. Ensure environment variables NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET are set in production.
- Actions: Run a quick integration test for upload/transform operations and confirm that signed URLs and API key usage succeed.

---

Database Audit
- There is a supabase/ folder and scripts for migrations (scripts/supabase-*.mjs). I did not have DB access, so DB integrity, RLS policies, triggers, migrations require REQUIRES_VERIFICATION.
- Recommend: run `npm run supabase:healthcheck` and `npm run supabase:list-migrations` from CI with correct envs.

---

Dependency & Security notes
- Use `npm audit` to identify vulnerabilities.
- Many overrides exist in package.json; verify no incompatible overrides (e.g., postcss, undici, etc.) cause bundle issues.
- Consider pinning versions for native libs and adding a postinstall check to ensure prebuilt binaries available.

---

Fixes applied (commit)
- Branch: fix/middleware-edge-compat
- Commit: af060700e344f4ddb1ad8fd765ca5c99926eb217
- Changes:
  - lib/rate-limit/redis-rate-limiter.ts: dynamic import of ioredis; guard and in-memory fallback; improved logging.
  - lib/supabase/middleware.ts: removed request.cookies.set calls; use response.cookies.set.
  - middleware.ts: dynamic import of rate limiter; guard updateSupabaseSession in try/catch; improved logging.

You can review the commit here:
https://github.com/cookiebiteorders-stack/cookie-bite/commit/af060700e344f4ddb1ad8fd765ca5c99926eb217

---

Recommended immediate actions (deploy checklist)
1) Merge `fix/middleware-edge-compat` into main once reviewed.
2) Run full `npm ci` and `NODE_ENV=production npm run build` in CI using Node 20 and same OS as production.
3) Add CI tests to exercise middleware paths (protected admin, account, api routes) in headless mode.
4) Configure Sentry in staging & production and ensure requestId headers included in events.
5) Confirm Redis availability in production or accept in-memory fallback limitations and document them.
6) Verify Supabase env vars and cookies behavior in staging; ensure session refresh works.

---

Complete TODO list (GitHub task list)

🔴 Critical
- [ ] Merge branch `fix/middleware-edge-compat` into main.
- [ ] Run `NODE_ENV=production npm run build` in CI (Node 20) and fix any native binary/build failures.
- [ ] Add pre-flight check in deployment to fail when production env vars missing (or set COOKIE_BITE_FAIL_ON_MISSING_ENV=true).
- [ ] Configure Sentry DSN in production and verify middleware error reporting.

🟠 High
- [ ] Audit all modules imported by middleware for Node-only APIs and convert to dynamic imports or move logic out of middleware.
- [ ] Deploy Redis for global rate limiting; validate rate buckets and failover behavior.
- [ ] Add integration tests for Supabase session refresh and cookie flows.

🟡 Medium
- [ ] Add CI lint/ts checks that detect top-level Node-only imports in middleware-executed files.
- [ ] Add e2e tests for admin & protected pages.

🟢 Low
- [ ] Run `npm audit` and schedule dependency updates; document risky native modules.
- [ ] Add docs on deployment (Hostinger specifics, Node 20, native modules).

---

Final validation & next steps
- I already applied code fixes for the most critical issues and pushed to `fix/middleware-edge-compat` (commit af060700...). Please review the code and merge into main when ready.
- After merging, run CI build and deploy to staging. Exercise protected/admin pages and APIs and confirm no 500s.
- Collect production/staging logs for any remaining uncaught exceptions; I will help triage them.

If you want, I will:
- Open a PR from `fix/middleware-edge-compat` to `main` with a summary and test instructions.
- Continue scanning the repository for other Node-only top-level imports and prepare small fix branches.
- Generate PRs for CI changes (add Node 20 build job, add pre-flight env check script).

---

Appendix: Files I edited
- lib/rate-limit/redis-rate-limiter.ts
- lib/supabase/middleware.ts
- middleware.ts

Appendix: Files I inspected (selected)
- package.json
- .env.example
- lib/config/production-lock.ts
- lib/cloudinary.ts
- lib/cloudinary-server.ts
- lib/logger.ts
- all lib/* directories listed in repository root (enumeration performed)
- app/ (directory listing)

---

Status markers
- Fixed: MIDDLEWARE-001, MIDDLEWARE-002 (see commit af060700...)
- Mitigated / Guarded: MIDDLEWARE-003 (dynamic import + try/catch applied; full audit of middleware imports still required)
- REQUIRES_VERIFICATION: Native module build success (sharp), runtime behavior in production host (Hostinger) regarding middleware runtime (Edge vs Node), Supabase RLS and DB migrations.

---

End of audit.
