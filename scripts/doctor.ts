/**
 * doctor
 * ------
 * First-run / fork health check. Prints the status of the load-bearing
 * environment config (from @mlabs/config/env-doctor — the single source of
 * truth) and does a live database check: is DATABASE_URL reachable, and are
 * migrations applied.
 *
 * The app boots with any env unset (all vars are .optional()), so silent
 * failure is the default. This surfaces it as an explicit checklist.
 *
 * Usage:
 *   pnpm doctor            # print status, always exit 0
 *   pnpm doctor --strict   # exit 1 if a *critical* var is missing (CI / pre-deploy)
 *
 * Exit codes:
 *   0 — informational (default), or --strict with no missing critical vars
 *   1 — --strict and a critical var is missing
 */

import path from "node:path"
import {
  evaluateConfig,
  missingBySeverity,
  hasMissingCritical,
  type CheckResult,
} from "@mlabs/config/env-doctor"
import { getMigrationStatus } from "@mlabs/db/status"

// ---------- terminal colors (no deps) ----------

const RESET = "\x1b[0m"
const RED = "\x1b[31m"
const GREEN = "\x1b[32m"
const YELLOW = "\x1b[33m"
const DIM = "\x1b[2m"
const BOLD = "\x1b[1m"

function statusMark(r: CheckResult): string {
  if (r.status === "ok") return `${GREEN}✓${RESET}`
  if (r.severity === "critical") return `${RED}✗${RESET}`
  if (r.severity === "recommended") return `${YELLOW}!${RESET}`
  return `${DIM}·${RESET}`
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length)
}

// ---------- runner ----------

export async function main(argv: string[] = process.argv): Promise<number> {
  const strict = argv.includes("--strict")

  const results = evaluateConfig(process.env)

  console.log(`${BOLD}mstack doctor${RESET} — environment & database\n`)

  console.log(`${BOLD}Config${RESET}`)
  const keyWidth = Math.max(...results.map((r) => r.key.length)) + 2
  for (const r of results) {
    const label = pad(r.key, keyWidth)
    if (r.status === "ok") {
      console.log(`  ${statusMark(r)} ${label}${DIM}set${RESET}`)
    } else {
      const sev = r.severity === "optional" ? "optional" : `${r.severity} — ${r.consequence}`
      console.log(`  ${statusMark(r)} ${label}${r.severity === "critical" ? RED : r.severity === "recommended" ? YELLOW : DIM}MISSING${RESET} ${DIM}(${sev})${RESET}`)
      console.log(`      ${DIM}→ ${r.howToGet}${RESET}`)
    }
  }

  console.log(`\n${BOLD}Database${RESET}`)
  const db = await getMigrationStatus(process.env.DATABASE_URL)
  if (!db.reachable) {
    if (!process.env.DATABASE_URL) {
      console.log(`  ${RED}✗${RESET} DATABASE_URL not set — ${DIM}no database; every DB query 500s${RESET}`)
    } else {
      console.log(`  ${RED}✗${RESET} unreachable — ${DIM}${db.error ?? "unknown error"}${RESET}`)
    }
  } else if (db.pending > 0) {
    console.log(
      `  ${YELLOW}!${RESET} reachable — ${db.applied} of ${db.total} migrations applied ` +
        `${YELLOW}(${db.pending} pending)${RESET} ${DIM}→ run \`pnpm db:migrate\`${RESET}`,
    )
  } else {
    console.log(`  ${GREEN}✓${RESET} reachable — ${db.applied} of ${db.total} migrations applied ${DIM}(0 pending)${RESET}`)
  }

  // ---------- summary ----------
  const missingCritical = missingBySeverity(results, "critical")
  const missingRecommended = missingBySeverity(results, "recommended")
  console.log()
  if (missingCritical.length === 0 && missingRecommended.length === 0) {
    console.log(`${GREEN}${BOLD}✓ all critical + recommended config present${RESET}`)
  } else {
    const parts: string[] = []
    if (missingCritical.length) parts.push(`${missingCritical.length} critical`)
    if (missingRecommended.length) parts.push(`${missingRecommended.length} recommended`)
    console.log(`${BOLD}Missing:${RESET} ${parts.join(", ")}. ${DIM}Run \`pnpm setup\` to configure.${RESET}`)
  }

  if (strict && hasMissingCritical(results)) {
    console.log(`${RED}--strict: critical config missing → exit 1${RESET}`)
    return 1
  }
  return 0
}

// CLI entry — only runs when invoked directly, not when imported by tests.
const isDirectRun =
  typeof process !== "undefined" &&
  process.argv[1] &&
  import.meta.url === `file://${path.resolve(process.argv[1])}`

if (isDirectRun) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(`unexpected error: ${(err as Error).stack ?? err}`)
      process.exit(1)
    },
  )
}
