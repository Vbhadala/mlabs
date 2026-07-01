// Next.js 16 instrumentation hook — fires once per server start, before
// the first request. The canonical place to boot long-lived work like a
// pg-boss / BullMQ worker pool, a background scheduler, or telemetry SDK
// initialization.
//
// The template ships this empty. Forks that add background work:
//
//   1. Put the worker code in a server-only package (e.g.
//      packages/services/src/<domain>/worker.ts).
//   2. Dynamic-import it from inside register() so it's pulled in only by
//      the nodejs runtime, not the edge bundle.
//   3. Guard on NEXT_RUNTIME (skip edge) AND NEXT_PHASE (skip
//      build-time — Next type-checks instrumentation during the build but
//      we don't want to open DB connections or schedule jobs there).
//
// Example (sketch):
//
//   export async function register() {
//     if (process.env.NEXT_RUNTIME !== "nodejs") return
//     if (process.env.NEXT_PHASE === "phase-production-build") return
//     const { startWorker } = await import("@mlabs/services/<domain>")
//     await startWorker()
//   }
//
// The worker module should be idempotent (singleton guard inside) so HMR
// in dev doesn't re-fire. A SIGTERM handler in the worker should call a
// graceful stop.
//
// See docs/decisions/0008-codebase-conventions.md (lands in T18).

import { env } from "@/config/env"
import { evaluateConfig, missingBySeverity } from "@mlabs/config/env-doctor"

export async function register() {
  // Dev-only, non-blocking config banner: turns silent misconfig into a
  // checklist on `pnpm dev`. Gating on the validated env.NODE_ENV is sufficient
  // — `next build`/`next start` run as "production" and tests as "test", so the
  // banner never fires outside dev (no raw process.env / NEXT_* flags needed).
  if (env.NODE_ENV === "development") {
    const results = evaluateConfig({
      DATABASE_URL: env.DATABASE_URL,
      BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
      BETTER_AUTH_URL: env.BETTER_AUTH_URL,
      POSTMARK_SERVER_TOKEN: env.POSTMARK_SERVER_TOKEN,
      POSTMARK_FROM_EMAIL: env.POSTMARK_FROM_EMAIL,
      REPLIT_OBJECT_STORAGE_BUCKET_ID: env.REPLIT_OBJECT_STORAGE_BUCKET_ID,
      STRIPE_SECRET_KEY: env.STRIPE_SECRET_KEY,
    })
    const critical = missingBySeverity(results, "critical")
    const recommended = missingBySeverity(results, "recommended")
    if (critical.length > 0 || recommended.length > 0) {
      console.warn(
        [
          "",
          "⚠  mstack: incomplete config — some features will fail:",
          ...critical.map((r) => `   ✗ ${r.key} (critical) — ${r.consequence}`),
          ...recommended.map((r) => `   ! ${r.key} — ${r.consequence}`),
          "   → run `pnpm doctor` for details, `pnpm setup` to fix.",
          "",
        ].join("\n"),
      )
    }
  }

  // Forks: add real boot code (workers, schedulers) below — see the block above.
}
